
import { useState } from "react";

import {
  getExerciseFrames,
} from "../../utils/exerciseMedia";

import {
  exerciseVideos,
} from "../../data/exerciseVideos";

// ==========================================
// EXERCISE ANIMATION
// ==========================================

function ExerciseAnimation({
  exerciseId,
  exerciseName,
}) {
  const [isPlaying, setIsPlaying] =
    useState(true);

  const [failedFrames, setFailedFrames] =
    useState([]);

  // ========================================
  // EXERCISE MEDIA
  // ========================================

  const video = exerciseVideos[exerciseId];

  const frames = getExerciseFrames(
    exerciseId
  ).filter(
    (src) => !failedFrames.includes(src)
  );

  // ========================================
  // HANDLE IMAGE ERRORS
  // ========================================

  function handleImageError(src) {
    setFailedFrames((previous) =>
      previous.includes(src)
        ? previous
        : [...previous, src]
    );
  }

  // ========================================
  // LOCAL VIDEO
  // ========================================

  if (video?.localVideo) {
    return (
      <section className="exercise-animation-panel">

        <div className="animation-heading">
          <h2>Exercise Demonstration</h2>

          <span className="animation-badge">
            Video Loop
          </span>
        </div>

        <video
          key={`${exerciseId}-${video.localVideo}`}
          className="exercise-loop-video"
          src={video.localVideo}
          autoPlay
          muted
          loop
          playsInline
          controls
          aria-label={
            `${exerciseName} exercise demonstration`
          }
        >
          Your browser does not support video playback.
        </video>

      </section>
    );
  }

  // ========================================
  // NO IMAGES AVAILABLE
  // ========================================

  if (frames.length === 0) {
    return (
      <section className="exercise-animation-panel">

        <div className="animation-heading">
          <h2>Exercise Demonstration</h2>
        </div>

        <div className="exercise-motion-placeholder">
          <span aria-hidden="true">🏋️</span>

          <p>Demonstration Not Available</p>
        </div>

      </section>
    );
  }

  // ========================================
  // IMAGE DEMONSTRATION
  // ========================================

  const hasTwoPositions =
    frames.length >= 2;

  const animationState =
    isPlaying ? "running" : "paused";

  return (
    <section className="exercise-animation-panel">

      {/* HEADING */}

      <div className="animation-heading">
        <h2>Exercise Demonstration</h2>

        <span className="animation-badge">
          {hasTwoPositions
            ? "Pose Preview"
            : "Static Preview"}
        </span>
      </div>

      {/* IMAGES */}

      <div
        className="exercise-animation-stage"
        key={exerciseId}
      >
        <img
          className="animation-image animation-image-first"
          src={frames[0]}
          alt={`${exerciseName} first position`}
          style={{
            animationPlayState: animationState,
          }}
          onError={() =>
            handleImageError(frames[0])
          }
        />

        {hasTwoPositions && (
          <img
            className="animation-image animation-image-second"
            src={frames[1]}
            alt={`${exerciseName} second position`}
            style={{
              animationPlayState: animationState,
            }}
            onError={() =>
              handleImageError(frames[1])
            }
          />
        )}
      </div>

      {/* ANIMATION CONTROLS */}

      {hasTwoPositions && (
        <>
          <p className="animation-description">
            This preview alternates between exercise
            positions. It is not a continuous movement
            demonstration.
          </p>

          <button
            className="animation-control"
            type="button"
            onClick={() =>
              setIsPlaying(
                (previous) => !previous
              )
            }
          >
            {isPlaying
              ? "Pause Preview"
              : "Play Preview"}
          </button>
        </>
      )}

    </section>
  );
}

export default ExerciseAnimation;
