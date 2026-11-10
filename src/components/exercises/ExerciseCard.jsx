
import { Link } from "react-router";

import ExerciseMotionPreview from "./ExerciseMotionPreview";

function ExerciseCard({ exercise }) {
  const equipmentLabel =
    exercise.equipment.length === 0
      ? "Bodyweight"
      : exercise.equipment.join(", ");

  const locationLabel = exercise.locations
    .map((location) => {
      if (location === "home") {
        return "Home";
      }

      if (location === "gym") {
        return "Gym";
      }

      return location;
    })
    .join(" / ");

  return (
    <article className="exercise-card">
      <Link
        to={`/exercises/${exercise.id}`}
        className="exercise-card-link"
      >
        {/* Animated exercise preview */}
        <ExerciseMotionPreview
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          variant="card"
        />

        {/* Exercise information */}
        <div className="exercise-card-content">
          <div className="exercise-card-top">
            <span className="exercise-difficulty">
              {exercise.difficulty}
            </span>
          </div>

          <h2>{exercise.name}</h2>

          <p className="exercise-muscle">
            {exercise.muscleGroup}
          </p>

          <div className="exercise-details">
            <div>
              <span className="detail-label">
                Equipment
              </span>

              <span>{equipmentLabel}</span>
            </div>

            <div>
              <span className="detail-label">
                Location
              </span>

              <span>{locationLabel}</span>
            </div>
          </div>

          <span className="view-exercise-link">
            View Exercise →
          </span>
        </div>
      </Link>
    </article>
  );
}

export default ExerciseCard;
