/**
 * Canonical provider-independent health records.
 * Original values are never overwritten by derived metrics.
 */

export type HealthProvider =
  | 'manual'
  | 'apple_health'
  | 'google_health'
  | 'zepp_via_apple'
  | 'project85_estimate'
  | 'unknown';

export type HealthRecordKind = 'manual' | 'imported' | 'calculated' | 'estimated';

export type HealthSyncStatus =
  | 'never'
  | 'ok'
  | 'stale'
  | 'error'
  | 'permission_needed'
  | 'unsupported'
  | 'blocked_credentials';

export type MetricAvailability =
  | 'available'
  | 'waiting'
  | 'permission_needed'
  | 'stale'
  | 'unsupported'
  | 'estimated'
  | 'unavailable';

export type HealthMetricCategory =
  | 'activity'
  | 'heart'
  | 'sleep'
  | 'respiratory'
  | 'temperature'
  | 'fitness'
  | 'energy'
  | 'body'
  | 'clinical'
  | 'nutrition';

export interface HealthMetricRecord {
  id: string;
  metricId: string;
  category: HealthMetricCategory;
  /** Normalized SI-ish value for app math */
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
  startAt: string;
  endAt: string | null;
  timeZone: string | null;
  ingestedAt: string;
  provider: HealthProvider;
  deviceName: string | null;
  sourceApp: string | null;
  sourceRecordId: string | null;
  kind: HealthRecordKind;
  quality: 'high' | 'medium' | 'low' | 'unknown';
  provenanceJson?: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthConnectionState {
  id: string;
  provider: HealthProvider;
  displayName: string;
  status: HealthSyncStatus;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  scopesGranted: string[];
  notes: string;
  updatedAt: string;
}

export interface MetricCapability {
  id: string;
  label: string;
  category: HealthMetricCategory;
  unit: string;
  /** Whether values are typically measured, derived by the device, or estimated by us */
  nature: 'measured' | 'derived' | 'estimated';
  providers: {
    provider: HealthProvider;
    support: 'supported' | 'partial' | 'via_hub' | 'unsupported' | 'requires_native' | 'requires_oauth';
    permissionNote: string;
  }[];
  typicalCadence: string;
  notes: string;
}
