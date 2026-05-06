// Simplified SM-2 spaced repetition.
export type Rating = "again" | "hard" | "good" | "easy";

export type SrsState = {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
};

export type SrsUpdate = SrsState & {
  due_at: string;
  last_rated_at: string;
};

export function applyRating(state: SrsState, rating: Rating): SrsUpdate {
  let { ease, interval_days, reps, lapses } = state;
  ease = Math.max(1.3, ease);

  if (rating === "again") {
    lapses += 1;
    reps = 0;
    interval_days = 0; // due again today
    ease = Math.max(1.3, ease - 0.2);
  } else {
    reps += 1;
    if (reps === 1) interval_days = rating === "easy" ? 3 : 1;
    else if (reps === 2) interval_days = rating === "easy" ? 6 : 3;
    else {
      const factor = rating === "hard" ? 1.2 : rating === "good" ? ease : ease * 1.3;
      interval_days = Math.max(1, Math.round(interval_days * factor));
    }
    if (rating === "hard") ease = Math.max(1.3, ease - 0.15);
    else if (rating === "easy") ease = ease + 0.15;
  }

  const now = new Date();
  const due = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000);
  return {
    ease,
    interval_days,
    reps,
    lapses,
    due_at: due.toISOString(),
    last_rated_at: now.toISOString(),
  };
}

export function isDue(due_at: string): boolean {
  return new Date(due_at).getTime() <= Date.now();
}
