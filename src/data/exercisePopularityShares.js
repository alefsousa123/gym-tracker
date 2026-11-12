/**
 * StrengthLog, November 2025.
 * Share of training sets for selected exercises.
 * Popularity is not scientific efficacy.
 *
 * https://www.strengthlog.com/most-popular-exercises/
 */
export const POPULARITY_SHARES = Object.freeze({
  "bench-press": 9.7,
  "squat": 7.0,
  "deadlift": 5.0,
  "lat-pulldown": 3.8,
  "ohp": 3.4,
  "barbell-row": 3.2,
  "lateral-raise": 2.7,
  "leg-extension": 2.5,
  "leg-press": 2.2,
  "barbell-curl": 2.1,
  "tricep-pushdown": 2.0,
  "incline-db-press": 1.9,
  "biceps-curl": 1.7,
  "pull-up": 1.7,
  "seated-cable-row": 1.6,
  "leg-curl": 1.3,
  "dumbbell-row": 1.3,
  "dumbbell-shoulder-press": 1.3,
  "romanian-deadlift": 1.3,
  "seated-leg-curl": 1.2,
  "hammer-curl": 1.1,
  "cable-fly": 1.1,
  "dumbbell-chest-press": 1.0,
  "face-pull": 1.0,
});

/**
 * Exact equivalent entries in the local catalog.
 * Do not automatically assign a parent exercise's
 * popularity to every variation.
 */
const EQUIVALENT_IDS = Object.freeze({
  "db-bench-press": "dumbbell-chest-press",
  "bent-over-db-row": "dumbbell-row",
  "single-arm-db-row": "dumbbell-row",
  "seated-dumbbell-curl": "biceps-curl",
});

export function getExercisePopularity(exerciseId) {
  const canonicalId =
    EQUIVALENT_IDS[exerciseId] ?? exerciseId;

  const share = POPULARITY_SHARES[canonicalId];

  return {
    share: share ?? null,
    source: share === undefined
      ? "unmeasured"
      : "strengthlog-2025",
  };
}
