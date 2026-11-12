import { useState } from "react";
import { Link } from "react-router";

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
  savePersonalizedRecoverySnapshot,
} from "../../utils/personalizedApplicationSafety";

import {
  listPersonalizedRecoverySnapshots,
  readPersonalizedRecoverySnapshot,
  persistRecoveredPlanState,
} from "../../utils/personalizedPlanRecovery";

import "./PersonalizedPlanRecovery.css";

function loadCopies() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return listPersonalizedRecoverySnapshots(
      window.localStorage
    );
  } catch {
    return [];
  }
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

export default function PersonalizedPlanRecovery() {
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

  const [copies, setCopies] =
    useState(loadCopies);

  const [expanded, setExpanded] =
    useState(false);

  const [selectedKey, setSelectedKey] =
    useState("");

  const [confirmingKey, setConfirmingKey] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const selected =
    copies.find(
      (copy) => copy.key === selectedKey
    ) ?? copies[0];

  function refreshCopies() {
    try {
      const next = loadCopies();

      setCopies(next);
      setSelectedKey(
        (previous) =>
          next.some(
            (copy) => copy.key === previous
          )
            ? previous
            : next[0]?.key ?? ""
      );

      setConfirmingKey(null);
      setError("");
    } catch (reason) {
      setError(reason.message);
    }
  }

  function handleReview() {
    if (activeWorkout) {
      setError(
        "Finish or discard the active workout first."
      );
      return;
    }

    if (!selected) {
      setError(
        "Select an available recovery copy."
      );
      return;
    }

    setError("");
    setMessage("");
    setConfirmingKey(selected.key);
  }

  function handleConfirm() {
    if (
      !selected ||
      confirmingKey !== selected.key
    ) {
      setError(
        "The selected copy changed. Review again."
      );
      setConfirmingKey(null);
      return;
    }

    if (activeWorkout) {
      setError(
        "Finish or discard the active workout first."
      );
      setConfirmingKey(null);
      return;
    }

    try {
      const storage = window.localStorage;

      const snapshot =
        readPersonalizedRecoverySnapshot(
          storage,
          selected.key
        );

      // Keep a new recovery copy of
      // everything currently applied.
      const safetyCopy =
        savePersonalizedRecoverySnapshot(
          storage,
          {
            appliedPlan,
            weeklySchedule,
          }
        );

      // Verify persistent storage writes
      // before updating React contexts.
      persistRecoveredPlanState(
        storage,
        snapshot
      );

      saveWeeklySchedule(
        snapshot.weeklySchedule
      );

      applyWorkoutPlan(
        snapshot.appliedPlan
      );

      setConfirmingKey(null);
      setError("");

      setMessage(
        "Recovery applied. A new backup of the replaced setup was saved. Refresh the page to verify persistence."
      );

      setCopies(loadCopies());
      setSelectedKey(safetyCopy.key);
    } catch (reason) {
      setConfirmingKey(null);

      setError(
        reason.message ??
        "Unable to restore the previous plan."
      );
    }
  }

  return (
    <section className="personalized-recovery">
      <div className="personalized-recovery-header">
        <div>
          <h2>Plan Recovery</h2>

          <p>
            Restore an earlier workout plan
            and weekly schedule saved in
            this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setExpanded((value) => !value);
            refreshCopies();
          }}
        >
          {expanded
            ? "Hide Recovery"
            : "Manage Recovery Copies"}
        </button>
      </div>

      {expanded && (
        <div className="personalized-recovery-content">
          <button
            type="button"
            className="personalized-recovery-secondary"
            onClick={refreshCopies}
          >
            Refresh Backup List
          </button>

          {copies.length === 0 ? (
            <p>
              No valid recovery copies were
              found in this browser.
            </p>
          ) : (
            <>
              <label
                htmlFor="personalizedRecoveryCopy"
              >
                Recovery copy
              </label>

              <select
                id="personalizedRecoveryCopy"
                value={selected?.key ?? ""}
                onChange={(event) => {
                  setSelectedKey(
                    event.target.value
                  );
                  setConfirmingKey(null);
                  setMessage("");
                }}
              >
                {copies.map((copy) => (
                  <option
                    key={copy.key}
                    value={copy.key}
                  >
                    {formatDate(copy.savedAt)}
                    {" — "}
                    {copy.planName}
                  </option>
                ))}
              </select>

              <p>
                {selected?.sessionCount ?? 0}
                {" "}sessions in the saved plan.
                The snapshot also includes the
                previous weekly schedule.
              </p>

              <button
                type="button"
                className="personalized-recovery-primary"
                disabled={Boolean(activeWorkout)}
                onClick={handleReview}
              >
                Review Recovery
              </button>
            </>
          )}

          {activeWorkout && (
            <p className="personalized-recovery-warning">
              An active workout must be completed
              or discarded before restoring plans.
            </p>
          )}

          {confirmingKey === selected?.key && (
            <div className="personalized-recovery-confirm">
              <h3>Restore this saved plan?</h3>

              <p>
                This will replace your current
                plan and weekly calendar with
                the selected recovery copy.
                Completed workout history will
                remain separate and unchanged.
              </p>

              <p>
                We will save another recovery
                copy of the current setup first.
              </p>

              <div className="personalized-recovery-actions">
                <button
                  type="button"
                  className="personalized-recovery-primary"
                  disabled={Boolean(activeWorkout)}
                  onClick={handleConfirm}
                >
                  Confirm Restore
                </button>

                <button
                  type="button"
                  className="personalized-recovery-secondary"
                  onClick={() =>
                    setConfirmingKey(null)
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <p
              className="personalized-recovery-warning"
              role="alert"
            >
              {error}
            </p>
          )}

          {message && (
            <p role="status">
              {message}
              {" "}
              <Link to="/workouts/schedule">
                View Weekly Schedule
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
