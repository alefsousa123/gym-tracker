
import {
  getExerciseEntries,
} from "./workoutExerciseEntries";

// ==========================================
// HELPERS
// ==========================================

function asPositiveNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function getSets(record) {
  return Array.isArray(record?.completedSets)
    ? record.completedSets
    : [];
}

// ==========================================
// ONE EXERCISE, ONE WORKOUT
// ==========================================

function createSessionResult(
  workout,
  exerciseId,
  entryId,
  target,
  weightUnit,
  allowLegacyFallback
) {

  // Match the exact occurrence first.
  // Legacy fallback is safe only when the
  // current plan has one such exercise.

  const candidates =
    Array.isArray(workout.exercises)
      ? workout.exercises.filter(
          (item) =>
            item.exerciseId === exerciseId
        )
      : [];

  const record =
    candidates.find(
      (item) => item.entryId === entryId
    ) ??
    (
      allowLegacyFallback &&
      candidates.length === 1 &&
      !candidates[0].entryId
        ? candidates[0]
        : null
    );

  if (!record) {
    return null;
  }

  const sets = getSets(record);

  const reps = sets.map(
    (set) => Number(set.reps)
  );

  const weights = sets.map(
    (set) => asPositiveNumber(set.weight)
  );

  const uniformWeight =
    weights.length > 0 &&
    weights[0] !== null &&
    weights.every(
      (weight) =>
        weight !== null &&
        Math.abs(
          weight - weights[0]
        ) < 0.000001
    )
      ? weights[0]
      : null;

  const sameConfiguration =
    workout.weightUnit === weightUnit &&
    record.target?.targetType === "reps" &&
    Number(record.target?.sets) ===
      Number(target.sets) &&
    Number(record.target?.minReps) ===
      Number(target.minReps) &&
    Number(record.target?.maxReps) ===
      Number(target.maxReps) &&
    (record.target?.loadMeasurement ?? null) ===
      (target.loadMeasurement ?? null);

  const completedAllSets =
    !record.skipped &&
    sets.length === Number(target.sets);

  const reachedTop =
    completedAllSets &&
    reps.every(
      (rep) =>
        Number.isInteger(rep) &&
        rep >= Number(target.maxReps)
    );

  return {
    date: workout.finishedAt,
    status: workout.status,

    reps,
    sets: sets.length,

    uniformWeight,
    sameConfiguration,
    reachedTop,

    qualifies:
      sameConfiguration &&
      reachedTop &&
      uniformWeight !== null,
  };
}

// ==========================================
// PERFORMANCE INSIGHTS
// ==========================================

export function buildPerformanceInsights(
  appliedPlan,
  workoutHistory
) {
  if (!appliedPlan?.sessions?.length) {
    return [];
  }

  const weightUnit =
    appliedPlan.weightUnit ?? "kg";

  const history = (
    Array.isArray(workoutHistory)
      ? workoutHistory
      : []
  )
    .filter(
      (workout) =>
        workout &&
        workout.planName === appliedPlan.name &&
        Array.isArray(workout.exercises) &&
        Number.isFinite(
          Date.parse(workout.finishedAt)
        )
    )
    .sort(
      (first, second) =>
        Date.parse(second.finishedAt) -
        Date.parse(first.finishedAt)
    );

  return appliedPlan.sessions.map(
    (session) => {
      // This page evaluates repetition-based
      // training only. Timed exercises remain
      // available in Workout History.

      const entries =
        getExerciseEntries(session);

      const occurrenceCounts = new Map();

      for (const entry of entries) {
        occurrenceCounts.set(
          entry.exerciseId,
          (
            occurrenceCounts.get(
              entry.exerciseId
            ) ?? 0
          ) + 1
        );
      }

      const repetitionExercises =
        entries.filter(
          (entry) =>
            entry.target.targetType === "reps"
        );

      return {
        sessionId: session.id,
        sessionName: session.name,


        exercises: repetitionExercises.map(
          (entry) => {
            const {
              entryId,
              exerciseId,
              target,
            } = entry;

            const allowLegacyFallback =
              occurrenceCounts.get(
                exerciseId
              ) === 1;

            const recent = history
              .filter(
                (workout) =>
                  workout.sessionId === session.id
              )
              .map(
                (workout) =>
                  createSessionResult(
                    workout,
                    exerciseId,
                    entryId,
                    target,
                    weightUnit,
                    allowLegacyFallback
                  )
              )
              .filter(Boolean)
              .slice(0, 3);

            const latest =
              recent[0] ?? null;

            const previous =
              recent[1] ?? null;

            const baselineWeight =
              latest?.uniformWeight ?? null;

            const twoMatchingTopPerformances =
              Boolean(
                latest?.qualifies &&
                previous?.qualifies
              ) &&
              Math.abs(
                latest.uniformWeight -
                previous.uniformWeight
              ) < 0.000001;

            const plannedWeight =
              asPositiveNumber(
                target.weight
              );

            const alreadyAdjusted =
              baselineWeight !== null &&
              plannedWeight !== null &&
              plannedWeight >
                baselineWeight + 0.000001;

            const canReviewIncrease =
              twoMatchingTopPerformances &&
              !alreadyAdjusted;

            return {
              entryId,
              exerciseId,
              target,
              recent,

              baselineWeight,
              plannedWeight,
              alreadyAdjusted,

              canReviewIncrease,
              weightUnit,
            };
          }
        ),
      };
    }
  );
}
