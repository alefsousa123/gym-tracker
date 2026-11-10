
import { useState } from "react";
import { exerciseVideos } from "../../data/exerciseVideos";

function ExerciseVideo({ exerciseId, exerciseName }) {
  const [showPlayer, setShowPlayer] = useState(false);

  const video = exerciseVideos[exerciseId];

  if (!video?.youtubeVideoId) {
    return null;
  }

  const videoId = video.youtubeVideoId;

  const embedUrl =
    `https://www.youtube.com/embed/${videoId}`;

  const youtubeUrl =
    `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <section className="exercise-video-panel">
      <div className="video-panel-heading">
        <div className="video-heading-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m10 9 5 3-5 3V9Z" />
          </svg>
        </div>

        <div>
          <h2>Video Tutorial</h2>
          <p>Learn the correct exercise technique</p>
        </div>
      </div>

      <div className="video-information">
        <h3>{video.youtubeTitle}</h3>
        <p>{video.youtubeChannel}</p>
      </div>

      {showPlayer ? (
        <div className="exercise-video-container">
          <iframe
            src={embedUrl}
            title={`${exerciseName} Video Tutorial`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="exercise-video-placeholder">
          <div className="video-play-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="m8 5 12 7-12 7V5Z" />
            </svg>
          </div>

          <h4>Ready to learn?</h4>

          <p>
            Watch the step-by-step exercise demonstration.
          </p>

          <button
            className="video-load-button"
            type="button"
            onClick={() => setShowPlayer(true)}
          >
            <span aria-hidden="true">▶</span>
            Load Video Tutorial
          </button>
        </div>
      )}

      <div className="video-actions">
        {showPlayer && (
          <button
            className="video-close-button"
            type="button"
            onClick={() => setShowPlayer(false)}
          >
            Close Video
          </button>
        )}

        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="video-external-link"
        >
          <span>Watch on YouTube</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}

export default ExerciseVideo;
