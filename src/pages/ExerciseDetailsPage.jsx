
import { useParams } from "react-router";

import { exercises } from "../data/exercises";
import { exerciseGuides } from "../data/exerciseGuides";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import ExerciseAnimation from
  "../components/exercises/ExerciseAnimation";

import ExerciseVideo from
  "../components/exercises/ExerciseVideo";

import ExerciseAccordion from
  "../components/exercises/ExerciseAccordion";

import "./ExerciseDetailsLayout.css";

// ==========================================
// EXERCISE DETAILS PAGE
// ==========================================

function ExerciseDetailsPage() {
  const { exerciseId } = useParams();

  // ========================================
  // FIND EXERCISE
  // ========================================

  const exercise = exercises.find(
    (item) => item.id === exerciseId
  );

  // ========================================
  // INVALID EXERCISE
  // ========================================

  if (!exercise) {
    return (
      <div className="exercise-detail-page">
        <h1>Exercise Not Found</h1>

        <p>
          The exercise you're looking for
          doesn't exist.
        </p>

        <BackToPreviousPage />
      </div>
    );
  }

  // ========================================
  // EXERCISE INFORMATION
  // ========================================

  const guide = exerciseGuides[exercise.id];

  const equipmentLabel =
    exercise.equipment.length > 0
      ? exercise.equipment.join(", ")
      : "Bodyweight";

  const secondaryMuscles =
    exercise.secondaryMuscles.length > 0
      ? exercise.secondaryMuscles.join(", ")
      : "None specified";

  const locationLabel = exercise.locations
    .map((location) =>
      location === "home" ? "Home" : "Gym"
    )
    .join(" / ");

  // ========================================
  // PAGE CONTENT
  // ========================================

  return (
    <div className="exercise-detail-page">

      {/* ==================================
          BACK TO ORIGINAL PAGE
      ================================== */}

      <BackToPreviousPage />

      {/* ==================================
          EXERCISE HEADING
      ================================== */}

      <header className="exercise-detail-heading">
        <span className="section-label">
          {exercise.muscleGroup.toUpperCase()}
        </span>

        <h1>{exercise.name}</h1>

        <p>
          {exercise.difficulty}
          {" · "}
          {locationLabel}
        </p>
      </header>

      {/* ==================================
          EXERCISE OVERVIEW
      ================================== */}

      <section
        className="exercise-overview-card"
        aria-label="Exercise Overview"
        key={exercise.id}
      >

        {/* Demonstration */}

        <div className="exercise-overview-visual">
          <ExerciseAnimation
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        </div>

        {/* Expandable Information */}

        <div className="exercise-overview-content">

          <ExerciseAccordion title="How to Perform">
            {guide ? (
              <div className="how-to-content">

                <h3>Starting Position</h3>

                <p>
                  {guide.startingPosition}
                </p>

                <h3>Step-by-Step Execution</h3>

                <ol className="exercise-instructions">
                  {guide.execution.map(
                    (step, index) => (
                      <li key={index}>
                        {step}
                      </li>
                    )
                  )}
                </ol>

                <h3>Breathing</h3>

                <p>
                  {guide.breathing}
                </p>

                <h3>Form Tips</h3>

                <ul className="form-tips-list">
                  {guide.formTips.map(
                    (tip, index) => (
                      <li key={index}>
                        {tip}
                      </li>
                    )
                  )}
                </ul>

              </div>
            ) : (
              <ol className="exercise-instructions">
                {exercise.instructions.map(
                  (step, index) => (
                    <li key={index}>
                      {step}
                    </li>
                  )
                )}
              </ol>
            )}
          </ExerciseAccordion>

          <ExerciseAccordion title="Exercise Information">
            <dl className="exercise-information">

              <div>
                <dt>Primary Muscle</dt>
                <dd>{exercise.muscleGroup}</dd>
              </div>

              <div>
                <dt>Secondary Muscles</dt>
                <dd>{secondaryMuscles}</dd>
              </div>

              <div>
                <dt>Equipment</dt>
                <dd>{equipmentLabel}</dd>
              </div>

              <div>
                <dt>Difficulty</dt>
                <dd>{exercise.difficulty}</dd>
              </div>

              <div>
                <dt>Training Location</dt>
                <dd>{locationLabel}</dd>
              </div>

            </dl>
          </ExerciseAccordion>

          {guide && (
            <>
              <ExerciseAccordion title="Common Mistakes">
                <ul className="common-mistakes-list">
                  {guide.commonMistakes.map(
                    (mistake, index) => (
                      <li key={index}>
                        {mistake}
                      </li>
                    )
                  )}
                </ul>
              </ExerciseAccordion>

              <ExerciseAccordion title="Exercise Variations">
                <div className="exercise-variations">

                  <div className="variation-card">
                    <h3>Easier Variation</h3>

                    <p>
                      {guide.easierVariation}
                    </p>
                  </div>

                  <div className="variation-card">
                    <h3>Harder Variation</h3>

                    <p>
                      {guide.harderVariation}
                    </p>
                  </div>

                </div>
              </ExerciseAccordion>
            </>
          )}

        </div>
      </section>

      {/* ==================================
          VIDEO TUTORIAL
      ================================== */}

      <ExerciseVideo
        exerciseId={exercise.id}
        exerciseName={exercise.name}
      />

      {/* ==================================
          TRAINING SAFETY
      ================================== */}

      <div className="exercise-safety-note">
        <h2>Training Tips</h2>

        <p>
          Start with a manageable difficulty,
          prioritize controlled movement, and
          respect your individual range of motion.
          Stop if you experience pain, dizziness,
          or unusual discomfort.
        </p>
      </div>

    </div>
  );
}

export default ExerciseDetailsPage;
