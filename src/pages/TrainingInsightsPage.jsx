
import {
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import { exercises } from "../data/exercises";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import {
  buildPerformanceInsights,
} from "../utils/performanceAnalysis";

import {
  recommendExerciseProgression,
} from "../utils/progressionRecommendations";

import ProgressionSuggestionApply from
  "../components/workouts/ProgressionSuggestionApply";

import "./TrainingInsightsPage.css";
import "./ProgressionSuggestion.css";

// ==========================================
// FORMATTING
// ==========================================

function getExerciseName(exerciseId) {
  return (
    exercises.find(
      (exercise) =>
        exercise.id === exerciseId
    )?.name ?? exerciseId
  );
}

function formatNumber(number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getRepsLabel(record) {
  if (
    !record ||
    record.reps.length === 0
  ) {
    return "No sets recorded";
  }

  return (
    record.reps.join(" / ") +
    " reps"
  );
}

function getRecordLoad(record, unit) {
  if (!record) {
    return "—";
  }

  if (record.uniformWeight === null) {
    return "Variable or unrecorded";
  }

  return (
    `${formatNumber(
      record.uniformWeight
    )} ${unit}`
  );
}

function getReviewMessage(insight) {
  if (insight.target.targetType !== "reps") {
    return (
      "This exercise uses a duration target. " +
      "Automatic weight analysis is not used."
    );
  }

  if (insight.recent.length === 0) {
    return (
      "No recorded performances found for " +
      "this exercise in the current program."
    );
  }

  if (insight.recent.length < 2) {
    return (
      "Record another session to compare " +
      "two consecutive performances."
    );
  }

  if (insight.alreadyAdjusted) {
    return (
      "The planned weight has already been " +
      "increased above the latest recorded load. " +
      "Record new sessions before reviewing again."
    );
  }

  if (
    !insight.recent[0].sameConfiguration ||
    !insight.recent[1].sameConfiguration
  ) {
    return (
      "The latest sessions have different " +
      "targets or weight units. No load " +
      "suggestion is available."
    );
  }

  if (
    insight.recent[0].uniformWeight === null ||
    insight.recent[1].uniformWeight === null
  ) {
    return (
      "Record the same positive weight for " +
      "every set in two comparable sessions " +
      "before reviewing an increase."
    );
  }

  if (
    !insight.recent[0].reachedTop ||
    !insight.recent[1].reachedTop
  ) {
    return (
      "Keep tracking your repetitions. " +
      "The upper target has not been reached " +
      "in every set of both recent sessions."
    );
  }

  return (
    "The last two sessions did not use " +
    "the same recorded weight."
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

function TrainingInsightsPage() {
  const {
    appliedPlan,
    updateExerciseWeight,
  } = useWorkoutPlan();

  const { workoutHistory } =
    useWorkoutSession();

  const sessions = useMemo(
    () =>
      buildPerformanceInsights(
        appliedPlan,
        workoutHistory
      ),
    [appliedPlan, workoutHistory]
  );

  const [
    selectedSessionId,
    setSelectedSessionId,
  ] = useState(
    () => sessions[0]?.sessionId ?? ""
  );

  const selectedSession =
    sessions.find(
      (session) =>
        session.sessionId === selectedSessionId
    ) ?? sessions[0];

  const [draftWeights, setDraftWeights] =
    useState({});

  const [feedback, setFeedback] =
    useState(null);

  const totalEligible = sessions.reduce(
    (total, session) =>
      total +
      session.exercises.filter(
        (insight) =>
          insight.canReviewIncrease
      ).length,
    0
  );

  // ========================================
  // MANUAL LOAD CHANGE
  // ========================================

  function handleApplyWeight(insight) {
    const insightKey =
      `${selectedSession.sessionId}:` +
      (insight.entryId ?? insight.exerciseId);

    const input = String(
      draftWeights[insightKey] ?? ""
    ).trim();

    const normalizedInput =
      input.replace(",", ".");

    // Accept positive decimals such as
    // 32, 32.5, or 32,5.
    if (
      !/^\d+(?:\.\d+)?$/.test(
        normalizedInput
      )
    ) {
      setFeedback({
        key: insightKey,
        type: "error",
        text: "Enter a valid positive weight.",
      });

      return;
    }

    const newWeight =
      Number(normalizedInput);

    const currentWeight =
      insight.baselineWeight;

    if (
      !Number.isFinite(newWeight) ||
      currentWeight === null ||
      newWeight <= currentWeight
    ) {
      setFeedback({
        key: insightKey,
        type: "error",

        text:
          "Choose a weight above the " +
          "latest recorded load.",
      });

      return;
    }

    // Conservative guard for this shortcut:
    // no more than a 10% increase.
    // This is not an individualized safety rule.
    const maxAllowed =
      currentWeight * 1.1;

    if (
      newWeight > maxAllowed + 0.000001
    ) {
      setFeedback({
        key: insightKey,
        type: "error",

        text:
          `Choose a smaller step. ` +
          `This shortcut limits a single ` +
          `increase to 10% of the recorded ` +
          `load (up to ${formatNumber(
            maxAllowed
          )} ${insight.weightUnit}).`,
      });

      return;
    }

    const updated = updateExerciseWeight(
      selectedSession.sessionId,
      insight.entryId ?? insight.exerciseId,
      newWeight
    );

    if (!updated) {
      setFeedback({
        key: insightKey,
        type: "error",
        text: "Could not update the workout plan.",
      });

      return;
    }

    setFeedback({
      key: insightKey,
      type: "success",

      text:
        `Planned weight updated to ` +
        `${formatNumber(newWeight)} ` +
        `${insight.weightUnit}. ` +
        `Previous workout records were not changed.`,
    });

    setDraftWeights((previous) => ({
      ...previous,
      [insightKey]: "",
    }));
  }

  // ========================================
  // NO APPLIED PLAN
  // ========================================

  if (!appliedPlan || sessions.length === 0) {
    return (
      <main className="ti-page">

        {/* CONTEXTUAL BACK NAVIGATION */}

        <BackToPreviousPage
          fallbackTo="/progress"
          fallbackLabel="Progress"
          className="ti-back-link"
        />

        <header className="ti-header">
          <span className="ti-eyebrow">
            PERFORMANCE
          </span>

          <h1>
            Performance & Progression
          </h1>

          <p>
            Select a workout plan to start
            reviewing exercise performance.
          </p>
        </header>

        <section className="ti-panel ti-empty">
          <h2>No Active Workout Plan</h2>

          <p>
            Apply a recommended plan or
            create your own program first.
          </p>

          <Link
            to="/workouts/plans"
            className="ti-primary-link"
          >
            Explore Workout Plans
          </Link>
        </section>
      </main>
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="ti-page">

      {/* CONTEXTUAL BACK NAVIGATION */}

      <BackToPreviousPage
        fallbackTo="/progress"
        fallbackLabel="Progress"
        className="ti-back-link"
      />

      <header className="ti-header">
        <span className="ti-eyebrow">
          OBJECTIVE TRAINING DATA
        </span>

        <h1>
          Performance & Progression
        </h1>

        <p>
          Compare actual repetitions and
          recorded loads. You always decide
          whether to change your plan.
        </p>
      </header>

      {/* ==================================
          SUMMARY
      ================================== */}

      <section className="ti-summary">
        <div>
          <span>Current Program</span>

          <strong>
            {appliedPlan.name}
          </strong>
        </div>

        <div>
          <span>Recorded Workouts</span>

          <strong>
            {workoutHistory.length}
          </strong>
        </div>

        <div>
          <span>Progression Reviews</span>

          <strong>
            {totalEligible}
          </strong>
        </div>
      </section>

      {/* ==================================
          SESSION SELECTOR
      ================================== */}

      <section className="ti-panel">
        <div className="ti-section-heading">
          <h2>Choose a Training Session</h2>

          <p>
            Review one session at a time
            to keep the screen simple.
          </p>
        </div>

        <label className="ti-field">
          Training Session

          <select
            value={selectedSession?.sessionId ?? ""}
            onChange={(event) => {
              setSelectedSessionId(
                event.target.value
              );

              setFeedback(null);
            }}
          >
            {sessions.map((session) => (
              <option
                key={session.sessionId}
                value={session.sessionId}
              >
                {session.sessionName}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* ==================================
          EXERCISE INSIGHTS
      ================================== */}

      <div className="ti-exercise-list">
        {selectedSession?.exercises.map(
          (insight, index) => {
            const insightKey =
              `${selectedSession.sessionId}:` +
              (insight.entryId ?? insight.exerciseId);

            const progression =
              recommendExerciseProgression(
                insight
              );

            const plannedWeight =
              insight.plannedWeight === null
                ? "Not specified"
                : `${formatNumber(
                    insight.plannedWeight
                  )} ${insight.weightUnit}`;

            return (
              <section
                key={`${insight.exerciseId}-${index}`}
                className="ti-panel"
              >
                <div className="ti-exercise-heading">
                  <div>
                    <span className="ti-eyebrow">
                      EXERCISE {index + 1}
                    </span>

                    <h2>
                      {getExerciseName(
                        insight.exerciseId
                      )}
                    </h2>

                    <p>
                      {insight.target.sets}
                      {" "}sets ·{" "}
                      {insight.target.targetType ===
                      "duration"
                        ? `${insight.target.durationSeconds} seconds`
                        : `${insight.target.minReps}–${insight.target.maxReps} reps`}
                    </p>
                  </div>

                  {insight.canReviewIncrease && (
                    <span className="ti-review-label">
                      Review Available
                    </span>
                  )}
                </div>

                <div className="ti-target-row">
                  <span>
                    Planned weight
                  </span>

                  <strong>
                    {plannedWeight}
                  </strong>
                </div>

                {/* Latest session records */}
                <div className="ti-records">
                  {insight.recent.length === 0 ? (
                    <p className="ti-no-records">
                      No recorded sessions
                      for this exercise yet.
                    </p>
                  ) : (
                    insight.recent.map(
                      (record, recordIndex) => (
                        <div
                          key={`${record.date}-${recordIndex}`}
                          className="ti-record-row"
                        >
                          <div>
                            <span>
                              {recordIndex === 0
                                ? "Latest"
                                : recordIndex === 1
                                  ? "Previous"
                                  : "Older"}
                            </span>

                            <small>
                              {formatDate(
                                record.date
                              )}
                            </small>
                          </div>

                          <div>
                            <strong>
                              {getRepsLabel(
                                record
                              )}
                            </strong>

                            <small>
                              {getRecordLoad(
                                record,
                                insight.weightUnit
                              )}
                            </small>
                          </div>
                        </div>
                      )
                    )
                  )}
                </div>

                {/* Manual progression review */}
                {insight.canReviewIncrease ? (
                  <div className="ti-progression-box">
                    <div className="ti-progression-heading">
                      <span aria-hidden="true">
                        ↗
                      </span>

                      <strong>
                        Progression Review Available
                      </strong>
                    </div>

                    <p>
                      You reached the upper
                      repetition target in two
                      consecutive comparable
                      sessions at{" "}
                      <strong>
                        {formatNumber(
                          insight.baselineWeight
                        )}{" "}
                        {insight.weightUnit}
                      </strong>.
                    </p>

                    <p>
                      If your technique was
                      controlled and the load
                      felt appropriate, you
                      may choose a small
                      increase. You can also
                      keep the same weight.
                    </p>

                    {progression.status ===
                      "review" &&
                      progression.suggestedWeight !==
                        null && (
                      <div className="ti-suggested-load">
                        <span className="ti-suggested-label">
                          Suggested Next Weight
                        </span>

                        <strong className="ti-suggested-value">
                          {formatNumber(
                            progression.suggestedWeight
                          )}{" "}
                          {progression.weightUnit}
                        </strong>

                        <span className="ti-suggested-change">
                          +{formatNumber(
                            progression.increaseAmount
                          )}{" "}
                          {progression.weightUnit}
                          {" · "}
                          +{formatNumber(
                            progression.increasePercent
                          )}%
                        </span>

                        <small>
                          Calculated suggestion only.
                          Your plan has not changed.
                          Check technique, effort and
                          available equipment before
                          choosing a new weight.
                        </small>
                      </div>
                    )}

                    {progression.status ===
                      "step-unavailable" && (
                      <p className="ti-step-warning">
                        No suggested increase fits
                        the configured weight step
                        within the 5% limit.
                        You can keep your current
                        planned load.
                      </p>
                    )}

                    <ProgressionSuggestionApply
                      insight={insight}
                      sessionId={
                        selectedSession.sessionId
                      }
                      onApplied={(weight, unit) => {
                        setFeedback({
                          key: insightKey,
                          type: "success",
                          text:
                            "Suggested planned weight updated to " +
                            formatNumber(weight) +
                            " " + unit +
                            ". Completed workout records were not changed.",
                        });
                      }}
                    />

                    <div className="ti-update-form">
                      <label
                        className="ti-field"
                        htmlFor={
                          `next-weight-${insightKey}`
                        }
                      >
                        New Planned Weight
                        ({insight.weightUnit})

                        <input
                          id={
                            `next-weight-${insightKey}`
                          }
                          type="text"
                          inputMode="decimal"
                          placeholder={
                            `Above ${formatNumber(
                              insight.baselineWeight
                            )}`
                          }
                          value={
                            draftWeights[insightKey] ??
                            ""
                          }
                          onChange={(event) =>
                            setDraftWeights(
                              (previous) => ({
                                ...previous,

                                [insightKey]:
                                  event.target.value,
                              })
                            )
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="ti-primary-button"
                        onClick={() =>
                          handleApplyWeight(
                            insight
                          )
                        }
                      >
                        Apply to My Plan
                      </button>
                    </div>

                    <small className="ti-help">
                      This shortcut allows
                      increases up to 10% of
                      the last recorded load.
                      This is a guardrail,
                      not a guarantee of safety.
                    </small>
                  </div>
                ) : (
                  <div className="ti-neutral-box">
                    <strong>
                      No Load Review Available
                    </strong>

                    <p>
                      {getReviewMessage(
                        insight
                      )}
                    </p>
                  </div>
                )}

                {/* Confirmation or validation */}
                {feedback?.key === insightKey && (
                  <p
                    className={
                      `ti-feedback ${
                        feedback.type === "success"
                          ? "is-success"
                          : "is-error"
                      }`
                    }
                    role="status"
                  >
                    {feedback.text}
                  </p>
                )}
              </section>
            );
          }
        )}
      </div>

      {/* ==================================
          EXPLANATION
      ================================== */}

      <section className="ti-panel">
        <div className="ti-section-heading">
          <h2>How This Works</h2>
        </div>

        <p className="ti-explanation">
          The application compares recorded
          performance, not estimated muscle
          growth or movement quality.
        </p>

        <p className="ti-explanation">
          A review opportunity is shown only
          after two comparable sessions
          reach the upper repetition target
          using the same recorded weight.
        </p>

        <p className="ti-explanation">
          Nothing is changed until you enter
          a new weight and select
          Apply to My Plan. The current workout
          history is never rewritten.
        </p>

        <p className="ti-explanation">
          Technique, fatigue, recovery, and
          exercise equipment still require
          your judgment. Keeping a load
          unchanged is always an option.
        </p>

        <div className="ti-bottom-links">
          <Link
            to="/progress/history"
            className="ti-secondary-link"
          >
            View Workout History
          </Link>

          <Link
            to="/workouts/builder"
            className="ti-secondary-link"
          >
            Open Workout Builder
          </Link>
        </div>
      </section>
    </main>
  );
}

export default TrainingInsightsPage;
