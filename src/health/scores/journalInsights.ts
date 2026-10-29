export type JournalEntry = {
  date: string;
  recovery: number;
  tags: string[];
};

export type JournalInsight =
  | { status: 'insufficient_data' }
  | {
      status: 'ok';
      tag: string;
      meanWith: number;
      meanWithout: number;
      diff: number;
      nWith: number;
      nWithout: number;
      message: string;
    };

const MIN_GROUP_N = 5;

export function journalTagInsight(entries: JournalEntry[], tag: string): JournalInsight {
  const withTag: number[] = [];
  const without: number[] = [];
  for (const e of entries) {
    if (e.tags.includes(tag)) withTag.push(e.recovery);
    else without.push(e.recovery);
  }
  if (withTag.length < MIN_GROUP_N || without.length < MIN_GROUP_N) {
    return { status: 'insufficient_data' };
  }
  const meanWith = withTag.reduce((a, b) => a + b, 0) / withTag.length;
  const meanWithout = without.reduce((a, b) => a + b, 0) / without.length;
  const diff = Math.round((meanWith - meanWithout) * 10) / 10;
  const sign = diff >= 0 ? '+' : '';
  return {
    status: 'ok',
    tag,
    meanWith,
    meanWithout,
    diff,
    nWith: withTag.length,
    nWithout: without.length,
    message: `Nights after ${tag}: recovery ${sign}${diff} on average (n=${withTag.length} vs ${without.length})`,
  };
}
