import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const dockerGrafanaDir = path.join(rootDir, "docker", "grafana");
const sourceDashboardsDir = path.join(dockerGrafanaDir, "dashboards");
const sreDir = path.join(dockerGrafanaDir, "SRE");
const modelDashboardsDir = path.join(sreDir, "dashboards-modelo-consulta");
const finalDashboardPath = path.join(sreDir, "Panorama Geral dos Jobs de Backup - Ajustes 01.json");
const provisionedDashboardPath = path.join(
  sourceDashboardsDir,
  "Panorama Geral dos Jobs de Backup  - Ajustes 01-1775850127781.json"
);

const DS = {
  type: "prometheus",
  uid: "${DS_PROMETHEUS}"
};

const PRIMARY_TYPES_REGEX = "vm_backup|backup_to_tape";
const PRIMARY_SCOPE = 'job_type=~"$job_type", job_name=~"$job_name"';
const VM_SCOPE = 'job_type="vm_backup", job_name=~"$job_name"';
const TAPE_SCOPE = 'job_type="backup_to_tape", job_name=~"$job_name"';
const ELIGIBLE_VOLUME_STATUS_REGEX = "success|warning|failed|error";
const RUNNING_STATUS_REGEX = "running|working|active";
const FAILED_STATUS_REGEX = "failed|error";
const IDLE_STATUS_REGEX = "disabled|none|unknown";
const STALE_DAYS_MAX_SECONDS = 14 * 86400;
const STALE_WEEKS_MAX_SECONDS = 60 * 86400;
const STALE_MONTHS_MAX_SECONDS = 365 * 86400;

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
    color: "#22c55e",
    text: "Sucesso"
  },
  failed: {
    color: "#ef4444",
    text: "Falha"
  },
  error: {
    color: "#ef4444",
    text: "Falha"
  },
  warning: {
    color: "#f59e0b",
    text: "Alerta"
  },
  running: {
    color: "#22d3ee",
    text: "Em execução"
  },
  working: {
    color: "#22d3ee",
    text: "Em execução"
  },
  active: {
    color: "#22d3ee",
    text: "Em execução"
  },
  disabled: {
    color: "#94a3b8",
    text: "Idle"
  },
  none: {
    color: "#94a3b8",
    text: "Idle"
  },
  unknown: {
    color: "#94a3b8",
    text: "Idle"
  }
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

function queryVariable({ name, label, query, allValue = ".*" }) {
  return {
    allValue,
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
  panelDescription,
  targetExpr,
  x,
  y,
  w = 4,
  h = 4,
  unit = "short",
  color = { mode: "fixed", fixedColor: "#475569" },
  thresholds = [{ color: "green", value: null }],
  decimals
}) {
  return {
    datasource: DS,
    description: panelDescription,
    fieldConfig: {
      defaults: {
        color,
        decimals,
        mappings: ZERO_MAPPINGS,
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

function barGaugePanel({
  id,
  title,
  panelDescription,
  targets,
  x,
  y,
  w = 12,
  h = 8,
  unit = "short",
  min = 0,
  max,
  thresholds = [{ color: "#475569", value: null }]
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
  panelDescription,
  targets,
  x,
  y,
  w = 12,
  h = 8,
  unit = "short",
  stack = false,
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
          fillOpacity: stack ? 24 : 14,
          gradientMode: "opacity",
          hideFrom: {
            legend: false,
            tooltip: false,
            viz: false
          },
          lineInterpolation: "smooth",
          lineWidth: 3,
          pointSize: 4,
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
        thresholds: {
          mode: "absolute",
          steps: [{ color: "green", value: null }]
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
  panelDescription,
  targets,
  transformations,
  overrides,
  x,
  y,
  w = 8,
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
          footer: {
            reducers: ["count"]
          },
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
  const refIds = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

function typeColumnOverride() {
  return {
    matcher: {
      id: "byName",
      options: "Tipo"
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
              color: "#a855f7",
              text: "Tape"
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
        value: 110
      }
    ]
  };
}

function statusColumnOverride() {
  return {
    matcher: {
      id: "byName",
      options: "Status"
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
        value: 140
      }
    ]
  };
}

function jobColumnOverride() {
  return {
    matcher: {
      id: "byName",
      options: "Nome do Job"
    },
    properties: [
      {
        id: "custom.width",
        value: 220
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
      },
      {
        id: "custom.width",
        value: 140
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
      },
      {
        id: "custom.width",
        value: 150
      }
    ]
  };
}

function staleAgeFriendlyMappings() {
  const options = {
    0: {
      color: "#38bdf8",
      text: "< 1 dia"
    },
    4000: {
      color: "#64748b",
      text: "Nunca executado"
    }
  };

  for (let day = 1; day <= 13; day += 1) {
    options[day] = {
      color: "#38bdf8",
      text: day === 1 ? "1 dia" : `${day} dias`
    };
  }

  for (let week = 1; week <= 8; week += 1) {
    options[1000 + week] = {
      color: "#f59e0b",
      text: week === 1 ? "1 semana" : `${week} semanas`
    };
  }

  for (let month = 1; month <= 12; month += 1) {
    options[2000 + month] = {
      color: "#a855f7",
      text: month === 1 ? "1 mês" : `${month} meses`
    };
  }

  for (let year = 1; year <= 100; year += 1) {
    options[3000 + year] = {
      color: "#ef4444",
      text: year === 1 ? "1 ano" : `${year} anos`
    };
  }

  return [{
    type: "value",
    options
  }];
}

function naSpecialMappings(text = "N/A", color = "#94a3b8") {
  return [
    {
      type: "special",
      options: {
        match: "nan",
        result: {
          color,
          text
        }
      }
    },
    {
      type: "special",
      options: {
        match: "null",
        result: {
          color,
          text
        }
      }
    },
    {
      type: "special",
      options: {
        match: "empty",
        result: {
          color,
          text
        }
      }
    }
  ];
}

function staleAgeColumnOverride() {
  return {
    matcher: {
      id: "byName",
      options: "Tempo sem execução"
    },
    properties: [
      {
        id: "mappings",
        value: staleAgeFriendlyMappings()
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

function lastKnownStatusColumnOverride() {
  return {
    matcher: {
      id: "byName",
      options: "Status"
    },
    properties: [
      {
        id: "mappings",
        value: [
          ...naSpecialMappings(),
          {
            type: "value",
            options: STATUS_VALUE_MAPPINGS
          }
        ]
      },
      {
        id: "custom.cellOptions",
        value: {
          type: "color-background"
        }
      },
      {
        id: "custom.width",
        value: 170
      }
    ]
  };
}

function bytesNaColumnOverride(name) {
  return {
    matcher: {
      id: "byName",
      options: name
    },
    properties: [
      {
        id: "mappings",
        value: naSpecialMappings()
      },
      {
        id: "unit",
        value: "decbytes"
      },
      {
        id: "custom.width",
        value: 150
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

function countJobsExpr(scope) {
  return `count(veeam_job_status{${scope}}) or vector(0)`;
}

function countStatusExpr(scope, statusRegex) {
  return `count(veeam_job_status{${scope}, status=~"${statusRegex}"}) or vector(0)`;
}

function executionWithinWindowFilter(scope, windowSecondsExpr) {
  return `veeam_job_last_run_timestamp_seconds{${scope}} > time() - ${windowSecondsExpr}`;
}

function eligibleStatusSeries(scope) {
  return `veeam_job_status{${scope}, status=~"${ELIGIBLE_VOLUME_STATUS_REGEX}"}`;
}

function eligibleVolumeSeries(scope, windowSecondsExpr = "86400") {
  return `veeam_job_transferred_bytes{${scope}} and on(job_name, job_type) (${executionWithinWindowFilter(scope, windowSecondsExpr)}) and on(job_name, job_type) (${eligibleStatusSeries(scope)})`;
}

function eligibleVolumeExpr(scope, windowSecondsExpr = "86400") {
  return `sum(${eligibleVolumeSeries(scope, windowSecondsExpr)}) or vector(0)`;
}

function statusTableExpr(scope, statusRegex, recentOnly = false, respectSelectedStatus = false, windowSecondsExpr = "86400") {
  const baseExpr = `veeam_job_status{${scope}, status=~"${statusRegex}"}`;
  let scopedExpr = recentOnly
    ? `${baseExpr} and on(job_name, job_type) (${executionWithinWindowFilter(scope, windowSecondsExpr)})`
    : baseExpr;

  if (respectSelectedStatus) {
    scopedExpr = `${scopedExpr} and on(job_name, job_type) (veeam_job_status{${scope}, status=~"$status"})`;
  }

  return `max by (job_name, job_type, status) (${scopedExpr})`;
}

function recentDurationExpr(scope, windowSecondsExpr) {
  return `avg(veeam_job_duration_seconds{${scope}} and on(job_name, job_type) (${executionWithinWindowFilter(scope, windowSecondsExpr)})) or vector(0)`;
}

function historicalDurationExpr(scope) {
  return `avg(veeam_job_avg_duration_seconds{${scope}}) or vector(0)`;
}

function maxRecentDurationExpr(scope, windowSecondsExpr) {
  return `max(veeam_job_duration_seconds{${scope}} and on(job_name, job_type) (${executionWithinWindowFilter(scope, windowSecondsExpr)})) or vector(0)`;
}

function topkEligibleVolumeExpr(scope, windowSecondsExpr) {
  return `topk(10, max by (job_name) (${eligibleVolumeSeries(scope, windowSecondsExpr)}))`;
}

function topkRecentDurationExpr(scope, windowSecondsExpr) {
  return `topk(10, max by (job_name) (veeam_job_duration_seconds{${scope}} and on(job_name, job_type) (${executionWithinWindowFilter(scope, windowSecondsExpr)})))`;
}

function failurePersistenceExpr() {
  return `topk(10, sum by (job_name, job_type) (count_over_time(veeam_job_status{${PRIMARY_SCOPE}, status=~"${FAILED_STATUS_REGEX}"}[7d])))`;
}

function staleJobsExpr(scope) {
  return `topk(10, max by (job_name, job_type) (clamp_min(time() - veeam_job_last_run_timestamp_seconds{${scope}}, 0)))`;
}

function staleJobAgeSeries(scope) {
  return `max by (job_name, job_type) (clamp_min(time() - veeam_job_last_run_timestamp_seconds{${scope}}, 0))`;
}

function staleJobsBucketExpr(scope, minSeconds, maxSeconds) {
  const ageSeries = staleJobAgeSeries(scope);
  let expr = `${ageSeries} and on(job_name, job_type) (${staleJobsExpr(scope)})`;

  if (minSeconds != null) {
    expr += ` and on(job_name, job_type) (${ageSeries} >= ${minSeconds})`;
  }

  if (maxSeconds != null) {
    expr += ` and on(job_name, job_type) (${ageSeries} < ${maxSeconds})`;
  }

  return expr;
}

function staleJobsFriendlyCodeExpr(scope, codeBase, divisorSeconds, minSeconds, maxSeconds) {
  return `floor((${staleJobsBucketExpr(scope, minSeconds, maxSeconds)}) / ${divisorSeconds}) + ${codeBase}`;
}

function neverExecutedJobsExpr(scope) {
  return `max by (job_name, job_type) (veeam_job_last_run_timestamp_seconds{${scope}} <= bool 0) and on(job_name, job_type) (${staleJobsExpr(scope)})`;
}

function staleExecutedJobsExpr(scope) {
  return `(${staleJobsExpr(scope)}) and on(job_name, job_type) (veeam_job_last_run_timestamp_seconds{${scope}} > 0)`;
}

function staleJobsLastKnownStatusExpr(scope) {
  return `max by (job_name, job_type, status) (veeam_job_status{${scope}} and on(job_name, job_type) (${staleExecutedJobsExpr(scope)}))`;
}

function staleJobsTransferredVolumeExpr(scope) {
  return `max by (job_name, job_type) (veeam_job_transferred_bytes{${scope}} and on(job_name, job_type) (${staleExecutedJobsExpr(scope)}))`;
}

function staleJobsSortPriorityExpr(scope) {
  return `((0 * ${staleExecutedJobsExpr(scope)}) + 1) or (0 * ${neverExecutedJobsExpr(scope)})`;
}

function staleJobsBreakdownPanel({ id, x, y, w = 12, h = 8 }) {
  return tablePanel({
    id,
    title: "Jobs sem Execução Recente",
    panelDescription: description(
      "Ranking dos jobs com maior tempo desde a última execução observada, exibido em dias, semanas, meses ou anos conforme a faixa do atraso.",
      "A ordenação continua baseada na idade real da última execução, enquanto o painel também expõe o último status conhecido e o volume transferido quando o job já teve execução observada.",
      "Ajuda a localizar rapidamente jobs parados, fora de janela ou sem atividade recente de forma mais legível para a operação."
    ),
    x,
    y,
    w,
    h,
    targets: [
      {
        expr: `(4000 * ${neverExecutedJobsExpr(PRIMARY_SCOPE)})`
      },
      {
        expr: staleJobsFriendlyCodeExpr(PRIMARY_SCOPE, 0, 86400, null, STALE_DAYS_MAX_SECONDS)
      },
      {
        expr: staleJobsFriendlyCodeExpr(PRIMARY_SCOPE, 1000, 604800, STALE_DAYS_MAX_SECONDS, STALE_WEEKS_MAX_SECONDS)
      },
      {
        expr: staleJobsFriendlyCodeExpr(PRIMARY_SCOPE, 2000, 2592000, STALE_WEEKS_MAX_SECONDS, STALE_MONTHS_MAX_SECONDS)
      },
      {
        expr: staleJobsFriendlyCodeExpr(PRIMARY_SCOPE, 3000, 31536000, STALE_MONTHS_MAX_SECONDS, null)
      },
      {
        expr: staleJobsBucketExpr(PRIMARY_SCOPE, null, null)
      },
      {
        expr: staleJobsLastKnownStatusExpr(PRIMARY_SCOPE)
      },
      {
        expr: staleJobsTransferredVolumeExpr(PRIMARY_SCOPE)
      },
      {
        expr: staleJobsSortPriorityExpr(PRIMARY_SCOPE)
      }
    ],
    transformations: [
      {
        id: "merge",
        options: {}
      },
      {
        id: "calculateField",
        options: {
          alias: "Tempo sem execução",
          mode: "reduceRow",
          reduce: {
            include: ["Value #A", "Value #B", "Value #C", "Value #D", "Value #E"],
            reducer: "max"
          }
        }
      },
      {
        id: "calculateField",
        options: {
          alias: "Ordenação bruta",
          mode: "reduceRow",
          reduce: {
            include: ["Value #F"],
            reducer: "max"
          }
        }
      },
      {
        id: "sortBy",
        options: {
          sort: [
            {
              desc: true,
              field: "Value #I"
            },
            {
              desc: true,
              field: "Ordenação bruta"
            }
          ]
        }
      },
      {
        id: "organize",
        options: {
          excludeByName: {
            Time: true,
            Value: true,
            "Value #A": true,
            "Value #B": true,
            "Value #C": true,
            "Value #D": true,
            "Value #E": true,
            "Value #F": true,
            "Value #G": true,
            "Value #I": true,
            "Value #J": true,
            "Ordenação bruta": true,
            "__name__": true,
            app: true,
            environment: true,
            instance: true,
            job: true
          },
          indexByName: {
            job_name: 0,
            job_type: 1,
            "Tempo sem execução": 2,
            status: 3,
            "Value #H": 4
          },
          renameByName: {
            job_name: "Nome do Job",
            job_type: "Tipo",
            "Tempo sem execução": "Tempo sem execução",
            status: "Status",
            "Value #H": "Volume transferido"
          }
        }
      }
    ],
    overrides: [
      jobColumnOverride(),
      typeColumnOverride(),
      staleAgeColumnOverride(),
      lastKnownStatusColumnOverride(),
      bytesNaColumnOverride("Volume transferido")
    ]
  });
}

function operationalTable({
  id,
  title,
  panelDescription,
  statusExpr,
  x,
  y,
  w = 8,
  h = 10,
  sortBy
}) {
  return tablePanel({
    id,
    title,
    panelDescription,
    x,
    y,
    w,
    h,
    sortBy,
    targets: [
      {
        expr: `max by (job_name, job_type, platform) (veeam_job_info{${PRIMARY_SCOPE}} and on(job_name, job_type) (${statusExpr}))`
      },
      {
        expr: statusExpr
      },
      {
        expr: `max by (job_name, job_type) ((veeam_job_last_run_timestamp_seconds{${PRIMARY_SCOPE}} * 1000) and on(job_name, job_type) (${statusExpr}))`
      },
      {
        expr: `max by (job_name, job_type) (veeam_job_duration_seconds{${PRIMARY_SCOPE}} and on(job_name, job_type) (${statusExpr}))`
      },
      {
        expr: `max by (job_name, job_type) (veeam_job_transferred_bytes{${PRIMARY_SCOPE}} and on(job_name, job_type) (${statusExpr}))`
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
            "Value #A": true,
            "Value #B": true,
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
            job_name: "Nome do Job",
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
      jobColumnOverride(),
      typeColumnOverride(),
      statusColumnOverride(),
      dateColumnOverride("Última execução"),
      durationColumnOverride("/^Duração$/"),
      bytesColumnOverride("/^Volume transferido$/")
    ]
  });
}

function dashboard() {
  const successExpr = statusTableExpr(PRIMARY_SCOPE, "success", false, true);
  const warningExpr = statusTableExpr(PRIMARY_SCOPE, "warning", false, true);
  const failedExpr = statusTableExpr(PRIMARY_SCOPE, FAILED_STATUS_REGEX, false, true);
  const runningExpr = statusTableExpr(PRIMARY_SCOPE, RUNNING_STATUS_REGEX, false, true);
  const idleExpr = statusTableExpr(PRIMARY_SCOPE, IDLE_STATUS_REGEX, false, true);
  const volume24hExpr = statusTableExpr(PRIMARY_SCOPE, ELIGIBLE_VOLUME_STATUS_REGEX, true, true);
  const selectedRangeWindowExpr = "$__range_s";

  const panels = [
    rowPanel(100, "Visão operacional imediata", 0),
    statPanel({
      id: 1,
      title: "Total de Jobs",
      panelDescription: description(
        "Quantidade total de jobs VMware e Tape visíveis no filtro atual.",
        "Use como base do universo operacional coberto pela análise.",
        "Ajuda a contextualizar todos os demais KPIs da visão."
      ),
      targetExpr: countJobsExpr(PRIMARY_SCOPE),
      x: 0,
      y: 1,
      color: { mode: "fixed", fixedColor: "#475569" }
    }),
    statPanel({
      id: 2,
      title: "Sucesso Geral",
      panelDescription: description(
        "Quantidade de jobs atualmente em sucesso.",
        "Valores altos em relação ao total indicam boa estabilidade operacional.",
        "É o principal KPI de saúde imediata do backup."
      ),
      targetExpr: countStatusExpr(PRIMARY_SCOPE, "success"),
      x: 4,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#22c55e", value: 1 }
      ]
    }),
    statPanel({
      id: 3,
      title: "Alerta Geral",
      panelDescription: description(
        "Quantidade de jobs com warning no estado atual.",
        "Warnings representam degradação e merecem análise antes de virarem falha.",
        "Ajuda a antecipar ação corretiva."
      ),
      targetExpr: countStatusExpr(PRIMARY_SCOPE, "warning"),
      x: 8,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#22c55e", value: null },
        { color: "#f59e0b", value: 1 }
      ]
    }),
    statPanel({
      id: 4,
      title: "Falha Geral",
      panelDescription: description(
        "Quantidade de jobs em falha ou erro no estado atual.",
        "Qualquer valor acima de zero indica risco operacional imediato.",
        "É o KPI mais direto para priorização de troubleshooting."
      ),
      targetExpr: countStatusExpr(PRIMARY_SCOPE, FAILED_STATUS_REGEX),
      x: 12,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#22c55e", value: null },
        { color: "#ef4444", value: 1 }
      ]
    }),
    statPanel({
      id: 5,
      title: "Em Execução Geral",
      panelDescription: description(
        "Quantidade de jobs em execução no momento da coleta.",
        "Use para validar pressão operacional e concorrência ativa da janela.",
        "Ajuda a correlacionar atividade, volume e duração."
      ),
      targetExpr: countStatusExpr(PRIMARY_SCOPE, RUNNING_STATUS_REGEX),
      x: 16,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    statPanel({
      id: 6,
      title: "Idle Geral",
      panelDescription: description(
        "Quantidade de jobs em idle, disabled, none ou unknown.",
        "Valores altos podem indicar ociosidade, jobs desabilitados ou ausência de execução recente.",
        "Ajuda a localizar lacunas operacionais no parque de backup."
      ),
      targetExpr: countStatusExpr(PRIMARY_SCOPE, IDLE_STATUS_REGEX),
      x: 20,
      y: 1,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#cbd5e1", value: null },
        { color: "#64748b", value: 1 }
      ]
    }),
    statPanel({
      id: 7,
      title: "Volume Total Transferido (24h)",
      panelDescription: description(
        "Soma do volume transferido pelos jobs com execução nas últimas 24 horas e status Success, Warning ou Failed.",
        "Idle e jobs sem execução recente ficam fora do cálculo por definição.",
        "Entrega a volumetria operacional realmente relevante para o último dia."
      ),
      targetExpr: eligibleVolumeExpr(PRIMARY_SCOPE),
      x: 0,
      y: 5,
      w: 8,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#0f766e" },
      thresholds: [{ color: "#0f766e", value: null }]
    }),
    statPanel({
      id: 8,
      title: "Volume VMware (24h)",
      panelDescription: description(
        "Volume transferido pelos jobs VMware elegíveis nas últimas 24 horas.",
        "Considere este card para entender o peso do ambiente virtual na janela recente.",
        "Ajuda a separar pressão operacional de VMware da camada Tape."
      ),
      targetExpr: eligibleVolumeExpr(VM_SCOPE),
      x: 8,
      y: 5,
      w: 8,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#2563eb" },
      thresholds: [{ color: "#2563eb", value: null }]
    }),
    statPanel({
      id: 9,
      title: "Volume Tape (24h)",
      panelDescription: description(
        "Volume transferido pelos jobs Tape elegíveis nas últimas 24 horas.",
        "Serve para medir o peso recente da operação em fita sem misturar jobs idle ou antigos.",
        "Ajuda a comparar distribuição de carga entre as duas tecnologias."
      ),
      targetExpr: eligibleVolumeExpr(TAPE_SCOPE),
      x: 16,
      y: 5,
      w: 8,
      unit: "decbytes",
      color: { mode: "fixed", fixedColor: "#a855f7" },
      thresholds: [{ color: "#a855f7", value: null }]
    }),
    statPanel({
      id: 10,
      title: "VMware: Sucesso",
      panelDescription: description(
        "Quantidade de jobs VMware em sucesso.",
        "Use para avaliar rapidamente a saúde do ambiente virtual.",
        "Ajuda a identificar se a estabilidade está concentrada em VMware."
      ),
      targetExpr: countStatusExpr(VM_SCOPE, "success"),
      x: 0,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#22c55e", value: 1 }
      ]
    }),
    statPanel({
      id: 11,
      title: "VMware: Falha",
      panelDescription: description(
        "Quantidade de jobs VMware em falha ou erro.",
        "Qualquer valor acima de zero merece análise imediata.",
        "Separa o risco específico do ambiente virtual."
      ),
      targetExpr: countStatusExpr(VM_SCOPE, FAILED_STATUS_REGEX),
      x: 3,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#22c55e", value: null },
        { color: "#ef4444", value: 1 }
      ]
    }),
    statPanel({
      id: 12,
      title: "VMware: Em Execução",
      panelDescription: description(
        "Quantidade de jobs VMware em execução.",
        "Mostra a concorrência atual da camada virtual.",
        "Ajuda a validar pressão de janela em VMware."
      ),
      targetExpr: countStatusExpr(VM_SCOPE, RUNNING_STATUS_REGEX),
      x: 6,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    statPanel({
      id: 13,
      title: "VMware: Idle",
      panelDescription: description(
        "Quantidade de jobs VMware em idle, disabled, none ou unknown.",
        "Ajuda a localizar ociosidade ou falta de execução observável no ambiente virtual.",
        "É útil para detectar jobs sem atividade operacional."
      ),
      targetExpr: countStatusExpr(VM_SCOPE, IDLE_STATUS_REGEX),
      x: 9,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#cbd5e1", value: null },
        { color: "#64748b", value: 1 }
      ]
    }),
    statPanel({
      id: 14,
      title: "Tape: Sucesso",
      panelDescription: description(
        "Quantidade de jobs Tape em sucesso.",
        "Use para avaliar a saúde imediata da camada de fita.",
        "Ajuda a comparar estabilidade entre Tape e VMware."
      ),
      targetExpr: countStatusExpr(TAPE_SCOPE, "success"),
      x: 12,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#22c55e", value: 1 }
      ]
    }),
    statPanel({
      id: 15,
      title: "Tape: Falha",
      panelDescription: description(
        "Quantidade de jobs Tape em falha ou erro.",
        "Qualquer valor acima de zero indica risco direto na operação em fita.",
        "Facilita a priorização por tecnologia."
      ),
      targetExpr: countStatusExpr(TAPE_SCOPE, FAILED_STATUS_REGEX),
      x: 15,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#22c55e", value: null },
        { color: "#ef4444", value: 1 }
      ]
    }),
    statPanel({
      id: 16,
      title: "Tape: Em Execução",
      panelDescription: description(
        "Quantidade de jobs Tape em execução.",
        "Ajuda a medir a atividade ativa da camada de fita.",
        "Permite comparar concorrência operacional entre as tecnologias."
      ),
      targetExpr: countStatusExpr(TAPE_SCOPE, RUNNING_STATUS_REGEX),
      x: 18,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#94a3b8", value: null },
        { color: "#3b82f6", value: 1 }
      ]
    }),
    statPanel({
      id: 17,
      title: "Tape: Idle",
      panelDescription: description(
        "Quantidade de jobs Tape em idle, disabled, none ou unknown.",
        "Ajuda a identificar fita ociosa, desabilitada ou sem execução recente observável.",
        "Complementa a visão operacional segregada por tecnologia."
      ),
      targetExpr: countStatusExpr(TAPE_SCOPE, IDLE_STATUS_REGEX),
      x: 21,
      y: 9,
      w: 3,
      color: { mode: "thresholds" },
      thresholds: [
        { color: "#cbd5e1", value: null },
        { color: "#64748b", value: 1 }
      ]
    }),
    rowPanel(101, "Diagnóstico operacional por status de job", 13),
    operationalTable({
      id: 18,
      title: "Jobs com Sucesso",
      panelDescription: description(
        "Tabela consolidada dos jobs em sucesso, com uma linha por job.",
        "Ordene por última execução ou filtre por nome para localizar rapidamente o item desejado.",
        "Facilita a confirmação do que terminou saudável no recorte operacional."
      ),
      statusExpr: successExpr,
      x: 0,
      y: 14,
      sortBy: [{
        desc: true,
        displayName: "Última execução"
      }]
    }),
    operationalTable({
      id: 19,
      title: "Jobs com Alerta",
      panelDescription: description(
        "Tabela consolidada dos jobs em warning, sem duplicidade de job.",
        "Use para localizar jobs degradados que ainda não chegaram a falha.",
        "Ajuda a agir de forma preventiva."
      ),
      statusExpr: warningExpr,
      x: 8,
      y: 14,
      sortBy: [{
        desc: true,
        displayName: "Última execução"
      }]
    }),
    operationalTable({
      id: 20,
      title: "Jobs com Falha",
      panelDescription: description(
        "Tabela consolidada dos jobs em falha ou erro, com uma linha por job.",
        "Priorize os itens mais recentes e com maior volume ou duração.",
        "É a tabela principal para resposta operacional imediata."
      ),
      statusExpr: failedExpr,
      x: 16,
      y: 14,
      sortBy: [{
        desc: true,
        displayName: "Última execução"
      }]
    }),
    operationalTable({
      id: 21,
      title: "Jobs em Execução",
      panelDescription: description(
        "Tabela dos jobs que estão em execução agora, sem repetir o mesmo job.",
        "Use para acompanhar a janela ativa e correlacionar jobs concorrentes.",
        "Ajuda a entender pressão operacional em tempo real."
      ),
      statusExpr: runningExpr,
      x: 0,
      y: 24,
      sortBy: [{
        desc: true,
        displayName: "Última execução"
      }]
    }),
    operationalTable({
      id: 22,
      title: "Jobs Idle",
      panelDescription: description(
        "Tabela dos jobs em idle, disabled, none ou unknown, com linha única por job.",
        "Use para identificar gaps operacionais, jobs desabilitados ou sem execução observável.",
        "Ajuda a diferenciar ausência de atividade de sucesso real."
      ),
      statusExpr: idleExpr,
      x: 8,
      y: 24,
      sortBy: [{
        desc: true,
        displayName: "Última execução"
      }]
    }),
    operationalTable({
      id: 23,
      title: "Top Jobs por Volumetria (24h)",
      panelDescription: description(
        "Ranking tabular dos jobs com maior volume transferido nas últimas 24 horas, restrito a Success, Warning e Failed.",
        "Use para localizar rapidamente quem concentrou a maior movimentação de dados no último dia.",
        "É a tabela de apoio para análise de peso operacional e impacto de janela."
      ),
      statusExpr: volume24hExpr,
      x: 16,
      y: 24,
      sortBy: [{
        desc: true,
        displayName: "Volume transferido"
      }]
    }),
    rowPanel(102, "Pontualidade, curvas e anomalias operacionais", 34),
    timeSeriesPanel({
      id: 24,
      title: "Evolução do Estado Operacional",
      panelDescription: description(
        "Curvas temporais da contagem de jobs por status operacional.",
        "Mudanças persistentes no mix de sucesso, alerta, falha, execução e idle mostram degradação ou recuperação do ambiente.",
        "É o melhor painel para leitura de tendência do estado atual."
      ),
      targets: [
        { expr: countStatusExpr(PRIMARY_SCOPE, "success"), legendFormat: "Sucesso" },
        { expr: countStatusExpr(PRIMARY_SCOPE, "warning"), legendFormat: "Alerta" },
        { expr: countStatusExpr(PRIMARY_SCOPE, FAILED_STATUS_REGEX), legendFormat: "Falha" },
        { expr: countStatusExpr(PRIMARY_SCOPE, RUNNING_STATUS_REGEX), legendFormat: "Em execução" },
        { expr: countStatusExpr(PRIMARY_SCOPE, IDLE_STATUS_REGEX), legendFormat: "Idle" }
      ],
      x: 0,
      y: 35,
      stack: true,
      overrides: [
        seriesColorOverride("Sucesso", "#22c55e"),
        seriesColorOverride("Alerta", "#f59e0b"),
        seriesColorOverride("Falha", "#ef4444"),
        seriesColorOverride("Em execução", "#3b82f6"),
        seriesColorOverride("Idle", "#64748b")
      ]
    }),
    staleJobsBreakdownPanel({
      id: 25,
      x: 12,
      y: 35
    }),
    timeSeriesPanel({
      id: 26,
      title: "Duração Média no Período Selecionado x Média Histórica",
      panelDescription: description(
        "Comparação entre a duração média dos jobs que executaram dentro do período selecionado no Grafana e a média histórica reportada pelo exporter.",
        "Se a curva do período selecionado se afasta da histórica, há sinal de lentidão, mudança de perfil ou anomalia operacional.",
        "Ajuda a detectar degradação considerando exatamente o time range escolhido no browser."
      ),
      targets: [
        { expr: recentDurationExpr(PRIMARY_SCOPE, selectedRangeWindowExpr), legendFormat: "Média no período selecionado" },
        { expr: historicalDurationExpr(PRIMARY_SCOPE), legendFormat: "Média histórica" },
        { expr: maxRecentDurationExpr(PRIMARY_SCOPE, selectedRangeWindowExpr), legendFormat: "Maior duração no período" }
      ],
      x: 0,
      y: 43,
      unit: "dtdurations",
      overrides: [
        seriesColorOverride("Média no período selecionado", "#2563eb"),
        seriesColorOverride("Média histórica", "#a855f7"),
        seriesColorOverride("Maior duração no período", "#f97316")
      ]
    }),
    timeSeriesPanel({
      id: 27,
      title: "Volume Elegível no Período Selecionado",
      panelDescription: description(
        "Curvas da volumetria elegível para o período selecionado no Grafana, com separação entre total, VMware e Tape.",
        "O painel considera apenas jobs com última execução dentro do time range selecionado e status Success, Warning ou Failed.",
        "Ajuda a acompanhar a pressão de dados por tecnologia sem forçar janela fixa."
      ),
      targets: [
        { expr: eligibleVolumeExpr(PRIMARY_SCOPE, selectedRangeWindowExpr), legendFormat: "Volume total" },
        { expr: eligibleVolumeExpr(VM_SCOPE, selectedRangeWindowExpr), legendFormat: "Volume VMware" },
        { expr: eligibleVolumeExpr(TAPE_SCOPE, selectedRangeWindowExpr), legendFormat: "Volume Tape" }
      ],
      x: 12,
      y: 43,
      unit: "decbytes",
      overrides: [
        seriesColorOverride("Volume total", "#0f766e"),
        seriesColorOverride("Volume VMware", "#2563eb"),
        seriesColorOverride("Volume Tape", "#a855f7")
      ]
    }),
    rowPanel(103, "Rankings operacionais por tecnologia", 51),
    barGaugePanel({
      id: 28,
      title: "VMware: Maiores Volumes (Filtro global)",
      panelDescription: description(
        "Ranking dos jobs VMware com maior volume transferido dentro do período selecionado no Grafana.",
        "Use para localizar rapidamente quem concentrou mais dados no time range atual.",
        "Ajuda a priorizar investigação de throughput, storage e janela em VMware com base no filtro global."
      ),
      targets: [{
        expr: topkEligibleVolumeExpr(VM_SCOPE, selectedRangeWindowExpr),
        legendFormat: "{{job_name}}"
      }],
      x: 0,
      y: 52,
      w: 6,
      unit: "decbytes",
      thresholds: [{ color: "#2563eb", value: null }]
    }),
    barGaugePanel({
      id: 29,
      title: "VMware: Maiores Durações (Filtro global)",
      panelDescription: description(
        "Ranking dos jobs VMware com maior duração dentro do período selecionado no Grafana.",
        "Os primeiros itens do ranking tendem a concentrar maior risco de alongar a janela virtual no time range atual.",
        "É o painel de lentidão prioritária para VMware baseado no filtro global."
      ),
      targets: [{
        expr: topkRecentDurationExpr(VM_SCOPE, selectedRangeWindowExpr),
        legendFormat: "{{job_name}}"
      }],
      x: 6,
      y: 52,
      w: 6,
      unit: "dtdurations",
      thresholds: [{ color: "#2563eb", value: null }]
    }),
    barGaugePanel({
      id: 30,
      title: "Tape: Maiores Volumes (Filtro global)",
      panelDescription: description(
        "Ranking dos jobs Tape com maior volume transferido dentro do período selecionado no Grafana.",
        "Mostra quais cargas estão pressionando mais a camada de fita no time range atual.",
        "Ajuda a direcionar análise de throughput e retenção em Tape com base no filtro global."
      ),
      targets: [{
        expr: topkEligibleVolumeExpr(TAPE_SCOPE, selectedRangeWindowExpr),
        legendFormat: "{{job_name}}"
      }],
      x: 12,
      y: 52,
      w: 6,
      unit: "decbytes",
      thresholds: [{ color: "#a855f7", value: null }]
    }),
    barGaugePanel({
      id: 31,
      title: "Tape: Maiores Durações (Filtro global)",
      panelDescription: description(
        "Ranking dos jobs Tape com maior duração dentro do período selecionado no Grafana.",
        "Os itens do topo tendem a concentrar maior impacto sobre a operação em fita no time range atual.",
        "É o painel de lentidão prioritária para Tape baseado no filtro global."
      ),
      targets: [{
        expr: topkRecentDurationExpr(TAPE_SCOPE, selectedRangeWindowExpr),
        legendFormat: "{{job_name}}"
      }],
      x: 18,
      y: 52,
      w: 6,
      unit: "dtdurations",
      thresholds: [{ color: "#a855f7", value: null }]
    }),
    barGaugePanel({
      id: 32,
      title: "VMware: Maiores Volumes (24h fixas)",
      panelDescription: description(
        "Ranking dos jobs VMware com maior volume transferido considerando sempre as últimas 24 horas.",
        "Esse painel ignora o time range global e mantém a análise fixa de um dia.",
        "Ajuda a comparar rapidamente a carga operacional mais recente do ambiente virtual."
      ),
      targets: [{
        expr: topkEligibleVolumeExpr(VM_SCOPE, "86400"),
        legendFormat: "{{job_name}}"
      }],
      x: 0,
      y: 60,
      w: 6,
      unit: "decbytes",
      thresholds: [{ color: "#60a5fa", value: null }]
    }),
    barGaugePanel({
      id: 33,
      title: "VMware: Maiores Durações (24h fixas)",
      panelDescription: description(
        "Ranking dos jobs VMware com maior duração considerando sempre as últimas 24 horas.",
        "Esse painel ignora o time range global e mantém foco apenas na janela fixa recente.",
        "Ajuda a identificar rapidamente os jobs virtuais mais longos do último dia."
      ),
      targets: [{
        expr: topkRecentDurationExpr(VM_SCOPE, "86400"),
        legendFormat: "{{job_name}}"
      }],
      x: 6,
      y: 60,
      w: 6,
      unit: "dtdurations",
      thresholds: [{ color: "#60a5fa", value: null }]
    }),
    barGaugePanel({
      id: 34,
      title: "Tape: Maiores Volumes (24h fixas)",
      panelDescription: description(
        "Ranking dos jobs Tape com maior volume transferido considerando sempre as últimas 24 horas.",
        "Esse painel ignora o time range global e mantém a análise fixa de um dia.",
        "Ajuda a comparar rapidamente a carga operacional mais recente da camada de fita."
      ),
      targets: [{
        expr: topkEligibleVolumeExpr(TAPE_SCOPE, "86400"),
        legendFormat: "{{job_name}}"
      }],
      x: 12,
      y: 60,
      w: 6,
      unit: "decbytes",
      thresholds: [{ color: "#c084fc", value: null }]
    }),
    barGaugePanel({
      id: 35,
      title: "Tape: Maiores Durações (24h fixas)",
      panelDescription: description(
        "Ranking dos jobs Tape com maior duração considerando sempre as últimas 24 horas.",
        "Esse painel ignora o time range global e mantém foco apenas na janela fixa recente.",
        "Ajuda a identificar rapidamente os jobs em fita mais longos do último dia."
      ),
      targets: [{
        expr: topkRecentDurationExpr(TAPE_SCOPE, "86400"),
        legendFormat: "{{job_name}}"
      }],
      x: 18,
      y: 60,
      w: 6,
      unit: "dtdurations",
      thresholds: [{ color: "#c084fc", value: null }]
    }),
    rowPanel(104, "Painéis a serem trabalhados", 68),
    barGaugePanel({
      id: 36,
      title: "Jobs com Recorrência/Persistência de Falha (7d)",
      panelDescription: description(
        "Ranking dos jobs com maior quantidade de amostras em falha nos últimos 7 dias.",
        "Leia como um proxy operacional de recorrência ou persistência em falha baseado nas coletas do Prometheus, não como número exato de execuções falhas.",
        "O painel foi mantido como referência para revisão futura nesta linha de trabalho."
      ),
      targets: [{
        expr: failurePersistenceExpr(),
        legendFormat: "{{job_name}} ({{job_type}})"
      }],
      x: 0,
      y: 69,
      w: 24,
      unit: "short",
      thresholds: [{ color: "#ef4444", value: null }]
    })
  ];

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
    links: [
      link("Visão Integrada", "veeam-one-jobs-sre", "Abrir a visão integrada de jobs e repositórios."),
      link("Detalhamento de Jobs", "veeam-one-jobs-detail", "Abrir o drill-down operacional de jobs."),
      link("Panorama Base", "veeam-one-jobs-panorama-geral", "Abrir o panorama base usado como referência.")
    ],
    liveNow: false,
    panels,
    refresh: "30s",
    schemaVersion: 42,
    tags: ["veeam", "jobs", "panorama", "sre", "ajustes-01"],
    templating: {
      list: [
        datasourceVariable(),
        queryVariable({
          name: "job_type",
          label: "Tipo de job",
          query: `label_values(veeam_job_info{job_type=~"${PRIMARY_TYPES_REGEX}"}, job_type)`,
          allValue: PRIMARY_TYPES_REGEX
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
      ]
    },
    time: {
      from: "now-7d",
      to: "now"
    },
    timepicker: {},
    timezone: "browser",
    title: "Panorama Geral dos Jobs de Backup - Ajustes 01",
    uid: "advmjkc",
    version: 20,
    weekStart: ""
  };
}

function ensureStructure() {
  fs.mkdirSync(modelDashboardsDir, { recursive: true });
}

function copyCurrentDashboards() {
  for (const entry of fs.readdirSync(sourceDashboardsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const sourcePath = path.join(sourceDashboardsDir, entry.name);
    const targetPath = path.join(modelDashboardsDir, entry.name);

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeFinalDashboard() {
  const content = `${JSON.stringify(dashboard(), null, 2)}\n`;
  fs.writeFileSync(finalDashboardPath, content, "utf8");
  fs.writeFileSync(provisionedDashboardPath, content, "utf8");
}

ensureStructure();
copyCurrentDashboards();
writeFinalDashboard();

console.log(`Dashboards-modelo copiados para ${modelDashboardsDir}`);
console.log(`Dashboard final gerado em ${finalDashboardPath}`);
