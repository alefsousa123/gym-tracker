/**
 * D1.4.1 - Exercise metadata review queue.
 *
 * Identifies uncertain classifications.
 * Does not calculate effectiveness scores.
 */

const REVIEW_ORDER = {
  unclassified: 0,
  "provisional-override": 1,
  "name-rule": 2,
  "variation-group": 3,
  category: 3,
};

function determineReviewTier(assessment) {
  if (
    assessment.movementFamily === "unclassified"
  ) {
    return "unclassified";
  }

  if (
    assessment.movementSource ===
    "provisional-override"
  ) {
    return "provisional-override";
  }

  return "heuristic-review";
}

export function buildExerciseReviewQueue(
  assessments
) {
  if (!Array.isArray(assessments)) {
    throw new TypeError(
      "Exercise assessments must be an array."
    );
  }

  return assessments
    .filter(
      (assessment) => assessment.needsReview
    )
    .map((assessment) => ({
      exerciseId: assessment.exerciseId,
      name: assessment.name,

      movementFamily:
        assessment.movementFamily,

      movementSource:
        assessment.movementSource,

      difficulty:
        assessment.difficulty,

      goals: [...assessment.goals],

      calisthenicsRelated:
        assessment.calisthenicsRelated,

      reasons: [
        ...assessment.reviewReasons,
      ],

      reviewTier:
        determineReviewTier(assessment),

      reviewStatus: "pending",
    }))
    .sort((first, second) => {
      const firstRank =
        REVIEW_ORDER[first.movementSource] ?? 2;

      const secondRank =
        REVIEW_ORDER[second.movementSource] ?? 2;

      return (
        firstRank - secondRank ||
        Number(second.calisthenicsRelated) -
          Number(first.calisthenicsRelated) ||
        first.exerciseId.localeCompare(
          second.exerciseId
        )
      );
    });
}

export function summarizeExerciseReviewQueue(
  queue
) {
  const reasons = {};
  const reviewTiers = {};
  const families = {};

  for (const item of queue) {
    reviewTiers[item.reviewTier] =
      (reviewTiers[item.reviewTier] ?? 0) + 1;

    families[item.movementFamily] =
      (families[item.movementFamily] ?? 0) + 1;

    for (const reason of item.reasons) {
      reasons[reason] =
        (reasons[reason] ?? 0) + 1;
    }
  }

  return {
    total: queue.length,
    reviewTiers,
    reasons,
    families,
  };
}
