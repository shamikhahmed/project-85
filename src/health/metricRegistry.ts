import type { MetricCapability } from './types';

/**
 * Capability registry — documentation-driven.
 * Access date for Google Health types/scopes: 2026-10-28 (docs last-updated Oct 2026).
 * Apple HealthKit: native-only; PWA cannot read HealthKit store.
 */
export const METRIC_REGISTRY: MetricCapability[] = [
  {
    id: 'steps',
    label: 'Steps',
    category: 'activity',
    unit: 'count',
    nature: 'measured',
    typicalCadence: 'continuous / daily rollup',
    notes: 'Never sum overlapping provider day totals.',
    providers: [
      {
        provider: 'manual',
        support: 'supported',
        permissionNote: 'User enters REPLACE-total for the day',
      },
      {
        provider: 'apple_health',
        support: 'requires_native',
        permissionNote: 'HKQuantityTypeIdentifierStepCount',
      },
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'steps · activity_and_fitness.readonly',
      },
      {
        provider: 'zepp_via_apple',
        support: 'via_hub',
        permissionNote: 'If Zepp writes steps into Apple Health',
      },
    ],
  },
  {
    id: 'distance',
    label: 'Distance',
    category: 'activity',
    unit: 'm',
    nature: 'derived',
    typicalCadence: 'continuous',
    notes: 'Device-derived from steps/GPS.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'DistanceWalkingRunning' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'distance' },
      { provider: 'zepp_via_apple', support: 'via_hub', permissionNote: 'Via Apple Health' },
      { provider: 'manual', support: 'unsupported', permissionNote: 'Not in Quick Log today' },
    ],
  },
  {
    id: 'active_energy',
    label: 'Active energy',
    category: 'energy',
    unit: 'kcal',
    nature: 'derived',
    typicalCadence: 'continuous',
    notes: 'Do not add to total-calories from another provider.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'ActiveEnergyBurned' },
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'active-energy-burned',
      },
      { provider: 'project85_estimate', support: 'supported', permissionNote: 'TDEE estimate only' },
    ],
  },
  {
    id: 'basal_energy',
    label: 'Basal / resting energy',
    category: 'energy',
    unit: 'kcal',
    nature: 'derived',
    typicalCadence: 'daily',
    notes: 'BasalCaloriesBurned / resting energy — keep distinct from active.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'BasalEnergyBurned' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'basal-metabolic-rate' },
    ],
  },
  {
    id: 'total_energy',
    label: 'Total energy',
    category: 'energy',
    unit: 'kcal',
    nature: 'derived',
    typicalCadence: 'daily rollup',
    notes: 'Keep distinct from PROJECT 85 TDEE estimate.',
    providers: [
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'total-calories' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'Basal + Active if both authorised' },
      { provider: 'project85_estimate', support: 'supported', permissionNote: 'Estimated TDEE' },
    ],
  },
  {
    id: 'resting_heart_rate',
    label: 'Resting heart rate',
    category: 'heart',
    unit: 'bpm',
    nature: 'derived',
    typicalCadence: 'daily',
    notes: 'Device-derived; not a clinical ECG.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'RestingHeartRate' },
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'daily-resting-heart-rate',
      },
      { provider: 'zepp_via_apple', support: 'via_hub', permissionNote: 'If shared to AH' },
      { provider: 'manual', support: 'unsupported', permissionNote: 'No manual RHR field yet' },
    ],
  },
  {
    id: 'hrv',
    label: 'Heart-rate variability',
    category: 'heart',
    unit: 'ms',
    nature: 'derived',
    typicalCadence: 'overnight / sample',
    notes: 'Preserve source measurement type; HRV alone ≠ readiness or biological age.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'HeartRateVariabilitySDNN' },
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'heart-rate-variability / daily-heart-rate-variability',
      },
      {
        provider: 'zepp_via_apple',
        support: 'partial',
        permissionNote: 'Only if Zepp writes HRV into AH — not guaranteed',
      },
    ],
  },
  {
    id: 'sleep_asleep',
    label: 'Time asleep',
    category: 'sleep',
    unit: 'min',
    nature: 'derived',
    typicalCadence: 'nightly session',
    notes: 'Distinguish time in bed vs asleep when both exist.',
    providers: [
      { provider: 'manual', support: 'supported', permissionNote: 'bedtime/wake log' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'SleepAnalysis' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'sleep' },
      { provider: 'zepp_via_apple', support: 'via_hub', permissionNote: 'Stages if written to AH' },
    ],
  },
  {
    id: 'sleep_in_bed',
    label: 'Time in bed',
    category: 'sleep',
    unit: 'min',
    nature: 'derived',
    typicalCadence: 'nightly session',
    notes: 'In-bed window — not the same as asleep minutes.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'SleepAnalysis inBed' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'sleep session' },
    ],
  },
  {
    id: 'workout',
    label: 'Workouts',
    category: 'activity',
    unit: 'min',
    nature: 'measured',
    typicalCadence: 'per session',
    notes: 'Imported workout sessions; duration in minutes.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'HKWorkout' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'ExerciseSession' },
    ],
  },
  {
    id: 'vo2_max',
    label: 'VO₂ max',
    category: 'fitness',
    unit: 'mL/kg·min',
    nature: 'estimated',
    typicalCadence: 'periodic',
    notes: 'Cardio fitness estimate — not a lab VO₂ test.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'VO2Max' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'vo2-max / daily-vo2-max' },
      { provider: 'zepp_via_apple', support: 'partial', permissionNote: 'If device + AH share' },
    ],
  },
  {
    id: 'spo2',
    label: 'Oxygen saturation',
    category: 'respiratory',
    unit: '%',
    nature: 'measured',
    typicalCadence: 'spot / overnight',
    notes: 'Not a medical SpO₂ claim.',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'OxygenSaturation' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'oxygen-saturation' },
      { provider: 'zepp_via_apple', support: 'via_hub', permissionNote: 'Common Zepp → AH path' },
    ],
  },
  {
    id: 'respiratory_rate',
    label: 'Respiratory rate',
    category: 'respiratory',
    unit: 'breaths/min',
    nature: 'derived',
    typicalCadence: 'sleep',
    notes: '',
    providers: [
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'RespiratoryRate' },
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'daily-respiratory-rate',
      },
    ],
  },
  {
    id: 'skin_temperature',
    label: 'Skin / sleep temperature',
    category: 'temperature',
    unit: '°C',
    nature: 'derived',
    typicalCadence: 'nightly',
    notes: 'Hardware-dependent; do not invent.',
    providers: [
      {
        provider: 'google_health',
        support: 'requires_oauth',
        permissionNote: 'daily-sleep-temperature-derivations / skin-temperature-sensors',
      },
      {
        provider: 'apple_health',
        support: 'partial',
        permissionNote: 'Apple Watch wrist temp when available',
      },
      {
        provider: 'zepp_via_apple',
        support: 'unsupported',
        permissionNote: 'Do not promise Zepp temperature via AH without verification',
      },
    ],
  },
  {
    id: 'weight',
    label: 'Body weight',
    category: 'body',
    unit: 'kg',
    nature: 'measured',
    typicalCadence: 'daily manual / scale',
    notes: 'Primary morning weigh-ins in PROJECT 85 weights table.',
    providers: [
      { provider: 'manual', support: 'supported', permissionNote: 'Local WeightEntry' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'BodyMass' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'weight' },
    ],
  },
  {
    id: 'body_fat',
    label: 'Body fat %',
    category: 'body',
    unit: '%',
    nature: 'estimated',
    typicalCadence: 'occasional',
    notes: 'Navy formula estimate labelled separately from device/scale BF%.',
    providers: [
      { provider: 'project85_estimate', support: 'supported', permissionNote: 'Navy circumference' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'body-fat' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'BodyFatPercentage' },
    ],
  },
  {
    id: 'hydration',
    label: 'Hydration',
    category: 'nutrition',
    unit: 'ml',
    nature: 'measured',
    typicalCadence: 'manual / imported',
    notes: 'Never invent water from steps/HR.',
    providers: [
      { provider: 'manual', support: 'supported', permissionNote: 'WaterEntry' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'hydration-log' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'DietaryWater' },
    ],
  },
  {
    id: 'nutrition_import',
    label: 'Imported nutrition',
    category: 'nutrition',
    unit: 'kcal',
    nature: 'estimated',
    typicalCadence: 'meal log',
    notes: 'Never fabricate; optional import only.',
    providers: [
      { provider: 'manual', support: 'supported', permissionNote: 'FoodEntry local' },
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'nutrition-log / food' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'Dietary* types' },
    ],
  },
  {
    id: 'ecg',
    label: 'ECG',
    category: 'clinical',
    unit: 'session',
    nature: 'measured',
    typicalCadence: 'on demand',
    notes: 'Sensitive; Restricted Google scope; native Apple only when authorised.',
    providers: [
      { provider: 'google_health', support: 'requires_oauth', permissionNote: 'ecg.readonly' },
      { provider: 'apple_health', support: 'requires_native', permissionNote: 'Electrocardiogram' },
    ],
  },
];

export function metricById(id: string): MetricCapability | undefined {
  return METRIC_REGISTRY.find((m) => m.id === id);
}

export function metricsByCategory(category: MetricCapability['category']): MetricCapability[] {
  return METRIC_REGISTRY.filter((m) => m.category === category);
}
