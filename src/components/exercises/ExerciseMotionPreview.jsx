
import exerciseImages from "../../data/exerciseImages.json";

import "./ExerciseMotionPreview.css";

function ExerciseMotionPreview({
  exerciseId,
  exerciseName,
  variant = "card",
}) {
  const images = exerciseImages[exerciseId];

  // Match the pose order already used in ExerciseAnimation.
  const frames =
    exerciseId === "push-up"
      ? [images?.peak, images?.start]
      : [images?.start, images?.peak];

  const availableFrames = frames.filter(Boolean);

  // A single main image is a fallback when two poses
  // are not available.
  const firstFrame =
    availableFrames[0] ?? images?.main ?? null;

  const secondFrame =
    availableFrames[1] &&
    availableFrames[1] !== firstFrame
      ? availableFrames[1]
      : null;

  const hasAnimation = Boolean(
    firstFrame && secondFrame
  );

  const previewClass = [
    "exercise-motion-preview",
    `exercise-motion-preview--${variant}`,
    hasAnimation ? "has-animation" : "",
  ]
    .filter(Boolean)
    .join(" ");

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
          />

          {hasAnimation && (
            <img
              className="exercise-motion-frame exercise-motion-frame--second"
              src={secondFrame}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
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
