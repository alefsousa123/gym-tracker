import {
  buildPerformanceInsights,
} from "./performanceAnalysis";

import {
  recommendExerciseProgression,
} from "./progressionRecommendations";

import {
  getExerciseEntries,
} from "./workoutExerciseEntries";

/**
 * D1.21.3
 *
 * Read-only verification before presenting
 * or confirming a suggested load change.
 *
 * This function does not update plans,
 * workout history or browser storage.
 */
export function reviewSuggestedProgression({
  appliedPlan,
  workoutHistory,
  sessionId,
  exerciseId,
  entryId = null,
  activeWorkout = null,
  expectedToken = null,
}) {
  function rejected(reason) {
    return {
      ok: false,
      reason,
      token: null,
      suggestedWeight: null,
    };
  }

  if (activeWorkout) {
    return rejected(
      "Finish or discard the active workout before changing planned loads."
    );
  }

  if (
    !appliedPlan ||
    !Array.isArray(appliedPlan.sessions) ||
    !Array.isArray(workoutHistory)
  ) {
    return rejected(
      "The workout plan or history is unavailable."
    );
  }

  const session =
    appliedPlan.sessions.find(
      (item) => item.id === sessionId
    );


  if (!session) {
    return rejected(
      "This exercise is not in the current plan."
    );
  }

  const matches =
    getExerciseEntries(session).filter(
      (entry) =>
        entry.exerciseId === exerciseId
    );

  // A catalog ID is allowed only when it
  // identifies exactly one occurrence.
  // Otherwise, require an exact entry ID.

  const selectedEntry =
    entryId === null
      ? (
          matches.length === 1
            ? matches[0]
            : null
        )
      : matches.find(
          (entry) =>
            entry.entryId === entryId
        );

  if (!selectedEntry) {
    return rejected(
      matches.length > 1
        ? "Select the specific exercise occurrence before reviewing its planned load."
        : "This exercise occurrence is not in the current plan."
    );
  }

  const insight =
    buildPerformanceInsights(
      appliedPlan,
      workoutHistory
    )
      .find(
        (item) =>
          item.sessionId === sessionId
      )
      ?.exercises.find(
        (item) =>
          item.entryId === selectedEntry.entryId
      );

  if (!insight) {
    return rejected(
      "No compatible progression data was found."
    );
  }

  const suggestion =
    recommendExerciseProgression(
      insight
    );

  if (
    suggestion.status !== "review" ||
    !Number.isFinite(
      suggestion.suggestedWeight
    )
  ) {
    return rejected(
      "This increase is no longer available. Review the latest training data."
    );
  }

  if (
    suggestion.suggestedWeight <=
    suggestion.currentWeight
  ) {
    return rejected(
      "The suggested weight must exceed the recorded weight."
    );
  }

  /*
   * The token represents the plan,
   * current training evidence and suggestion.
   *
   * If any of them changes between opening
   * and confirming, the operation is refused.
   */
  const token = JSON.stringify({
    planName: appliedPlan.name,
    splitId: appliedPlan.splitId,
    location: appliedPlan.location,
    weightUnit: appliedPlan.weightUnit,
    isPersonalized:
      appliedPlan.isPersonalized === true,

    sessions:
      appliedPlan.sessions,

    sessionId,
    exerciseId,
    entryId: selectedEntry.entryId,

    target: insight.target,
    recent: insight.recent,

    baselineWeight:
      insight.baselineWeight,

    suggestedWeight:
      suggestion.suggestedWeight,
  });

  if (
    expectedToken !== null &&
    token !== expectedToken
  ) {
    return rejected(
      "The plan or performance data changed. Review the suggestion again."
    );
  }

  return {
    ok: true,
    reason: null,
    token,

    suggestedWeight:
      suggestion.suggestedWeight,

    currentWeight:
      suggestion.currentWeight,

    weightUnit:
      suggestion.weightUnit,

    increasePercent:
      suggestion.increasePercent,
  };
}
