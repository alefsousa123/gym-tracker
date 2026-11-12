import repdbExercises from "./repdb.catalog.generated.json";
import {
  CURATED_EXERCISE_IDS,
  CURATED_RECOMMENDATION_TAG,
} from "./exerciseRecommendationTags";

// ==========================================
// ORIGINAL GYM TRACKER EXERCISES
// ==========================================

// Preserve these original IDs because saved
// plans and workout history may reference them.

const originalExercises = [
  {
    id: "push-up",
    name: "Push-Up",
    muscleGroup: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: [],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Start in a high plank position.",
      "Lower your chest with control.",
      "Push back to the starting position.",
    ],
  },
  {
    id: "bench-press",
    name: "Barbell Bench Press",
    muscleGroup: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: ["Barbell", "Bench", "Weight Plates"],
    locations: ["gym"],
    difficulty: "Intermediate",
    instructions: [
      "Lie on a flat bench.",
      "Lower the bar with control.",
      "Press the bar upward.",
    ],
  },
  {
    id: "dumbbell-chest-press",
    name: "Dumbbell Chest Press",
    muscleGroup: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: ["Dumbbells", "Bench"],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Lie on a stable bench with dumbbells.",
      "Lower the weights with control.",
      "Press them upward.",
    ],
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight Squat",
    muscleGroup: "Legs",
    secondaryMuscles: ["Glutes"],
    equipment: [],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Stand with feet approximately shoulder-width apart.",
      "Bend your hips and knees with control.",
      "Return to standing.",
    ],
  },
  {
    id: "goblet-squat",
    name: "Goblet Squat",
    muscleGroup: "Legs",
    secondaryMuscles: ["Glutes", "Core"],
    equipment: ["Dumbbells"],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Hold a dumbbell close to your chest.",
      "Squat down with control.",
      "Return to standing.",
    ],
  },
  {
    id: "leg-press",
    name: "Leg Press",
    muscleGroup: "Legs",
    secondaryMuscles: ["Glutes"],
    equipment: ["Leg Press Machine"],
    locations: ["gym"],
    difficulty: "Beginner",
    instructions: [
      "Adjust the seat and foot position.",
      "Lower the platform within a comfortable range.",
      "Press it away without locking your knees forcefully.",
    ],
  },
  {
    id: "dumbbell-row",
    name: "Dumbbell Row",
    muscleGroup: "Back",
    secondaryMuscles: ["Biceps"],
    equipment: ["Dumbbells"],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Support your body in a stable position.",
      "Pull the dumbbell toward your torso.",
      "Lower it slowly.",
    ],
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscleGroup: "Back",
    secondaryMuscles: ["Biceps"],
    equipment: ["Cable Machine"],
    locations: ["gym"],
    difficulty: "Beginner",
    instructions: [
      "Sit securely at the machine.",
      "Pull the bar toward your upper chest.",
      "Return slowly to the starting position.",
    ],
  },
  {
    id: "dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    muscleGroup: "Shoulders",
    secondaryMuscles: ["Triceps"],
    equipment: ["Dumbbells"],
    locations: ["home", "gym"],
    difficulty: "Intermediate",
    instructions: [
      "Hold the dumbbells near shoulder height.",
      "Press upward with control.",
      "Lower them slowly.",
    ],
  },
  {
    id: "biceps-curl",
    name: "Dumbbell Biceps Curl",
    muscleGroup: "Arms",
    secondaryMuscles: [],
    equipment: ["Dumbbells"],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Stand with dumbbells by your sides.",
      "Bend your elbows to lift the weights.",
      "Lower them slowly.",
    ],
  },
  {
    id: "plank",
    name: "Plank",
    muscleGroup: "Core",
    secondaryMuscles: ["Shoulders"],
    equipment: [],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Place your forearms on the floor.",
      "Keep your body in a straight alignment.",
      "Hold the position while breathing normally.",
    ],
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    muscleGroup: "Glutes",
    secondaryMuscles: ["Legs", "Core"],
    equipment: [],
    locations: ["home", "gym"],
    difficulty: "Beginner",
    instructions: [
      "Lie on your back with knees bent.",
      "Lift your hips with control.",
      "Lower your hips to the floor.",
    ],
  },
];

// ==========================================
// IMPORTED REPDB EXERCISES
// ==========================================

// Build a Set of existing exercise IDs.
const originalExerciseIds = new Set(
  originalExercises.map((exercise) => exercise.id)
);

// Prevent duplicate IDs and prioritize
// the original Gym Tracker exercises.
const additionalExercises = repdbExercises.filter(
  (exercise) => !originalExerciseIds.has(exercise.id)
);

// ==========================================
// COMPLETE EXERCISE CATALOG
// ==========================================

// Both sources use the same normalized data
// structure and can be consumed by React.

export const exercises = [
  ...originalExercises,
  ...additionalExercises,
].map((exercise) => ({
  ...exercise,
  recommendationTags: [
    ...(Array.isArray(exercise.recommendationTags)
      ? exercise.recommendationTags
      : []),
    ...(CURATED_EXERCISE_IDS.has(exercise.id)
      ? [CURATED_RECOMMENDATION_TAG]
      : []),
  ],
})).sort((first, second) =>
  first.name.localeCompare(second.name, "en", {
    sensitivity: "base",
  })
);


// D2.3S EQUIPMENT OVERRIDES V2
// Apply corrected equipment requirements after
// the complete catalog has been constructed.
// Preserve exercise IDs and the source dataset.

const equipmentOverridesD23S = {
  // D2.3S EQUIPMENT CORRECTIONS V3
  "dumbbell-row": ["Dumbbells", "Bench"],
  "back-extension": ["Back Extension Machine"],

  "chest-supported-db-row": [
    "Dumbbells",
    "Incline Bench"
  ],
  "chest-supported-kettlebell-row": [
    "Kettlebells",
    "Incline Bench"
  ],
  "single-arm-chest-supported-dumbbell-row": [
    "Dumbbells",
    "Incline Bench"
  ],
  "chest-supported-dumbbell-shrug": [
    "Dumbbells",
    "Incline Bench"
  ],
  "bench-pull": [
    "Barbell",
    "Bench"
  ],
  "dumbbell-bench-pull": [
    "Dumbbells",
    "Bench"
  ],
  "hyperextension-hold-bench": [
    "Back Extension Machine"
  ]
};

for (let index = 0; index < exercises.length; index++) {
  const exercise = exercises[index];

  const equipment =
    equipmentOverridesD23S[exercise.id];

  if (equipment) {
    exercises[index] = {
      ...exercise,
      equipment: [...equipment],
    };
  }
}
