import {
  rankExercisesForUser,
} from "./exerciseRecommendationEngine";

import {
  matchesExerciseRole,
} from "./exerciseTrainingRoles";

/**
 * D1.10 - Context-aware exercise ranking.
 *
 * Suitability still depends on the user's
 * goal, focus areas, experience and setup.
 *
 * Session compatibility decides which
 * exercises should appear first.
 */
export function rankExercisesForWorkoutSession(
  candidates,
  options = {}
) {
  const addedIds = new Set(
    options.addedIds ?? []
  );

  return rankExercisesForUser(
    candidates,
    {
      profile: options.profile,
      isAvailable: options.isAvailable,
    }
  )
    .map((item) => ({
      ...item,

      sessionRelevant:
        matchesExerciseRole(
          item.exercise,
          options.sessionId
        ),

      alreadyAdded:
        addedIds.has(item.exercise.id),
    }))
    .sort((first, second) =>
      Number(
        second.eligibleForAutomaticRecommendation
      ) -
      Number(
        first.eligibleForAutomaticRecommendation
      ) ||

      Number(second.sessionRelevant) -
      Number(first.sessionRelevant) ||

      Number(first.alreadyAdded) -
      Number(second.alreadyAdded) ||

      second.score - first.score ||

      first.exercise.name.localeCompare(
        second.exercise.name
      )
    );
}
