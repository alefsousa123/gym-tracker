import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { exercises } from "../data/exercises";
import { exerciseGuides } from "../data/exerciseGuides";
import { isExerciseAvailable } from "../data/workoutPlans";
import { useEquipment } from "../context/EquipmentContext";
import { useTrainingProfile } from "../context/TrainingProfileContext";

import BackToPreviousPage from "../components/navigation/BackToPreviousPage";
import ExerciseAnimation from "../components/exercises/ExerciseAnimation";
import ExerciseMotionPreview from "../components/exercises/ExerciseMotionPreview";
import ExerciseVideo from "../components/exercises/ExerciseVideo";
import ExerciseAccordion from "../components/exercises/ExerciseAccordion";

import "./ExerciseDetailsLayout.css";

// ==========================================
// C5.3 - LOAD REPDB DETAILS ONLY ON DEMAND
// ==========================================

const detailLoaders = [
  () => import("../data/repdb.details.0.generated.json"),
  () => import("../data/repdb.details.1.generated.json"),
  () => import("../data/repdb.details.2.generated.json"),
  () => import("../data/repdb.details.3.generated.json"),
];

const detailsPromiseCache = new Map();

function loadDetailsPart(partIndex) {
  const index = Number(partIndex);
  const load = detailLoaders[index];

  if (!load) {
    return Promise.reject(
      new Error(`Invalid RepDB details part: ${partIndex}`)
    );
  }

  if (!detailsPromiseCache.has(index)) {
    const promise = load()
      .then((module) => module.default)
      .catch((error) => {
        detailsPromiseCache.delete(index);
        throw error;
      });

    detailsPromiseCache.set(index, promise);
  }

  return detailsPromiseCache.get(index);
}

// ==========================================
// ORIGINAL EXERCISE GROUPS
// ==========================================

const VARIATIONS_PER_PAGE = 6;

const difficultyLevels = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const originalVariationGroups = {
  "push-up": "push-up",
  "bench-press": "bench-press",
  "dumbbell-chest-press": "bench-press",
  "bodyweight-squat": "squat",
  "goblet-squat": "squat",
  "leg-press": "leg-press",
  "dumbbell-row": "row",
  "lat-pulldown": "lat-pulldown",
  "dumbbell-shoulder-press": "overhead-press",
  "biceps-curl": "biceps-curl",
  "plank": "plank",
  "glute-bridge": "glute-bridge",
};

function getVariationGroup(exercise) {
  const variationGroup =
    typeof exercise.variationGroup === "string"
      ? exercise.variationGroup.trim()
      : "";

  return variationGroup || originalVariationGroups[exercise.id] || null;
}

const exerciseById = new Map();
const exercisesByVariationGroup = new Map();

for (const exercise of exercises) {
  exerciseById.set(exercise.id, exercise);

  const group = getVariationGroup(exercise);
  if (!group) continue;

  if (!exercisesByVariationGroup.has(group)) {
    exercisesByVariationGroup.set(group, []);
  }

  exercisesByVariationGroup.get(group).push(exercise);
}

function getRelatedExercises(exercise) {
  const group = getVariationGroup(exercise);
  if (!group) return [];

  const candidates = exercisesByVariationGroup.get(group) ?? [];
  const seenNames = new Set([exercise.name.trim().toLowerCase()]);

  return candidates
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) => {
      const normalizedName = candidate.name.trim().toLowerCase();

      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });
}

function getDifficultyDistance(difficulty, experienceLevel) {
  const exerciseLevel =
    difficultyLevels[String(difficulty ?? "").toLowerCase()];
  const userLevel =
    difficultyLevels[String(experienceLevel ?? "").toLowerCase()];

  if (exerciseLevel === undefined || userLevel === undefined) {
    return 99;
  }

  return Math.abs(exerciseLevel - userLevel);
}

function getExerciseAvailability(exercise, trainingLocation, homeEquipment) {
  if (!["home", "gym", "both"].includes(trainingLocation)) {
    return { available: null, label: "Availability not configured" };
  }

  const availableAtHome = isExerciseAvailable(
    exercise,
    "home",
    homeEquipment
  );

  const availableAtGym = isExerciseAvailable(
    exercise,
    "gym",
    homeEquipment
  );

  if (trainingLocation === "home") {
    return {
      available: availableAtHome,
      label: availableAtHome
        ? "Matches Your Home Setup"
        : "Other Equipment / Location Needed",
    };
  }

  if (trainingLocation === "gym") {
    return {
      available: availableAtGym,
      label: availableAtGym
        ? "Available at Gym"
        : "Not Listed for Gym Training",
    };
  }

  const available = availableAtHome || availableAtGym;
  const label = availableAtHome && availableAtGym
    ? "Home & Gym"
    : availableAtHome
      ? "Available at Home"
      : availableAtGym
        ? "Available at Gym"
        : "Other Equipment / Location Needed";

  return { available, label };
}

function rankRelatedExercises(exercise, profile, homeEquipment) {
  return getRelatedExercises(exercise)
    .map((item) => ({
      exercise: item,
      availability: getExerciseAvailability(
        item,
        profile?.trainingLocation ?? null,
        homeEquipment
      ),
      difficultyDistance: getDifficultyDistance(
        item.difficulty,
        profile?.experienceLevel
      ),
    }))
    .sort((first, second) => {
      const firstAvailable = first.availability.available === true ? 1 : 0;
      const secondAvailable = second.availability.available === true ? 1 : 0;

      if (firstAvailable !== secondAvailable) {
        return secondAvailable - firstAvailable;
      }

      if (first.difficultyDistance !== second.difficultyDistance) {
        return first.difficultyDistance - second.difficultyDistance;
      }

      return first.exercise.name.localeCompare(second.exercise.name, "en", {
        sensitivity: "base",
      });
    });
}

// ==========================================
// RELATED EXERCISES - COLLAPSED BY DEFAULT
// ==========================================

function RelatedExercises({ exercise }) {
  const { homeEquipment } = useEquipment();
  const { profile } = useTrainingProfile();
  const [visibleCount, setVisibleCount] = useState(VARIATIONS_PER_PAGE);

  const rankedExercises = rankRelatedExercises(
    exercise,
    profile,
    homeEquipment
  );

  if (rankedExercises.length === 0) return null;

  const visibleExercises = rankedExercises.slice(0, visibleCount);
  const hasMore = visibleCount < rankedExercises.length;
  const compatibleCount = rankedExercises.filter(
    (item) => item.availability.available === true
  ).length;

  return (
    <ExerciseAccordion
      title={`Related Exercises (${rankedExercises.length})`}
      defaultOpen={false}
    >
      <div className="exercise-variations">
        <p style={{
          margin: "0 0 10px",
          color: "var(--color-text-secondary)",
          fontSize: 12,
          lineHeight: 1.7,
        }}>
          Explore alternatives from the same movement family.
          Compatible options appear first. Related exercises are
          not necessarily easier or harder progressions.
        </p>

        {profile && (
          <p style={{
            margin: "0 0 12px",
            color: "var(--color-text-secondary)",
            fontSize: 12,
          }}>
            {compatibleCount} of {rankedExercises.length} variations
            {" "}match your training setup.
          </p>
        )}

        {visibleExercises.map(({
          exercise: relatedExercise,
          availability,
          difficultyDistance,
        }) => (
          <Link
            key={relatedExercise.id}
            to={`/exercises/${relatedExercise.id}`}
            className="variation-card"
            aria-label={`View ${relatedExercise.name}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <ExerciseMotionPreview
              exerciseId={relatedExercise.id}
              exerciseName={relatedExercise.name}
              variant="thumbnail"
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3>{relatedExercise.name}</h3>

              <p>
                {relatedExercise.muscleGroup}
                {" · "}
                {relatedExercise.difficulty}
              </p>

              <p>
                Equipment: {relatedExercise.equipment.length > 0
                  ? relatedExercise.equipment.join(", ")
                  : "Bodyweight"}
              </p>

              <p>
                Location: {relatedExercise.locations.map((location) =>
                  location === "home" ? "Home" : "Gym"
                ).join(" / ")}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {availability.available !== null && (
                  <span style={{
                    display: "inline-block",
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: availability.available
                      ? "var(--color-mint)"
                      : "var(--color-inset)",
                    color: availability.available
                      ? "var(--color-success-text)"
                      : "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {availability.label}
                  </span>
                )}

                {profile?.experienceLevel && difficultyDistance === 0 && (
                  <span style={{
                    display: "inline-block",
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: "var(--color-surface-soft)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    Matches Your Experience Level
                  </span>
                )}
              </div>

              <span style={{
                display: "inline-block",
                marginTop: 10,
                color: "var(--color-accent)",
                fontSize: 12,
                fontWeight: 700,
              }}>
                View Exercise →
              </span>
            </div>
          </Link>
        ))}

        {hasMore && (
          <button
            type="button"
            className="animation-control"
            onClick={() => setVisibleCount(
              (previous) => previous + VARIATIONS_PER_PAGE
            )}
          >
            Load More Variations
          </button>
        )}
      </div>
    </ExerciseAccordion>
  );
}

// ==========================================
// ORIGINAL EXERCISE PROGRESSIONS
// ==========================================

function ExerciseProgressions({ guide }) {
  if (!guide?.easierVariation && !guide?.harderVariation) {
    return null;
  }

  return (
    <ExerciseAccordion title="Exercise Progressions">
      <div className="exercise-variations">
        {guide.easierVariation && (
          <div className="variation-card">
            <h3>Easier Variation</h3>
            <p>{guide.easierVariation}</p>
          </div>
        )}

        {guide.harderVariation && (
          <div className="variation-card">
            <h3>Harder Variation</h3>
            <p>{guide.harderVariation}</p>
          </div>
        )}
      </div>
    </ExerciseAccordion>
  );
}

// ==========================================
// EXERCISE DETAILS CONTENT
// ==========================================

function ExerciseDetailsContent({ exerciseId }) {
  const exercise = exerciseById.get(exerciseId);

  const [repdbDetails, setRepdbDetails] = useState(null);
  const [detailsStatus, setDetailsStatus] = useState("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!exercise || exercise.source !== "repdb") return;

    let active = true;

    loadDetailsPart(exercise.detailsPart)
      .then((detailsById) => {
        if (!active) return;
        setRepdbDetails(detailsById[exercise.id] ?? null);
        setDetailsStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to load RepDB exercise details:", error);
        if (active) setDetailsStatus("error");
      });

    return () => {
      active = false;
    };
  }, [exercise, retryCount]);

  if (!exercise) {
    return (
      <div className="exercise-detail-page">
        <h1>Exercise Not Found</h1>
        <p>The exercise you're looking for doesn't exist.</p>
        <BackToPreviousPage />
      </div>
    );
  }

  const guide = exerciseGuides[exercise.id];
  const isRepdb = exercise.source === "repdb";

  // The catalog contains lightweight metadata.
  // Only RepDB descriptions, instructions and tips
  // are loaded separately when this page is opened.
  const description = isRepdb
    ? repdbDetails?.description ?? ""
    : exercise.description ?? "";

  const instructions = isRepdb
    ? repdbDetails?.instructions ?? []
    : exercise.instructions ?? [];

  const tips = isRepdb
    ? repdbDetails?.tips ?? []
    : exercise.tips ?? [];

  const equipmentLabel = exercise.equipment.length > 0
    ? exercise.equipment.join(", ")
    : "Bodyweight";

  const secondaryMuscles = exercise.secondaryMuscles.length > 0
    ? exercise.secondaryMuscles.join(", ")
    : "None specified";

  const locationLabel = exercise.locations.map((location) =>
    location === "home" ? "Home" : "Gym"
  ).join(" / ");

  return (
    <div className="exercise-detail-page">
      <BackToPreviousPage />

      <header className="exercise-detail-heading">
        <span className="section-label">
          {exercise.muscleGroup.toUpperCase()}
        </span>
        <h1>{exercise.name}</h1>
        <p>{exercise.difficulty}{" · "}{locationLabel}</p>
      </header>

      <section
        className="exercise-overview-card"
        aria-label="Exercise Overview"
      >
        <div className="exercise-overview-visual">
          <ExerciseAnimation
            exerciseId={exercise.id}
            exerciseName={exercise.name}
          />
        </div>

        <div className="exercise-overview-content">
          <ExerciseAccordion title="How to Perform">
            {guide ? (
              <div className="how-to-content">
                <h3>Starting Position</h3>
                <p>{guide.startingPosition}</p>

                <h3>Step-by-Step Execution</h3>
                <ol className="exercise-instructions">
                  {guide.execution.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>

                <h3>Breathing</h3>
                <p>{guide.breathing}</p>

                <h3>Form Tips</h3>
                <ul className="form-tips-list">
                  {guide.formTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="how-to-content">
                {isRepdb && detailsStatus === "loading" ? (
                  <p role="status">Loading exercise instructions...</p>
                ) : isRepdb && detailsStatus === "error" ? (
                  <div>
                    <p>Could not load exercise instructions.</p>
                    <button
                      type="button"
                      className="animation-control"
                      onClick={() => {
                        setDetailsStatus("loading");
                        setRetryCount((previous) => previous + 1);
                      }}
                    >
                      Retry Loading
                    </button>
                  </div>
                ) : (
                  <>
                    {description && <p>{description}</p>}

                    {instructions.length > 0 ? (
                      <ol className="exercise-instructions">
                        {instructions.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p>Instructions are not available.</p>
                    )}

                    {tips.length > 0 && (
                      <>
                        <h3>Form Tips</h3>
                        <ul className="form-tips-list">
                          {tips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </ExerciseAccordion>

          <ExerciseAccordion title="Exercise Information">
            <dl className="exercise-information">
              <div><dt>Primary Muscle</dt><dd>{exercise.muscleGroup}</dd></div>
              <div><dt>Secondary Muscles</dt><dd>{secondaryMuscles}</dd></div>
              <div><dt>Equipment</dt><dd>{equipmentLabel}</dd></div>
              <div><dt>Difficulty</dt><dd>{exercise.difficulty}</dd></div>
              <div><dt>Training Location</dt><dd>{locationLabel}</dd></div>
            </dl>
          </ExerciseAccordion>

          {guide?.commonMistakes?.length > 0 && (
            <ExerciseAccordion title="Common Mistakes">
              <ul className="common-mistakes-list">
                {guide.commonMistakes.map((mistake, index) => (
                  <li key={index}>{mistake}</li>
                ))}
              </ul>
            </ExerciseAccordion>
          )}

          <ExerciseProgressions guide={guide} />
          <RelatedExercises exercise={exercise} />
        </div>
      </section>

      <ExerciseVideo
        exerciseId={exercise.id}
        exerciseName={exercise.name}
      />

      <div className="exercise-safety-note">
        <h2>Training Tips</h2>
        <p>
          Start with a manageable difficulty, prioritize controlled
          movement, and respect your individual range of motion.
          Stop if you experience pain, dizziness, or unusual discomfort.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// RESET INTERNAL STATE WHEN EXERCISE CHANGES
// ==========================================

function ExerciseDetailsPage() {
  const { exerciseId } = useParams();

  return (
    <ExerciseDetailsContent
      key={exerciseId}
      exerciseId={exerciseId}
    />
  );
}

export default ExerciseDetailsPage;
