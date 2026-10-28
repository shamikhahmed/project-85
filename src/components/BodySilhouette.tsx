import type { KeyboardEvent } from 'react';
import type { BodyView } from '../domain/types';

interface Props {
  view: BodyView;
  selectedRegion: string | null;
  onSelectRegion: (regionId: string) => void;
  filledRegions?: Set<string>;
}

/**
 * Original instructional schematic — not an anatomical diagnostic tool.
 */
export function BodySilhouette({
  view,
  selectedRegion,
  onSelectRegion,
  filledRegions,
}: Props) {
  const hit = (id: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-pressed': selectedRegion === id,
    'aria-label': `Select ${id.replace('_', ' ')} measurements`,
    className: `body-hit${selectedRegion === id ? ' active' : ''}${
      filledRegions?.has(id) ? ' filled' : ''
    }`,
    onClick: () => onSelectRegion(id),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectRegion(id);
      }
    },
  });

  return (
    <div className="body-silhouette" data-view={view}>
      <svg viewBox="0 0 200 420" role="img" aria-label={`Body map ${view} view schematic`}>
        <title>Instructional body schematic — {view}</title>
        {/* Torso outline */}
        <path
          className="body-outline"
          d={
            view === 'side'
              ? 'M100 28c12 0 22 10 22 24v18c8 6 14 18 14 32v48c0 14-4 26-12 34v86c0 20 6 36 6 56v48c-8 4-16 6-30 6s-22-2-30-6v-48c0-20 6-36 6-56v-86c-8-8-12-20-12-34v-48c0-14 6-26 14-32V52c0-14 10-24 22-24z'
              : 'M100 28c18 0 32 12 32 28v16c22 8 36 28 36 52v56c0 18-6 34-18 46v88c0 22 8 40 8 62v40c-10 6-22 10-58 10s-48-4-58-10v-40c0-22 8-40 8-62v-88c-12-12-18-28-18-46V124c0-24 14-44 36-52V56c0-16 14-28 32-28z'
          }
          fill="var(--bg-sunken)"
          stroke="var(--border)"
          strokeWidth="2"
        />

        {/* Hotspots */}
        {(view === 'front' || view === 'side') && (
          <ellipse cx="100" cy="48" rx="18" ry="14" {...hit('neck')} />
        )}
        {(view === 'front' || view === 'back') && (
          <ellipse cx="100" cy="88" rx="48" ry="16" {...hit('shoulders')} />
        )}
        {(view === 'front' || view === 'side') && (
          <ellipse cx="100" cy="120" rx="36" ry="22" {...hit('chest')} />
        )}
        {(view === 'front' || view === 'side') && (
          <ellipse cx="100" cy="168" rx="30" ry="14" {...hit('waist')} />
        )}
        {(view === 'front' || view === 'side') && (
          <ellipse cx="100" cy="196" rx="32" ry="16" {...hit('abdomen')} />
        )}
        <ellipse cx="100" cy="228" rx="36" ry="18" {...hit('hips')} />

        {view !== 'back' && (
          <>
            <ellipse cx="48" cy="150" rx="16" ry="36" {...hit('arm_left')} />
            <ellipse cx="152" cy="150" rx="16" ry="36" {...hit('arm_right')} />
          </>
        )}
        {view === 'back' && (
          <>
            <ellipse cx="48" cy="150" rx="16" ry="36" {...hit('arm_left')} />
            <ellipse cx="152" cy="150" rx="16" ry="36" {...hit('arm_right')} />
          </>
        )}

        <ellipse cx="78" cy="300" rx="18" ry="48" {...hit('leg_left')} />
        <ellipse cx="122" cy="300" rx="18" ry="48" {...hit('leg_right')} />

        {(view === 'front' || view === 'side') && (
          <rect x="186" y="40" width="10" height="340" rx="3" {...hit('stature')} />
        )}
      </svg>
      <p className="body-disclaimer muted">
        Instructional schematic — not an anatomical diagnostic tool.
      </p>
    </div>
  );
}
