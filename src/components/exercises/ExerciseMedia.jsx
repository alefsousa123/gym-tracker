
import { useState } from "react";

import {
  getExerciseFrames,
} from "../../utils/exerciseMedia";

function ExerciseMedia({
  exerciseId,
  exerciseName,
  compact = false,
}) {
  const [failedFrames, setFailedFrames] =
    useState([]);

  const frames = getExerciseFrames(
    exerciseId
  ).filter(
    (src) => !failedFrames.includes(src)
  );

  if (frames.length === 0) {
    return (
      <div className="exercise-media-placeholder">
        <span aria-hidden="true">🏋️</span>
        <p>Image Not Available</p>
      </div>
    );
  }

  const visibleFrames = compact
    ? frames.slice(0, 1)
    : frames;

  function handleImageError(src) {
    setFailedFrames((previous) =>
      previous.includes(src)
        ? previous
        : [...previous, src]
    );
  }

  return (
    <div
      className={
        compact
          ? "exercise-media compact"
          : "exercise-media"
      }
    >
      {visibleFrames.map((src, index) => {
        const label =
          frames.length === 1
            ? "Exercise Demonstration"
            : index === 0
              ? "Starting Position"
              : "Movement Position";

        return (
          <figure key={src}>
            <img
              src={src}
              alt={`${exerciseName} - ${label}`}
              loading="lazy"
              decoding="async"
              onError={() =>
                handleImageError(src)
              }
            />

            {!compact && (
              <figcaption>
                {label}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

export default ExerciseMedia;
