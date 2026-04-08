import { Gauge, Registry } from "prom-client";

const REPOSITORY_LABELS = ["repository_name", "repository_type", "backup_server", "state"] as const;
const SOBR_LABELS = ["sobr_name", "backup_server", "performance_tier", "capacity_tier", "archive_tier"] as const;
const SOBR_EXTENT_LABELS = ["sobr_name", "extent_name", "extent_type", "backup_server"] as const;

type RawItem = Record<string, unknown>;

interface RepositoriesExporterConfig {
  continueOnEndpointError: boolean;
}

interface RepositoriesMetricsService {
  listAllRepositories(): Promise<RawItem[]>;
}

interface ScaleoutRepositoriesMetricsService {
  listAllScaleoutRepositories(): Promise<RawItem[]>;
}

export class RepositoriesExporter {
  private readonly registry = new Registry();
  private readonly repositoryCapacity = new Gauge({
    name: "veeam_repository_capacity_bytes",
    help: "Capacidade total do repositorio Veeam ONE em bytes, quando disponivel no payload original.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryUsed = new Gauge({
    name: "veeam_repository_used_bytes",
    help: "Espaco usado do repositorio Veeam ONE em bytes, quando disponivel ou derivavel de capacity/free.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryFree = new Gauge({
    name: "veeam_repository_free_bytes",
    help: "Espaco livre do repositorio Veeam ONE em bytes, quando disponivel ou derivavel de capacity/used.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryUsageRatio = new Gauge({
    name: "veeam_repository_usage_ratio",
    help: "Razao de uso do repositorio Veeam ONE entre 0 e 1, derivada de used/capacity quando possivel.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryRestorePoints = new Gauge({
    name: "veeam_repository_restore_points_total",
    help: "Total de restore points do repositorio Veeam ONE, quando disponivel no payload original.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryBackups = new Gauge({
    name: "veeam_repository_backups_total",
    help: "Total de backups do repositorio Veeam ONE, quando disponivel no payload original.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryVms = new Gauge({
    name: "veeam_repository_vms_total",
    help: "Total de VMs do repositorio Veeam ONE, quando disponivel no payload original.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly repositoryDaysLeft = new Gauge({
    name: "veeam_repository_days_left_estimate",
    help: "Estimativa de dias restantes do repositorio Veeam ONE, somente quando disponivel no payload original.",
    labelNames: REPOSITORY_LABELS,
    registers: [this.registry]
  });
  private readonly sobrCapacity = new Gauge({
    name: "veeam_sobr_capacity_bytes",
    help: "Capacidade total do Scale-Out Repository em bytes, quando disponivel no payload original.",
    labelNames: SOBR_LABELS,
    registers: [this.registry]
  });
  private readonly sobrUsed = new Gauge({
    name: "veeam_sobr_used_bytes",
    help: "Espaco usado do Scale-Out Repository em bytes, quando disponivel ou derivavel de capacity/free.",
    labelNames: SOBR_LABELS,
    registers: [this.registry]
  });
  private readonly sobrFree = new Gauge({
    name: "veeam_sobr_free_bytes",
    help: "Espaco livre do Scale-Out Repository em bytes, quando disponivel ou derivavel de capacity/used.",
    labelNames: SOBR_LABELS,
    registers: [this.registry]
  });
  private readonly sobrUsageRatio = new Gauge({
    name: "veeam_sobr_usage_ratio",
    help: "Razao de uso do Scale-Out Repository entre 0 e 1, derivada de used/capacity quando possivel.",
    labelNames: SOBR_LABELS,
    registers: [this.registry]
  });
  private readonly sobrExtents = new Gauge({
    name: "veeam_sobr_extents_total",
    help: "Total de extents do Scale-Out Repository, quando disponivel no payload original.",
    labelNames: SOBR_LABELS,
    registers: [this.registry]
  });
  private readonly sobrExtentCapacity = new Gauge({
    name: "veeam_sobr_extent_capacity_bytes",
    help: "Capacidade do extent do Scale-Out Repository em bytes, quando disponivel no payload original.",
    labelNames: SOBR_EXTENT_LABELS,
    registers: [this.registry]
  });
  private readonly sobrExtentUsed = new Gauge({
    name: "veeam_sobr_extent_used_bytes",
    help: "Espaco usado do extent do Scale-Out Repository em bytes, quando disponivel ou derivavel de capacity/free.",
    labelNames: SOBR_EXTENT_LABELS,
    registers: [this.registry]
  });
  private readonly sobrExtentFree = new Gauge({
    name: "veeam_sobr_extent_free_bytes",
    help: "Espaco livre do extent do Scale-Out Repository em bytes, quando disponivel ou derivavel de capacity/used.",
    labelNames: SOBR_EXTENT_LABELS,
    registers: [this.registry]
  });
  private readonly sobrExtentUsageRatio = new Gauge({
    name: "veeam_sobr_extent_usage_ratio",
    help: "Razao de uso do extent do Scale-Out Repository entre 0 e 1, derivada de used/capacity quando possivel.",
    labelNames: SOBR_EXTENT_LABELS,
    registers: [this.registry]
  });

  constructor(
    private readonly repositoriesService: RepositoriesMetricsService,
    private readonly scaleoutRepositoriesService: ScaleoutRepositoriesMetricsService,
    private readonly config: RepositoriesExporterConfig = { continueOnEndpointError: true }
  ) {}

  get contentType(): string {
    return this.registry.contentType;
  }

  async collect(): Promise<string> {
    const [repositories, scaleoutRepositories] = await Promise.all([
      this.collectRepositories(),
      this.collectScaleoutRepositories()
    ]);

    this.update(repositories, scaleoutRepositories);
    return this.registry.metrics();
  }

  private async collectRepositories(): Promise<RawItem[]> {
    try {
      return await this.repositoriesService.listAllRepositories();
    } catch (error) {
      if (!this.config.continueOnEndpointError) {
        throw error;
      }

      warn("Falha ao coletar repositorios para metricas; seguindo com os demais exporters.", error);
      return [];
    }
  }

  private async collectScaleoutRepositories(): Promise<RawItem[]> {
    try {
      return await this.scaleoutRepositoriesService.listAllScaleoutRepositories();
    } catch (error) {
      if (!this.config.continueOnEndpointError) {
        throw error;
      }

      warn("Falha ao coletar Scale-Out Repositories para metricas; seguindo com os demais exporters.", error);
      return [];
    }
  }

  private update(repositories: RawItem[], scaleoutRepositories: RawItem[]): void {
    this.reset();

    for (const repository of repositories) {
      this.updateRepository(repository);
    }

    for (const scaleoutRepository of scaleoutRepositories) {
      this.updateScaleoutRepository(scaleoutRepository);
    }
  }

  private updateRepository(repository: RawItem): void {
    const labels = repositoryLabelsFor(repository);
    const capacity = capacityFor(repository);
    const used = usedFor(repository, capacity);
    const free = freeFor(repository, capacity, used);

    setIfNumber(this.repositoryCapacity, labels, capacity);
    setIfNumber(this.repositoryUsed, labels, used);
    setIfNumber(this.repositoryFree, labels, free);
    setIfNumber(this.repositoryUsageRatio, labels, usageRatioFor(repository, capacity, used));
    setIfNumber(this.repositoryRestorePoints, labels, readFirstNumber(repository, [
      "restorePointsTotal",
      "restorePointsCount",
      "restorePoints"
    ]));
    setIfNumber(this.repositoryBackups, labels, readFirstNumber(repository, [
      "backupsTotal",
      "backupsCount",
      "backups"
    ]));
    setIfNumber(this.repositoryVms, labels, readFirstNumber(repository, [
      "vmsTotal",
      "vmsCount",
      "vms",
      "vmCount"
    ]));
    setIfNumber(this.repositoryDaysLeft, labels, readFirstNumber(repository, [
      "daysLeftEstimate",
      "daysLeft",
      "outOfSpaceInDays"
    ]));
  }

  private updateScaleoutRepository(scaleoutRepository: RawItem): void {
    const labels = scaleoutLabelsFor(scaleoutRepository);
    const capacity = capacityFor(scaleoutRepository);
    const used = usedFor(scaleoutRepository, capacity);
    const free = freeFor(scaleoutRepository, capacity, used);
    const extents = extentsFor(scaleoutRepository);

    setIfNumber(this.sobrCapacity, labels, capacity);
    setIfNumber(this.sobrUsed, labels, used);
    setIfNumber(this.sobrFree, labels, free);
    setIfNumber(this.sobrUsageRatio, labels, usageRatioFor(scaleoutRepository, capacity, used));
    setIfNumber(this.sobrExtents, labels, readFirstNumber(scaleoutRepository, [
      "extentsTotal",
      "extentsCount"
    ]) ?? extents?.length);

    if (!extents) {
      return;
    }

    for (const extent of extents) {
      const extentLabels = scaleoutExtentLabelsFor(scaleoutRepository, extent);
      const extentCapacity = capacityFor(extent);
      const extentUsed = usedFor(extent, extentCapacity);
      const extentFree = freeFor(extent, extentCapacity, extentUsed);

      setIfNumber(this.sobrExtentCapacity, extentLabels, extentCapacity);
      setIfNumber(this.sobrExtentUsed, extentLabels, extentUsed);
      setIfNumber(this.sobrExtentFree, extentLabels, extentFree);
      setIfNumber(this.sobrExtentUsageRatio, extentLabels, usageRatioFor(extent, extentCapacity, extentUsed));
    }
  }

  private reset(): void {
    this.repositoryCapacity.reset();
    this.repositoryUsed.reset();
    this.repositoryFree.reset();
    this.repositoryUsageRatio.reset();
    this.repositoryRestorePoints.reset();
    this.repositoryBackups.reset();
    this.repositoryVms.reset();
    this.repositoryDaysLeft.reset();
    this.sobrCapacity.reset();
    this.sobrUsed.reset();
    this.sobrFree.reset();
    this.sobrUsageRatio.reset();
    this.sobrExtents.reset();
    this.sobrExtentCapacity.reset();
    this.sobrExtentUsed.reset();
    this.sobrExtentFree.reset();
    this.sobrExtentUsageRatio.reset();
  }
}

function repositoryLabelsFor(repository: RawItem): Record<(typeof REPOSITORY_LABELS)[number], string> {
  return {
    repository_name: labelFrom(repository, ["name", "repositoryName"]),
    repository_type: labelFrom(repository, ["repositoryType", "type"]),
    backup_server: labelFrom(repository, ["backupServerName", "backupServer", "backupServerId"]),
    state: labelFrom(repository, ["state", "status"])
  };
}

function scaleoutLabelsFor(repository: RawItem): Record<(typeof SOBR_LABELS)[number], string> {
  return {
    sobr_name: labelFrom(repository, ["name", "scaleoutRepositoryName", "scaleOutRepositoryName"]),
    backup_server: labelFrom(repository, ["backupServerName", "backupServer", "backupServerId"]),
    performance_tier: labelFrom(repository, ["performanceTier", "performanceTierName", "policyType"]),
    capacity_tier: labelFrom(repository, ["capacityTier", "capacityTierName", "capacityTierState"]),
    archive_tier: labelFrom(repository, ["archiveTier", "archiveTierName", "archiveTierState"])
  };
}

function scaleoutExtentLabelsFor(repository: RawItem, extent: RawItem): Record<(typeof SOBR_EXTENT_LABELS)[number], string> {
  return {
    sobr_name: labelFrom(repository, ["name", "scaleoutRepositoryName", "scaleOutRepositoryName"]),
    extent_name: labelFrom(extent, ["name", "repositoryName", "extentName"]),
    extent_type: labelFrom(extent, ["repositoryType", "type", "extentType"]),
    backup_server: labelFrom(extent, ["backupServerName", "backupServer", "backupServerId"], labelFrom(repository, [
      "backupServerName",
      "backupServer",
      "backupServerId"
    ]))
  };
}

function capacityFor(item: RawItem): number | undefined {
  return readFirstNumber(item, [
    "capacityBytes",
    "totalCapacityBytes",
    "repositoryCapacityBytes",
    "totalSpaceBytes",
    "totalBytes",
    "capacity"
  ]);
}

function usedFor(item: RawItem, capacity: number | undefined): number | undefined {
  const used = readFirstNumber(item, [
    "usedBytes",
    "usedSpaceBytes",
    "usedDataBytes",
    "repositoryUsedBytes",
    "usedSpace"
  ]);

  if (used !== undefined) {
    return used;
  }

  const free = freeFor(item, capacity, undefined);
  return capacity !== undefined && free !== undefined ? Math.max(capacity - free, 0) : undefined;
}

function freeFor(item: RawItem, capacity: number | undefined, used: number | undefined): number | undefined {
  const free = readFirstNumber(item, [
    "freeBytes",
    "freeSpaceBytes",
    "availableBytes",
    "repositoryFreeBytes",
    "freeSpace"
  ]);

  if (free !== undefined) {
    return free;
  }

  return capacity !== undefined && used !== undefined ? Math.max(capacity - used, 0) : undefined;
}

function usageRatioFor(item: RawItem, capacity: number | undefined, used: number | undefined): number | undefined {
  const directRatio = readFirstNumber(item, [
    "usageRatio",
    "usedRatio",
    "usage"
  ]);

  if (directRatio !== undefined) {
    return normalizeRatio(directRatio);
  }

  const usagePercent = readFirstNumber(item, [
    "usagePercent",
    "usedPercent",
    "usedSpacePercent"
  ]);

  if (usagePercent !== undefined) {
    return normalizeRatio(usagePercent);
  }

  if (capacity === undefined || used === undefined || capacity <= 0) {
    return undefined;
  }

  return used / capacity;
}

function normalizeRatio(value: number): number {
  return value > 1 ? value / 100 : value;
}

function extentsFor(item: RawItem): RawItem[] | undefined {
  const extents = readFirstArray(item, [
    "extents",
    "performanceExtents",
    "repositories"
  ]);

  return extents?.filter(isRawItem);
}

function labelFrom(item: RawItem, keys: string[], fallback = "unknown"): string {
  for (const key of keys) {
    const value = item[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return fallback;
}

function readFirstNumber(item: RawItem, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = item[key];
    const parsed = numberFrom(value);

    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
}

function readFirstArray(item: RawItem, keys: string[]): unknown[] | undefined {
  for (const key of keys) {
    const value = item[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return undefined;
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function setIfNumber<T extends string>(gauge: Gauge<T>, labels: Record<T, string>, value: number | undefined): void {
  if (value !== undefined) {
    gauge.set(labels, value);
  }
}

function isRawItem(item: unknown): item is RawItem {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function warn(message: string, error: unknown): void {
  console.warn(JSON.stringify({
    level: "warn",
    message,
    error: error instanceof Error ? error.message : "Erro desconhecido"
  }));
}
