
import { exercises } from "./exercises";

// Curated workout templates
export const workoutPlans = [
  {
    id: "full-body-foundation",
    name: "Full Body Foundation",
    splitId: "full-body",
    description:
      "A flexible starting structure that covers multiple movement patterns.",
    minDays: 1,
    maxDays: 4,
    levels: ["beginner", "intermediate", "advanced"],
    goals: [
      "general-fitness",
      "build-muscle",
      "body-recomposition",
      "improve-endurance",
    ],
    sessions: [
      {
        id: "full-body",
        name: "Full Body",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Upper Body Push",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Upper Body Pull",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Hip Extension",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Stability",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "upper-lower-builder",
    name: "Upper / Lower Builder",
    splitId: "upper-lower",
    description:
      "Alternate upper-body and lower-body sessions across the week.",
    minDays: 2,
    maxDays: 6,
    levels: ["beginner", "intermediate", "advanced"],
    goals: [
      "build-muscle",
      "build-strength",
      "body-recomposition",
      "general-fitness",
    ],
    sessions: [
      {
        id: "upper",
        name: "Upper Body",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "lower",
        name: "Lower Body",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    splitId: "push-pull-legs",
    description:
      "Organize training by pushing, pulling, and lower-body movements.",
    minDays: 3,
    maxDays: 6,
    levels: ["intermediate", "advanced"],
    goals: [
      "build-muscle",
      "build-strength",
      "body-recomposition",
    ],
    sessions: [
      {
        id: "push",
        name: "Push",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
        ],
      },
      {
        id: "pull",
        name: "Pull",
        slots: [
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "legs",
        name: "Legs",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
  {
    id: "abc-training",
    name: "ABC Training",
    splitId: "abc",
    description:
      "Three rotating workout categories that can be customized later.",
    minDays: 3,
    maxDays: 6,
    levels: ["intermediate", "advanced"],
    goals: [
      "build-muscle",
      "general-fitness",
      "improve-endurance",
    ],
    sessions: [
      {
        id: "a",
        name: "Workout A",
        slots: [
          {
            label: "Chest Exercise",
            exerciseIds: [
              "push-up",
              "dumbbell-chest-press",
              "bench-press",
            ],
          },
          {
            label: "Shoulder Exercise",
            exerciseIds: ["dumbbell-shoulder-press"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
      {
        id: "b",
        name: "Workout B",
        slots: [
          {
            label: "Back Exercise",
            exerciseIds: [
              "dumbbell-row",
              "lat-pulldown",
            ],
          },
          {
            label: "Arm Exercise",
            exerciseIds: ["biceps-curl"],
          },
        ],
      },
      {
        id: "c",
        name: "Workout C",
        slots: [
          {
            label: "Squat Pattern",
            exerciseIds: [
              "bodyweight-squat",
              "goblet-squat",
              "leg-press",
            ],
          },
          {
            label: "Glute Exercise",
            exerciseIds: ["glute-bridge"],
          },
          {
            label: "Core Exercise",
            exerciseIds: ["plank"],
          },
        ],
      },
    ],
  },
];

// Check whether an exercise matches the environment
export function isExerciseAvailable(
  exercise,
  location,
  homeEquipment
) {
  if (!exercise.locations.includes(location)) {
    return false;
  }

  // Gym exercises use the gym's available equipment.
  // Actual gym inventory can be modeled later.
  if (location === "gym") {
    return true;
  }

  // Home exercises need every required item.
  return exercise.equipment.every((item) =>
    homeEquipment.includes(item)
  );
}

// Build the exercise suggestions for each session
export function buildPlanPreview(
  plan,
  location,
  homeEquipment
) {
  const exerciseById = new Map(
    exercises.map((exercise) => [
      exercise.id,
      exercise,
    ])
  );

  let totalSlots = 0;
  let matchedSlots = 0;

  const sessions = plan.sessions.map((session) => {
    const suggestedExercises = [];
    const missingSlots = [];

    session.slots.forEach((slot) => {
      totalSlots += 1;

      const matchingExercise = slot.exerciseIds
        .map((id) => exerciseById.get(id))
        .find(
          (exercise) =>
            exercise &&
            isExerciseAvailable(
              exercise,
              location,
              homeEquipment
            )
        );

      if (matchingExercise) {
        matchedSlots += 1;

        suggestedExercises.push({
          id: matchingExercise.id,
          name: matchingExercise.name,
          muscleGroup: matchingExercise.muscleGroup,
          equipment: matchingExercise.equipment,
        });
      } else {
        missingSlots.push(slot.label);
      }
    });

    return {
      id: session.id,
      name: session.name,
      exercises: suggestedExercises,
      missingSlots,
    };
  });

  const coverage =
    totalSlots === 0
      ? 0
      : Math.round((matchedSlots / totalSlots) * 100);

  const hasEmptySession = sessions.some(
    (session) => session.exercises.length === 0
  );

  return {
    sessions,
    totalSlots,
    matchedSlots,
    coverage,
    hasEmptySession,
    isComplete: matchedSlots === totalSlots,
  };
}

// Rank plans using profile priorities and coverage
export function getRecommendedPlans(
  profile,
  location,
  homeEquipment
) {
  if (!profile) {
    return [];
  }

  const frequency = Number(
    profile.trainingDaysPerWeek
  );

  if (
    !Number.isInteger(frequency) ||
    frequency < 1 ||
    frequency > 6
  ) {
    return [];
  }

  const primaryGoal =
    profile.primaryGoal ?? profile.trainingGoal;

  const secondaryGoal =
    profile.secondaryGoal ?? "";

  return workoutPlans
    .filter(
      (plan) =>
        frequency >= plan.minDays &&
        frequency <= plan.maxDays &&
        plan.levels.includes(profile.experienceLevel)
    )
    .map((plan) => {
      const preview = buildPlanPreview(
        plan,
        location,
        homeEquipment
      );

      let score = 0;

      if (plan.goals.includes(primaryGoal)) {
        score += 8;
      }

      if (
        secondaryGoal &&
        plan.goals.includes(secondaryGoal)
      ) {
        score += 3;
      }

      // Favor plans that can use more available exercises
      score += preview.coverage / 20;

      return {
        plan,
        preview,
        score,
      };
    })
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.preview.coverage -
          first.preview.coverage
    );
}
