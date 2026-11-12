/**
 * D1.11 - Personalized score calibration.
 *
 * Product suitability heuristics, not
 * scientifically measured efficacy grades.
 */

const COMPOUND_FAMILIES = new Set([
  "squat",
  "lunge",
  "hip-hinge",
  "hip-extension",
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
]);

const ISOLATION_FAMILIES = new Set([
  "chest-isolation",
  "shoulder-isolation",
  "hip-isolation",
  "knee-extension",
  "knee-flexion",
  "elbow-flexion",
  "elbow-extension",
  "calf",
]);

function clamp(value, max) {
  return Math.max(0, Math.min(max, value));
}

/**
 * Scores coverage across up to three ordered
 * muscle priorities.
 *
 * Primary muscle involvement = full credit.
 * Secondary involvement = partial credit.
 *
 * Missing priorities are not exclusions.
 */
export function scoreMuscleCoverage(
  profile,
  muscles
) {
  const priorities = [
    ...new Set(
      Array.isArray(profile?.musclePriorities)
        ? profile.musclePriorities
        : []
    ),
  ].slice(0, 3);

  if (priorities.length === 0) {
    return 12;
  }

  const priorityWeights = [1, 0.7, 0.45];

  const primary = new Set(
    muscles?.primaryRegions ?? []
  );

  const secondary = new Set(
    muscles?.secondaryRegions ?? []
  );

  let earned = 0;
  let available = 0;

  priorities.forEach((region, index) => {
    const weight = priorityWeights[index];

    available += weight;

    if (primary.has(region)) {
      earned += weight;
    } else if (secondary.has(region)) {
      earned += weight * 0.4;
    }
  });

  return clamp(
    Math.round(
      4 + (16 * earned) / available
    ),
    20
  );
}

/**
 * Refines the movement component without
 * changing its 25-point maximum.
 *
 * This is a small programming preference,
 * not proof that one exercise is superior.
 */
export function refineMovementScore({
  exercise,
  profile,
  movement,
  readiness,
  baseScore,
}) {
  const goal =
    profile?.primaryGoal ??
    profile?.trainingGoal ??
    "general-fitness";

  const family =
    movement?.movementFamily ??
    "unclassified";

  const category =
    readiness?.category ?? "strength";

  const tags = Array.isArray(exercise.tags)
    ? exercise.tags
    : [];

  let adjustment = 0;

  if (goal === "build-strength") {
    if (COMPOUND_FAMILIES.has(family)) {
      adjustment += 2;
    }

    if (ISOLATION_FAMILIES.has(family)) {
      adjustment -= 2;
    }
  }

  if (
    goal === "build-muscle" ||
    goal === "body-recomposition"
  ) {
    if (ISOLATION_FAMILIES.has(family)) {
      adjustment += 1;
    }

    if (family === "calisthenics-skill") {
      adjustment -= 2;
    }

    if (category === "olympic") {
      adjustment -= 2;
    }
  }

  if (
    goal === "general-fitness" &&
    (
      family === "mobility" ||
      family === "loaded-carry"
    )
  ) {
    adjustment += 1;
  }

  // Warm-up movements are still useful;
  // avoid prioritizing them as primary
  // muscle-building or strength exercises.
  if (
    tags.includes("warm_up") &&
    (
      goal === "build-muscle" ||
      goal === "build-strength"
    )
  ) {
    adjustment -= 2;
  }

  // Unverified movement classification
  // receives a small confidence penalty.
  if (
    movement?.movementSource ===
      "provisional-override" &&
    !movement?.familyDescriptionCheck
  ) {
    adjustment -= 1;
  }

  return clamp(
    baseScore + adjustment,
    25
  );
}

/**
 * A conservative automatic-recommendation
 * rule for beginners.
 *
 * Exercises remain accessible manually
 * from the exercise library.
 */
export function isHighSkillForBeginner(
  exercise,
  movement,
  readiness
) {
  const category =
    readiness?.category ?? "strength";

  if (category === "olympic") {
    return true;
  }

  if (
    movement?.movementFamily ===
    "calisthenics-skill"
  ) {
    return true;
  }

  const complexIds = new Set([
    "thruster",
    "jefferson-curl",
  ]);

  return complexIds.has(exercise.id);
}
