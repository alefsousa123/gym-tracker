
import { useState } from "react";

import {
  getExerciseFrames,
} from "../../utils/exerciseMedia";

import "./ExerciseMotionPreview.css";

// ==========================================
// EXERCISE MOTION PREVIEW
// ==========================================

function ExerciseMotionPreview({
  exerciseId,
  exerciseName,
  variant = "card",
}) {
  const [failedFrames, setFailedFrames] =
    useState([]);

  // ========================================
  // AVAILABLE FRAMES
  // ========================================

  const frames = getExerciseFrames(
    exerciseId
  ).filter(
    (src) => !failedFrames.includes(src)
  );

  const firstFrame = frames[0] ?? null;
  const secondFrame = frames[1] ?? null;

  const hasAnimation = Boolean(
    firstFrame && secondFrame
  );

  // ========================================
  // IMAGE ERROR HANDLING
  // ========================================

  function handleImageError(src) {
    setFailedFrames((previous) =>
      previous.includes(src)
        ? previous
        : [...previous, src]
    );
  }

  // ========================================
  // CSS CLASSES
  // ========================================

  const previewClass = [
    "exercise-motion-preview",
    `exercise-motion-preview--${variant}`,
    hasAnimation ? "has-animation" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className={previewClass}
      role="img"
      aria-label={
        hasAnimation
          ? `${exerciseName} exercise movement preview`
          : `${exerciseName} exercise preview`
      }
    >
      {firstFrame ? (
        <>
          <img
            className="exercise-motion-frame exercise-motion-frame--first"
            src={firstFrame}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={() =>
              handleImageError(firstFrame)
            }
          />

          {hasAnimation && (
            <img
              className="exercise-motion-frame exercise-motion-frame--second"
              src={secondFrame}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              onError={() =>
                handleImageError(secondFrame)
              }
            />
          )}
        </>
      ) : (
        <div className="exercise-motion-placeholder">
          <span aria-hidden="true">🏋️</span>
          <small>No Preview</small>
        </div>
      )}
    </div>
  );
}

export default ExerciseMotionPreview;
