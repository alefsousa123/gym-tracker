
import { useState } from "react";

import exerciseImages from "../../data/exerciseImages.json";
import { exerciseVideos } from "../../data/exerciseVideos";

function ExerciseAnimation({ exerciseId, exerciseName }) {
  const [isPlaying, setIsPlaying] = useState(true);

  const images = exerciseImages[exerciseId];
  const video = exerciseVideos[exerciseId];

  // Use a local animation when one is available.
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
          key={video.localVideo}
          className="exercise-loop-video"
          src={video.localVideo}
          autoPlay
          muted
          loop
          playsInline
          controls
          aria-label={`${exerciseName} exercise demonstration`}
        >
          Your browser does not support video playback.
        </video>
      </section>
    );
  }

  if (!images) {
    return null;
  }

  // Preserve the corrected Push-Up image order.
  const imageList =
    exerciseId === "push-up"
      ? [images.peak, images.start]
      : [images.start, images.peak];

  const availableImages = imageList.filter(Boolean);

  // Handle static exercises with a single main image.
  if (availableImages.length === 0 && images.main) {
    availableImages.push(images.main);
  }

  if (availableImages.length === 0) {
    return null;
  }

  const hasTwoPositions = availableImages.length >= 2;

  return (
    <section className="exercise-animation-panel">
      <div className="animation-heading">
        <h2>Exercise Demonstration</h2>

        <span className="animation-badge">
          {hasTwoPositions ? "Pose Preview" : "Static Preview"}
        </span>
      </div>

      <div
        className="exercise-animation-stage"
        style={{
          animationPlayState: isPlaying ? "running" : "paused",
        }}
      >
        <img
          className="animation-image animation-image-first"
          src={availableImages[0]}
          alt={`${exerciseName} first position`}
        />

        {hasTwoPositions && (
          <img
            className="animation-image animation-image-second"
            src={availableImages[1]}
            alt={`${exerciseName} second position`}
          />
        )}
      </div>

      {hasTwoPositions && (
        <>
          <p className="animation-description">
            This preview alternates between exercise positions.
            It is not a continuous movement demonstration.
          </p>

          <button
            className="animation-control"
            type="button"
            onClick={() => setIsPlaying((previous) => !previous)}
          >
            {isPlaying ? "Pause Preview" : "Play Preview"}
          </button>
        </>
      )}
    </section>
  );
}

export default ExerciseAnimation;
