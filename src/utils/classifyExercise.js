
/**
 * D1.3 - Exercise classification.
 *
 * Descriptive metadata only.
 * No scientific efficacy scores are assigned here.
 */

import {
  exerciseFamilyOverrides,
} from "../data/exerciseFamilyOverrides";

import {
  exerciseFamilyDescriptionChecks,
} from "../data/exerciseFamilyDescriptionChecks";

import {
  exerciseMovementTraits,
} from "../data/exerciseMovementTraits";

export const MOVEMENT_FAMILY_LABELS = {
  "horizontal-push": "Horizontal push",
  "vertical-push": "Vertical push",
  "horizontal-pull": "Horizontal pull",
  "vertical-pull": "Vertical pull",
  squat: "Squat / knee-dominant",
  lunge: "Lunge / single-leg",
  "hip-hinge": "Hip hinge",
  "hip-extension": "Hip extension",
  "knee-extension": "Knee extension",
  "knee-flexion": "Knee flexion",
  "elbow-flexion": "Elbow flexion",
  "elbow-extension": "Elbow extension",
  "shoulder-isolation": "Shoulder isolation",
  "chest-isolation": "Chest isolation",
  "hip-isolation": "Hip isolation",
  calf: "Calf training",
  "core-flexion": "Core flexion",
  "core-stability": "Core stability",
  "back-extension": "Back extension",
  "pull-accessory": "Pull accessory",
  forearm: "Forearm / wrist",
  "calisthenics-skill": "Calisthenics skill",
  power: "Power / explosive",
  conditioning: "Conditioning / cardio",
  mobility: "Mobility / stretching",
  "balance-stability": "Balance / stability",
  "loaded-carry": "Loaded carry",
  "shoulder-stability": "Shoulder stability",
  "neck-stability": "Neck stability",
  "core-rotation": "Core rotation",
  "core-lateral-flexion": "Core lateral flexion",
  unclassified: "Requires classification",
};

// Known movement groups from the RepDB catalog.
const VARIATION_FAMILY = {
  "bench-press": "horizontal-push",
  "floor-press": "horizontal-push",
  "push-up": "horizontal-push",
  dips: "vertical-push",
  "overhead-press": "vertical-push",
  row: "horizontal-pull",
  "rear-delt-row": "horizontal-pull",
  "pull-up": "vertical-pull",
  "lat-pulldown": "vertical-pull",
  squat: "squat",
  "leg-press": "squat",
  "step-up": "lunge",
  lunge: "lunge",
  deadlift: "hip-hinge",
  "kettlebell-swing": "hip-hinge",
  "hip-thrust": "hip-extension",
  "leg-extension": "knee-extension",
  "leg-curl": "knee-flexion",
  "hip-abduction": "hip-isolation",
  "hip-adduction": "hip-isolation",
  "bicep-curl": "elbow-flexion",
  "barbell-curl": "elbow-flexion",
  "skull-crusher": "elbow-extension",
  "overhead-tricep-extension": "elbow-extension",
  "tricep-kickback": "elbow-extension",
  "tricep-pushdown": "elbow-extension",
  "front-raise": "shoulder-isolation",
  "lateral-raise": "shoulder-isolation",
  "reverse-fly": "shoulder-isolation",
  "upright-row": "shoulder-isolation",
  shrug: "shoulder-isolation",
  "chest-fly": "chest-isolation",
  "calf-raise": "calf",
  crunch: "core-flexion",
  "leg-raise": "core-flexion",
  plank: "core-stability",
  "static-hold": "core-stability",
  "turkish-get-up": "core-stability",
  "back-extension": "back-extension",
  pullover: "pull-accessory",
  "wrist-curl": "forearm",
  clean: "power",
  snatch: "power",
  jerk: "power",
  "ball-slam": "power",
  cardio: "conditioning",
  "leg-swing": "mobility",
};

const SKILL_PATTERN =
  /(?:^|[- ])(?:front[- ]lever|back[- ]lever|planche|handstand|human[- ]flag|muscle[- ]up|l[- ]sit|v[- ]sit|skin[- ]the[- ]cat)(?:$|[- ])/i;

const CALISTHENICS_PATTERN =
  /(?:push[- ]ups?|pull[- ]ups?|chin[- ]ups?|dips?|front[- ]lever|back[- ]lever|planche|handstand|human[- ]flag|muscle[- ]ups?|l[- ]sit|v[- ]sit|pistol[- ]squat)/i;

// Fallbacks are heuristics, never verified evidence.
const NAME_FAMILY_RULES = [
  [
    /pallof|rollout|dead[- ]bug|bird[- ]dog|bear[- ]crawl|ab[- ]wheel|anti[- ]rotation/i,
    "core-stability",
  ],
  [/squat|leg[- ]press/i, "squat"],
  [/lunge|split[- ]squat|step[- ]up/i, "lunge"],
  [/deadlift|good[- ]morning|hip[- ]hinge|swing/i, "hip-hinge"],
  [/glute[- ]bridge|hip[- ]thrust|kickback/i, "hip-extension"],
  [/pull[- ]up|chin[- ]up|lat[- ]pulldown/i, "vertical-pull"],
  [/\brow\b|[- ]row|pull[- ]apart|face[- ]pull/i, "horizontal-pull"],
  [/push[- ]up|bench[- ]press|chest[- ]press|floor[- ]press/i, "horizontal-push"],
  [/dip|overhead[- ]press|shoulder[- ]press|push[- ]press/i, "vertical-push"],
  [/leg[- ]extension|knee[- ]extension/i, "knee-extension"],
  [/leg[- ]curl/i, "knee-flexion"],
  [/wrist|grip|farmer/i, "forearm"],
  [/bicep|curl/i, "elbow-flexion"],
  [/tricep|skull[- ]crusher/i, "elbow-extension"],
  [/lateral[- ]raise|front[- ]raise|rear[- ]delt|reverse[- ]fly|external[- ]rotation/i, "shoulder-isolation"],
  [/chest[- ]fly|pec[- ]deck/i, "chest-isolation"],
  [/abduction|adduction|lateral[- ]walk/i, "hip-isolation"],
  [/calf[- ]raise/i, "calf"],
  [/crunch|leg[- ]raise|knee[- ]raise/i, "core-flexion"],
  [/plank|hold|hollow[- ]body/i, "core-stability"],
  [/back[- ]extension|superman/i, "back-extension"],
];

function determineFamily(exercise) {
  const provisionalFamily =
    exerciseFamilyOverrides[exercise.id];

  if (provisionalFamily) {
    return {
      family: provisionalFamily,
      source: "provisional-override",
    };
  }

  const category = exercise.category;

  const name = [
    exercise.id ?? "",
    exercise.name ?? "",
  ].join(" ");

  if (category === "stretching") {
    return {
      family: "mobility",
      source: "category",
    };
  }

  if (category === "cardio") {
    return {
      family: "conditioning",
      source: "category",
    };
  }

  if (
    category === "olympic" ||
    category === "plyometrics"
  ) {
    return {
      family: "power",
      source: "category",
    };
  }

  if (SKILL_PATTERN.test(name)) {
    return {
      family: "calisthenics-skill",
      source: "name-rule",
    };
  }

  const mapped =
    VARIATION_FAMILY[exercise.variationGroup];

  if (mapped) {
    return {
      family: mapped,
      source: "variation-group",
    };
  }

  for (const [pattern, family] of NAME_FAMILY_RULES) {
    if (pattern.test(name)) {
      return {
        family,
        source: "name-rule",
      };
    }
  }

  return {
    family: "unclassified",
    source: "unclassified",
  };
}

function inferredGoals(family) {
  if (family === "mobility") {
    return ["mobility"];
  }

  if (family === "conditioning") {
    return ["endurance"];
  }

  if (family === "power") {
    return ["power"];
  }

  if (
    family === "core-stability" ||
    family === "core-flexion"
  ) {
    return ["core", "endurance"];
  }

  if (family === "calisthenics-skill") {
    return ["strength"];
  }

  return ["strength", "hypertrophy"];
}

/**
 * Classifies one exercise without changing it.
 *
 * reference: optional metadata from RepDB when
 * an original Gym Tracker ID overrides its entry.
 */
export function classifyExercise(
  exercise,
  reference = null
) {
  const metadata = {
    ...reference,
    ...exercise,

    category:
      exercise.category ??
      reference?.category ??
      "strength",

    variationGroup:
      exercise.variationGroup ??
      reference?.variationGroup ??
      null,

    tags:
      exercise.tags ??
      reference?.tags ??
      [],

    goals:
      exercise.goals?.length
        ? exercise.goals
        : reference?.goals ?? [],
  };

  const movement = determineFamily(metadata);

  const hasCatalogGoals =
    metadata.goals.length > 0;

  const goals = hasCatalogGoals
    ? [...new Set(metadata.goals)]
    : inferredGoals(movement.family);

  const taggedCalisthenics =
    metadata.tags.includes("calisthenics");

  const inferredCalisthenics =
    CALISTHENICS_PATTERN.test(
      `${exercise.id} ${exercise.name}`
    );

  const familyIndicatesCalisthenics =
    movement.family === "calisthenics-skill";

  const reviewReasons = [];

  if (movement.source === "provisional-override") {
    reviewReasons.push(
      "family-requires-evidence-review"
    );
  }

  if (movement.source === "name-rule") {
    reviewReasons.push(
      "movement-inferred-from-name"
    );
  }

  if (movement.source === "unclassified") {
    reviewReasons.push(
      "movement-unclassified"
    );
  }

  if (!hasCatalogGoals) {
    reviewReasons.push("goals-inferred");
  }

  if (
    inferredCalisthenics &&
    !taggedCalisthenics
  ) {
    reviewReasons.push(
      "calisthenics-inferred-from-name"
    );
  }

  const descriptionCheck =
    exerciseFamilyDescriptionChecks[
      exercise.id
    ] ?? null;

  const descriptionConfirmed =
    descriptionCheck?.status ===
      "catalog-description-checked" &&
    descriptionCheck.family ===
      movement.family;

  if (descriptionConfirmed) {
    const index = reviewReasons.indexOf(
      "family-requires-evidence-review"
    );

    if (index !== -1) {
      reviewReasons.splice(index, 1);
    }
  }

  const movementTraits =
    exerciseMovementTraits[exercise.id] ?? null;

  return {
    exerciseId: exercise.id,
    name: exercise.name,

    muscleGroup: exercise.muscleGroup,
    secondaryMuscles:
      exercise.secondaryMuscles ?? [],

    category: metadata.category,
    variationGroup:
      metadata.variationGroup,

    movementFamily: movement.family,
    movementSource: movement.source,

    secondaryMovementFamilies:
      movementTraits
        ? [...movementTraits.secondaryFamilies]
        : [],

    movementQualities:
      movementTraits
        ? [...movementTraits.qualities]
        : [],

    movementDetailsStatus:
      movementTraits
        ? "provisional-multi-pattern"
        : "not-reviewed",

    requiresGoalReview:
      movementTraits?.requiresGoalReview === true,

    requiresTechniqueReview:
      movementTraits?.requiresTechniqueReview === true,

    goals,
    goalsSource: hasCatalogGoals
      ? "catalog"
      : "heuristic",

    difficulty:
      exercise.difficulty ?? "Unspecified",

    requiredEquipment:
      exercise.equipment ?? [],

    locations:
      exercise.locations ?? [],

    calisthenicsRelated:
      taggedCalisthenics ||
      inferredCalisthenics ||
      familyIndicatesCalisthenics,

    calisthenicsSource:
      taggedCalisthenics
        ? "catalog-tag"
        : inferredCalisthenics
          ? "name-rule"
          : familyIndicatesCalisthenics
            ? "movement-family"
            : "none",

    familyDescriptionCheck:
      descriptionConfirmed
        ? descriptionCheck
        : null,

    needsReview:
      reviewReasons.length > 0,

    reviewReasons,

    // Reserved for later evidence-based work.
    popularityEvidence: "not-reviewed",
    efficacyEvidence: "not-reviewed",
  };
}
