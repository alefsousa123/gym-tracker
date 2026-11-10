
const compoundExerciseIds = new Set([
  "push-up",
  "bench-press",
  "dumbbell-chest-press",
  "bodyweight-squat",
  "goblet-squat",
  "leg-press",
  "dumbbell-row",
  "lat-pulldown",
  "dumbbell-shoulder-press",
]);

const timedExerciseIds = new Set([
  "plank",
]);

export const loadMeasurementOptions = [
  {
    value: "total",
    label: "Total External Load",
  },
  {
    value: "per-dumbbell",
    label: "Per Dumbbell",
  },
  {
    value: "machine",
    label: "Machine Stack",
  },
  {
    value: "added-bodyweight",
    label: "Added to Bodyweight",
  },
];

// Identify how an exercise's load should be recorded
function getDefaultLoadMeasurement(exerciseId) {
  if (
    exerciseId.includes("dumbbell") ||
    exerciseId === "goblet-squat" ||
    exerciseId === "biceps-curl"
  ) {
    return "per-dumbbell";
  }

  if (
    exerciseId === "leg-press" ||
    exerciseId === "lat-pulldown"
  ) {
    return "machine";
  }

  if (
    exerciseId === "push-up" ||
    exerciseId === "bodyweight-squat" ||
    exerciseId === "plank" ||
    exerciseId === "glute-bridge"
  ) {
    return "added-bodyweight";
  }

  return "total";
}

// Editable starting values, not mandatory prescriptions
export function createDefaultExerciseTarget(exerciseId) {
  const isTimed = timedExerciseIds.has(exerciseId);

  const restSeconds = isTimed
    ? 60
    : compoundExerciseIds.has(exerciseId)
      ? 120
      : 90;

  return {
    sets: 3,
    targetType: isTimed ? "duration" : "reps",
    minReps: 8,
    maxReps: 12,
    durationSeconds: 30,
    restSeconds,
    weight: "",
    loadMeasurement:
      getDefaultLoadMeasurement(exerciseId),
  };
}

// Preserve existing settings or create new defaults
export function normalizeExerciseTarget(
  exerciseId,
  existingTarget = null
) {
  return {
    ...createDefaultExerciseTarget(exerciseId),
    ...(existingTarget ?? {}),
  };
}

// Convert editable form data to validated numeric values
export function validateExerciseTarget(
  exerciseId,
  target
) {
  const current = normalizeExerciseTarget(
    exerciseId,
    target
  );

  const sets = Number(current.sets);
  const minReps = Number(current.minReps);
  const maxReps = Number(current.maxReps);
  const durationSeconds = Number(
    current.durationSeconds
  );
  const restSeconds = Number(current.restSeconds);

  if (
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > 99
  ) {
    return {
      error: "Sets must be a whole number from 1 to 99.",
    };
  }

  if (
    current.targetType !== "reps" &&
    current.targetType !== "duration"
  ) {
    return {
      error: "Choose repetitions or duration.",
    };
  }

  if (current.targetType === "reps") {
    if (
      !Number.isInteger(minReps) ||
      minReps < 1 ||
      minReps > 100
    ) {
      return {
        error:
          "Minimum repetitions must be between 1 and 100.",
      };
    }

    if (
      !Number.isInteger(maxReps) ||
      maxReps < minReps ||
      maxReps > 100
    ) {
      return {
        error:
          "Maximum repetitions must be at least the minimum and no more than 100.",
      };
    }
  }

  if (current.targetType === "duration") {
    if (
      !Number.isInteger(durationSeconds) ||
      durationSeconds < 1 ||
      durationSeconds > 3600
    ) {
      return {
        error:
          "Duration must be between 1 and 3600 seconds.",
      };
    }
  }

  if (
    !Number.isInteger(restSeconds) ||
    restSeconds < 0 ||
    restSeconds > 900
  ) {
    return {
      error:
        "Rest time must be from 0 to 900 seconds.",
    };
  }

  const weightText = String(
    current.weight ?? ""
  )
    .trim()
    .replace(",", ".");

  const weight = weightText === ""
    ? ""
    : Number(weightText);

  if (
    weightText !== "" &&
    (
      !Number.isFinite(weight) ||
      weight < 0
    )
  ) {
    return {
      error:
        "Weight must be empty or a nonnegative number.",
    };
  }

  const validLoadMeasurement =
    loadMeasurementOptions.some(
      (option) =>
        option.value === current.loadMeasurement
    );

  if (!validLoadMeasurement) {
    return {
      error: "Select a valid load measurement.",
    };
  }

  return {
    error: null,
    value: {
      sets,
      targetType: current.targetType,
      minReps,
      maxReps,
      durationSeconds,
      restSeconds,
      weight,
      loadMeasurement: current.loadMeasurement,
    },
  };
}
