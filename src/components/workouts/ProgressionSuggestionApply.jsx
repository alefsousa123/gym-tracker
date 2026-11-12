import { useState } from "react";

import {
  useWorkoutPlan,
} from "../../context/WorkoutPlanContext";

import {
  useWorkoutSession,
} from "../../context/WorkoutSessionContext";

import {
  recommendExerciseProgression,
} from "../../utils/progressionRecommendations";

import {
  reviewSuggestedProgression,
} from "../../utils/progressionApplicationReview";

import "./ProgressionSuggestionApply.css";

function formatWeight(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ProgressionSuggestionApply({
  sessionId,
  insight,
  onApplied,
}) {
  const {
    appliedPlan,
    updateExerciseWeight,
  } = useWorkoutPlan();

  const {
    activeWorkout,
    workoutHistory,
  } = useWorkoutSession();

  const [pendingToken, setPendingToken] =
    useState(null);

  const [reviewed, setReviewed] =
    useState(false);

  const [error, setError] =
    useState("");

  const suggestion =
    recommendExerciseProgression(
      insight
    );

  function cancel() {
    setPendingToken(null);
    setReviewed(false);
    setError("");
  }

  function review() {
    const result =
      reviewSuggestedProgression({
        appliedPlan,
        workoutHistory,
        sessionId,
        exerciseId: insight.exerciseId,
        entryId: insight.entryId,
        activeWorkout,
      });

    if (!result.ok) {
      setPendingToken(null);
      setReviewed(false);
      setError(result.reason);
      return;
    }

    setError("");
    setReviewed(false);
    setPendingToken(result.token);
  }

  function confirm() {
    if (
      !pendingToken ||
      !reviewed
    ) {
      setError(
        "Review the confirmation before applying."
      );
      return;
    }

    const result =
      reviewSuggestedProgression({
        appliedPlan,
        workoutHistory,
        sessionId,
        exerciseId: insight.exerciseId,
        entryId: insight.entryId,
        activeWorkout,
        expectedToken: pendingToken,
      });

    if (!result.ok) {
      setPendingToken(null);
      setReviewed(false);
      setError(result.reason);
      return;
    }

    const applied = updateExerciseWeight(
      sessionId,
      insight.entryId ?? insight.exerciseId,
      result.suggestedWeight
    );

    if (!applied) {
      setError(
        "Could not update the planned weight."
      );
      setPendingToken(null);
      setReviewed(false);
      return;
    }

    cancel();

    onApplied?.(
      result.suggestedWeight,
      result.weightUnit
    );
  }

  if (
    suggestion.status !== "review" ||
    suggestion.suggestedWeight === null
  ) {
    return null;
  }

  return (
    <div className="ti-suggestion-action">
      {!pendingToken ? (
        <button
          type="button"
          className="ti-suggestion-review-button"
          disabled={Boolean(activeWorkout)}
          onClick={review}
        >
          Review Suggested Increase
        </button>
      ) : (
        <div className="ti-suggestion-confirmation">
          <h3>Confirm Suggested Weight</h3>

          <p>
            Recorded load:{" "}
            <strong>
              {formatWeight(
                suggestion.currentWeight
              )}{" "}
              {suggestion.weightUnit}
            </strong>
          </p>

          <p>
            Suggested planned load:{" "}
            <strong>
              {formatWeight(
                suggestion.suggestedWeight
              )}{" "}
              {suggestion.weightUnit}
            </strong>
          </p>

          <p>
            This changes the planned weight
            for future workouts. Completed
            workout records are not rewritten.
          </p>

          <label className="ti-suggestion-check">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) =>
                setReviewed(
                  event.target.checked
                )
              }
            />

            <span>
              I reviewed my technique, effort,
              comfort and available equipment,
              and I want to use this suggested
              weight.
            </span>
          </label>

          <div className="ti-suggestion-buttons">
            <button
              type="button"
              className="ti-suggestion-review-button"
              disabled={
                !reviewed ||
                Boolean(activeWorkout)
              }
              onClick={confirm}
            >
              Confirm & Apply Suggested Weight
            </button>

            <button
              type="button"
              className="ti-suggestion-cancel-button"
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeWorkout && (
        <p className="ti-suggestion-error">
          Finish or discard your active workout
          before applying a new planned load.
        </p>
      )}

      {error && (
        <p
          className="ti-suggestion-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
