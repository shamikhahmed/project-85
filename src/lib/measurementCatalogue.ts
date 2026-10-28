import type { BodyMeasurementType, BodyView, MeasurementCondition } from '../domain/types';

export interface MeasurementDef {
  type: BodyMeasurementType;
  label: string;
  shortLabel: string;
  region: string;
  views: BodyView[];
  /** Instructional tape placement — not medical advice */
  howToMeasure: string;
  minCm: number;
  maxCm: number;
  /** Display decimals when unit is cm */
  precisionCm: number;
  optional?: boolean;
}

export const MEASUREMENT_CATALOGUE: MeasurementDef[] = [
  {
    type: 'height',
    label: 'Height',
    shortLabel: 'Height',
    region: 'stature',
    views: ['front', 'side'],
    howToMeasure: 'Stand barefoot against a wall. Mark the crown and measure floor to mark.',
    minCm: 120,
    maxCm: 250,
    precisionCm: 1,
  },
  {
    type: 'neck',
    label: 'Neck',
    shortLabel: 'Neck',
    region: 'neck',
    views: ['front', 'side'],
    howToMeasure: 'Tape just below the larynx, level, snug but not tight.',
    minCm: 25,
    maxCm: 60,
    precisionCm: 1,
  },
  {
    type: 'shoulders',
    label: 'Shoulders',
    shortLabel: 'Shoulders',
    region: 'shoulders',
    views: ['front', 'back'],
    howToMeasure: 'Across the widest point of the deltoids, arms relaxed at sides.',
    minCm: 70,
    maxCm: 160,
    precisionCm: 1,
  },
  {
    type: 'chest',
    label: 'Chest',
    shortLabel: 'Chest',
    region: 'chest',
    views: ['front', 'side'],
    howToMeasure: 'Around the fullest part of the chest, tape level, after a normal exhale.',
    minCm: 60,
    maxCm: 160,
    precisionCm: 1,
  },
  {
    type: 'upper_chest',
    label: 'Upper chest',
    shortLabel: 'Upper chest',
    region: 'chest',
    views: ['front'],
    howToMeasure: 'Higher on the pectorals, just under the clavicles.',
    minCm: 60,
    maxCm: 160,
    precisionCm: 1,
    optional: true,
  },
  {
    type: 'waist_natural',
    label: 'Natural waist',
    shortLabel: 'Waist',
    region: 'waist',
    views: ['front', 'side'],
    howToMeasure: 'Narrowest point of the torso, usually above the navel. Level tape, relaxed.',
    minCm: 50,
    maxCm: 180,
    precisionCm: 1,
  },
  {
    type: 'waist_navel',
    label: 'Navel waist',
    shortLabel: 'Navel',
    region: 'waist',
    views: ['front', 'side'],
    howToMeasure: 'Horizontal tape at navel level — keep the same landmark every session.',
    minCm: 50,
    maxCm: 180,
    precisionCm: 1,
  },
  {
    type: 'abdomen',
    label: 'Abdomen',
    shortLabel: 'Abdomen',
    region: 'abdomen',
    views: ['front', 'side'],
    howToMeasure: 'Around the largest abdominal circumference, typically below the navel.',
    minCm: 50,
    maxCm: 180,
    precisionCm: 1,
  },
  {
    type: 'hips',
    label: 'Hips',
    shortLabel: 'Hips',
    region: 'hips',
    views: ['front', 'side', 'back'],
    howToMeasure: 'Around the fullest part of the glutes/hips, feet together.',
    minCm: 60,
    maxCm: 180,
    precisionCm: 1,
  },
  {
    type: 'bicep_left_relaxed',
    label: 'Left bicep (relaxed)',
    shortLabel: 'L bi relax',
    region: 'arm_left',
    views: ['front', 'side'],
    howToMeasure: 'Mid-upper arm, arm hanging relaxed. Do not merge with flexed.',
    minCm: 15,
    maxCm: 60,
    precisionCm: 1,
  },
  {
    type: 'bicep_left_flexed',
    label: 'Left bicep (flexed)',
    shortLabel: 'L bi flex',
    region: 'arm_left',
    views: ['front', 'side'],
    howToMeasure: 'Peak of flexed biceps, fist clenched — separate from relaxed.',
    minCm: 15,
    maxCm: 65,
    precisionCm: 1,
  },
  {
    type: 'bicep_right_relaxed',
    label: 'Right bicep (relaxed)',
    shortLabel: 'R bi relax',
    region: 'arm_right',
    views: ['front', 'side'],
    howToMeasure: 'Mid-upper arm, arm hanging relaxed. Separate from left.',
    minCm: 15,
    maxCm: 60,
    precisionCm: 1,
  },
  {
    type: 'bicep_right_flexed',
    label: 'Right bicep (flexed)',
    shortLabel: 'R bi flex',
    region: 'arm_right',
    views: ['front', 'side'],
    howToMeasure: 'Peak of flexed biceps — never combine with relaxed or left side.',
    minCm: 15,
    maxCm: 65,
    precisionCm: 1,
  },
  {
    type: 'forearm_left',
    label: 'Left forearm',
    shortLabel: 'L forearm',
    region: 'arm_left',
    views: ['front'],
    howToMeasure: 'Largest circumference of the forearm, fist lightly closed.',
    minCm: 15,
    maxCm: 45,
    precisionCm: 1,
  },
  {
    type: 'forearm_right',
    label: 'Right forearm',
    shortLabel: 'R forearm',
    region: 'arm_right',
    views: ['front'],
    howToMeasure: 'Largest circumference of the forearm — separate left/right.',
    minCm: 15,
    maxCm: 45,
    precisionCm: 1,
  },
  {
    type: 'wrist_left',
    label: 'Left wrist',
    shortLabel: 'L wrist',
    region: 'arm_left',
    views: ['front'],
    howToMeasure: 'Just distal to the styloid processes, snug.',
    minCm: 10,
    maxCm: 30,
    precisionCm: 1,
  },
  {
    type: 'wrist_right',
    label: 'Right wrist',
    shortLabel: 'R wrist',
    region: 'arm_right',
    views: ['front'],
    howToMeasure: 'Just distal to the styloid processes — separate left/right.',
    minCm: 10,
    maxCm: 30,
    precisionCm: 1,
  },
  {
    type: 'thigh_left',
    label: 'Left thigh',
    shortLabel: 'L thigh',
    region: 'leg_left',
    views: ['front', 'side'],
    howToMeasure: 'Mid-thigh, halfway between hip crease and knee, weight evenly shared.',
    minCm: 30,
    maxCm: 100,
    precisionCm: 1,
  },
  {
    type: 'thigh_right',
    label: 'Right thigh',
    shortLabel: 'R thigh',
    region: 'leg_right',
    views: ['front', 'side'],
    howToMeasure: 'Mid-thigh — never average left and right into one field.',
    minCm: 30,
    maxCm: 100,
    precisionCm: 1,
  },
  {
    type: 'calf_left',
    label: 'Left calf',
    shortLabel: 'L calf',
    region: 'leg_left',
    views: ['side', 'back'],
    howToMeasure: 'Largest calf circumference, standing relaxed.',
    minCm: 20,
    maxCm: 60,
    precisionCm: 1,
  },
  {
    type: 'calf_right',
    label: 'Right calf',
    shortLabel: 'R calf',
    region: 'leg_right',
    views: ['side', 'back'],
    howToMeasure: 'Largest calf circumference — separate from left.',
    minCm: 20,
    maxCm: 60,
    precisionCm: 1,
  },
  {
    type: 'ankle_left',
    label: 'Left ankle',
    shortLabel: 'L ankle',
    region: 'leg_left',
    views: ['front'],
    howToMeasure: 'Narrowest point above the malleoli.',
    minCm: 15,
    maxCm: 40,
    precisionCm: 1,
    optional: true,
  },
  {
    type: 'ankle_right',
    label: 'Right ankle',
    shortLabel: 'R ankle',
    region: 'leg_right',
    views: ['front'],
    howToMeasure: 'Narrowest point above the malleoli — separate left/right.',
    minCm: 15,
    maxCm: 40,
    precisionCm: 1,
    optional: true,
  },
];

export const CONDITION_LABELS: Record<MeasurementCondition, string> = {
  morning_fasted: 'Morning · fasted',
  evening: 'Evening',
  post_workout: 'Post-workout',
  other: 'Other',
  unspecified: 'Unspecified',
};

export function defFor(type: BodyMeasurementType): MeasurementDef | undefined {
  return MEASUREMENT_CATALOGUE.find((d) => d.type === type);
}

export function defsForView(view: BodyView): MeasurementDef[] {
  return MEASUREMENT_CATALOGUE.filter((d) => d.views.includes(view));
}

export function defsForRegion(region: string): MeasurementDef[] {
  return MEASUREMENT_CATALOGUE.filter((d) => d.region === region);
}

/** Interactive hotspot ids used by the body schematic */
export const BODY_REGIONS = [
  { id: 'neck', label: 'Neck', views: ['front', 'side'] as BodyView[] },
  { id: 'shoulders', label: 'Shoulders', views: ['front', 'back'] as BodyView[] },
  { id: 'chest', label: 'Chest', views: ['front', 'side'] as BodyView[] },
  { id: 'waist', label: 'Waist', views: ['front', 'side'] as BodyView[] },
  { id: 'abdomen', label: 'Abdomen', views: ['front', 'side'] as BodyView[] },
  { id: 'hips', label: 'Hips', views: ['front', 'side', 'back'] as BodyView[] },
  { id: 'arm_left', label: 'Left arm', views: ['front', 'side'] as BodyView[] },
  { id: 'arm_right', label: 'Right arm', views: ['front', 'side'] as BodyView[] },
  { id: 'leg_left', label: 'Left leg', views: ['front', 'side', 'back'] as BodyView[] },
  { id: 'leg_right', label: 'Right leg', views: ['front', 'side', 'back'] as BodyView[] },
  { id: 'stature', label: 'Height', views: ['front', 'side'] as BodyView[] },
] as const;

/**
 * Separate measurement systems — left/right and relaxed/flexed stay distinct rows.
 * Never merge into a single averaged field.
 */
export const MEASUREMENT_SYSTEMS: {
  id: string;
  title: string;
  subtitle: string;
  types: BodyMeasurementType[];
}[] = [
  {
    id: 'stature',
    title: 'Stature',
    subtitle: 'Standing height',
    types: ['height'],
  },
  {
    id: 'upper',
    title: 'Neck & shoulders',
    subtitle: 'Upper frame',
    types: ['neck', 'shoulders'],
  },
  {
    id: 'torso',
    title: 'Chest & torso',
    subtitle: 'Chest, waist levels, abdomen, hips — each site separate',
    types: ['chest', 'upper_chest', 'waist_natural', 'waist_navel', 'abdomen', 'hips'],
  },
  {
    id: 'arm_left',
    title: 'Left arm',
    subtitle: 'Relaxed and flexed biceps are never merged',
    types: [
      'bicep_left_relaxed',
      'bicep_left_flexed',
      'forearm_left',
      'wrist_left',
    ],
  },
  {
    id: 'arm_right',
    title: 'Right arm',
    subtitle: 'Separate from left — never averaged',
    types: [
      'bicep_right_relaxed',
      'bicep_right_flexed',
      'forearm_right',
      'wrist_right',
    ],
  },
  {
    id: 'leg_left',
    title: 'Left leg',
    subtitle: 'Thigh, calf, optional ankle',
    types: ['thigh_left', 'calf_left', 'ankle_left'],
  },
  {
    id: 'leg_right',
    title: 'Right leg',
    subtitle: 'Separate from left — never averaged',
    types: ['thigh_right', 'calf_right', 'ankle_right'],
  },
];

export function systemsWithDefs(includeOptional: boolean) {
  return MEASUREMENT_SYSTEMS.map((sys) => ({
    ...sys,
    defs: sys.types
      .map((t) => defFor(t))
      .filter((d): d is MeasurementDef => !!d && (includeOptional || !d.optional)),
  })).filter((sys) => sys.defs.length > 0);
}
