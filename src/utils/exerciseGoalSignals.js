/**
 * D1.4.6 - Training goal metadata audit.
 *
 * Catalog labels are descriptive indicators.
 * They are NOT scientific efficacy scores.
 */

export const PROFILE_GOAL_RULES = Object.freeze({
  "build-muscle": {
    catalogSignals: ["hypertrophy"],
    relation: "direct",
  },

  "build-strength": {
    catalogSignals: ["strength"],
    relation: "direct",
  },

  "improve-endurance": {
    catalogSignals: ["endurance"],
    relation: "direct",
  },

  "body-recomposition": {
    catalogSignals: ["hypertrophy", "strength"],
    relation: "indirect",
  },

  "general-fitness": {
    catalogSignals: [
      "strength",
      "endurance",
      "mobility",
      "power",
    ],
    relation: "broad",
  },
});

const KNOWN_CATALOG_GOALS = new Set([
  "hypertrophy",
  "strength",
  "endurance",
  "mobility",
  "power",
  "rehabilitation",
  "core",
]);

export function assessExerciseGoalSignals(
  exercise,
  repdbReference = null,
  movementAssessment = null
) {
  // Prefer original RepDB goal labels when
  // Gym Tracker overrides an exercise ID.
  const rawGoals =
    Array.isArray(repdbReference?.goals)
      ? repdbReference.goals
      : Array.isArray(exercise.goals)
        ? exercise.goals
        : [];

  const catalogGoals = [...new Set(rawGoals)];

  const category =
    repdbReference?.category ??
    exercise.category ??
    "strength";

  const reviewReasons = [];

  if (catalogGoals.length === 0) {
    reviewReasons.push("missing-catalog-goals");
  }

  if (
    catalogGoals.some(
      (goal) => !KNOWN_CATALOG_GOALS.has(goal)
    )
  ) {
    reviewReasons.push("unknown-goal-label");
  }

  // Cardio equipment or activity does not
  // automatically support hypertrophy or
  // maximal-strength claims.
  if (
    category === "cardio" &&
    catalogGoals.some(
      (goal) =>
        goal === "hypertrophy" ||
        goal === "strength"
    )
  ) {
    reviewReasons.push(
      "cardio-with-strength-or-hypertrophy-tag"
    );
  }

  // The profile currently asks for muscular
  // endurance, not cardiovascular endurance.
  if (
    category === "cardio" &&
    catalogGoals.includes("endurance")
  ) {
    reviewReasons.push(
      "cardio-versus-muscular-endurance"
    );
  }

  if (
    movementAssessment?.movementFamily ===
      "mobility" &&
    !catalogGoals.includes("mobility")
  ) {
    reviewReasons.push(
      "mobility-movement-without-mobility-tag"
    );
  }

  if (movementAssessment?.requiresGoalReview) {
    reviewReasons.push(
      "movement-traits-request-goal-review"
    );
  }

  // Rehabilitation tags do not establish
  // medical safety or treatment suitability.
  if (catalogGoals.includes("rehabilitation")) {
    reviewReasons.push(
      "rehabilitation-label-needs-clinical-review"
    );
  }

  const goalsForProfile = {};

  for (const [
    profileGoal,
    rule,
  ] of Object.entries(PROFILE_GOAL_RULES)) {
    const matchedCatalogGoals =
      rule.catalogSignals.filter(
        (goal) => catalogGoals.includes(goal)
      );

    let status = "not-indicated";

    if (matchedCatalogGoals.length > 0) {
      if (reviewReasons.length > 0) {
        status = "requires-review";
      } else if (rule.relation === "direct") {
        status = "catalog-indicator";
      } else {
        status = "indirect-catalog-indicator";
      }
    }

    goalsForProfile[profileGoal] = {
      status,
      relation: rule.relation,
      matchedCatalogGoals,
    };
  }

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    category,

    catalogGoals,
    catalogGoalsSource:
      catalogGoals.length > 0
        ? "exercise-catalog"
        : "not-recorded",

    // Separate medical claims from training goals.
    hasUnverifiedRehabilitationLabel:
      catalogGoals.includes("rehabilitation"),

    goalsForProfile,

    needsGoalReview:
      reviewReasons.length > 0,

    reviewReasons,

    // No effectiveness study has been
    // evaluated for this individual exercise.
    efficacyReviewStatus: "not-reviewed",
  };
}
