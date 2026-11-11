
import { useState } from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  getRecommendedPlans,
} from "../data/workoutPlans";

import {
  createWeeklyTemplate,
} from "../data/workoutSplits";

import ExerciseMotionPreview from
  "../components/exercises/ExerciseMotionPreview";

import "./WorkoutPlansPage.css";

// ==========================================
// TRAINING GOAL LABELS
// ==========================================

const goalLabels = {
  "build-muscle": "Build Muscle",
  "build-strength": "Build Strength",
  "improve-endurance": "Improve Endurance",
  "body-recomposition": "Body Recomposition",
  "general-fitness": "General Fitness",
};

// ==========================================
// REUSABLE PLAN EXERCISE ROW
// ==========================================

function PlanExerciseRow({ exercise }) {
  return (
    <li className="plans-exercise-item">
      <Link
        to={`/exercises/${exercise.id}`}
        className="plans-exercise-link"
      >
        <ExerciseMotionPreview
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          variant="thumbnail"
        />

        <div className="plans-exercise-info">
          <strong>{exercise.name}</strong>

          <span>{exercise.muscleGroup}</span>
        </div>

        <span
          className="plans-exercise-arrow"
          aria-hidden="true"
        >
          ↗
        </span>
      </Link>
    </li>
  );
}

// ==========================================
// RECOMMENDED WORKOUT PLANS PAGE
// ==========================================

function WorkoutPlansPage() {
  // ========================================
  // SHARED CONTEXT DATA
  // ========================================

  const { profile } = useTrainingProfile();

  const { homeEquipment } = useEquipment();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const {
    appliedPlan,
    applyWorkoutPlan,
  } = useWorkoutPlan();

  // ========================================
  // URL SEARCH PARAMETERS
  // ========================================

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  // ========================================
  // DEFAULT TRAINING LOCATION
  // ========================================

  const defaultLocation =
    profile?.trainingLocation === "gym"
      ? "gym"
      : "home";

  const locationParam =
    searchParams.get("location");

  const trainingLocation =
    locationParam === "home" ||
    locationParam === "gym"
      ? locationParam
      : defaultLocation;

  // ========================================
  // SELECTED PLAN FROM URL
  // ========================================

  const selectedPlanId =
    searchParams.get("plan");

  // ========================================
  // LOCAL INTERFACE STATE
  // ========================================

  const [
    isConfirming,
    setIsConfirming,
  ] = useState(false);

  const [
    feedback,
    setFeedback,
  ] = useState("");

  // ========================================
  // RECOMMENDATIONS
  // ========================================

  const recommendations = getRecommendedPlans(
    profile,
    trainingLocation,
    homeEquipment
  );

  // Keep the selected plan when it exists
  // in the current recommendation list.
  const selectedRecommendation =
    recommendations.find(
      (item) =>
        item.plan.id === selectedPlanId
    ) ?? recommendations[0];

  const selectedPlan =
    selectedRecommendation?.plan;

  const selectedPreview =
    selectedRecommendation?.preview;

  const canApply =
    Boolean(selectedPreview) &&
    !selectedPreview.hasEmptySession;

  // ========================================
  // TRAINING PROFILE INFORMATION
  // ========================================

  const primaryGoal =
    profile?.primaryGoal ??
    profile?.trainingGoal ??
    "";

  const secondaryGoal =
    profile?.secondaryGoal ?? "";

  const hasValidFrequency =
    profile &&
    Number(profile.trainingDaysPerWeek) >= 1 &&
    Number(profile.trainingDaysPerWeek) <= 6;

  // ========================================
  // UPDATE URL PARAMETERS
  // ========================================

  function updatePlanParams(changes) {
    setSearchParams(
      (previousParams) => {
        const nextParams =
          new URLSearchParams(
            previousParams
          );

        Object.entries(changes).forEach(
          ([key, value]) => {
            if (
              value === null ||
              value === undefined ||
              value === ""
            ) {
              nextParams.delete(key);
            } else {
              nextParams.set(key, value);
            }
          }
        );

        return nextParams;
      },
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  }

  // ========================================
  // TRAINING LOCATION CHANGE
  // ========================================

  function handleLocationChange(event) {
    const nextLocation =
      event.target.value;

    // Keep the selected plan ID.
    // The recommendation list will determine
    // whether this plan is still available.
    updatePlanParams({
      location: nextLocation,
    });

    setIsConfirming(false);
    setFeedback("");
  }

  // ========================================
  // SELECT PLAN
  // ========================================

  function handleSelectPlan(planId) {
    updatePlanParams({
      plan: planId,
    });

    setIsConfirming(false);
    setFeedback("");
  }

  // ========================================
  // REVIEW PLAN APPLICATION
  // ========================================

  function handleReviewApplication() {
    if (!canApply) {
      return;
    }

    setIsConfirming(true);
    setFeedback("");
  }

  // ========================================
  // CONFIRM PLAN APPLICATION
  // ========================================

  function handleConfirmApplication() {
    if (
      !profile ||
      !selectedPlan ||
      !canApply
    ) {
      return;
    }

    const newSchedule =
      createWeeklyTemplate(
        Number(
          profile.trainingDaysPerWeek
        ),
        selectedPlan.splitId
      );

    const planData = {
      templateId: selectedPlan.id,
      name: selectedPlan.name,
      splitId: selectedPlan.splitId,
      location: trainingLocation,
      coverage: selectedPreview.coverage,

      sessions:
        selectedPreview.sessions.map(
          (session) => ({
            id: session.id,
            name: session.name,

            exerciseIds:
              session.exercises.map(
                (exercise) =>
                  exercise.id
              ),

            missingSlots: [
              ...session.missingSlots,
            ],
          })
        ),
    };

    saveWeeklySchedule(newSchedule);

    applyWorkoutPlan(planData);

    setIsConfirming(false);

    setFeedback(
      `${selectedPlan.name} was applied to your weekly schedule.`
    );
  }

  // ========================================
  // PAGE CONTENT
  // ========================================

  return (
    <div className="workout-plans-page">

      {/* ==================================
          CONTEXTUAL BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/workouts"
        fallbackLabel="Workouts"
        className="plans-back-link"
      />

      {/* ==================================
          PAGE HEADING
      ================================== */}

      <header className="plans-page-heading">
        <span className="plans-eyebrow">
          PERSONALIZED TRAINING
        </span>

        <h1>Recommended Workout Plans</h1>

        <p>
          Explore workout templates based on your
          training goals, experience, schedule,
          and available equipment.
        </p>
      </header>

      {/* ==================================
          PROFILE VALIDATION
      ================================== */}

      {!profile ? (
        <section className="plans-notice">
          <h2>
            Set Up Your Training Profile
          </h2>

          <p>
            Complete your training profile
            to receive recommendations based
            on your preferences.
          </p>

          <Link to="/settings/profile">
            Configure Training Profile →
          </Link>
        </section>
      ) : !hasValidFrequency ? (
        <section className="plans-notice">
          <h2>
            Review Your Weekly Frequency
          </h2>

          <p>
            The current recommendation templates
            support one to six workout days per week.
            Please review your schedule and recovery
            needs before choosing a program.
          </p>

          <Link to="/settings/profile">
            Edit Training Profile →
          </Link>
        </section>
      ) : (
        <>

          {/* ==================================
              TRAINING PREFERENCES
          ================================== */}

          <section className="plans-profile-panel">
            <div className="plans-profile-header">
              <div>
                <h2>
                  Your Training Preferences
                </h2>

                <p>
                  These settings determine which
                  workout plans appear below.
                </p>
              </div>

              <Link to="/settings/profile">
                Edit Profile →
              </Link>
            </div>

            <div className="plans-profile-details">
              <div>
                <span>Primary Goal</span>

                <strong>
                  {goalLabels[primaryGoal] ??
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Secondary Goal</span>

                <strong>
                  {secondaryGoal
                    ? goalLabels[secondaryGoal]
                    : "None"}
                </strong>
              </div>

              <div>
                <span>Experience</span>

                <strong>
                  {profile.experienceLevel}
                </strong>
              </div>

              <div>
                <span>Training Days</span>

                <strong>
                  {profile.trainingDaysPerWeek}
                  {" "}/ week
                </strong>
              </div>
            </div>

            {/* ==================================
                TRAINING LOCATION
            ================================== */}

            <div className="plans-location-field">
              <label htmlFor="planTrainingLocation">
                Where will you follow this plan?
              </label>

              <select
                id="planTrainingLocation"
                value={trainingLocation}
                onChange={handleLocationChange}
              >
                <option value="home">
                  At Home
                </option>

                <option value="gym">
                  At the Gym
                </option>
              </select>

              <p>
                Home recommendations use your saved
                equipment. Gym recommendations assume
                access to the equipment listed in the
                exercise library.
              </p>

              {trainingLocation === "home" && (
                <Link to="/settings/equipment">
                  Manage Home Equipment →
                </Link>
              )}
            </div>
          </section>

          {/* ==================================
              SUGGESTED PROGRAMS
          ================================== */}

          <section className="plans-results-section">
            <div className="plans-section-heading">
              <div>
                <h2>Suggested Programs</h2>

                <p>
                  Select a plan to preview its sessions
                  and compatible exercises.
                </p>
              </div>

              <span className="plans-result-count">
                {recommendations.length} options
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="plans-notice">
                <h3>
                  No Matching Plans Found
                </h3>

                <p>
                  Try adjusting your training frequency,
                  experience level, or training location.
                </p>
              </div>
            ) : (
              <div className="plans-template-grid">
                {recommendations.map(
                  (item, index) => {
                    const isSelected =
                      item.plan.id ===
                      selectedPlan?.id;

                    return (
                      <button
                        key={item.plan.id}
                        type="button"
                        className={
                          `plans-template-card ${
                            isSelected
                              ? "is-selected"
                              : ""
                          }`
                        }
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleSelectPlan(
                            item.plan.id
                          )
                        }
                      >
                        <div className="plans-template-top">
                          <span className="plans-template-tag">
                            {index === 0
                              ? "Top Match"
                              : "Alternative"}
                          </span>

                          <span className="plans-template-coverage">
                            {item.preview.coverage}%
                            {" "}coverage
                          </span>
                        </div>

                        <h3>
                          {item.plan.name}
                        </h3>

                        <p>
                          {item.plan.description}
                        </p>

                        <span className="plans-template-frequency">
                          {item.plan.minDays}–
                          {item.plan.maxDays}
                          {" "}training days
                        </span>

                        <span className="plans-template-action">
                          {isSelected
                            ? "Selected"
                            : "View Plan"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* ==================================
              SELECTED PLAN PREVIEW
          ================================== */}

          {selectedPlan && selectedPreview && (
            <section className="plans-preview-panel">

              <div className="plans-section-heading">
                <div>
                  <span className="plans-eyebrow">
                    PLAN PREVIEW
                  </span>

                  <h2>
                    {selectedPlan.name}
                  </h2>

                  <p>
                    Review the available exercises
                    before applying the program.
                  </p>
                </div>

                <span className="plans-result-count">
                  {selectedPreview.matchedSlots}
                  {" "}of{" "}
                  {selectedPreview.totalSlots}
                  {" "}slots
                </span>
              </div>

              {/* ==================================
                  MISSING EXERCISES WARNING
              ================================== */}

              {!selectedPreview.isComplete && (
                <div className="plans-coverage-warning">
                  <strong>
                    Some exercise slots are unavailable.
                  </strong>

                  <p>
                    This plan is a starting draft.
                    Missing movement slots need suitable
                    alternatives before it can be
                    considered complete.
                  </p>
                </div>
              )}

              {/* ==================================
                  SESSIONS AND EXERCISES
              ================================== */}

              <div className="plans-session-grid">
                {selectedPreview.sessions.map(
                  (session) => (
                    <article
                      key={session.id}
                      className="plans-session-card"
                    >
                      <h3>
                        {session.name}
                      </h3>

                      <ul className="plans-exercise-list">
                        {session.exercises.map(
                          (exercise) => (
                            <PlanExerciseRow
                              key={exercise.id}
                              exercise={exercise}
                            />
                          )
                        )}
                      </ul>

                      {/* ==================================
                          MISSING SLOTS
                      ================================== */}

                      {session.missingSlots.length > 0 && (
                        <div className="plans-missing-slots">
                          <strong>
                            Missing Exercise Slots
                          </strong>

                          <ul>
                            {session.missingSlots.map(
                              (slot) => (
                                <li key={slot}>
                                  {slot}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {/* ==================================
                          EMPTY SESSION
                      ================================== */}

                      {session.exercises.length === 0 && (
                        <p className="plans-empty-session">
                          No compatible exercises are
                          currently available for
                          this session.
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>

              {/* ==================================
                  EDUCATIONAL NOTE
              ================================== */}

              <p className="plans-education-note">
                These are exercise suggestions, not a
                complete training prescription. Sets,
                repetitions, loads, and individual
                progression will be added in later stages.
              </p>

              {/* ==================================
                  APPLY PLAN
              ================================== */}

              {!isConfirming ? (
                <div className="plans-apply-actions">
                  <button
                    type="button"
                    className="plans-apply-button"
                    disabled={!canApply}
                    onClick={handleReviewApplication}
                  >
                    Review & Apply Plan
                  </button>

                  {!canApply && (
                    <span className="plans-apply-hint">
                      Choose another plan or add equipment.
                      Every session needs at least one
                      available exercise.
                    </span>
                  )}
                </div>
              ) : (
                <div className="plans-confirm-panel">

                  <h3>
                    Apply This Workout Plan?
                  </h3>

                  <p>
                    Applying this plan will replace
                    your current weekly schedule with
                    a new template for{" "}
                    {profile.trainingDaysPerWeek}
                    {" "}training days per week.
                  </p>

                  {weeklySchedule && (
                    <p className="plans-confirm-warning">
                      You already have a saved schedule.
                      Its current day assignments will
                      be replaced.
                    </p>
                  )}

                  {!selectedPreview.isComplete && (
                    <p className="plans-confirm-warning">
                      Some exercise slots are missing.
                      You can apply the draft, but
                      those gaps still need attention.
                    </p>
                  )}

                  <div className="plans-confirm-actions">
                    <button
                      type="button"
                      className="plans-apply-button"
                      onClick={
                        handleConfirmApplication
                      }
                    >
                      Confirm & Apply
                    </button>

                    <button
                      type="button"
                      className="plans-cancel-button"
                      onClick={() =>
                        setIsConfirming(false)
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ==================================
                  SUCCESS FEEDBACK
              ================================== */}

              {feedback && (
                <div
                  className="plans-success-message"
                  role="status"
                >
                  <p>{feedback}</p>

                  <Link to="/workouts/schedule">
                    View Weekly Schedule →
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* ==================================
              CURRENTLY APPLIED PLAN
          ================================== */}

          {appliedPlan && (
            <section className="plans-current-plan">
              <div>
                <span className="plans-eyebrow">
                  CURRENT PLAN
                </span>

                <h2>
                  {appliedPlan.name}
                </h2>

                <p>
                  {appliedPlan.location === "home"
                    ? "At Home"
                    : "At the Gym"}

                  {" · "}

                  {typeof appliedPlan.coverage ===
                  "number"
                    ? `${appliedPlan.coverage}% catalog coverage when applied`
                    : "Custom exercise selection"}
                </p>
              </div>

              <Link to="/workouts">
                Back to Workouts →
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default WorkoutPlansPage;
