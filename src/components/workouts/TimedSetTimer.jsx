
import {
  useEffect,
  useState,
} from "react";

import {
  useWorkoutSession,
} from "../../context/WorkoutSessionContext";

import "./TimedSetTimer.css";

function formatMilliseconds(milliseconds) {
  const seconds = Math.max(
    0,
    Math.ceil(milliseconds / 1000)
  );

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    `${String(minutes).padStart(2, "0")}:` +
    String(remainingSeconds).padStart(2, "0")
  );
}

function TimedSetTimer({
  workoutId,
  exerciseId,
  setNumber,
  targetSeconds,
  onDurationChange,
}) {
  const {
    timedSetTimer,

    startTimedSet,
    pauseTimedSet,
    resumeTimedSet,
    stopTimedSet,
    clearTimedSet,
  } = useWorkoutSession();

  const seconds = Math.max(
    1,
    Math.min(
      3600,
      Math.round(Number(targetSeconds) || 30)
    )
  );

  const defaultTotalMs = seconds * 1000;

  // This timer belongs to one exact exercise
  // and one exact set of the current workout.
  const isCurrentTimer =
    timedSetTimer.workoutId === workoutId &&
    timedSetTimer.exerciseId === exerciseId &&
    timedSetTimer.setNumber === setNumber;

  const timer = isCurrentTimer
    ? timedSetTimer
    : {
        status: "idle",
        totalMs: defaultTotalMs,
        remainingMs: defaultTotalMs,
        elapsedMs: 0,
        endsAt: null,
      };

  const [now, setNow] = useState(Date.now());

  // Update the visible countdown without
  // modifying the saved timer every second.
  useEffect(() => {
    if (timer.status !== "running") {
      return;
    }

    setNow(Date.now());

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => clearInterval(intervalId);
  }, [timer.status, timer.endsAt]);

  const remainingMs =
    timer.status === "running"
      ? Math.max(
          0,
          timer.endsAt - now
        )
      : timer.remainingMs;

  const elapsedMs =
    timer.status === "running"
      ? Math.max(
          0,
          timer.totalMs - remainingMs
        )
      : timer.elapsedMs;

  const progress = Math.max(
    0,
    Math.min(
      100,
      (elapsedMs / timer.totalMs) * 100
    )
  );

  // Recover the actual duration after reloading
  // or when the exercise timer is stopped.
  useEffect(() => {
    if (!isCurrentTimer) {
      return;
    }

    if (timer.status === "finished") {
      onDurationChange(
        String(
          Math.round(timer.totalMs / 1000)
        )
      );
    }

    if (timer.status === "stopped") {
      onDurationChange(
        String(
          Math.max(
            1,
            Math.ceil(timer.elapsedMs / 1000)
          )
        )
      );
    }
  }, [
    isCurrentTimer,
    timer.status,
    timer.totalMs,
    timer.elapsedMs,
    onDurationChange,
  ]);

  const displayTime =
    timer.status === "stopped"
      ? formatMilliseconds(elapsedMs)
      : formatMilliseconds(remainingMs);

  function handleStart() {
    startTimedSet({
      workoutId,
      exerciseId,
      setNumber,
      targetSeconds: seconds,
    });
  }

  const statusMessage = {
    idle: "Start when you are ready.",
    running:
      "Hold your position. Maintain controlled technique.",
    paused: "Timer paused.",
    finished:
      "Time completed! Confirm the set below.",
    stopped:
      "Time recorded. Confirm the set below.",
  };

  return (
    <div className="timed-set-timer">
      <div className="timed-set-heading">
        <span>EXERCISE TIMER</span>

        <span>
          Target: {seconds} sec
        </span>
      </div>

      <div
        className="timed-set-clock"
        role="timer"
        aria-label="Exercise timer"
      >
        {displayTime}
      </div>

      <div
        className="timed-set-progress"
        role="progressbar"
        aria-label="Timed exercise progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <p className="timed-set-message">
        {statusMessage[timer.status]}
      </p>

      {timer.status === "idle" && (
        <button
          type="button"
          className="timed-set-primary"
          onClick={handleStart}
        >
          ▶ Start Timer
        </button>
      )}

      {timer.status === "running" && (
        <div className="timed-set-actions">
          <button
            type="button"
            className="timed-set-secondary"
            onClick={pauseTimedSet}
          >
            Pause
          </button>

          <button
            type="button"
            className="timed-set-secondary"
            onClick={stopTimedSet}
          >
            Stop Early
          </button>
        </div>
      )}

      {timer.status === "paused" && (
        <div className="timed-set-actions">
          <button
            type="button"
            className="timed-set-primary"
            onClick={resumeTimedSet}
          >
            Resume
          </button>

          <button
            type="button"
            className="timed-set-secondary"
            onClick={stopTimedSet}
          >
            Stop Early
          </button>
        </div>
      )}

      {(timer.status === "finished" ||
        timer.status === "stopped") && (
        <button
          type="button"
          className="timed-set-secondary"
          onClick={clearTimedSet}
        >
          Restart Timer
        </button>
      )}

      <p className="timed-set-note">
        The timer tracks exercise duration.
        You may also enter the actual time manually.
      </p>
    </div>
  );
}

export default TimedSetTimer;
