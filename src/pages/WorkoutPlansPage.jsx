import { useState } from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import ExerciseMotionPreview from
  "../components/exercises/ExerciseMotionPreview";

import PersonalizedPlanRecovery from
  "../components/workouts/PersonalizedPlanRecovery";

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
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import { exercises } from "../data/exercises";

import {
  createSelectedWorkoutProposal,
} from "../utils/workoutExerciseSelection";

import {
  createEquipmentAdaptedProposal,
} from "../utils/equipmentAdaptationProposal";

import {
  preparePersonalizedActivation,
  savePersonalizedRecoverySnapshot,
} from "../utils/personalizedApplicationSafety";

import "./WorkoutPlansPage.css";

// ==========================================
// UNIFIED PERSONALIZED RECOMMENDER
// ==========================================

const programs = [
  {
    id: "full-body",
    name: "Full Body Foundation",
    description:
      "Train your whole body with exercise selection adapted to your goals.",
    minDays: 1,
    maxDays: 6,
  },
  {
    id: "upper-lower",
    name: "Upper / Lower Builder",
    description:
      "Alternate upper and lower body sessions with personalized exercise selection.",
    minDays: 2,
    maxDays: 6,
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    description:
      "Personalized pushing, pulling, and leg sessions.",
    minDays: 3,
    maxDays: 6,
  },
  {
    id: "abc",
    name: "ABC Training",
    description:
      "Three rotating training categories adapted to your profile and schedule.",
    minDays: 3,
    maxDays: 6,
  },
];

const legacyPlanIds = {
  "full-body-foundation": "full-body",
  "upper-lower-builder": "upper-lower",
  "push-pull-legs": "push-pull-legs",
  "abc-training": "abc",
};

const goalLabels = {
  "build-muscle": "Build Muscle",
  "build-strength": "Build Strength",
  "improve-endurance": "Improve Endurance",
  "body-recomposition": "Body Recomposition",
  "general-fitness": "General Fitness",
};

const exerciseById = new Map(
  exercises.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

function getPreferredSplit(frequency, goal) {
  if (frequency <= 2) {
    return "full-body";
  }

  if (frequency === 3) {
    return [
      "build-muscle",
      "build-strength",
      "body-recomposition",
    ].includes(goal)
      ? "abc"
      : "full-body";
  }

  if (frequency === 4) {
    return "upper-lower";
  }

  return "push-pull-legs";
}

function formatDay(dayId) {
  const names = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return names[dayId] ?? dayId;
}

function formatMissingSlot(slot) {
  if (typeof slot === "string") {
    return slot;
  }

  if (!slot || typeof slot !== "object") {
    return "Unfilled exercise slot";
  }

  const role =
    slot.role ??
    slot.label ??
    slot.muscleGroup ??
    "Exercise";

  const reason =
    typeof slot.reason === "string"
      ? slot.reason
      : "No compatible exercise found";

  return String(role) + ": " + reason;
}

// Reuses the animated exercise thumbnail
// and layout from Recommended Plans.
function PlanExerciseRow({ selectedExercise }) {
  const exercise =
    exerciseById.get(selectedExercise.id);

  const name =
    exercise?.name ??
    selectedExercise.name ??
    selectedExercise.id;

  return (
    <li className="plans-exercise-item">
      <Link
        to={"/exercises/" + selectedExercise.id}
        className="plans-exercise-link"
      >
        <ExerciseMotionPreview
          exerciseId={selectedExercise.id}
          exerciseName={name}
          variant="thumbnail"
        />

        <div className="plans-exercise-info">
          <strong>{name}</strong>

          <span>
            {exercise?.muscleGroup ?? "Exercise"}
            {" · "}
            {selectedExercise.sets ?? "Planned"}
            {" "}sets
          </span>
          {selectedExercise.adaptedFromRole && (
            <span className="plans-adapted-role-note">
              Adapted from {selectedExercise.adaptedFromRole}:
              now trains {selectedExercise.role} instead
            </span>
          )}
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

function WorkoutPlansPage() {
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

  const { activeWorkout } =
    useWorkoutSession();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    pendingSignature,
    setPendingSignature,
  ] = useState(null);

  const [feedback, setFeedback] =
    useState("");

  // D2.3T v3 EQUIPMENT ADAPTED: exact-preview consent.
  const [acknowledgedSignature, setAcknowledgedSignature] =
    useState(null);

  const [error, setError] =
    useState("");

  const defaultLocation =
    profile?.trainingLocation === "gym"
      ? "gym"
      : "home";

  const locationParam =
    searchParams.get("location");

  const trainingLocation =
    locationParam === "gym" ||
    locationParam === "home"
      ? locationParam
      : defaultLocation;

  const adaptToEquipment =
    trainingLocation === "home" &&
    searchParams.get("adapt") === "1";

  const frequency = Number(
    profile?.trainingDaysPerWeek ?? 0
  );

  const hasValidFrequency =
    Number.isInteger(frequency) &&
    frequency >= 1 &&
    frequency <= 6;

  const primaryGoal =
    profile?.primaryGoal ??
    profile?.trainingGoal ??
    "";

  const preferredSplit =
    getPreferredSplit(
      frequency,
      primaryGoal
    );

  const recommendations =
    programs
      .filter(
        (plan) =>
          frequency >= plan.minDays &&
          frequency <= plan.maxDays
      )
      .sort(
        (first, second) =>
          Number(
            second.id === preferredSplit
          ) -
          Number(
            first.id === preferredSplit
          )
      );

  const rawSelectedId =
    searchParams.get("plan");

  const selectedPlanId =
    legacyPlanIds[rawSelectedId] ??
    rawSelectedId;

  const selectedPlan =
    recommendations.find(
      (plan) => plan.id === selectedPlanId
    ) ??
    recommendations[0] ??
    null;

  // ========================================
  // ONE GENERATOR FOR ALL RECOMMENDATIONS
  // ========================================

  const generated = (() => {
    if (
      !profile ||
      !hasValidFrequency ||
      !selectedPlan
    ) {
      return {
        proposal: null,
        error: "",
      };
    }

    try {
      const proposal =
        (adaptToEquipment
          ? createEquipmentAdaptedProposal
          : createSelectedWorkoutProposal)(
          profile,
          {
            splitId: selectedPlan.id,
            location: trainingLocation,
            homeEquipment:
              homeEquipment ?? [],
          }
        );

      return {
        proposal,
        error: "",
      };
    } catch (generationError) {
      return {
        proposal: null,
        error:
          generationError.message ??
          "Could not generate a workout plan.",
      };
    }
  })();

  const proposal = generated.proposal;

  const signature = JSON.stringify({
    profile,
    location: trainingLocation,
    homeEquipment,
    selectedPlanId: selectedPlan?.id,
    proposal,
  });

  const isConfirming =
    pendingSignature !== null &&
    pendingSignature === signature;

  const needsCoverageAcknowledgement =
    Boolean(proposal?.adaptationChanges?.length);

  const canApply =
    Boolean(proposal?.completeSelection) &&
    !activeWorkout &&
    (!needsCoverageAcknowledgement ||
      acknowledgedSignature === signature);

  const selectedCount =
    proposal?.selectedCount ?? 0;

  const plannedSlots =
    proposal?.plannedSlots ?? 0;

  // ========================================
  // CHANGE LOCATION OR PROGRAM STRUCTURE
  // ========================================

  function updateParams(changes) {
    setSearchParams(
      (previous) => {
        const next =
          new URLSearchParams(previous);

        for (
          const [key, value] of
          Object.entries(changes)
        ) {
          if (value === null) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }

        return next;
      },
      {
        replace: true,
        preventScrollReset: true,
      }
    );

    setPendingSignature(null);
    setFeedback("");
    setError("");
  }

  // ========================================
  // REVIEW PERSONALIZED PLAN
  // ========================================

  function handleReviewApplication() {
    if (
      !profile ||
      !proposal ||
      !selectedPlan
    ) {
      setError(
        "No personalized plan is available."
      );
      return;
    }

    try {
      preparePersonalizedActivation({
        profile,
        proposal,
        splitId: selectedPlan.id,
        location: trainingLocation,
        activeWorkout,
        acceptCoverageLimitations:
          acknowledgedSignature === signature,
      });

      setPendingSignature(signature);
      setFeedback("");
      setError("");
    } catch (reviewError) {
      setPendingSignature(null);
      setError(
        reviewError.message ??
        "Could not review this plan."
      );
    }
  }

  // ========================================
  // CONFIRM AND APPLY PERSONALIZED PLAN
  // ========================================

  function handleConfirmApplication() {
    if (
      !isConfirming ||
      !profile ||
      !proposal ||
      !selectedPlan
    ) {
      setPendingSignature(null);
      setError(
        "The recommendation changed. Review it again before applying."
      );
      return;
    }

    try {
      const prepared =
        preparePersonalizedActivation({
          profile,
          proposal,
          splitId: selectedPlan.id,
          location: trainingLocation,
          activeWorkout,
          acceptCoverageLimitations:
            acknowledgedSignature === signature,
        });

      // Never replace the current plan without
      // first saving a recovery snapshot.
      savePersonalizedRecoverySnapshot(
        window.localStorage,
        {
          appliedPlan,
          weeklySchedule,
        }
      );

      const nextPlan = {
        ...prepared.planData,
        templateId:
          "personalized-" + selectedPlan.id,
        name:
          selectedPlan.name +
          (proposal.adaptationChanges?.length
            ? " (Equipment-Adapted)"
            : " (Personalized)"),
        isPersonalized: true,
      };

      saveWeeklySchedule(
        prepared.scheduleData
      );

      applyWorkoutPlan(nextPlan);

      setPendingSignature(null);
      setError("");

      setFeedback(
        nextPlan.name +
        " was applied to your weekly schedule."
      );
    } catch (applicationError) {
      setPendingSignature(null);

      setError(
        applicationError.message ??
        "Could not apply this workout plan."
      );
    }
  }

  return (
    <div className="workout-plans-page">
      <BackToPreviousPage
        fallbackTo="/workouts"
        fallbackLabel="Workouts"
        className="plans-back-link"
      />

      <header className="plans-page-heading">
        <span className="plans-eyebrow">
          PERSONALIZED TRAINING
        </span>

        <h1>Recommended Workout Plans</h1>

        <p>
          One intelligent recommendation system.
          Exercises, session volume and training
          time are adapted to your profile,
          experience and available equipment.
        </p>
      </header>

      <PersonalizedPlanRecovery />

      {!profile ? (
        <section className="plans-notice">
          <h2>Set Up Your Training Profile</h2>

          <p>
            Complete your training profile to
            receive personalized recommendations.
          </p>

          <Link to="/settings/profile">
            Configure Training Profile →
          </Link>
        </section>
      ) : !hasValidFrequency ? (
        <section className="plans-notice">
          <h2>Review Your Weekly Frequency</h2>

          <p>
            Select between one and six workout
            days per week in your profile.
          </p>

          <Link to="/settings/profile">
            Edit Training Profile →
          </Link>
        </section>
      ) : (
        <>
          <section className="plans-profile-panel">
            <div className="plans-profile-header">
              <div>
                <h2>Your Training Preferences</h2>

                <p>
                  These settings are used by
                  the personalized generator.
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
                  {profile.secondaryGoal
                    ? goalLabels[
                        profile.secondaryGoal
                      ]
                    : "None"}
                </strong>
              </div>

              <div>
                <span>Experience</span>
                <strong>
                  {profile.experienceLevel ??
                    "Not selected"}
                </strong>
              </div>

              <div>
                <span>Training Days</span>
                <strong>
                  {frequency} / week
                </strong>
              </div>

              <div>
                <span>Session Duration</span>
                <strong>
                  {profile.sessionDurationMinutes ??
                    60}{" "}min
                </strong>
              </div>
            </div>

            <div className="plans-location-field">
              <label htmlFor="planTrainingLocation">
                Where will you follow this plan?
              </label>

              <select
                id="planTrainingLocation"
                value={trainingLocation}
                onChange={(event) =>
                  updateParams({
                    location: event.target.value,
                  })
                }
              >
                <option value="home">
                  At Home
                </option>

                <option value="gym">
                  At the Gym
                </option>
              </select>

              <p>
                Home recommendations use your
                saved equipment. Gym recommendations
                use the available gym exercise
                library.
              </p>

              {trainingLocation === "home" && (
                <Link to="/settings/equipment">
                  Manage Home Equipment →
                </Link>
              )}
            </div>
          </section>

          <section className="plans-results-section">
            <div className="plans-section-heading">
              <div>
                <h2>Suggested Programs</h2>

                <p>
                  Choose a training structure.
                  Every option uses the same
                  personalized exercise generator.
                </p>
              </div>

              <span className="plans-result-count">
                {recommendations.length}
                {" "}options
              </span>
            </div>

            <div className="plans-template-grid">
              {recommendations.map(
                (plan, index) => {
                  const selected =
                    selectedPlan?.id === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={
                        "plans-template-card " +
                        (selected
                          ? "is-selected"
                          : "")
                      }
                      aria-pressed={selected}
                      onClick={() =>
                        updateParams({
                          plan: plan.id,
                        })
                      }
                    >
                      <div className="plans-template-top">
                        <span className="plans-template-tag">
                          {index === 0
                            ? "Top Match"
                            : "Alternative"}
                        </span>

                        <span className="plans-template-coverage">
                          Personalized
                        </span>
                      </div>

                      <h3>{plan.name}</h3>

                      <p>{plan.description}</p>

                      <span className="plans-template-frequency">
                        {plan.minDays}–
                        {plan.maxDays}
                        {" "}training days
                      </span>

                      <span className="plans-template-action">
                        {selected
                          ? "Selected"
                          : "View Plan"}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {selectedPlan && (
            <section className="plans-preview-panel">
              {trainingLocation === "home" && (
                <div className="plans-equipment-adaptation-control">
                  <strong>Equipment Fit</strong>
                  <p>
                    The original recommendation keeps its muscle targets.
                    The optional alternative can fill unavailable slots
                    with different movements. These are NOT equivalent
                    replacements for missing back or biceps training.
                  </p>
                  <button
                    type="button"
                    className="plans-adapt-toggle"
                    aria-pressed={adaptToEquipment}
                    onClick={() => {
                      setAcknowledgedSignature(null);
                      updateParams({
                        adapt: adaptToEquipment ? null : "1",
                      });
                    }}
                  >
                    {adaptToEquipment
                      ? "Show Original Recommendation"
                      : "Preview Equipment-Adapted Alternative"}
                  </button>
                </div>
              )}
              <div className="plans-section-heading">
                <div>
                  <span className="plans-eyebrow">
                    PERSONALIZED PLAN PREVIEW
                  </span>

                  <h2>{selectedPlan.name}</h2>

                  <p>
                    Exercises selected using your
                    training goals, experience,
                    time budget and equipment.
                  </p>
                </div>

                <span className="plans-result-count">
                  {selectedCount} of {plannedSlots}
                  {" "}exercise slots
                </span>
              </div>

              {generated.error && (
                <div
                  className="plans-coverage-warning"
                  role="alert"
                >
                  <strong>
                    Could Not Generate Plan
                  </strong>

                  <p>{generated.error}</p>
                </div>
              )}

              {proposal && (
                <>
                  {proposal.adaptationChanges?.length > 0 && (
                    <div className="plans-coverage-warning" role="status">
                      <strong>Equipment-Adapted: Changed Muscle Coverage</strong>
                      <p>
                        Some exercise slots were changed to movements
                        that fit your equipment. They do not replace
                        the intended benefits of unavailable pulling
                        or biceps exercises.
                      </p>
                      <p>
                        Requested slots changed or still missing:
                        {" "}{proposal.uncoveredRoles.join(", ")}.
                      </p>
                      <label className="plans-adapt-consent">
                        <input
                          type="checkbox"
                          checked={acknowledgedSignature === signature}
                          onChange={(event) => {
                            setPendingSignature(null);
                            setAcknowledgedSignature(
                              event.target.checked ? signature : null
                            );
                          }}
                        />
                        I understand that the alternative changes the
                        muscle groups trained, and I want to review it.
                      </label>
                    </div>
                  )}

                  {!proposal.completeSelection && (
                    <div className="plans-coverage-warning">
                      <strong>
                        This recommendation needs
                        adjustments before applying.
                      </strong>

                      <p>
                        {selectedCount} of
                        {" "}{plannedSlots} exercise
                        slots are filled. Review
                        available equipment, training
                        time and any missing slots
                        below. An incomplete program
                        cannot be activated.
                      </p>
                    </div>
                  )}

                  <div className="plans-session-grid">
                    {proposal.sessions.map(
                      (session) => (
                        <article
                          key={session.dayId}
                          className="plans-session-card"
                        >
                          <h3>
                            {formatDay(
                              session.dayId
                            )}
                            {" · "}
                            {String(
                              session.sessionId
                            ).toUpperCase()}
                          </h3>

                          <p className="plans-education-note">
                            {session.exercises.length}
                            {" "}exercises
                            {" · "}
                            {session.time
                              ?.estimatedTotalMinutes ??
                              "—"}
                            {" "}estimated minutes
                          </p>

                          <ul className="plans-exercise-list">
                            {session.exercises.map(
                              (selectedExercise) => (
                                <PlanExerciseRow
                                  key={
                                    selectedExercise.id
                                  }
                                  selectedExercise={
                                    selectedExercise
                                  }
                                />
                              )
                            )}
                          </ul>

                          {session.missingSlots
                            .length > 0 && (
                            <div className="plans-missing-slots">
                              <strong>
                                Missing Exercise Slots
                              </strong>

                              <ul>
                                {session.missingSlots.map(
                                  (slot, index) => (
                                    <li key={index}>
                                      {formatMissingSlot(
                                        slot
                                      )}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          {session.exercises
                            .length === 0 && (
                            <p className="plans-empty-session">
                              No compatible exercises
                              were found for this
                              training session.
                            </p>
                          )}
                        </article>
                      )
                    )}
                  </div>

                  <p className="plans-education-note">
                    Each exercise is selected by
                    the personalized generator.
                    Sets and exercise targets
                    will be saved with the applied
                    plan. You may customize them
                    later in Workout Builder.
                  </p>

                  {!isConfirming ? (
                    <div className="plans-apply-actions">
                      <button
                        type="button"
                        className="plans-apply-button"
                        disabled={!canApply}
                        onClick={
                          handleReviewApplication
                        }
                      >
                        Review & Apply Plan
                      </button>

                      {activeWorkout && (
                        <span className="plans-apply-hint">
                          Finish or discard the
                          active workout first.
                        </span>
                      )}

                      {!proposal.completeSelection && (
                        <span className="plans-apply-hint">
                          Complete the missing
                          exercise slots before
                          applying this plan.
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="plans-confirm-panel">
                      <h3>
                        Apply Personalized Plan?
                      </h3>

                      <p>
                        This will replace your
                        current active plan and
                        weekly schedule.
                      </p>

                      <p>
                        Your completed workout
                        history will be preserved.
                        A recovery copy of your
                        previous plan and schedule
                        will be created first.
                      </p>

                      <div className="plans-confirm-actions">
                        <button
                          type="button"
                          className="plans-apply-button"
                          disabled={Boolean(
                            activeWorkout
                          )}
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
                            setPendingSignature(
                              null
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      className="plans-coverage-warning"
                      role="alert"
                    >
                      <strong>
                        Application Not Completed
                      </strong>

                      <p>{error}</p>
                    </div>
                  )}

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
                </>
              )}
            </section>
          )}

          {appliedPlan && (
            <section className="plans-current-plan">
              <div>
                <span className="plans-eyebrow">
                  CURRENT PLAN
                </span>

                <h2>{appliedPlan.name}</h2>

                <p>
                  {appliedPlan.location === "home"
                    ? "At Home"
                    : "At the Gym"}
                  {" · "}
                  {appliedPlan.sessions.length}
                  {" "}training sessions
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
