import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const dashboardsDir = path.join(rootDir, "docker", "grafana", "dashboards");

const DS = {
  type: "prometheus",
  uid: "${DS_PROMETHEUS}"
};

const ZERO_MAPPINGS = [
  {
    type: "special",
    options: {
      match: "nan",
      result: {
        text: "0"
      }
    }
  },
  {
    type: "special",
    options: {
      match: "null",
      result: {
        text: "0"
      }
    }
  },
  {
    type: "special",
    options: {
      match: "empty",
      result: {
        text: "0"
      }
    }
  }
];

const STATUS_VALUE_MAPPINGS = {
  success: {
    color: "green",
    text: "Sucesso"
  },
  failed: {
    color: "red",
    text: "Falha"
  },
  error: {
    color: "red",
    text: "Erro"
  },
  warning: {
    color: "orange",
    text: "Alerta"
  },
  running: {
    color: "blue",
    text: "Em execução"
  },
  working: {
    color: "blue",
    text: "Em execução"
  },
  active: {
    color: "blue",
    text: "Em execução"
  },
  disabled: {
    color: "#6b7280",
    text: "Idle"
  },
  none: {
    color: "#6b7280",
    text: "Idle"
  },
  unknown: {
    color: "#9ca3af",
    text: "Desconhecido"
  }
};

const PRIMARY_JOB_TYPES_REGEX = "vm_backup|backup_to_tape";
const OVERVIEW_JOB_SCOPE = `job_type=~"${PRIMARY_JOB_TYPES_REGEX}", job_name=~"$job_name"`;
const JOB_SCOPE = 'job_type=~"$job_type", job_name=~"$job_name"';
const JOB_STATUS_SCOPE = `${JOB_SCOPE}, status=~"$status"`;
const REPO_SCOPE = 'repository_name=~"$repository_name", backup_server=~"$backup_server"';
const BACKUP_SERVER_SCOPE = 'backup_server=~"$backup_server"';

const refIds = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const expr = {
  totalJobs: `count(veeam_job_status{${JOB_SCOPE}}) or vector(0)`,
  successJobs: `(sum(success_jobs{${JOB_SCOPE}}) or vector(0))`,
  failedJobs: `(sum(failed_jobs{${JOB_SCOPE}}) or vector(0))`,
  runningJobs: `(sum(active_jobs{${JOB_SCOPE}}) or vector(0))`,
  warningJobs: `(count(veeam_job_status{${JOB_SCOPE}, status="warning"}) or vector(0))`,
  successRatio: `((sum(success_jobs{${JOB_SCOPE}}) or vector(0)) / clamp_min(count(veeam_job_status{${JOB_SCOPE}}), 1)) or vector(0)`,
  processedVolume: `sum(job_last_transferred_data_bytes{${JOB_SCOPE}}) or vector(0)`,
  avgLastDuration: `avg(job_last_run_duration_seconds{${JOB_SCOPE}}) or vector(0)`,
  avgHistoricalDuration: `avg(veeam_job_avg_duration_seconds{${JOB_SCOPE}}) or vector(0)`,
  maxAging: `max((time() - veeam_job_last_run_timestamp_seconds{${JOB_SCOPE}}) and on(job_name, job_type) (veeam_job_last_run_timestamp_seconds{${JOB_SCOPE}} > 0)) or vector(0)`,
  currentInactive: `clamp_min(count(veeam_job_status{${JOB_SCOPE}}) - (sum(active_jobs{${JOB_SCOPE}}) or vector(0)), 0) or vector(0)`,
  idleJobsByType: `sum(veeam_jobs_idle_total{job_type=~"$job_type"}) or vector(0)`,
  failedJobsByType: `sum(veeam_jobs_failed_total{job_type=~"$job_type"}) or vector(0)`,
  warningJobsByType: `sum(veeam_jobs_warning_total{job_type=~"$job_type"}) or vector(0)`,
  runningJobsByType: `sum(veeam_jobs_running_total{job_type=~"$job_type"}) or vector(0)`,
  degradedJobsByType: `((sum(veeam_jobs_failed_total{job_type=~"$job_type"}) or vector(0)) + (sum(veeam_jobs_warning_total{job_type=~"$job_type"}) or vector(0)) + (sum(veeam_jobs_idle_total{job_type=~"$job_type"}) or vector(0)))`,
  repositoryCapacity: `sum(veeam_repository_capacity_bytes{${REPO_SCOPE}}) or vector(0)`,
  repositoryUsed: `sum(veeam_repository_used_bytes{${REPO_SCOPE}}) or vector(0)`,
  repositoryFree: `sum(veeam_repository_free_bytes{${REPO_SCOPE}}) or vector(0)`,
  repositoryUsageAvg: `avg(veeam_repository_usage_ratio{${REPO_SCOPE}}) or vector(0)`,
  repositoriesAtRisk: `count(veeam_repository_usage_ratio{${REPO_SCOPE}} > 0.85) or vector(0)`,
  repositoryWorstUsage: `max(veeam_repository_usage_ratio{${REPO_SCOPE}}) or vector(0)`,
  repositoryMinDaysLeft: `min(veeam_repository_days_left_estimate{${REPO_SCOPE}}) or vector(0)`,
  sobrWorstUsage: `max(veeam_sobr_usage_ratio{${BACKUP_SERVER_SCOPE}}) or vector(0)`,
  sobrAtRisk: `count(veeam_sobr_usage_ratio{${BACKUP_SERVER_SCOPE}} > 0.85) or vector(0)`,
  sobrUsageAvg: `avg(veeam_sobr_usage_ratio{${BACKUP_SERVER_SCOPE}}) or vector(0)`
};

function description(what, how, why) {
  return `**O que mostra:** ${what}\n\n**Como interpretar:** ${how}\n\n**Por que importa:** ${why}`;
}

function datasourceVariable() {
  return {
    current: {
      selected: false,
      text: "Prometheus",
      value: "prometheus"
    },
    hide: 0,
    includeAll: false,
    label: "Fonte de Dados",
    name: "DS_PROMETHEUS",
    options: [],
    query: "prometheus",
    refresh: 1,
    regex: "",
    type: "datasource"
  };
}

function queryVariable({ name, label, query }) {
  return {
    allValue: ".*",
    current: {
      selected: true,
      text: "All",
      value: "$__all"
    },
    datasource: DS,
    definition: query,
    hide: 0,
    includeAll: true,
    label,
    multi: true,
    name,
    options: [],
    query: {
      query,
      refId: "PrometheusVariableQueryEditor-VariableQuery"
    },
    refresh: 1,
    regex: "",
    sort: 1,
    type: "query"
  };
}

function rowPanel(id, title, y) {
  return {
    collapsed: false,
    gridPos: {
      h: 1,
      w: 24,
      x: 0,
      y
    },
    id,
    panels: [],
    title,
    type: "row"
  };
}

function statPanel({
  id,
  title,
  description: panelDescription,
  expr: targetExpr,
  x,
  y,
  w = 4,
  h = 4,
  unit = "short",
  color = { mode: "fixed", fixedColor: "#475569" },
  thresholds = [{ color: "green", value: null }],
  decimals,
  min,
  max
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color,
        decimals,
        mappings: ZERO_MAPPINGS,
        max,
        min,
        thresholds: {
          mode: "absolute",
          steps: thresholds
        },
        unit
      },
      overrides: []
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      colorMode: "background",
      graphMode: "area",
      justifyMode: "center",
      orientation: "auto",
      reduceOptions: {
        calcs: ["lastNotNull"],
        fields: "",
        values: false
      },
      showPercentChange: false,
      textMode: "value",
      wideLayout: true
    },
    targets: [{
      datasource: DS,
      editorMode: "code",
      expr: targetExpr,
      instant: true,
      range: false,
      refId: "A"
    }],
    title,
    type: "stat"
  };
}

function gaugePanel({
  id,
  title,
  description: panelDescription,
  expr: targetExpr,
  x,
  y,
  w = 4,
  h = 8,
  unit = "short",
  min = 0,
  max = 100,
  thresholds = [
    { color: "green", value: null },
    { color: "yellow", value: 70 },
    { color: "red", value: 85 }
  ],
  decimals
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color: {
          mode: "thresholds"
        },
        decimals,
        mappings: ZERO_MAPPINGS,
        max,
        min,
        thresholds: {
          mode: "absolute",
          steps: thresholds
        },
        unit
      },
      overrides: []
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      orientation: "auto",
      reduceOptions: {
        calcs: ["lastNotNull"],
        fields: "",
        values: false
      },
      showThresholdLabels: false,
      showThresholdMarkers: true,
      sizing: "auto"
    },
    targets: [{
      datasource: DS,
      editorMode: "code",
      expr: targetExpr,
      instant: true,
      range: false,
      refId: "A"
    }],
    title,
    type: "gauge"
  };
}

function barChartPanel({
  id,
  title,
  description: panelDescription,
  targets,
  x,
  y,
  w = 8,
  h = 8,
  unit = "short",
  min,
  max,
  thresholds = [{ color: "green", value: null }],
  orientation = "horizontal"
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color: {
          mode: "thresholds"
        },
        mappings: ZERO_MAPPINGS,
        max,
        min,
        thresholds: {
          mode: "absolute",
          steps: thresholds
        },
        unit
      },
      overrides: []
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      barRadius: 0,
      barWidth: 0.8,
      fullHighlight: false,
      groupWidth: 0.7,
      legend: {
        displayMode: "list",
        placement: "bottom",
        showLegend: true
      },
      orientation,
      showValue: "auto",
      stacking: "none",
      tooltip: {
        hideZeros: false,
        mode: "single",
        sort: "desc"
      },
      xTickLabelRotation: 0,
      xTickLabelSpacing: 0
    },
    targets: normalizeTargets(targets, true),
    title,
    type: "barchart"
  };
}

function barGaugePanel({
  id,
  title,
  description: panelDescription,
  targets,
  x,
  y,
  w = 8,
  h = 8,
  unit = "short",
  min = 0,
  max,
  thresholds = [
    { color: "green", value: null },
    { color: "yellow", value: 70 },
    { color: "red", value: 85 }
  ]
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color: {
          mode: "thresholds"
        },
        mappings: ZERO_MAPPINGS,
        max,
        min,
        thresholds: {
          mode: "absolute",
          steps: thresholds
        },
        unit
      },
      overrides: []
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      displayMode: "gradient",
      minVizHeight: 16,
      minVizWidth: 16,
      namePlacement: "left",
      orientation: "horizontal",
      reduceOptions: {
        calcs: ["lastNotNull"],
        fields: "",
        values: false
      },
      showUnfilled: true,
      sizing: "manual",
      valueMode: "color"
    },
    targets: normalizeTargets(targets, true),
    title,
    type: "bargauge"
  };
}

function timeSeriesPanel({
  id,
  title,
  description: panelDescription,
  targets,
  x,
  y,
  w = 12,
  h = 8,
  unit = "short",
  min,
  max,
  stack = false,
  thresholds = [{ color: "green", value: null }],
  overrides = []
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color: {
          mode: "palette-classic"
        },
        custom: {
          axisBorderShow: false,
          axisCenteredZero: false,
          axisColorMode: "text",
          drawStyle: "line",
          fillOpacity: stack ? 24 : 18,
          gradientMode: "opacity",
          hideFrom: {
            legend: false,
            tooltip: false,
            viz: false
          },
          lineInterpolation: "smooth",
          lineWidth: 3,
          pointSize: 5,
          scaleDistribution: {
            type: "linear"
          },
          showPoints: "auto",
          spanNulls: true,
          stacking: {
            group: "A",
            mode: stack ? "normal" : "none"
          },
          thresholdsStyle: {
            mode: "off"
          }
        },
        mappings: ZERO_MAPPINGS,
        max,
        min,
        thresholds: {
          mode: "absolute",
          steps: thresholds
        },
        unit
      },
      overrides
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      legend: {
        calcs: [
          "lastNotNull",
          "mean",
          "max"
        ],
        displayMode: "table",
        placement: "bottom",
        showLegend: true
      },
      tooltip: {
        mode: "multi",
        sort: "desc"
      }
    },
    targets: normalizeTargets(targets, false),
    title,
    type: "timeseries"
  };
}

function tablePanel({
  id,
  title,
  description: panelDescription,
  targets,
  transformations,
  overrides,
  x,
  y,
  w = 24,
  h = 10,
  sortBy
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color: {
          mode: "thresholds"
        },
        custom: {
          align: "auto",
          cellOptions: {
            type: "auto"
          },
          filterable: true,
          inspect: false
        },
        mappings: ZERO_MAPPINGS,
        thresholds: {
          mode: "absolute",
          steps: [{ color: "green", value: null }]
        }
      },
      overrides
    },
    gridPos: {
      h,
      w,
      x,
      y
    },
    id,
    options: {
      cellHeight: "sm",
      enablePagination: true,
      showHeader: true,
      sortBy
    },
    targets: normalizeTargets(targets, true, true),
    title,
    transformations,
    type: "table"
  };
}

function normalizeTargets(targets, instant, table = false) {
  return targets.map((target, index) => ({
    datasource: DS,
    editorMode: "code",
    expr: target.expr,
    format: table ? "table" : undefined,
    instant,
    legendFormat: target.legendFormat,
    range: !instant,
    refId: refIds[index] ?? `X${index}`
  }));
}

function link(title, uid, tooltip) {
  return {
    asDropdown: false,
    icon: "dashboard",
    includeVars: true,
    keepTime: true,
    tags: [],
    targetBlank: false,
    title,
    tooltip,
    type: "link",
    url: `/d/${uid}`
  };
}

function statusColumnOverride(name = "Status") {
  return {
    matcher: {
      id: "byName",
      options: name
    },
    properties: [
      {
        id: "mappings",
        value: [{
          type: "value",
          options: STATUS_VALUE_MAPPINGS
        }]
      },
      {
        id: "custom.cellOptions",
        value: {
          type: "color-background"
        }
      },
      {
        id: "custom.width",
        value: 150
      }
    ]
  };
}

function typeColumnOverride(name = "Tipo") {
  return {
    matcher: {
      id: "byName",
      options: name
    },
    properties: [
      {
        id: "mappings",
        value: [{
          type: "value",
          options: {
            vm_backup: {
              color: "#2563eb",
              text: "VMware"
            },
            backup_to_tape: {
              color: "#f59e0b",
              text: "TAPE"
            },
            backup_copy: {
              color: "#14b8a6",
              text: "Backup Copy"
            }
          }
        }]
      },
      {
        id: "custom.cellOptions",
        value: {
          type: "color-background"
        }
      },
      {
        id: "custom.width",
        value: 120
      }
    ]
  };
}

function bytesColumnOverride(pattern) {
  return {
    matcher: {
      id: "byRegexp",
      options: pattern
    },
    properties: [
      {
        id: "unit",
        value: "decbytes"
      }
    ]
  };
}

function durationColumnOverride(pattern) {
  return {
    matcher: {
      id: "byRegexp",
      options: pattern
    },
    properties: [
      {
        id: "unit",
        value: "dtdurations"
      }
    ]
  };
}

function percentageColumnOverride(pattern) {
  return {
    matcher: {
      id: "byRegexp",
      options: pattern
    },
    properties: [
      {
        id: "unit",
        value: "percent"
      },
      {
        id: "custom.cellOptions",
        value: {
          type: "gradient-gauge"
        }
      }
    ]
  };
}

function dateColumnOverride(name) {
  return {
    matcher: {
      id: "byName",
      options: name
    },
    properties: [
      {
        id: "unit",
        value: "dateTimeAsLocal"
      },
      {
        id: "custom.width",
        value: 180
      }
    ]
  };
}

function seriesColorOverride(name, color) {
  return {
    matcher: {
      id: "byName",
      options: name
    },
    properties: [
      {
        id: "color",
        value: {
          fixedColor: color,
          mode: "fixed"
        }
      }
    ]
  };
}

function jobScopeForType(jobType) {
  return `job_type="${jobType}", job_name=~"$job_name"`;
}

function jobStatusScopeForType(jobType) {
  return `${jobScopeForType(jobType)}, status=~"$status"`;
}

function countJobsExpr(scope) {
  return `count(veeam_job_status{${scope}}) or vector(0)`;
}

function successJobsExpr(scope) {
  return `sum(success_jobs{${scope}}) or vector(0)`;
}

function failedJobsExpr(scope) {
  return `sum(failed_jobs{${scope}}) or vector(0)`;
}

function warningJobsExpr(scope) {
  return `count(veeam_job_status{${scope}, status="warning"}) or vector(0)`;
}

function runningJobsExpr(scope) {
  return `sum(active_jobs{${scope}}) or vector(0)`;
}

function idleJobsExpr(scope) {
  return `count(veeam_job_status{${scope}, status=~"disabled|none|unknown"}) or vector(0)`;
}

function transferredVolumeExpr(scope) {
  return `sum(job_last_transferred_data_bytes{${scope}}) or vector(0)`;
}

function avgDurationLastExpr(scope) {
  return `avg(job_last_run_duration_seconds{${scope}}) or vector(0)`;
}

function avgDurationHistoryExpr(scope) {
  return `avg(veeam_job_avg_duration_seconds{${scope}}) or vector(0)`;
}

function successRateExpr(scope) {
  return `(100 * (${successJobsExpr(scope)}) / clamp_min(count(veeam_job_status{${scope}}), 1)) or vector(0)`;
}

function failureRateExpr(scope) {
  return `(100 * (${failedJobsExpr(scope)}) / clamp_min(count(veeam_job_status{${scope}}), 1)) or vector(0)`;
}

function makeDashboard({
  title,
  uid,
  tags,
  version,
  timeFrom = "now-30d",
  links,
  variables,
  panels
}) {
  return {
    annotations: {
      list: [{
        builtIn: 1,
        datasource: {
          type: "grafana",
          uid: "-- Grafana --"
        },
        enable: true,
        hide: true,
        iconColor: "rgba(0, 211, 255, 1)",
        name: "Annotations & Alerts",
        type: "dashboard"
      }]
    },
    editable: true,
    fiscalYearStartMonth: 0,
    graphTooltip: 1,
    id: null,
    links,
    liveNow: false,
    panels,
    refresh: "30s",
    schemaVersion: 42,
    tags,
    templating: {
      list: variables
    },
    time: {
      from: timeFrom,
      to: "now"
    },
    timepicker: {},
    timezone: "browser",
    title,
    uid,
    version,
    weekStart: ""
  };
}

function mainVariables() {
  return [
    datasourceVariable(),
    queryVariable({
      name: "job_type",
      label: "Tipo de job",
      query: "label_values(veeam_job_info, job_type)"
    }),
    queryVariable({
      name: "job_name",
      label: "Job",
      query: 'label_values(veeam_job_info{job_type=~"$job_type"}, job_name)'
    }),
    queryVariable({
      name: "status",
      label: "Status",
      query: 'label_values(veeam_job_status{job_type=~"$job_type", job_name=~"$job_name"}, status)'
    }),
    queryVariable({
      name: "backup_server",
      label: "Backup Server",
      query: 'label_values({__name__=~"veeam_repository_capacity_bytes|veeam_sobr_capacity_bytes|veeam_sobr_extent_capacity_bytes"}, backup_server)'
    }),
    queryVariable({
      name: "repository_name",
      label: "Repositório",
      query: 'label_values(veeam_repository_capacity_bytes{backup_server=~"$backup_server"}, repository_name)'
    })
  ];
}

function jobsPanoramaVariables() {
  return [
    datasourceVariable(),
    queryVariable({
      name: "job_name",
      label: "Job",
      query: `label_values(veeam_job_info{job_type=~"${PRIMARY_JOB_TYPES_REGEX}"}, job_name)`
    })
  ];
}

function jobsDetailVariables() {
  return [
    datasourceVariable(),
    queryVariable({
      name: "job_type",
      label: "Tipo de job",
      query: `label_values(veeam_job_info{job_type=~"${PRIMARY_JOB_TYPES_REGEX}"}, job_type)`
    }),
    queryVariable({
      name: "job_name",
      label: "Job",
      query: 'label_values(veeam_job_info{job_type=~"$job_type"}, job_name)'
    }),
    queryVariable({
      name: "status",
      label: "Status",
      query: 'label_values(veeam_job_status{job_type=~"$job_type", job_name=~"$job_name"}, status)'
    })
  ];
}

function repositoryVariables() {
  return [
    datasourceVariable(),
    queryVariable({
      name: "backup_server",
      label: "Backup Server",
      query: 'label_values({__name__=~"veeam_repository_capacity_bytes|veeam_sobr_capacity_bytes|veeam_sobr_extent_capacity_bytes"}, backup_server)'
    }),
    queryVariable({
      name: "repository_name",
      label: "Repositório",
      query: 'label_values(veeam_repository_capacity_bytes{backup_server=~"$backup_server"}, repository_name)'
    })
  ];
}

function overviewDashboard() {
  const panels = [
    rowPanel(100, "Resumo Executivo", 0),
    statPanel({
      id: 1,
      title: "Total de Jobs",
      description: description(
        "Quantidade de jobs Veeam ONE visíveis no filtro atual por tipo e nome.",
        "Use como linha de base do ambiente monitorado; mudanças bruscas podem indicar inclusão, remoção ou falha de coleta.",
        "Ajuda a confirmar escopo e a contextualizar todos os demais KPIs."
      ),
      expr: expr.totalJobs,
      x: 0,
      y: 1,
      color: { mode: "fixed", fixedColor: "#475569" }
    }),
    statPanel({
      id: 2,
      title: "Jobs com Sucesso",
      description: description(
        "Quantidade de jobs cujo último estado conhecido está em sucesso.",
        "Quanto maior em relação ao total, mais saudável está a operação recente.",
        "É o principal indicador de estabilidade da camada de backup."
      ),
      expr: expr.successJobs,
      x: 4,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#64748b", value: null },
        { color: "green", value: 1 }
      ]
    }),
    statPanel({
      id: 3,
      title: "Jobs com Falha",
      description: description(
        "Quantidade de jobs cujo último estado conhecido é falha ou erro.",
        "Valores acima de zero merecem atenção imediata, principalmente quando persistem ao longo do tempo.",
        "Falhas recorrentes comprometem RPO, janelas de backup e confiança operacional."
      ),
      expr: expr.failedJobs,
      x: 8,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "red", value: 1 }
      ]
    }),
    statPanel({
      id: 4,
      title: "Jobs em Execução",
      description: description(
        "Quantidade de jobs ativos no momento da coleta.",
        "Serve para acompanhar pressão operacional e confirmar se a janela está em andamento.",
        "Ajuda a correlacionar volume, duração e concorrência."
      ),
      expr: expr.runningJobs,
      x: 12,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#64748b", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    statPanel({
      id: 5,
      title: "Jobs com Warning",
      description: description(
        "Quantidade de jobs com warning no último estado conhecido.",
        "Warnings são sinais de degradação que podem anteceder falhas mais severas.",
        "Permite agir antes que o problema vire indisponibilidade."
      ),
      expr: expr.warningJobs,
      x: 16,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "orange", value: 1 }
      ]
    }),
    statPanel({
      id: 6,
      title: "Taxa de Sucesso (%)",
      description: description(
        "Razão entre jobs em sucesso e o total de jobs selecionados.",
        "Acima de 95% indica operação estável; abaixo disso o ambiente exige análise do bloco de saúde.",
        "Resume em um único número a confiabilidade operacional do ambiente."
      ),
      expr: expr.successRatio,
      x: 20,
      y: 1,
      unit: "percentunit",
      decimals: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "red", value: null },
        { color: "orange", value: 0.85 },
        { color: "green", value: 0.95 }
      ]
    }),
    statPanel({
      id: 7,
      title: "Volume Total Processado",
      description: description(
        "Soma do volume transferido conhecido na última coleta dos jobs filtrados.",
        "Interprete como pressão recente de dados sobre a operação de backup.",
        "Ajuda a entender crescimento, gargalos e impacto sobre storage e janela."
      ),
      expr: expr.processedVolume,
      x: 0,
      y: 5,
      w: 8,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#0f766e" }
    }),
    statPanel({
      id: 8,
      title: "Capacidade Total dos Repositórios",
      description: description(
        "Soma da capacidade total dos repositórios filtrados por nome e backup server.",
        "Mostra o tamanho disponível da camada de armazenamento de backup tradicional.",
        "É essencial para avaliar expansão e risco de saturação."
      ),
      expr: expr.repositoryCapacity,
      x: 8,
      y: 5,
      w: 8,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#7c3aed" }
    }),
    statPanel({
      id: 9,
      title: "Uso Médio dos Repositórios (%)",
      description: description(
        "Média percentual de uso dos repositórios filtrados.",
        "Acima de 70% pede atenção; acima de 85% representa risco operacional relevante.",
        "Resume o nível de pressão da capacidade disponível."
      ),
      expr: expr.repositoryUsageAvg,
      x: 16,
      y: 5,
      w: 8,
      unit: "percentunit",
      decimals: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "yellow", value: 0.7 },
        { color: "red", value: 0.85 }
      ]
    }),
    rowPanel(101, "Status Operacional", 9),
    barChartPanel({
      id: 10,
      title: "Distribuição Atual por Status",
      description: description(
        "Distribuição atual dos jobs por estado operacional consolidado.",
        "Observe rapidamente a proporção entre sucesso, warning, falha, execução e inatividade.",
        "É o painel mais direto para responder se há problemas agora."
      ),
      targets: [
        { expr: expr.successJobs, legendFormat: "Sucesso" },
        { expr: expr.warningJobs, legendFormat: "Warning" },
        { expr: expr.failedJobs, legendFormat: "Falha" },
        { expr: expr.runningJobs, legendFormat: "Em execução" },
        { expr: expr.idleJobsByType, legendFormat: "Idle" }
      ],
      x: 0,
      y: 10,
      unit: "short",
      thresholds: [
        { color: "#475569", value: null },
        { color: "#475569", value: 1 }
      ]
    }),
    barChartPanel({
      id: 11,
      title: "Distribuição por Tipo de Job",
      description: description(
        "Contagem atual de jobs por tipo reportado pelo Veeam ONE.",
        "Use para identificar concentração operacional por workload ou serviço.",
        "Ajuda a priorizar análises quando um tipo específico concentra falhas ou volume."
      ),
      targets: [{
        expr: `count by (job_type) (veeam_job_status{${JOB_SCOPE}})`,
        legendFormat: "{{job_type}}"
      }],
      x: 8,
      y: 10,
      unit: "short",
      thresholds: [
        { color: "#0f766e", value: null }
      ]
    }),
    barGaugePanel({
      id: 12,
      title: "Jobs Ativos vs Inativos",
      description: description(
        "Comparação entre jobs em execução e jobs fora de execução no instante atual.",
        "Desbalanceamentos fora da janela esperada podem indicar backlog, travamento ou ambiente ocioso demais.",
        "Ajuda a validar rapidamente a dinâmica operacional da janela."
      ),
      targets: [
        { expr: expr.runningJobs, legendFormat: "Ativos" },
        { expr: expr.currentInactive, legendFormat: "Inativos" }
      ],
      x: 16,
      y: 10,
      w: 8,
      h: 8,
      unit: "short",
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    criticalJobsTable({
      id: 13,
      title: "Jobs Críticos no Estado Atual",
      y: 18
    }),
    rowPanel(102, "Evolução Temporal", 28),
    timeSeriesPanel({
      id: 14,
      title: "Estado Operacional ao Longo do Tempo",
      description: description(
        "Série temporal com a contagem de jobs por estado consolidado em cada coleta do Prometheus.",
        "Mudanças persistentes de tendência mostram degradação ou recuperação operacional do ambiente.",
        "É o melhor bloco para entender comportamento recente e sazonalidade da operação."
      ),
      targets: [
        { expr: expr.successJobs, legendFormat: "Sucesso" },
        { expr: expr.warningJobs, legendFormat: "Warning" },
        { expr: expr.failedJobs, legendFormat: "Falha" },
        { expr: expr.runningJobs, legendFormat: "Em execução" },
        { expr: expr.idleJobsByType, legendFormat: "Idle" }
      ],
      x: 0,
      y: 29,
      w: 12,
      h: 8,
      unit: "short",
      stack: true
    }),
    timeSeriesPanel({
      id: 15,
      title: "Falhas e Alertas ao Longo do Tempo",
      description: description(
        "Evolução temporal dos jobs em falha e warning.",
        "Tendência de alta indica deterioração operacional; quedas após intervenção validam a ação corretiva.",
        "Permite antecipar incidentes antes que se tornem generalizados."
      ),
      targets: [
        { expr: expr.failedJobs, legendFormat: "Falha" },
        { expr: expr.warningJobs, legendFormat: "Warning" }
      ],
      x: 12,
      y: 29,
      w: 12,
      h: 8,
      unit: "short"
    }),
    timeSeriesPanel({
      id: 16,
      title: "Volume Transferido Conhecido",
      description: description(
        "Soma do volume transferido conhecido pelos jobs monitorados ao longo do tempo.",
        "Use para perceber picos de processamento e verificar se o volume acompanha o comportamento esperado da janela.",
        "Ajuda a correlacionar crescimento de dados com duração e consumo de storage."
      ),
      targets: [
        { expr: expr.processedVolume, legendFormat: "Volume processado" }
      ],
      x: 0,
      y: 37,
      w: 12,
      h: 8,
      unit: "decbytes"
    }),
    timeSeriesPanel({
      id: 17,
      title: "Duração Média dos Jobs",
      description: description(
        "Comparação entre duração média da última execução e duração média histórica reportada pelo exporter.",
        "Se a linha da última execução se afastar muito da média histórica, há sinal de anomalia operacional.",
        "Ajuda a detectar lentidão, gargalo de infraestrutura e mudança de perfil do workload."
      ),
      targets: [
        { expr: expr.avgLastDuration, legendFormat: "Última execução" },
        { expr: expr.avgHistoricalDuration, legendFormat: "Média histórica" }
      ],
      x: 12,
      y: 37,
      w: 12,
      h: 8,
      unit: "s"
    }),
    rowPanel(103, "Repositórios", 45),
    barChartPanel({
      id: 18,
      title: "Ranking de Utilização dos Repositórios",
      description: description(
        "Ranking dos repositórios com maior percentual de utilização atual.",
        "Repositórios no topo do ranking devem ser avaliados antes de afetarem novos backups e retenções.",
        "É o principal painel para priorizar ação de capacidade."
      ),
      targets: [{
        expr: `topk(10, veeam_repository_usage_ratio{${REPO_SCOPE}} * 100)`,
        legendFormat: "{{repository_name}}"
      }],
      x: 0,
      y: 46,
      w: 12,
      h: 8,
      unit: "percent",
      min: 0,
      max: 100,
      thresholds: [
        { color: "green", value: null },
        { color: "yellow", value: 70 },
        { color: "red", value: 85 }
      ]
    }),
    gaugePanel({
      id: 19,
      title: "Maior Uso entre Repositórios",
      description: description(
        "Maior percentual de utilização encontrado entre os repositórios filtrados.",
        "Valores altos indicam risco concentrado mesmo quando a média geral parece confortável.",
        "Ajuda a evitar que um único repositório crítico esconda a real urgência do ambiente."
      ),
      expr: expr.repositoryWorstUsage,
      x: 12,
      y: 46,
      unit: "percentunit",
      decimals: 1
    }),
    gaugePanel({
      id: 20,
      title: "Menor Folga Estimada (dias)",
      description: description(
        "Menor estimativa de dias restantes até esgotamento de capacidade entre os repositórios filtrados.",
        "Quanto menor o valor, mais urgente é a necessidade de expansão, limpeza ou revisão de retenção.",
        "É um indicador direto de risco de parada por capacidade."
      ),
      expr: expr.repositoryMinDaysLeft,
      x: 16,
      y: 46,
      unit: "d",
      min: 0,
      max: 180,
      thresholds: [
        { color: "red", value: null },
        { color: "orange", value: 30 },
        { color: "yellow", value: 60 },
        { color: "green", value: 120 }
      ]
    }),
    gaugePanel({
      id: 21,
      title: "Maior Uso entre SOBRs",
      description: description(
        "Maior percentual de utilização entre os Scale-Out Backup Repositories monitorados.",
        "SOBRs pressionados tendem a concentrar riscos de tier, placement e offload.",
        "Complementa a leitura de risco da camada de storage avançado."
      ),
      expr: expr.sobrWorstUsage,
      x: 20,
      y: 46,
      unit: "percentunit",
      decimals: 1
    }),
    repositoriesTable({
      id: 22,
      title: "Detalhamento dos Repositórios",
      x: 0,
      y: 54,
      w: 14,
      h: 10
    }),
    sobrExtentsTable({
      id: 23,
      title: "SOBR e Extents",
      x: 14,
      y: 54,
      w: 10,
      h: 10
    }),
    rowPanel(104, "Distribuições", 64),
    barChartPanel({
      id: 24,
      title: "Faixas de Duração da Última Execução",
      description: description(
        "Distribuição dos jobs por faixas de duração da última execução conhecida.",
        "Concentração em faixas maiores indica janela mais pesada e maior sensibilidade a gargalos.",
        "Ajuda a separar workloads curtos, médios e longos para investigação."
      ),
      targets: [
        { expr: `count((job_last_run_duration_seconds{${JOB_SCOPE}} > 0) and (job_last_run_duration_seconds{${JOB_SCOPE}} <= 300)) or vector(0)`, legendFormat: "Até 5 min" },
        { expr: `count((job_last_run_duration_seconds{${JOB_SCOPE}} > 300) and (job_last_run_duration_seconds{${JOB_SCOPE}} <= 900)) or vector(0)`, legendFormat: "5 a 15 min" },
        { expr: `count((job_last_run_duration_seconds{${JOB_SCOPE}} > 900) and (job_last_run_duration_seconds{${JOB_SCOPE}} <= 3600)) or vector(0)`, legendFormat: "15 a 60 min" },
        { expr: `count(job_last_run_duration_seconds{${JOB_SCOPE}} > 3600) or vector(0)`, legendFormat: "Acima de 60 min" }
      ],
      x: 0,
      y: 65,
      unit: "short"
    }),
    barChartPanel({
      id: 25,
      title: "Faixas de Volume Processado",
      description: description(
        "Distribuição dos jobs por faixas de volume transferido conhecido na última coleta.",
        "Faixas mais altas indicam jobs com maior pressão sobre a janela e o storage.",
        "Ajuda a localizar quais cargas tendem a concentrar consumo de dados."
      ),
      targets: [
        { expr: `count(job_last_transferred_data_bytes{${JOB_SCOPE}} <= 107374182400) or vector(0)`, legendFormat: "Até 100 GB" },
        { expr: `count((job_last_transferred_data_bytes{${JOB_SCOPE}} > 107374182400) and (job_last_transferred_data_bytes{${JOB_SCOPE}} <= 536870912000)) or vector(0)`, legendFormat: "100 a 500 GB" },
        { expr: `count((job_last_transferred_data_bytes{${JOB_SCOPE}} > 536870912000) and (job_last_transferred_data_bytes{${JOB_SCOPE}} <= 1099511627776)) or vector(0)`, legendFormat: "500 GB a 1 TB" },
        { expr: `count(job_last_transferred_data_bytes{${JOB_SCOPE}} > 1099511627776) or vector(0)`, legendFormat: "Acima de 1 TB" }
      ],
      x: 8,
      y: 65,
      unit: "short"
    }),
    barChartPanel({
      id: 26,
      title: "Distribuição por Plataforma",
      description: description(
        "Contagem dos jobs por plataforma reportada no exporter.",
        "Use para identificar concentração de workloads em VMware, Hyper-V ou outras plataformas suportadas.",
        "É útil para priorizar troubleshooting por domínio tecnológico."
      ),
      targets: [{
        expr: `count by (platform) (veeam_job_info{${JOB_SCOPE}})`,
        legendFormat: "{{platform}}"
      }],
      x: 16,
      y: 65,
      unit: "short"
    }),
    barChartPanel({
      id: 27,
      title: "Estados dos Repositórios",
      description: description(
        "Distribuição dos repositórios por estado operacional informado pelo exporter.",
        "Mudanças nesse mix ajudam a identificar indisponibilidade, manutenção ou degradação da camada de storage.",
        "Complementa a leitura de capacidade com a leitura de disponibilidade."
      ),
      targets: [{
        expr: `count by (state) (veeam_repository_usage_ratio{${REPO_SCOPE}})`,
        legendFormat: "{{state}}"
      }],
      x: 0,
      y: 73,
      w: 24,
      h: 8,
      unit: "short"
    }),
    rowPanel(105, "Detalhamento Operacional", 81),
    detailedJobsTable({
      id: 28,
      title: "Inventário Operacional dos Jobs",
      y: 82
    }),
    rowPanel(106, "Saúde do Ambiente", 94),
    barGaugePanel({
      id: 29,
      title: "Taxa de Sucesso por Tipo de Job",
      description: description(
        "Taxa de sucesso consolidada por tipo de job usando a métrica agregada do exporter.",
        "Tipos com valores mais baixos concentram maior risco e devem virar prioridade investigativa.",
        "Ajuda a direcionar a análise para o serviço mais degradado do ambiente."
      ),
      targets: [{
        expr: `veeam_jobs_success_ratio{job_type=~"$job_type"} * 100`,
        legendFormat: "{{job_type}}"
      }],
      x: 0,
      y: 95,
      w: 8,
      h: 8,
      unit: "percent",
      min: 0,
      max: 100,
      thresholds: [
        { color: "red", value: null },
        { color: "orange", value: 85 },
        { color: "green", value: 95 }
      ]
    }),
    barGaugePanel({
      id: 30,
      title: "Indicadores de Degradação Atual",
      description: description(
        "Visão consolidada dos jobs em failed, warning, idle e running a partir das métricas agregadas por tipo.",
        "O bloco evidencia rapidamente se a degradação é falha direta, alerta recorrente ou ociosidade anormal.",
        "Funciona como checklist de saúde antes do drill-down em tabelas."
      ),
      targets: [
        { expr: expr.failedJobsByType, legendFormat: "Falha" },
        { expr: expr.warningJobsByType, legendFormat: "Warning" },
        { expr: expr.idleJobsByType, legendFormat: "Idle" },
        { expr: expr.runningJobsByType, legendFormat: "Em execução" }
      ],
      x: 8,
      y: 95,
      w: 8,
      h: 8,
      unit: "short",
      thresholds: [
        { color: "#64748b", value: null },
        { color: "orange", value: 1 },
        { color: "red", value: 3 }
      ]
    }),
    timeSeriesPanel({
      id: 31,
      title: "Tendência de Degradação",
      description: description(
        "Comparação temporal entre jobs degradados e o total consolidado do ambiente por tipo.",
        "Se a linha degradada cresce ou se aproxima do total, o ambiente está perdendo estabilidade.",
        "É o painel final para responder se a saúde geral está melhorando ou piorando."
      ),
      targets: [
        { expr: expr.degradedJobsByType, legendFormat: "Degradados" },
        { expr: `sum(veeam_jobs_total{job_type=~"$job_type"}) or vector(0)`, legendFormat: "Total" }
      ],
      x: 16,
      y: 95,
      w: 8,
      h: 8,
      unit: "short"
    })
  ];

  return makeDashboard({
    title: "Veeam ONE - Operação de Jobs e Repositórios",
    uid: "veeam-one-jobs-sre",
    tags: ["veeam", "jobs", "repositories", "executivo", "operacional"],
    version: 3,
    timeFrom: "now-30d",
    links: [
      link("Panorama de Jobs", "veeam-one-jobs-panorama-geral", "Abrir o dashboard focado na operação de jobs."),
      link("Detalhamento de Jobs", "veeam-one-jobs-detail", "Abrir o dashboard de drill-down operacional dos jobs."),
      link("Repositórios e Capacidade", "veeam-one-repositories-capacity", "Abrir o dashboard focado em capacidade e risco de storage.")
    ],
    variables: mainVariables(),
    panels
  });
}

function jobsPanoramaDashboard() {
  const panels = [
    rowPanel(100, "Gráfico 01 - Visão Geral da Execução do Backup", 0),
    statPanel({
      id: 1,
      title: "Total Geral de Jobs",
      description: description(
        "Quantidade total de jobs de VMware e TAPE monitorados no filtro atual.",
        "Use como linha de base do ambiente de execução que está sendo analisado.",
        "Esse número resume o escopo operacional ativo da visão principal."
      ),
      expr: countJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 0,
      y: 1,
      color: { mode: "fixed", fixedColor: "#475569" }
    }),
    statPanel({
      id: 2,
      title: "Jobs VMware",
      description: description(
        "Quantidade de jobs VMware presentes no recorte atual.",
        "Serve para comparar o peso operacional do ambiente virtual frente aos jobs em fita.",
        "Ajuda a identificar onde está a maior parte da carga de backup."
      ),
      expr: countJobsExpr(jobScopeForType("vm_backup")),
      x: 4,
      y: 1,
      color: { mode: "fixed", fixedColor: "#2563eb" },
      thresholds: [{ color: "#2563eb", value: null }]
    }),
    statPanel({
      id: 3,
      title: "Jobs TAPE",
      description: description(
        "Quantidade de jobs TAPE presentes no recorte atual.",
        "Ajuda a visualizar o peso operacional da camada de fita em relação ao VMware.",
        "É útil para comparar esforço, volume e criticidade entre os dois domínios."
      ),
      expr: countJobsExpr(jobScopeForType("backup_to_tape")),
      x: 8,
      y: 1,
      color: { mode: "fixed", fixedColor: "#f59e0b" },
      thresholds: [{ color: "#f59e0b", value: null }]
    }),
    statPanel({
      id: 4,
      title: "Volume Total Transferido",
      description: description(
        "Soma do volume transferido conhecido pelos jobs de VMware e TAPE no filtro atual.",
        "Mostra a carga total de dados movimentada pela execução observada.",
        "É essencial para interpretar crescimento, pressão de storage e peso da janela."
      ),
      expr: transferredVolumeExpr(OVERVIEW_JOB_SCOPE),
      x: 12,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#0f766e" },
      thresholds: [{ color: "#0f766e", value: null }]
    }),
    statPanel({
      id: 5,
      title: "Volume VMware",
      description: description(
        "Volume transferido conhecido somente pelos jobs VMware.",
        "Permite comparar quanto da movimentação total está concentrada no ambiente virtual.",
        "Ajuda a priorizar análise de capacidade e janela no domínio VMware."
      ),
      expr: transferredVolumeExpr(jobScopeForType("vm_backup")),
      x: 16,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#06b6d4" },
      thresholds: [{ color: "#06b6d4", value: null }]
    }),
    statPanel({
      id: 6,
      title: "Volume TAPE",
      description: description(
        "Volume transferido conhecido somente pelos jobs TAPE.",
        "Permite entender o peso específico da operação em fita.",
        "Ajuda a comparar crescimento e criticidade entre TAPE e VMware."
      ),
      expr: transferredVolumeExpr(jobScopeForType("backup_to_tape")),
      x: 20,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#f97316" },
      thresholds: [{ color: "#f97316", value: null }]
    }),
    statPanel({
      id: 7,
      title: "Sucesso Geral",
      description: description(
        "Quantidade geral de jobs em sucesso dentro do escopo de VMware e TAPE.",
        "Mostra o volume operacional concluído com êxito no estado atual.",
        "É o principal indicador de estabilidade imediata da execução."
      ),
      expr: successJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 0,
      y: 5,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#64748b", value: null },
        { color: "green", value: 1 }
      ]
    }),
    statPanel({
      id: 8,
      title: "Alerta Geral",
      description: description(
        "Quantidade geral de jobs em alerta no estado atual.",
        "Alertas são sinais de degradação que merecem acompanhamento antes de virarem falha.",
        "Permite antecipar ação corretiva com mais tempo de resposta."
      ),
      expr: warningJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 4,
      y: 5,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "orange", value: 1 }
      ]
    }),
    statPanel({
      id: 9,
      title: "Falha Geral",
      description: description(
        "Quantidade geral de jobs com falha no estado atual.",
        "Qualquer valor acima de zero indica necessidade de investigação prioritária.",
        "É o KPI mais direto de risco operacional imediato."
      ),
      expr: failedJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 8,
      y: 5,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "red", value: 1 }
      ]
    }),
    statPanel({
      id: 10,
      title: "Em Execução Geral",
      description: description(
        "Quantidade geral de jobs em execução no momento da coleta.",
        "Ajuda a validar concorrência operacional e peso instantâneo da janela.",
        "Permite correlacionar execução ativa com volume e duração."
      ),
      expr: runningJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 12,
      y: 5,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#64748b", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    statPanel({
      id: 11,
      title: "Idle Geral",
      description: description(
        "Quantidade geral de jobs sem execução ativa ou marcados como idle no estado observado.",
        "Use como indicador de jobs desabilitados, sem execução ou com status não operacional recorrente.",
        "Ajuda a identificar inatividade relevante no parque de backup."
      ),
      expr: idleJobsExpr(OVERVIEW_JOB_SCOPE),
      x: 16,
      y: 5,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#64748b", value: 1 }
      ]
    }),
    statPanel({
      id: 12,
      title: "Taxa de Sucesso (%)",
      description: description(
        "Percentual de sucesso do ambiente considerando apenas VMware e TAPE.",
        "Acima de 95% indica boa estabilidade; abaixo disso a operação merece análise de tendência.",
        "Consolida a saúde da execução em um KPI simples para leitura rápida."
      ),
      expr: successRateExpr(OVERVIEW_JOB_SCOPE),
      x: 20,
      y: 5,
      unit: "percent",
      decimals: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "red", value: null },
        { color: "orange", value: 85 },
        { color: "green", value: 95 }
      ]
    }),
    rowPanel(101, "Distribuição por Status e Tipo", 9),
    barGaugePanel({
      id: 13,
      title: "Status Geral",
      description: description(
        "Resumo geral dos jobs por status operacional no universo de VMware e TAPE.",
        "Ajuda a identificar rapidamente qual estado domina a execução do backup.",
        "É o painel mais direto para responder se o ambiente está saudável agora."
      ),
      targets: [
        { expr: successJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Sucesso" },
        { expr: warningJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Alerta" },
        { expr: failedJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Falha" },
        { expr: runningJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Em execução" },
        { expr: idleJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Idle" }
      ],
      x: 0,
      y: 10,
      w: 8,
      h: 8,
      unit: "short"
    }),
    barGaugePanel({
      id: 14,
      title: "Status VMware",
      description: description(
        "Distribuição dos jobs VMware por status operacional.",
        "Permite avaliar rapidamente se a degradação está concentrada no ambiente virtual.",
        "É útil para priorizar investigação específica em VMware."
      ),
      targets: [
        { expr: successJobsExpr(jobScopeForType("vm_backup")), legendFormat: "Sucesso" },
        { expr: warningJobsExpr(jobScopeForType("vm_backup")), legendFormat: "Alerta" },
        { expr: failedJobsExpr(jobScopeForType("vm_backup")), legendFormat: "Falha" },
        { expr: runningJobsExpr(jobScopeForType("vm_backup")), legendFormat: "Em execução" },
        { expr: idleJobsExpr(jobScopeForType("vm_backup")), legendFormat: "Idle" }
      ],
      x: 8,
      y: 10,
      w: 8,
      h: 8,
      unit: "short"
    }),
    barGaugePanel({
      id: 15,
      title: "Status TAPE",
      description: description(
        "Distribuição dos jobs TAPE por status operacional.",
        "Permite identificar rapidamente se os problemas estão concentrados na camada de fita.",
        "Ajuda a separar a leitura operacional de TAPE da leitura de VMware."
      ),
      targets: [
        { expr: successJobsExpr(jobScopeForType("backup_to_tape")), legendFormat: "Sucesso" },
        { expr: warningJobsExpr(jobScopeForType("backup_to_tape")), legendFormat: "Alerta" },
        { expr: failedJobsExpr(jobScopeForType("backup_to_tape")), legendFormat: "Falha" },
        { expr: runningJobsExpr(jobScopeForType("backup_to_tape")), legendFormat: "Em execução" },
        { expr: idleJobsExpr(jobScopeForType("backup_to_tape")), legendFormat: "Idle" }
      ],
      x: 16,
      y: 10,
      w: 8,
      h: 8,
      unit: "short"
    }),
    rowPanel(102, "Tabelas por Status", 18),
    jobsStatusTable({
      id: 16,
      title: "Jobs com Sucesso",
      descriptionText: "Lista paginada dos jobs VMware e TAPE em sucesso no estado atual.",
      statusExpr: `veeam_job_status{${OVERVIEW_JOB_SCOPE}, status="success"}`,
      x: 0,
      y: 19,
      w: 12,
      h: 10
    }),
    jobsStatusTable({
      id: 17,
      title: "Jobs com Falha",
      descriptionText: "Lista paginada dos jobs VMware e TAPE em falha no estado atual.",
      statusExpr: `veeam_job_status{${OVERVIEW_JOB_SCOPE}, status=~"failed|error"}`,
      x: 12,
      y: 19,
      w: 12,
      h: 10
    }),
    jobsStatusTable({
      id: 18,
      title: "Jobs em Execução",
      descriptionText: "Lista paginada dos jobs VMware e TAPE em execução no momento da coleta.",
      statusExpr: `veeam_job_status{${OVERVIEW_JOB_SCOPE}, status=~"running|working|active"}`,
      x: 0,
      y: 29,
      w: 12,
      h: 10
    }),
    jobsStatusTable({
      id: 19,
      title: "Jobs Idle",
      descriptionText: "Lista paginada dos jobs VMware e TAPE em estado idle, desabilitado ou sem execução observável.",
      statusExpr: `veeam_job_status{${OVERVIEW_JOB_SCOPE}, status=~"disabled|none|unknown"}`,
      x: 12,
      y: 29,
      w: 12,
      h: 10
    }),
    rowPanel(103, "Pontualidade, Taxas e Curvas de Crescimento", 39),
    timeSeriesPanel({
      id: 20,
      title: "Evolução do Estado Operacional",
      description: description(
        "Evolução temporal da quantidade de jobs por estado operacional no universo de VMware e TAPE.",
        "Mudanças rápidas entre scrapes ajudam a perceber instabilidade, degradação ou recuperação do ambiente.",
        "É o gráfico de pontualidade mais útil para acompanhar o comportamento da execução ao longo do tempo."
      ),
      targets: [
        { expr: successJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Sucesso" },
        { expr: warningJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Alerta" },
        { expr: failedJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Falha" },
        { expr: runningJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Em execução" },
        { expr: idleJobsExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Idle" }
      ],
      x: 0,
      y: 40,
      w: 12,
      overrides: [
        seriesColorOverride("Sucesso", "#22c55e"),
        seriesColorOverride("Alerta", "#f59e0b"),
        seriesColorOverride("Falha", "#ef4444"),
        seriesColorOverride("Em execução", "#3b82f6"),
        seriesColorOverride("Idle", "#64748b")
      ]
    }),
    timeSeriesPanel({
      id: 21,
      title: "Taxas de Sucesso e Falha",
      description: description(
        "Curvas percentuais de sucesso e falha do ambiente de VMware e TAPE.",
        "Acompanhe as tendências para detectar perda gradual de qualidade da execução.",
        "Ajuda a transformar leituras pontuais em acompanhamento contínuo de saúde."
      ),
      targets: [
        { expr: successRateExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Taxa de sucesso" },
        { expr: failureRateExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Taxa de falha" }
      ],
      x: 12,
      y: 40,
      w: 12,
      unit: "percent",
      overrides: [
        seriesColorOverride("Taxa de sucesso", "#16a34a"),
        seriesColorOverride("Taxa de falha", "#dc2626")
      ]
    }),
    timeSeriesPanel({
      id: 22,
      title: "Tempo Médio e Pico da Execução",
      description: description(
        "Comparação entre o tempo médio histórico e o pico de duração observado na última execução conhecida.",
        "Se apenas o pico cresce, o problema pode ser pontual; se a média cresce, há degradação mais estrutural.",
        "Ajuda a entender se o ambiente está apenas com outliers ou com lentidão recorrente."
      ),
      targets: [
        { expr: avgDurationHistoryExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Tempo médio" },
        { expr: `max(veeam_job_duration_seconds{${OVERVIEW_JOB_SCOPE}}) or vector(0)`, legendFormat: "Maior duração" }
      ],
      x: 0,
      y: 48,
      w: 12,
      unit: "dtdurations",
      overrides: [
        seriesColorOverride("Tempo médio", "#2563eb"),
        seriesColorOverride("Maior duração", "#a855f7")
      ]
    }),
    timeSeriesPanel({
      id: 23,
      title: "Volume Total e por Tipo",
      description: description(
        "Curvas de crescimento do volume total transferido, com separação entre VMware e TAPE.",
        "Ajuda a visualizar picos, sazonalidade e concentração de dados por tipo de backup.",
        "É o melhor painel para correlacionar crescimento de dados com pressão operacional."
      ),
      targets: [
        { expr: transferredVolumeExpr(OVERVIEW_JOB_SCOPE), legendFormat: "Volume total" },
        { expr: transferredVolumeExpr(jobScopeForType("vm_backup")), legendFormat: "Volume VMware" },
        { expr: transferredVolumeExpr(jobScopeForType("backup_to_tape")), legendFormat: "Volume TAPE" }
      ],
      x: 12,
      y: 48,
      w: 12,
      unit: "decbytes",
      overrides: [
        seriesColorOverride("Volume total", "#0f766e"),
        seriesColorOverride("Volume VMware", "#06b6d4"),
        seriesColorOverride("Volume TAPE", "#f97316")
      ]
    })
  ];

  return makeDashboard({
    title: "04 - Panorama Geral dos Jobs de Backup",
    uid: "veeam-one-jobs-panorama-geral",
    tags: ["veeam", "jobs", "panorama", "operacional"],
    version: 4,
    timeFrom: "now-30d",
    links: [
      link("Visão Integrada", "veeam-one-jobs-sre", "Abrir a visão executiva integrada de jobs e repositórios."),
      link("Detalhamento de Jobs", "veeam-one-jobs-detail", "Abrir o drill-down operacional dos jobs.")
    ],
    variables: jobsPanoramaVariables(),
    panels
  });
}

function jobsDetailDashboard() {
  const panels = [
    rowPanel(100, "Resumo do Filtro", 0),
    statPanel({
      id: 1,
      title: "Jobs no Filtro",
      description: description(
        "Quantidade de jobs encontrados com os filtros atuais, incluindo status quando selecionado.",
        "Use para validar o escopo exato do drill-down antes de interpretar tabelas e gráficos.",
        "Evita conclusões sobre um subconjunto inesperado."
      ),
      expr: `count(veeam_job_status{${JOB_STATUS_SCOPE}}) or vector(0)`,
      x: 0,
      y: 1,
      w: 4,
      color: { mode: "fixed", fixedColor: "#475569" }
    }),
    statPanel({
      id: 2,
      title: "Jobs VMware",
      description: description(
        "Quantidade de jobs VMware dentro do filtro aplicado.",
        "Ajuda a separar rapidamente o peso do ambiente virtual no drill-down.",
        "É útil quando a visão detalhada mistura VMware e TAPE."
      ),
      expr: `count(veeam_job_status{${jobStatusScopeForType("vm_backup")}}) or vector(0)`,
      x: 4,
      y: 1,
      w: 4,
      color: { mode: "fixed", fixedColor: "#2563eb" },
      thresholds: [{ color: "#2563eb", value: null }]
    }),
    statPanel({
      id: 3,
      title: "Jobs TAPE",
      description: description(
        "Quantidade de jobs TAPE dentro do filtro aplicado.",
        "Ajuda a separar rapidamente o peso da camada de fita no drill-down.",
        "É útil quando a visão detalhada mistura VMware e TAPE."
      ),
      expr: `count(veeam_job_status{${jobStatusScopeForType("backup_to_tape")}}) or vector(0)`,
      x: 8,
      y: 1,
      w: 4,
      color: { mode: "fixed", fixedColor: "#f59e0b" },
      thresholds: [{ color: "#f59e0b", value: null }]
    }),
    statPanel({
      id: 4,
      title: "Volume no Filtro",
      description: description(
        "Soma do volume transferido conhecido dentro do recorte atual.",
        "Ajuda a medir o peso operacional do subconjunto analisado.",
        "É útil para comparar jobs críticos entre si."
      ),
      expr: `sum(job_last_transferred_data_bytes{${JOB_STATUS_SCOPE}}) or vector(0)`,
      x: 12,
      y: 1,
      w: 6,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#0f766e" }
    }),
    statPanel({
      id: 5,
      title: "Duração Média",
      description: description(
        "Média da duração da última execução dentro do recorte atual.",
        "Use para avaliar quão pesada está a seleção aplicada em horas ou minutos aproximados.",
        "Ajuda a comparar grupos de jobs e validar impacto operacional."
      ),
      expr: `avg(job_last_run_duration_seconds{${JOB_STATUS_SCOPE}}) or vector(0)`,
      x: 18,
      y: 1,
      w: 6,
      unit: "dtdurations",
      color: { mode: "fixed", fixedColor: "#1d4ed8" }
    }),
    rowPanel(101, "Drill-down Operacional", 5),
    detailedJobsTable({
      id: 6,
      title: "Tabela Detalhada dos Jobs",
      y: 6,
      statusFiltered: true
    }),
    rowPanel(102, "Rankings Operacionais", 18),
    barGaugePanel({
      id: 7,
      title: "VMware: Maiores Durações",
      description: description(
        "Ranking dos jobs VMware com maior duração da última execução no filtro aplicado.",
        "Os itens do topo concentram maior risco de impactar a janela do ambiente virtual.",
        "Ajuda a priorizar a investigação de lentidão em VMware."
      ),
      targets: [{
        expr: `topk(10, job_last_run_duration_seconds{${jobStatusScopeForType("vm_backup")}})`,
        legendFormat: "{{job_name}}"
      }],
      x: 0,
      y: 19,
      w: 6,
      h: 8,
      unit: "dtdurations"
    }),
    barGaugePanel({
      id: 8,
      title: "TAPE: Maiores Durações",
      description: description(
        "Ranking dos jobs TAPE com maior duração da última execução no filtro aplicado.",
        "Os itens do topo sinalizam maior risco de alongar a operação em fita.",
        "Ajuda a priorizar a investigação de lentidão em TAPE."
      ),
      targets: [{
        expr: `topk(10, job_last_run_duration_seconds{${jobStatusScopeForType("backup_to_tape")}})`,
        legendFormat: "{{job_name}}"
      }],
      x: 6,
      y: 19,
      w: 6,
      h: 8,
      unit: "dtdurations"
    }),
    barGaugePanel({
      id: 9,
      title: "VMware: Maiores Volumes",
      description: description(
        "Ranking dos jobs VMware com maior volume transferido conhecido dentro do filtro.",
        "Jobs com mais dados tendem a pressionar rede, storage e janela do ambiente virtual.",
        "Ajuda a diferenciar gargalo de volume de gargalo de performance."
      ),
      targets: [{
        expr: `topk(10, job_last_transferred_data_bytes{${jobStatusScopeForType("vm_backup")}})`,
        legendFormat: "{{job_name}}"
      }],
      x: 12,
      y: 19,
      w: 6,
      h: 8,
      unit: "decbytes"
    }),
    barGaugePanel({
      id: 10,
      title: "TAPE: Maiores Volumes",
      description: description(
        "Ranking dos jobs TAPE com maior volume transferido conhecido dentro do filtro.",
        "Jobs com mais dados tendem a pressionar throughput e janela da camada de fita.",
        "Ajuda a priorizar a investigação de cargas mais pesadas em TAPE."
      ),
      targets: [{
        expr: `topk(10, job_last_transferred_data_bytes{${jobStatusScopeForType("backup_to_tape")}})`,
        legendFormat: "{{job_name}}"
      }],
      x: 18,
      y: 19,
      w: 6,
      h: 8,
      unit: "decbytes"
    }),
    rowPanel(103, "Evolução do Filtro", 27),
    timeSeriesPanel({
      id: 11,
      title: "Volume Transferido por Tipo",
      description: description(
        "Mostra a evolução temporal do volume transferido conhecido, com separação entre total, VMware e TAPE.",
        "Picos indicam maior pressão de dados e ajudam a explicar janelas mais pesadas.",
        "É essencial para diferenciar crescimento geral de crescimento concentrado em um tipo específico."
      ),
      targets: [
        { expr: `sum(job_last_transferred_data_bytes{${JOB_STATUS_SCOPE}})`, legendFormat: "Volume total" },
        { expr: `sum(job_last_transferred_data_bytes{${jobStatusScopeForType("vm_backup")}})`, legendFormat: "Volume VMware" },
        { expr: `sum(job_last_transferred_data_bytes{${jobStatusScopeForType("backup_to_tape")}})`, legendFormat: "Volume TAPE" }
      ],
      x: 0,
      y: 28,
      w: 12,
      unit: "decbytes",
      overrides: [
        seriesColorOverride("Volume total", "#0f766e"),
        seriesColorOverride("Volume VMware", "#06b6d4"),
        seriesColorOverride("Volume TAPE", "#f97316")
      ]
    }),
    timeSeriesPanel({
      id: 12,
      title: "Duração Média e Histórica",
      description: description(
        "Mostra a evolução temporal da duração média da última execução em comparação com a média histórica dos jobs filtrados.",
        "Elevações persistentes sugerem lentidão operacional ou mudança importante no perfil da carga.",
        "Ajuda a validar se o problema está no tempo de processamento e não apenas no volume."
      ),
      targets: [
        { expr: `avg(job_last_run_duration_seconds{${JOB_STATUS_SCOPE}})`, legendFormat: "Última execução" },
        { expr: `avg(veeam_job_avg_duration_seconds{job_type=~"$job_type", job_name=~"$job_name"}) or vector(0)`, legendFormat: "Média histórica" }
      ],
      x: 12,
      y: 28,
      w: 12,
      unit: "dtdurations",
      overrides: [
        seriesColorOverride("Última execução", "#2563eb"),
        seriesColorOverride("Média histórica", "#a855f7")
      ]
    }),
    timeSeriesPanel({
      id: 13,
      title: "Estado Operacional do Filtro",
      description: description(
        "Mostra a evolução temporal dos principais estados operacionais dentro do filtro selecionado.",
        "Mudanças ajudam a perceber se a degradação está concentrada, intermitente ou em expansão.",
        "É útil para entender o comportamento operacional do recorte ao longo da janela."
      ),
      targets: [
        { expr: `sum(success_jobs{job_type=~"$job_type", job_name=~"$job_name"}) or vector(0)`, legendFormat: "Sucesso" },
        { expr: `count(veeam_job_status{${JOB_STATUS_SCOPE}, status="warning"}) or vector(0)`, legendFormat: "Alerta" },
        { expr: `sum(failed_jobs{job_type=~"$job_type", job_name=~"$job_name"}) or vector(0)`, legendFormat: "Falha" },
        { expr: `sum(active_jobs{job_type=~"$job_type", job_name=~"$job_name"}) or vector(0)`, legendFormat: "Em execução" }
      ],
      x: 0,
      y: 36,
      w: 12,
      unit: "short",
      overrides: [
        seriesColorOverride("Sucesso", "#22c55e"),
        seriesColorOverride("Alerta", "#f59e0b"),
        seriesColorOverride("Falha", "#ef4444"),
        seriesColorOverride("Em execução", "#3b82f6")
      ]
    }),
    timeSeriesPanel({
      id: 14,
      title: "Contagem de Jobs por Tipo",
      description: description(
        "Mostra quantos jobs permanecem no filtro em cada instante, com separação entre total, VMware e TAPE.",
        "Mudanças ajudam a perceber se a seleção atual é estável ou se oscila ao longo da janela.",
        "É útil para validar se o problema está concentrado em um tipo de job."
      ),
      targets: [
        { expr: `count(veeam_job_status{${JOB_STATUS_SCOPE}})`, legendFormat: "Total" },
        { expr: `count(veeam_job_status{${jobStatusScopeForType("vm_backup")}})`, legendFormat: "VMware" },
        { expr: `count(veeam_job_status{${jobStatusScopeForType("backup_to_tape")}})`, legendFormat: "TAPE" }
      ],
      x: 12,
      y: 36,
      w: 12,
      unit: "short",
      overrides: [
        seriesColorOverride("Total", "#475569"),
        seriesColorOverride("VMware", "#2563eb"),
        seriesColorOverride("TAPE", "#f59e0b")
      ]
    })
  ];

  return makeDashboard({
    title: "Veeam ONE - Detalhamento Operacional de Jobs",
    uid: "veeam-one-jobs-detail",
    tags: ["veeam", "jobs", "drilldown", "operacional"],
    version: 3,
    timeFrom: "now-30d",
    links: [
      link("Visão Integrada", "veeam-one-jobs-sre", "Voltar para a visão executiva integrada."),
      link("Panorama de Jobs", "veeam-one-jobs-panorama-geral", "Abrir o panorama de jobs.")
    ],
    variables: jobsDetailVariables(),
    panels
  });
}

function repositoriesDashboard() {
  const panels = [
    rowPanel(100, "Resumo de Capacidade", 0),
    statPanel({
      id: 1,
      title: "Capacidade Total",
      description: description(
        "Soma da capacidade total dos repositórios filtrados.",
        "Use como visão global da camada de storage de backup tradicional.",
        "É a base para avaliar expansão, risco e eficiência de uso."
      ),
      expr: expr.repositoryCapacity,
      x: 0,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#7c3aed" }
    }),
    statPanel({
      id: 2,
      title: "Espaço Utilizado",
      description: description(
        "Soma do espaço usado dos repositórios filtrados.",
        "Ajuda a medir o consumo atual da camada de storage.",
        "É essencial para acompanhar crescimento e absorção de novas cópias."
      ),
      expr: expr.repositoryUsed,
      x: 4,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#1d4ed8" }
    }),
    statPanel({
      id: 3,
      title: "Espaço Livre",
      description: description(
        "Soma do espaço livre disponível nos repositórios filtrados.",
        "Quedas rápidas indicam pressão de crescimento ou retenção inadequada.",
        "Ajuda a antecipar risco de interrupção por falta de espaço."
      ),
      expr: expr.repositoryFree,
      x: 8,
      y: 1,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#0f766e" }
    }),
    statPanel({
      id: 4,
      title: "Uso Médio (%)",
      description: description(
        "Média percentual de uso dos repositórios filtrados.",
        "Acima de 70% exige atenção; acima de 85% pede ação rápida.",
        "Resume a pressão geral da camada de armazenamento."
      ),
      expr: expr.repositoryUsageAvg,
      x: 12,
      y: 1,
      unit: "percentunit",
      decimals: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "yellow", value: 0.7 },
        { color: "red", value: 0.85 }
      ]
    }),
    statPanel({
      id: 5,
      title: "Repositórios em Risco",
      description: description(
        "Quantidade de repositórios acima de 85% de utilização.",
        "Qualquer valor acima de zero merece tratamento prioritário.",
        "É o KPI mais direto de risco de capacidade imediato."
      ),
      expr: expr.repositoriesAtRisk,
      x: 16,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "orange", value: 1 },
        { color: "red", value: 3 }
      ]
    }),
    statPanel({
      id: 6,
      title: "SOBRs em Risco",
      description: description(
        "Quantidade de SOBRs acima de 85% de utilização.",
        "Mesmo com poucos itens, esse número merece atenção porque concentra risco em storage scale-out.",
        "Complementa a visão de risco dos repositórios tradicionais."
      ),
      expr: expr.sobrAtRisk,
      x: 20,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "green", value: null },
        { color: "orange", value: 1 },
        { color: "red", value: 2 }
      ]
    }),
    rowPanel(101, "Risco Atual", 5),
    barChartPanel({
      id: 7,
      title: "Ranking de Utilização",
      description: description(
        "Ranking dos repositórios com maior percentual de utilização atual.",
        "Os primeiros itens devem ser tratados antes dos demais.",
        "Facilita a priorização operacional da capacidade."
      ),
      targets: [{
        expr: `topk(15, veeam_repository_usage_ratio{${REPO_SCOPE}} * 100)`,
        legendFormat: "{{repository_name}}"
      }],
      x: 0,
      y: 6,
      w: 12,
      h: 8,
      unit: "percent",
      min: 0,
      max: 100,
      thresholds: [
        { color: "green", value: null },
        { color: "yellow", value: 70 },
        { color: "red", value: 85 }
      ]
    }),
    gaugePanel({
      id: 8,
      title: "Maior Uso de Repositório",
      description: description(
        "Maior percentual de utilização encontrado entre os repositórios filtrados.",
        "Mesmo com média boa, esse indicador evidencia gargalos concentrados.",
        "Ajuda a evitar surpresa operacional em um único ponto crítico."
      ),
      expr: expr.repositoryWorstUsage,
      x: 12,
      y: 6,
      unit: "percentunit",
      decimals: 1
    }),
    gaugePanel({
      id: 9,
      title: "Menor Folga Estimada",
      description: description(
        "Menor estimativa de dias restantes até esgotamento entre os repositórios filtrados.",
        "Quanto menor o valor, maior a urgência da intervenção.",
        "É um indicador prático para priorizar expansão ou revisão de retenção."
      ),
      expr: expr.repositoryMinDaysLeft,
      x: 16,
      y: 6,
      unit: "d",
      min: 0,
      max: 180,
      thresholds: [
        { color: "red", value: null },
        { color: "orange", value: 30 },
        { color: "yellow", value: 60 },
        { color: "green", value: 120 }
      ]
    }),
    gaugePanel({
      id: 10,
      title: "Uso Médio dos SOBRs",
      description: description(
        "Percentual médio de utilização dos SOBRs filtrados pelo backup server.",
        "Acima de 70% exige atenção; acima de 85% tende a representar risco elevado.",
        "Ajuda a acompanhar a saúde do storage scale-out."
      ),
      expr: expr.sobrUsageAvg,
      x: 20,
      y: 6,
      unit: "percentunit",
      decimals: 1
    }),
    rowPanel(102, "Tendências", 14),
    timeSeriesPanel({
      id: 11,
      title: "Uso dos Repositórios ao Longo do Tempo",
      description: description(
        "Evolução do percentual de uso dos repositórios com maior consumo.",
        "Crescimento contínuo sem recuperação indica necessidade de ação preventiva.",
        "Ajuda a distinguir pico momentâneo de tendência estrutural."
      ),
      targets: [{
        expr: `topk(5, veeam_repository_usage_ratio{${REPO_SCOPE}} * 100)`,
        legendFormat: "{{repository_name}}"
      }],
      x: 0,
      y: 15,
      w: 12,
      unit: "percent"
    }),
    timeSeriesPanel({
      id: 12,
      title: "Uso dos SOBRs ao Longo do Tempo",
      description: description(
        "Evolução do percentual de uso dos SOBRs monitorados.",
        "Curvas de crescimento acelerado pedem revisão de tier e planejamento antecipado.",
        "É um painel importante para evitar saturação da camada scale-out."
      ),
      targets: [{
        expr: `veeam_sobr_usage_ratio{${BACKUP_SERVER_SCOPE}} * 100`,
        legendFormat: "{{sobr_name}}"
      }],
      x: 12,
      y: 15,
      w: 12,
      unit: "percent"
    }),
    rowPanel(103, "Detalhamento", 23),
    repositoriesTable({
      id: 13,
      title: "Tabela de Repositórios",
      x: 0,
      y: 24,
      w: 14,
      h: 10
    }),
    sobrExtentsTable({
      id: 14,
      title: "Tabela de SOBRs e Extents",
      x: 14,
      y: 24,
      w: 10,
      h: 10
    }),
    barChartPanel({
      id: 15,
      title: "Estados dos Repositórios",
      description: description(
        "Distribuição atual dos repositórios por estado operacional.",
        "Estados diferentes de disponibilidade saudável pedem análise complementar de infraestrutura.",
        "Ajuda a correlacionar capacidade com disponibilidade."
      ),
      targets: [{
        expr: `count by (state) (veeam_repository_usage_ratio{${REPO_SCOPE}})`,
        legendFormat: "{{state}}"
      }],
      x: 0,
      y: 34,
      w: 12
    }),
    barChartPanel({
      id: 16,
      title: "Distribuição por Tipo de Repositório",
      description: description(
        "Distribuição atual dos repositórios por tipo informado no exporter.",
        "Mostra se o risco está concentrado em um tipo específico de storage.",
        "Facilita a decisão entre expansão local, scale-out ou revisão arquitetural."
      ),
      targets: [{
        expr: `count by (repository_type) (veeam_repository_usage_ratio{${REPO_SCOPE}})`,
        legendFormat: "{{repository_type}}"
      }],
      x: 12,
      y: 34,
      w: 12
    })
  ];

  return makeDashboard({
    title: "Veeam ONE - Repositórios e Capacidade",
    uid: "veeam-one-repositories-capacity",
    tags: ["veeam", "repositories", "capacity", "operacional"],
    version: 2,
    timeFrom: "now-30d",
    links: [
      link("Visão Integrada", "veeam-one-jobs-sre", "Abrir a visão executiva integrada."),
      link("Panorama de Jobs", "veeam-one-jobs-panorama-geral", "Abrir o panorama focado em jobs.")
    ],
    variables: repositoryVariables(),
    panels
  });
}

function jobsStatusTable({ id, title, descriptionText, statusExpr, x, y, w = 12, h = 10 }) {
  const infoExpr = `veeam_job_info{${OVERVIEW_JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`;

  return tablePanel({
    id,
    title,
    description: description(
      descriptionText,
      "Use paginação, filtros de coluna e ordenação para localizar rapidamente os jobs mais relevantes dentro do status exibido.",
      "Essas tabelas separam a leitura operacional por status sem misturar sinais diferentes no mesmo painel."
    ),
    x,
    y,
    w,
    h,
    sortBy: [{
      desc: true,
      displayName: "Última execução"
    }],
    targets: [
      {
        expr: infoExpr
      },
      {
        expr: statusExpr
      },
      {
        expr: `veeam_job_last_run_timestamp_seconds{${OVERVIEW_JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: `veeam_job_duration_seconds{${OVERVIEW_JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: `veeam_job_transferred_bytes{${OVERVIEW_JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "__name__": true,
            app: true,
            environment: true,
            instance: true,
            job: true,
            platform: true
          },
          indexByName: {
            job_name: 0,
            job_type: 1,
            status: 2,
            "Value #C": 3,
            "Value #D": 4,
            "Value #E": 5
          },
          renameByName: {
            job_name: "Job",
            job_type: "Tipo",
            status: "Status",
            "Value #C": "Última execução",
            "Value #D": "Duração",
            "Value #E": "Volume transferido"
          }
        }
      }
    ],
    overrides: [
      typeColumnOverride(),
      statusColumnOverride(),
      dateColumnOverride("Última execução"),
      durationColumnOverride("/^Duração$/"),
      bytesColumnOverride("/^Volume transferido$/")
    ]
  });
}

function criticalJobsTable({ id, title, y }) {
  const statusExpr = `veeam_job_status{${JOB_SCOPE}, status=~"failed|error|warning"}`;
  const filteredInfoExpr = `veeam_job_info{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`;

  return tablePanel({
    id,
    title,
    description: description(
      "Lista dos jobs em falha, erro ou alerta no estado atual.",
      "Ordene e filtre para localizar rapidamente os itens mais críticos por duração, volume ou recência.",
      "Centraliza o ponto de partida para investigação e ação corretiva."
    ),
    x: 0,
    y,
    w: 24,
    h: 10,
    sortBy: [{
      desc: true,
      displayName: "Última execução"
    }],
    targets: [
      {
        expr: filteredInfoExpr
      },
      {
        expr: statusExpr
      },
      {
        expr: `veeam_job_last_run_timestamp_seconds{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: `veeam_job_duration_seconds{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: `veeam_job_transferred_bytes{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "__name__": true,
            app: true,
            environment: true,
            instance: true,
            job: true,
            platform: true
          },
          indexByName: {
            job_name: 0,
            job_type: 1,
            status: 2,
            "Value #C": 3,
            "Value #D": 4,
            "Value #E": 5
          },
          renameByName: {
            job_name: "Job",
            job_type: "Tipo",
            status: "Status",
            "Value #C": "Última execução",
            "Value #D": "Duração",
            "Value #E": "Volume"
          }
        }
      }
    ],
    overrides: [
      typeColumnOverride(),
      statusColumnOverride(),
      dateColumnOverride("Última execução"),
      durationColumnOverride("/^Duração$/"),
      bytesColumnOverride("/^Volume$/")
    ]
  });
}

function detailedJobsTable({ id, title, y, statusFiltered = false }) {
  const scope = statusFiltered ? JOB_STATUS_SCOPE : JOB_SCOPE;
  const statusExpr = `veeam_job_status{${scope}}`;
  const infoExpr = statusFiltered
    ? `veeam_job_info{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
    : `veeam_job_info{${JOB_SCOPE}}`;
  const avgDurationExpr = statusFiltered
    ? `veeam_job_avg_duration_seconds{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
    : `veeam_job_avg_duration_seconds{${JOB_SCOPE}}`;

  return tablePanel({
    id,
    title,
    description: description(
      "Tabela operacional consolidada dos jobs com tipo, status, última execução, duração e volume.",
      "Use paginação, ordenação e filtros de coluna para investigar rapidamente jobs específicos.",
      "É a visão mais rica para apoiar decisão operacional de curto prazo."
    ),
    x: 0,
    y,
    w: 24,
    h: 12,
    sortBy: [{
      desc: true,
      displayName: "Última execução"
    }],
    targets: [
      {
        expr: infoExpr
      },
      {
        expr: statusExpr
      },
      {
        expr: `veeam_job_last_run_timestamp_seconds{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: `veeam_job_duration_seconds{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      },
      {
        expr: avgDurationExpr
      },
      {
        expr: `veeam_job_transferred_bytes{${JOB_SCOPE}} and on(job_name, job_type) (${statusExpr})`
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "__name__": true,
            app: true,
            environment: true,
            instance: true,
            job: true,
            platform: true
          },
          indexByName: {
            job_name: 0,
            job_type: 1,
            status: 2,
            "Value #C": 3,
            "Value #D": 4,
            "Value #E": 5,
            "Value #F": 6
          },
          renameByName: {
            job_name: "Job",
            job_type: "Tipo",
            status: "Status",
            "Value #C": "Última execução",
            "Value #D": "Duração última execução",
            "Value #E": "Duração média histórica",
            "Value #F": "Volume transferido"
          }
        }
      }
    ],
    overrides: [
      typeColumnOverride(),
      statusColumnOverride(),
      dateColumnOverride("Última execução"),
      durationColumnOverride("/^Duração/"),
      bytesColumnOverride("/^Volume transferido$/")
    ]
  });
}

function repositoriesTable({ id, title, x, y, w, h }) {
  return tablePanel({
    id,
    title,
    description: description(
      "Tabela detalhada com capacidade, uso, espaço livre, estado, restore points, backups, VMs e dias restantes por repositório.",
      "Ordene pelo percentual de uso ou pelos dias restantes para localizar o maior risco primeiro.",
      "É a principal base operacional para ação de capacidade."
    ),
    x,
    y,
    w,
    h,
    sortBy: [{
      desc: true,
      displayName: "% Utilização"
    }],
    targets: [
      {
        expr: `veeam_repository_capacity_bytes{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_used_bytes{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_free_bytes{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_usage_ratio{${REPO_SCOPE}} * 100`
      },
      {
        expr: `veeam_repository_days_left_estimate{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_restore_points_total{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_backups_total{${REPO_SCOPE}}`
      },
      {
        expr: `veeam_repository_vms_total{${REPO_SCOPE}}`
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "__name__": true,
            instance: true,
            job: true
          },
          indexByName: {
            repository_name: 0,
            repository_type: 1,
            backup_server: 2,
            state: 3,
            "Value #A": 4,
            "Value #B": 5,
            "Value #C": 6,
            "Value #D": 7,
            "Value #E": 8,
            "Value #F": 9,
            "Value #G": 10,
            "Value #H": 11
          },
          renameByName: {
            repository_name: "Repositório",
            repository_type: "Tipo",
            backup_server: "Backup Server",
            state: "Estado",
            "Value #A": "Capacidade",
            "Value #B": "Usado",
            "Value #C": "Livre",
            "Value #D": "% Utilização",
            "Value #E": "Dias restantes",
            "Value #F": "Restore points",
            "Value #G": "Backups",
            "Value #H": "VMs"
          }
        }
      }
    ],
    overrides: [
      bytesColumnOverride("/^(Capacidade|Usado|Livre)$/"),
      percentageColumnOverride("/^% Utilização$/")
    ]
  });
}

function sobrExtentsTable({ id, title, x, y, w, h }) {
  return tablePanel({
    id,
    title,
    description: description(
      "Tabela com capacidade, uso, espaço livre e percentual por extent dos SOBRs monitorados.",
      "Extents com maior utilização tendem a concentrar gargalo ou necessidade de rebalanceamento.",
      "Ajuda a sair da visão agregada do SOBR e localizar o ponto exato do risco."
    ),
    x,
    y,
    w,
    h,
    sortBy: [{
      desc: true,
      displayName: "% Utilização"
    }],
    targets: [
      {
        expr: `veeam_sobr_extent_capacity_bytes{${BACKUP_SERVER_SCOPE}}`
      },
      {
        expr: `veeam_sobr_extent_used_bytes{${BACKUP_SERVER_SCOPE}}`
      },
      {
        expr: `veeam_sobr_extent_free_bytes{${BACKUP_SERVER_SCOPE}}`
      },
      {
        expr: `veeam_sobr_extent_usage_ratio{${BACKUP_SERVER_SCOPE}} * 100`
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "__name__": true,
            instance: true,
            job: true
          },
          indexByName: {
            sobr_name: 0,
            extent_name: 1,
            extent_type: 2,
            backup_server: 3,
            "Value #A": 4,
            "Value #B": 5,
            "Value #C": 6,
            "Value #D": 7
          },
          renameByName: {
            sobr_name: "SOBR",
            extent_name: "Extent",
            extent_type: "Tipo",
            backup_server: "Backup Server",
            "Value #A": "Capacidade",
            "Value #B": "Usado",
            "Value #C": "Livre",
            "Value #D": "% Utilização"
          }
        }
      }
    ],
    overrides: [
      bytesColumnOverride("/^(Capacidade|Usado|Livre)$/"),
      percentageColumnOverride("/^% Utilização$/")
    ]
  });
}

const dashboards = [
  {
    file: "veeam-one-jobs-sre.json",
    content: overviewDashboard()
  },
  {
    file: "veeam-one-jobs-panorama-geral.json",
    content: jobsPanoramaDashboard()
  },
  {
    file: "veeam-one-jobs-detail.json",
    content: jobsDetailDashboard()
  },
  {
    file: "veeam-one-repositories-capacity.json",
    content: repositoriesDashboard()
  }
];

for (const dashboard of dashboards) {
  fs.writeFileSync(
    path.join(dashboardsDir, dashboard.file),
    `${JSON.stringify(dashboard.content, null, 2)}\n`,
    "utf8"
  );
}

console.log(`Dashboards atualizados em ${dashboardsDir}`);
