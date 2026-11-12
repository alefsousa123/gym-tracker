import {
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import {
  createSelectedWorkoutProposal,
} from "../../utils/workoutExerciseSelection";

import {
  useWorkoutPlan,
} from "../../context/WorkoutPlanContext";

import {
  useWeeklySchedule,
} from "../../context/WeeklyScheduleContext";

import {
  useWorkoutSession,
} from "../../context/WorkoutSessionContext";

import {
  preparePersonalizedActivation,
  savePersonalizedRecoverySnapshot,
} from "../../utils/personalizedApplicationSafety";

import "./PersonalizedPlanPreview.css";
import "./PersonalizedPlanApply.css";

const dayLabels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const roleLabels = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  legs: "Legs",
  glutes: "Glutes",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  calves: "Calves",
};

function displayRole(role) {
  return roleLabels[role] ?? role;
}

export default function PersonalizedPlanPreview({
  profile,
  location,
  homeEquipment,
  splitId,
  onApplied,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [
    pendingSignature,
    setPendingSignature,
  ] = useState(null);

  const [
    applicationError,
    setApplicationError,
  ] = useState("");

  const [
    applicationMessage,
    setApplicationMessage,
  ] = useState("");

  const {
    appliedPlan,
    applyWorkoutPlan,
  } = useWorkoutPlan();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const { activeWorkout } =
    useWorkoutSession();

  // The generator runs only when the
  // personalized preview is opened.
  const result = useMemo(() => {
    if (
      !expanded ||
      !profile ||
      !splitId
    ) {
      return null;
    }

    try {
      return {
        proposal:
          createSelectedWorkoutProposal(
            profile,
            {
              splitId,
              location,
              homeEquipment:
                homeEquipment ?? [],
            }
          ),

        error: null,
      };
    } catch (error) {
      return {
        proposal: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create preview.",
      };
    }
  }, [
    expanded,
    profile,
    splitId,
    location,
    homeEquipment,
  ]);

  const proposal = result?.proposal;

  // A confirmation belongs to one exact
  // preview and configuration.
  const currentSignature = JSON.stringify({
    profile,
    location,
    homeEquipment,
    splitId,

    sessions: proposal?.sessions.map(
      (session) => ({
        dayId: session.dayId,
        ids: session.exercises.map(
          (exercise) => [
            exercise.id,
            exercise.sets,
          ]
        ),
      })
    ),
  });

  const isConfirmingPersonalized =
    pendingSignature !== null &&
    pendingSignature === currentSignature;

  function handleReviewPersonalized() {
    try {
      preparePersonalizedActivation({
        profile,
        proposal,
        splitId,
        location,
        activeWorkout,
      });

      setApplicationError("");
      setApplicationMessage("");
      setPendingSignature(currentSignature);
    } catch (error) {
      setApplicationError(error.message);
      setPendingSignature(null);
    }
  }

  function handleConfirmPersonalized() {
    if (
      !isConfirmingPersonalized ||
      !proposal
    ) {
      setPendingSignature(null);
      setApplicationError(
        "The preview changed. Review the new draft before applying."
      );
      return;
    }

    try {
      // Revalidate at the moment of
      // the actual confirmation.
      const prepared =
        preparePersonalizedActivation({
          profile,
          proposal,
          splitId,
          location,
          activeWorkout,
        });

      // If we cannot save a recovery copy,
      // do not replace the current plan.
      savePersonalizedRecoverySnapshot(
        window.localStorage,
        {
          appliedPlan,
          weeklySchedule,
        }
      );

      // These are the existing provider
      // actions used by the app.
      saveWeeklySchedule(
        prepared.scheduleData
      );

      applyWorkoutPlan(
        prepared.planData
      );

      setPendingSignature(null);
      setApplicationError("");

      setApplicationMessage(
        "Personalized plan applied. Your previous plan and schedule were backed up in this browser."
      );

      onApplied?.();
    } catch (error) {
      setPendingSignature(null);
      setApplicationError(
        error.message ??
        "Could not apply the personalized plan."
      );
    }
  }

  return (
    <section
      className="personalized-plan-preview"
      aria-label="Personalized workout draft"
    >
      <div className="personalized-plan-heading">
        <div>
          <span className="personalized-plan-eyebrow">
            NEW · PERSONALIZED GENERATOR
          </span>

          <h3>
            Personalized Workout Preview
          </h3>

          <p>
            See how this training split could
            be adapted to your available time,
            muscle priorities and equipment.
          </p>
        </div>

        <button
          type="button"
          className="personalized-plan-toggle"
          aria-expanded={expanded}
          onClick={() =>
            setExpanded((value) => !value)
          }
        >
          {expanded
            ? "Hide Personalized Draft"
            : "Generate Personalized Draft"}
        </button>
      </div>

      {expanded && result?.error && (
        <p
          className="personalized-plan-warning"
          role="alert"
        >
          Preview unavailable: {result.error}
        </p>
      )}

      {expanded && proposal && (
        <div className="personalized-plan-content">
          <div className="personalized-plan-metrics">
            <span>
              <strong>
                {proposal.profileSummary
                  .sessionDurationMinutes}
                {" "}min
              </strong>
              {" "}per workout
            </span>

            <span>
              <strong>
                {proposal.sessions.length}
              </strong>
              {" "}weekly sessions
            </span>

            <span>
              <strong>
                {proposal.selectedCount}/
                {proposal.plannedSlots}
              </strong>
              {" "}exercise slots filled
            </span>
          </div>

          {!proposal.completeSelection && (
            <div
              className="personalized-plan-warning"
              role="status"
            >
              This draft has unfilled exercise
              slots. Check available equipment
              or adjust the training setup.
            </div>
          )}

          {(proposal.allocationWarnings.length > 0 ||
            proposal.volumeWarnings.length > 0) && (
            <p className="personalized-plan-note">
              Some weekly priorities or
              provisional volume targets could
              not be fully satisfied. Review the
              sessions before choosing a program.
            </p>
          )}

          <div className="personalized-plan-sessions">
            {proposal.sessions.map(
              (session) => (
                <article
                  className="personalized-plan-session"
                  key={session.dayId}
                >
                  <header>
                    <div>
                      <h4>
                        {dayLabels[session.dayId] ??
                          session.dayId}
                        {" · "}
                        {session.sessionId.toUpperCase()}
                      </h4>

                      <p>
                        {session.exercises.length}
                        {" "}exercises · approx.{" "}
                        {session.time
                          .estimatedTotalMinutes}
                        {" "}min
                      </p>
                    </div>

                    <span>
                      {session.fitsEstimatedTime
                        ? "Within estimated time"
                        : "Over estimated time"}
                    </span>
                  </header>

                  <ol>
                    {session.exercises.map(
                      (exercise) => (
                        <li
                          key={
                            exercise.slotPosition
                          }
                        >
                          <div>
                            <Link
                              to={
                                "/exercises/" +
                                exercise.id
                              }
                            >
                              {exercise.name}
                            </Link>

                            <small>
                              {displayRole(
                                exercise.role
                              )}
                            </small>
                          </div>

                          <span>
                            {exercise.sets}
                            {" "}sets
                          </span>
                        </li>
                      )
                    )}
                  </ol>

                  {session.missingSlots.length > 0 && (
                    <div className="personalized-plan-warning">
                      Missing exercise slots:{" "}
                      {session.missingSlots
                        .map((slot) =>
                          displayRole(
                            slot.role
                          )
                        )
                        .join(", ")}
                    </div>
                  )}
                </article>
              )
            )}
          </div>

          <div className="personalized-plan-apply">
            <div className="personalized-plan-apply-actions">
              <button
                type="button"
                className="personalized-plan-apply-button"
                disabled={
                  !proposal.completeSelection ||
                  Boolean(activeWorkout)
                }
                onClick={handleReviewPersonalized}
              >
                Review & Apply Personalized Draft
              </button>
            </div>

            {activeWorkout && (
              <p className="personalized-plan-warning">
                Finish or discard the active workout
                before applying a new plan.
              </p>
            )}

            {!proposal.completeSelection && (
              <p className="personalized-plan-warning">
                Complete every exercise slot before
                applying this personalized draft.
              </p>
            )}

            {isConfirmingPersonalized && (
              <div className="personalized-plan-apply-confirm">
                <h4>
                  Replace Your Current Workout Plan?
                </h4>

                <p>
                  This will replace the currently
                  applied plan and weekly schedule
                  with {proposal.sessions.length}
                  personalized sessions.
                  Your completed workout history
                  will remain available.
                </p>

                <p>
                  A recovery copy of your previous
                  plan and schedule will be saved
                  in this browser first.
                </p>

                <div className="personalized-plan-apply-actions">
                  <button
                    type="button"
                    className="personalized-plan-apply-button"
                    disabled={Boolean(activeWorkout)}
                    onClick={handleConfirmPersonalized}
                  >
                    Confirm & Apply Personalized Plan
                  </button>

                  <button
                    type="button"
                    className="personalized-plan-apply-cancel"
                    onClick={() =>
                      setPendingSignature(null)
                    }
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {applicationError && (
              <p
                className="personalized-plan-apply-error"
                role="alert"
              >
                {applicationError}
              </p>
            )}

            {applicationMessage && (
              <div
                className="personalized-plan-apply-feedback"
                role="status"
              >
                <p>{applicationMessage}</p>

                <Link to="/workouts/schedule">
                  View Weekly Schedule
                </Link>
              </div>
            )}
          </div>

          <p className="personalized-plan-disclaimer">
            Experimental preview only. The
            Apply Template button below still
            applies the original workout
            template, not this personalized
            draft. Estimated durations are
            not measured workout times.
          </p>
        </div>
      )}
    </section>
  );
}
