
import exerciseImages from "../../data/exerciseImages.json";

function ExerciseMedia({
  exerciseId,
  exerciseName,
  compact = false,
}) {
  const images = exerciseImages[exerciseId];

  if (!images || Object.keys(images).length === 0) {
    return (
      <div className="exercise-media-placeholder">
        <span aria-hidden="true">🏋️</span>
        <p>Image Not Available</p>
      </div>
    );
  }

  // Build the image list
  const imageList = [
    images.start && {
      src: images.start,
      position: "start",
    },
    images.peak && {
      src: images.peak,
      position: "peak",
    },
    images.main && {
      src: images.main,
      position: "main",
    },
  ].filter(Boolean);

  // Preserve the corrected image order
  const orderedImages =
    exerciseId === "push-up"
      ? [...imageList].reverse()
      : imageList;

  // Assign captions based on the displayed sequence
  const labeledImages = orderedImages.map((image, index) => {
    let label = "Exercise Demonstration";

    if (orderedImages.length > 1) {
      label =
        index === 0
          ? "Starting Position"
          : index === 1
            ? "Movement Position"
            : "Additional Position";
    }

    return {
      ...image,
      label,
    };
  });

  // Show only the first image on exercise cards
  const visibleImages = compact
    ? labeledImages.slice(0, 1)
    : labeledImages;

  return (
    <div
      className={
        compact
          ? "exercise-media compact"
          : "exercise-media"
      }
    >
      {visibleImages.map((image) => (
        <figure key={image.src}>
          <img
            src={image.src}
            alt={`${exerciseName} - ${image.label}`}
            loading="lazy"
          />

          {!compact && (
            <figcaption>
              {image.label}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

export default ExerciseMedia;
