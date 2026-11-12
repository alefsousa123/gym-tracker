/**
 * D1.4.5 - Exercise muscle-region mapping.
 *
 * Anatomical classification only.
 * Primary and secondary regions are NOT
 * efficacy scores or workout-volume estimates.
 */

export const MUSCLE_TO_REGION = Object.freeze({
  // Glutes
  "Gluteus Maximus": "glutes",
  "Gluteus Medius": "glutes",
  "Glutes": "glutes",

  // Legs
  "Quadriceps": "legs",
  "Hamstrings": "legs",
  "Adductors": "legs",
  "Abductors": "legs",
  "Hip Flexors": "legs",
  "Legs": "legs",

  // Calves / lower leg
  "Gastrocnemius": "calves",
  "Soleus": "calves",
  "Tibialis Anterior": "calves",
  "Calves": "calves",

  // Abs and core
  "Rectus Abdominis": "abs",
  "Transverse Abdominis": "abs",
  "Obliques": "abs",
  "Quadratus Lumborum": "abs",
  "Core": "abs",

  // Back
  "Latissimus Dorsi": "back",
  "Rhomboids": "back",
  "Erector Spinae": "back",
  "Trapezius": "back",
  "Back": "back",

  // Chest
  "Pectoralis Major": "chest",
  "Chest": "chest",

  // Shoulders
  "Anterior Deltoid": "shoulders",
  "Lateral Deltoid": "shoulders",
  "Posterior Deltoid": "shoulders",
  "Infraspinatus Teres Minor": "shoulders",
  "Supraspinatus": "shoulders",
  "Serratus Anterior": "shoulders",
  "Shoulders": "shoulders",

  // Arms
  "Biceps Brachii": "arms",
  "Triceps Brachii": "arms",
  "Brachialis": "arms",
  "Brachioradialis": "arms",
  "Forearm Flexors": "arms",
  "Forearm Extensors": "arms",
  "Forearms": "arms",
  "Biceps": "arms",
  "Triceps": "arms",
  "Arms": "arms",
});

function classifyMuscleNames(names) {
  const regions = new Set();
  const unmapped = new Set();

  for (const name of names) {
    const region = MUSCLE_TO_REGION[name];

    if (region) {
      regions.add(region);
    } else {
      unmapped.add(name);
    }
  }

  return {
    regions: [...regions],
    unmapped: [...unmapped],
  };
}

/**
 * The original Gym Tracker catalog can override
 * RepDB IDs. We use RepDB anatomical metadata
 * when it exists, while preserving the original
 * exercise identity and saved-workout references.
 */
export function classifyExerciseMuscleRegions(
  exercise,
  repdbReference = null
) {
  const hasRepdbAnatomy =
    Array.isArray(repdbReference?.primaryMuscles);

  const primaryMuscles = hasRepdbAnatomy
    ? repdbReference.primaryMuscles
    : Array.isArray(exercise.primaryMuscles)
      ? exercise.primaryMuscles
      : exercise.muscleGroup
        ? [exercise.muscleGroup]
        : [];

  const secondaryMuscles =
    Array.isArray(repdbReference?.secondaryMuscles)
      ? repdbReference.secondaryMuscles
      : Array.isArray(exercise.secondaryMuscles)
        ? exercise.secondaryMuscles
        : [];

  const primary = classifyMuscleNames(
    primaryMuscles
  );

  const secondary = classifyMuscleNames(
    secondaryMuscles
  );

  // A region already classified as primary should
  // not appear a second time as secondary.
  const primarySet = new Set(primary.regions);

  const secondaryRegions =
    secondary.regions.filter(
      (region) => !primarySet.has(region)
    );

  return {
    exerciseId: exercise.id,
    name: exercise.name,

    primaryRegions: primary.regions,
    secondaryRegions,

    anatomySource: hasRepdbAnatomy
      ? "repdb-anatomy"
      : "exercise-catalog-fallback",

    unmappedMuscles: [
      ...new Set([
        ...primary.unmapped,
        ...secondary.unmapped,
      ]),
    ],

    // This flag means anatomical metadata
    // exists. It does NOT mean effectiveness
    // has been scientifically demonstrated.
    hasRegionClassification:
      primary.regions.length > 0,
  };
}
