import {
  PROFILE_GOAL_RULES,
} from "./exerciseGoalSignals";

/**
 * D1.4.7 - Conservative goal assessment.
 *
 * The catalog is not a scientific effectiveness
 * ranking. No 0-100 scores are assigned here.
 */

const ORIGINAL_GOAL_INFERENCES = {
  "biceps-curl": [
    "hypertrophy",
    "strength",
  ],

  "dumbbell-chest-press": [
    "hypertrophy",
    "strength",
  ],

  "dumbbell-row": [
    "hypertrophy",
    "strength",
  ],
};

function unique(items) {
  return [...new Set(items)];
}

function canUseGoalForProfile(
  catalogGoal,
  profileGoal,
  category
) {
  if (category !== "cardio") {
    return true;
  }

  // Cardio tags do not establish that the
  // exercise is appropriate for muscular
  // hypertrophy or maximal strength.
  if (
    catalogGoal === "hypertrophy" ||
    catalogGoal === "strength"
  ) {
    return false;
  }

  // The current profile field refers to
  // muscular endurance, not aerobic endurance.
  if (
    profileGoal === "improve-endurance" &&
    catalogGoal === "endurance"
  ) {
    return false;
  }

  return true;
}

export function assessExerciseGoalReadiness(
  exercise,
  goalAssessment,
  movementAssessment
) {
  if (!goalAssessment || !movementAssessment) {
    throw new Error(
      "Goal and movement assessments are required."
    );
  }

  const category = goalAssessment.category;

  const catalogGoals = unique(
    goalAssessment.catalogGoals
  );

  const provisionalGoals = [];

  // Original exercises without RepDB goal tags.
  if (catalogGoals.length === 0) {
    provisionalGoals.push(
      ...(ORIGINAL_GOAL_INFERENCES[exercise.id] ?? [])
    );
  }

  // Movement-based mobility inference.
  if (
    movementAssessment.movementFamily ===
      "mobility" &&
    !catalogGoals.includes("mobility")
  ) {
    provisionalGoals.push("mobility");
  }

  const inferredGoals = unique(
    provisionalGoals
  ).filter(
    (goal) => !catalogGoals.includes(goal)
  );

  const profileMatches = {};

  for (const [
    profileGoal,
    rule,
  ] of Object.entries(PROFILE_GOAL_RULES)) {
    const usableCatalog = rule.catalogSignals
      .filter(
        (goal) =>
          catalogGoals.includes(goal) &&
          canUseGoalForProfile(
            goal,
            profileGoal,
            category
          )
      );

    const usableInferred = rule.catalogSignals
      .filter(
        (goal) =>
          inferredGoals.includes(goal) &&
          canUseGoalForProfile(
            goal,
            profileGoal,
            category
          )
      );

    let status = "not-indicated";

    if (usableCatalog.length > 0) {
      status =
        rule.relation === "direct"
          ? "catalog-indicator"
          : "indirect-catalog-indicator";
    } else if (usableInferred.length > 0) {
      status =
        rule.relation === "direct"
          ? "provisional"
          : "indirect-provisional";
    }

    profileMatches[profileGoal] = {
      status,
      matchedCatalogGoals: usableCatalog,
      matchedInferredGoals: usableInferred,
      relation: rule.relation,
    };
  }

  const excludedCatalogGoals =
    catalogGoals.filter(
      (goal) =>
        category === "cardio" &&
        (
          goal === "hypertrophy" ||
          goal === "strength"
        )
    );

  const reviewReasons = [
    ...goalAssessment.reviewReasons,
  ];

  if (inferredGoals.length > 0) {
    reviewReasons.push(
      "goal-inference-needs-review"
    );
  }

  if (
    category === "cardio" &&
    catalogGoals.includes("endurance")
  ) {
    reviewReasons.push(
      "cardiorespiratory-endurance-is-not-muscular-endurance"
    );
  }

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    category,

    catalogGoals,
    inferredGoals,

    excludedCatalogGoals,

    enduranceDomain:
      category === "cardio"
        ? "cardiorespiratory"
        : "muscular-or-unspecified",

    profileMatches,

    rehabilitationLabelUnverified:
      catalogGoals.includes("rehabilitation"),

    reviewReasons: unique(reviewReasons),

    needsReview:
      reviewReasons.length > 0,

    // Explicitly separate metadata review
    // from scientific evidence assessment.
    scientificEfficacyStatus: "not-reviewed",

    readyForAutomaticScoring: false,
  };
}
