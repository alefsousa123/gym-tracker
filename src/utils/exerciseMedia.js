
import originalImages from "../data/exerciseImages.json";
import { exercises } from "../data/exercises";

// ==========================================
// EXERCISE LOOKUP
// ==========================================

const exerciseById = new Map(
  exercises.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

// ==========================================
// REPDB IMAGE PATH
// ==========================================

function getRepdbImageUrl(imagePath) {
  if (
    typeof imagePath !== "string" ||
    !/^images\/flat\/[a-z0-9_-]+\.webp$/i.test(imagePath)
  ) {
    return null;
  }

  const fileName = imagePath.split("/").at(-1);

  return `/repdb-images/${fileName}`;
}

// ==========================================
// FIND EXERCISE IMAGES
// ==========================================

export function getExerciseImages(exerciseId) {
  // Original images always have priority.
  const original = originalImages[exerciseId];

  if (original) {
    return original;
  }

  const exercise = exerciseById.get(exerciseId);

  if (
    !exercise ||
    exercise.source !== "repdb"
  ) {
    return null;
  }

  const media = exercise.media ?? {};

  const images = {
    start: getRepdbImageUrl(media.start),
    peak: getRepdbImageUrl(media.peak),
    main: getRepdbImageUrl(media.main),
  };

  const hasImages = Object.values(
    images
  ).some(Boolean);

  return hasImages ? images : null;
}

// ==========================================
// ORDER EXERCISE FRAMES
// ==========================================

export function getExerciseFrames(exerciseId) {
  const images = getExerciseImages(exerciseId);

  if (!images) {
    return [];
  }

  // Preserve the original Push-Up correction.
  const orderedFrames =
    exerciseId === "push-up"
      ? [images.peak, images.start]
      : [images.start, images.peak];

  const frames = orderedFrames.filter(Boolean);

  if (frames.length === 0 && images.main) {
    frames.push(images.main);
  }

  return [...new Set(frames)];
}
