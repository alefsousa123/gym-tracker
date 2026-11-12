import {
  exerciseMuscleRegionsById,
} from '../data/exerciseMuscleRegionAssessments.js';

/**
 * Catalog discovery uses anatomical PRIMARY regions.
 * This is not a suitability score or a claim about effective sets.
 * The old labels remain valid for saved URLs / builder drafts.
 */
export const exerciseMuscleFilterOptions = Object.freeze([
  'Chest', 'Back', 'Shoulders', 'Arms',
  'Biceps', 'Triceps', 'Forearms',
  'Legs', 'Quadriceps', 'Hamstrings',
  'Glutes', 'Calves', 'Core', 'Full Body',
]);

const regionByFilter = Object.freeze({
  Chest: 'chest',
  Back: 'back',
  Shoulders: 'shoulders',
  Arms: 'arms',
  Legs: 'legs',
  Glutes: 'glutes',
  Calves: 'calves',
  Core: 'abs',
});

const detailedMuscles = Object.freeze({
  Biceps: /\b(?:biceps(?: brachii)?|brachialis)\b/i,
  Triceps: /\btriceps(?: brachii)?\b/i,
  Forearms: /\b(?:forearm\w*|brachioradialis)\b/i,
  Quadriceps: /\bquadriceps\b/i,
  Hamstrings: /\bhamstrings\b/i,
});

export function matchesPrimaryMuscleFilter(exercise, filter = 'all') {
  if (filter === 'all' || !filter) return true;
  if (!exercise || typeof exercise.id !== 'string') return false;

  if (filter === 'Full Body') {
    return exercise.muscleGroup === 'Full Body';
  }

  const detailed = detailedMuscles[filter];
  if (detailed) {
    const primaryNames = Array.isArray(exercise.primaryMuscles)
      ? exercise.primaryMuscles
      : [];

    if (primaryNames.some((name) => detailed.test(String(name)))) {
      return true;
    }

    // Original catalog entries may not have fine-grained anatomy.
    // Use only explicit, unambiguous names as a conservative fallback.
    if (primaryNames.length === 0) {
      if (filter === 'Biceps' && exercise.id === 'biceps-curl') {
        return true;
      }
      if (filter === 'Triceps' && /\btricep/i.test(exercise.name ?? '')) {
        return true;
      }
    }
    return false;
  }

  const region = regionByFilter[filter];
  if (!region) return exercise.muscleGroup === filter;

  return (
    exerciseMuscleRegionsById.get(exercise.id)
      ?.primaryRegions?.includes(region) === true ||
    exercise.muscleGroup === filter
  );
}
