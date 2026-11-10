
import {
  useEffect,
  useRef,
  useState,
} from "react";

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
  targetSeconds,
  onDurationChange,
  onBusyChange,
}) {
  const totalSeconds = Math.max(
    1,
    Math.min(
      3600,
      Math.round(Number(targetSeconds) || 30)
    )
  );

  const totalMs = totalSeconds * 1000;

  const [status, setStatus] = useState("idle");
  const [remainingMs, setRemainingMs] =
    useState(totalMs);

  const endAtRef = useRef(null);

  // Calculate the time from a real deadline
  // instead of decrementing a counter each second.
  useEffect(() => {
    if (status !== "running") {
      return;
    }

    function updateClock() {
      const millisecondsLeft = Math.max(
        0,
        endAtRef.current - Date.now()
      );

      setRemainingMs(millisecondsLeft);
    }

    updateClock();

    const intervalId = setInterval(
      updateClock,
      200
    );

    return () => clearInterval(intervalId);
  }, [status]);

  // When the countdown finishes, fill the actual
  // duration but do not complete the set automatically.
  useEffect(() => {
    if (
      status !== "running" ||
      remainingMs > 0
    ) {
      return;
    }

    setStatus("finished");
    onDurationChange(String(totalSeconds));
    onBusyChange(false);
  }, [
    status,
    remainingMs,
    totalSeconds,
    onDurationChange,
    onBusyChange,
  ]);

  // Unlock the parent form when leaving this timer.
  useEffect(() => {
    return () => {
      onBusyChange(false);
    };
  }, [onBusyChange]);

  function handleStart() {
    setRemainingMs(totalMs);

    endAtRef.current =
      Date.now() + totalMs;

    setStatus("running");
    onBusyChange(true);
  }

  function handlePause() {
    if (status !== "running") {
      return;
    }

    const millisecondsLeft = Math.max(
      0,
      endAtRef.current - Date.now()
    );

    setRemainingMs(millisecondsLeft);
    setStatus("paused");
  }

  function handleResume() {
    if (status !== "paused") {
      return;
    }

    endAtRef.current =
      Date.now() + remainingMs;

    setStatus("running");
  }

  function handleStopEarly() {
    if (
      status !== "running" &&
      status !== "paused"
    ) {
      return;
    }

    const millisecondsLeft =
      status === "running"
        ? Math.max(
            0,
            endAtRef.current - Date.now()
          )
        : remainingMs;

    const elapsedSeconds = Math.min(
      totalSeconds,
      Math.max(
        1,
        Math.ceil(
          (totalMs - millisecondsLeft) / 1000
        )
      )
    );

    setRemainingMs(millisecondsLeft);
    setStatus("stopped");

    onDurationChange(
      String(elapsedSeconds)
    );

    onBusyChange(false);
  }

  function handleReset() {
    setStatus("idle");
    setRemainingMs(totalMs);
    endAtRef.current = null;

    onBusyChange(false);
  }

  const elapsedSeconds = Math.min(
    totalSeconds,
    Math.max(
      0,
      Math.ceil(
        (totalMs - remainingMs) / 1000
      )
    )
  );

  const displayTime =
    status === "stopped"
      ? formatMilliseconds(
          totalMs - remainingMs
        )
      : formatMilliseconds(remainingMs);

  const progress = Math.max(
    0,
    Math.min(
      100,
      ((totalMs - remainingMs) / totalMs) * 100
    )
  );

  return (
    <div className="timed-set-timer">
      <div className="timed-set-heading">
        <span>EXERCISE TIMER</span>

        <span>
          Target: {totalSeconds} sec
        </span>
      </div>

      <div
        className="timed-set-clock"
        role="timer"
        aria-label="Exercise timer"
      >
        {displayTime}
      </div>

      <div className="timed-set-progress">
        <div
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <p className="timed-set-message">
        {status === "idle" &&
          "Start when you are ready."}

        {status === "running" &&
          "Hold your position. Focus on controlled technique."}

        {status === "paused" &&
          "Timer paused."}

        {status === "finished" &&
          "Time completed! Confirm the set below."}

        {status === "stopped" &&
          `${elapsedSeconds} seconds recorded. Confirm the set below.`}
      </p>

      {status === "idle" && (
        <button
          type="button"
          className="timed-set-primary"
          onClick={handleStart}
        >
          ▶ Start Timer
        </button>
      )}

      {status === "running" && (
        <div className="timed-set-actions">
          <button
            type="button"
            className="timed-set-secondary"
            onClick={handlePause}
          >
            Pause
          </button>

          <button
            type="button"
            className="timed-set-secondary"
            onClick={handleStopEarly}
          >
            Stop Early
          </button>
        </div>
      )}

      {status === "paused" && (
        <div className="timed-set-actions">
          <button
            type="button"
            className="timed-set-primary"
            onClick={handleResume}
          >
            Resume
          </button>

          <button
            type="button"
            className="timed-set-secondary"
            onClick={handleStopEarly}
          >
            Stop Early
          </button>
        </div>
      )}

      {(status === "finished" ||
        status === "stopped") && (
        <button
          type="button"
          className="timed-set-secondary"
          onClick={handleReset}
        >
          Restart Timer
        </button>
      )}

      <p className="timed-set-note">
        The timer measures your exercise.
        You can also enter the actual
        duration manually.
      </p>
    </div>
  );
}

export default TimedSetTimer;
