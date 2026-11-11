
import {
  useEffect,
  useState,
} from "react";

import {
  useWorkoutSession,
} from "../../context/WorkoutSessionContext";

import "./TimedSetTimer.css";

// ==========================================
// TIME FORMATTER
// ==========================================

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

// ==========================================
// TIMED SET TIMER
// ==========================================

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

  // ========================================
  // TARGET DURATION
  // ========================================

  const seconds = Math.max(
    1,
    Math.min(
      3600,
      Math.round(Number(targetSeconds) || 30)
    )
  );

  const defaultTotalMs = seconds * 1000;

  // ========================================
  // CURRENT TIMER IDENTIFICATION
  // ========================================

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

  // ========================================
  // CLOCK STATE
  // ========================================

  // Null indicates that the first timer
  // tick has not happened yet.
  //
  // Unlike useState(Date.now()), this
  // initial value is pure.

  const [now, setNow] = useState(null);

  // ========================================
  // CLOCK UPDATES
  // ========================================

  useEffect(() => {
    if (timer.status !== "running") {
      return;
    }

    // Update the clock from the interval
    // callback, not synchronously from
    // the effect body.

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    timer.status,
    timer.endsAt,
  ]);

  // ========================================
  // REMAINING TIME
  // ========================================

  // Until the first tick, use the saved
  // remaining time.
  //
  // The timer will synchronize with the
  // real end timestamp on the next tick.

  const hasClockTick =
    now !== null &&
    Number.isFinite(now);

  const hasValidEndTime =
    Number.isFinite(timer.endsAt);

  const remainingMs =
    timer.status === "running" &&
    hasClockTick &&
    hasValidEndTime
      ? Math.max(
          0,
          Math.min(
            timer.remainingMs,
            timer.endsAt - now
          )
        )
      : timer.remainingMs;

  // ========================================
  // ELAPSED TIME
  // ========================================

  const elapsedMs =
    timer.status === "running"
      ? Math.max(
          0,
          timer.totalMs - remainingMs
        )
      : timer.elapsedMs;

  // ========================================
  // PROGRESS PERCENTAGE
  // ========================================

  const progress = Math.max(
    0,
    Math.min(
      100,
      timer.totalMs > 0
        ? (elapsedMs / timer.totalMs) * 100
        : 0
    )
  );

  // ========================================
  // RESTORE RECORDED DURATION
  // ========================================

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

  // ========================================
  // DISPLAY TIME
  // ========================================

  const displayTime =
    timer.status === "stopped"
      ? formatMilliseconds(elapsedMs)
      : formatMilliseconds(remainingMs);

  // ========================================
  // START HANDLER
  // ========================================

  function handleStart() {
    startTimedSet({
      workoutId,
      exerciseId,
      setNumber,
      targetSeconds: seconds,
    });
  }

  // ========================================
  // STATUS MESSAGES
  // ========================================

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

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="timed-set-timer">

      {/* TIMER HEADING */}

      <div className="timed-set-heading">
        <span>EXERCISE TIMER</span>

        <span>
          Target: {seconds} sec
        </span>
      </div>

      {/* CURRENT TIME */}

      <div
        className="timed-set-clock"
        role="timer"
        aria-label="Exercise timer"
      >
        {displayTime}
      </div>

      {/* PROGRESS BAR */}

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

      {/* STATUS MESSAGE */}

      <p className="timed-set-message">
        {statusMessage[timer.status]}
      </p>

      {/* START */}

      {timer.status === "idle" && (
        <button
          type="button"
          className="timed-set-primary"
          onClick={handleStart}
        >
          ▶ Start Timer
        </button>
      )}

      {/* PAUSE / STOP EARLY */}

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

      {/* RESUME / STOP EARLY */}

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

      {/* RESTART */}

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

      {/* NOTE */}

      <p className="timed-set-note">
        The timer tracks exercise duration.
        You may also enter the actual time manually.
      </p>

    </div>
  );
}

export default TimedSetTimer;
