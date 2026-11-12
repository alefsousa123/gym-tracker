
import { exercises } from "../data/exercises";

// ==========================================
// VALIDATION HELPERS
// ==========================================

function getPositiveReps(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const reps = Number(value);

  return Number.isInteger(reps) && reps > 0
    ? reps
    : null;
}

function getPositiveWeight(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const weight = Number(value);

  return Number.isFinite(weight) && weight > 0
    ? weight
    : null;
}

function getExerciseName(exerciseId) {
  return (
    exercises.find(
      (exercise) => exercise.id === exerciseId
    )?.name ?? exerciseId
  );
}

function getWeightUnit(workout) {
  if (
    workout.weightUnit === "kg" ||
    workout.weightUnit === "lb"
  ) {
    return workout.weightUnit;
  }

  return "unknown";
}

function getLoadMeasurement(exercise) {
  const value =
    exercise.target?.loadMeasurement;

  return (
    typeof value === "string" &&
    value.trim()
  )
    ? value.trim()
    : "unspecified";
}

// ==========================================
// EXTRACT ACTUAL TRAINING DATA
// ==========================================

export function buildTrainingChartData(
  workoutHistory
) {
  const records = [];

  const history = Array.isArray(workoutHistory)
    ? workoutHistory
    : [];

  for (const workout of history) {
    const finishedAt = Date.parse(
      workout?.finishedAt
    );

    if (
      !Number.isFinite(finishedAt) ||
      !Array.isArray(workout?.exercises)
    ) {
      continue;
    }

    const weightUnit =
      getWeightUnit(workout);

    for (const exercise of workout.exercises) {
      // Timed exercises are not included
      // in repetition/load charts.
      if (
        exercise.target?.targetType ===
        "duration"
      ) {
        continue;
      }

      const sets = Array.isArray(
        exercise.completedSets
      )
        ? exercise.completedSets
        : [];

      const repetitionSets = [];

      for (const set of sets) {
        if (set.targetType === "duration") {
          continue;
        }

        const reps = getPositiveReps(
          set.reps
        );

        if (reps === null) {
          continue;
        }

        repetitionSets.push({
          reps,

          weight: getPositiveWeight(
            set.weight
          ),
        });
      }

      if (repetitionSets.length === 0) {
        continue;
      }

      const weightedSets =
        repetitionSets.filter(
          (set) => set.weight !== null
        );

      const totalReps =
        repetitionSets.reduce(
          (total, set) =>
            total + set.reps,
          0
        );

      // Only sets with a recorded positive
      // load contribute to these metrics.
      const maxWeight =
        weightedSets.length > 0
          ? Math.max(
              ...weightedSets.map(
                (set) => set.weight
              )
            )
          : null;

      const loadVolume =
        weightedSets.length > 0
          ? weightedSets.reduce(
              (total, set) =>
                total +
                set.weight * set.reps,
              0
            )
          : null;

      const loadMeasurement =
        getLoadMeasurement(exercise);

      // Separate comparisons by unit and
      // loading convention.
      const variantKey = JSON.stringify([
        weightUnit,
        loadMeasurement,
      ]);

      records.push({
        workoutId: workout.id,
        sessionName:
          workout.sessionName ?? "Workout",

        finishedAt:
          workout.finishedAt,

        exerciseId:
          exercise.exerciseId,

        exerciseName:
          getExerciseName(
            exercise.exerciseId
          ),

        weightUnit,
        loadMeasurement,
        variantKey,

        setCount: repetitionSets.length,
        weightedSetCount:
          weightedSets.length,

        totalReps,
        maxWeight,
        loadVolume,
      });
    }
  }


  // ========================================
  // U1.7A - GROUP REPEATED ENTRIES
  // ========================================
  //
  // One chart record per workout, exercise
  // and loading convention.
  //
  // Multiple occurrences contribute their
  // actual sets, reps and load-volume.
  //
  // They do not create extra workout
  // sessions on the chart.

  const combinedRecordsBySession = new Map();

  for (const record of records) {
    const key = JSON.stringify([
      record.workoutId,
      record.finishedAt,
      record.exerciseId,
      record.variantKey,
    ]);

    const previous =
      combinedRecordsBySession.get(key);

    if (!previous) {
      combinedRecordsBySession.set(
        key,
        { ...record }
      );

      continue;
    }

    previous.setCount +=
      record.setCount;

    previous.weightedSetCount +=
      record.weightedSetCount;

    previous.totalReps +=
      record.totalReps;

    previous.maxWeight =
      previous.maxWeight === null
        ? record.maxWeight
        : record.maxWeight === null
          ? previous.maxWeight
          : Math.max(
              previous.maxWeight,
              record.maxWeight
            );

    previous.loadVolume =
      previous.loadVolume === null &&
      record.loadVolume === null
        ? null
        : (
            previous.loadVolume ?? 0
          ) + (
            record.loadVolume ?? 0
          );
  }

  const combinedRecords = Array.from(
    combinedRecordsBySession.values()
  );

  // Oldest sessions first: this is
  // the correct order for a timeline.
  combinedRecords.sort(
    (first, second) =>
      Date.parse(first.finishedAt) -
      Date.parse(second.finishedAt)
  );

  const exerciseMap = new Map();

  for (const record of combinedRecords) {
    exerciseMap.set(
      record.exerciseId,
      record.exerciseName
    );
  }

  const exerciseOptions = Array.from(
    exerciseMap,
    ([id, name]) => ({
      id,
      name,
    })
  ).sort(
    (first, second) =>
      first.name.localeCompare(second.name)
  );

  return {
    records: combinedRecords,
    exerciseOptions,
  };
}

// ==========================================
// UNIT / LOAD VARIANTS
// ==========================================

export function getTrainingChartVariants(
  records,
  exerciseId
) {
  const variants = new Map();

  for (const record of records) {
    if (
      record.exerciseId !== exerciseId
    ) {
      continue;
    }

    if (variants.has(record.variantKey)) {
      continue;
    }

    const unitLabel =
      record.weightUnit === "unknown"
        ? "Unit not recorded"
        : record.weightUnit;

    const measurementLabel =
      record.loadMeasurement === "unspecified"
        ? "Load type not specified"
        : record.loadMeasurement
            .replace(/[-_]/g, " ");

    variants.set(record.variantKey, {
      key: record.variantKey,

      weightUnit: record.weightUnit,
      loadMeasurement:
        record.loadMeasurement,

      label:
        `${unitLabel} · ${measurementLabel}`,
    });
  }

  return Array.from(variants.values());
}

// ==========================================
// SELECT THE TIMELINE
// ==========================================

export function getTrainingChartRecords(
  records,
  exerciseId,
  variantKey
) {
  return records.filter(
    (record) =>
      record.exerciseId === exerciseId &&
      record.variantKey === variantKey
  );
}

// ==========================================
// SUMMARY STATISTICS
// ==========================================

export function getTrainingChartStats(records) {
  const weightedRecords =
    records.filter(
      (record) =>
        record.maxWeight !== null
    );

  const volumeRecords =
    records.filter(
      (record) =>
        record.loadVolume !== null
    );

  const totalReps = records.reduce(
    (total, record) =>
      total + record.totalReps,
    0
  );

  const totalVolume =
    volumeRecords.length > 0
      ? volumeRecords.reduce(
          (total, record) =>
            total + record.loadVolume,
          0
        )
      : null;

  const bestWeight =
    weightedRecords.length > 0
      ? Math.max(
          ...weightedRecords.map(
            (record) => record.maxWeight
          )
        )
      : null;

  const latestWeight =
    weightedRecords.length > 0
      ? weightedRecords[
          weightedRecords.length - 1
        ].maxWeight
      : null;

  const missingWeightSets =
    records.reduce(
      (total, record) =>
        total +
        (
          record.setCount -
          record.weightedSetCount
        ),
      0
    );

  return {
    sessionCount: records.length,
    totalReps,
    totalVolume,
    bestWeight,
    latestWeight,
    missingWeightSets,
  };
}
