/** First-open app tour (re-open from Settings). */
export interface TourSlide {
  icon: string;
  title: string;
  body: string;
}

export const TOUR_SLIDES: TourSlide[] = [
  { icon: '🎯', title: 'Project 85', body: 'One line from today to 85 kg by the birthday. Every screen is built from what you actually log.' },
  { icon: '⚡', title: 'Quick Log', body: 'Weight, meals, water and sleep in a few taps. Missing days stay missing; nothing is invented.' },
  { icon: '▶️', title: 'Start workout', body: 'On Train, press Start workout: one set at a time, the animation, a rest countdown and voice cues.' },
  { icon: '🔁', title: 'Machine taken?', body: 'Pick a swap from the card or See all. The new exercise gets its own animation, video and log.' },
  { icon: '🎬', title: 'Form videos', body: 'Every exercise and warm-up has a video button. Tap a warm-up row to see the move.' },
  { icon: '📊', title: 'Sunday report', body: 'Each Sunday: the week vs the plan line, wins, and one fix for next week.' },
  { icon: '🔒', title: 'Local first', body: 'Data lives on this device. Export a backup from Settings any time.' },
];
