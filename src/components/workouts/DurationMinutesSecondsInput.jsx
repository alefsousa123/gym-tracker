import { useState } from 'react';
import {
  splitDurationSeconds,
  combineDurationParts,
} from '../../utils/workoutDuration';
import './DurationMinutesSecondsInput.css';

/** Two editable fields, one canonical durationSeconds value. */
function DurationMinutesSecondsInput({
  value,
  onChange,
  disabled = false,
  label = 'Duration',
  maxSeconds = 3600,
}) {
  const parts = splitDurationSeconds(value);
  const [minutesDraft, setMinutesDraft] = useState(null);
  const [secondsDraft, setSecondsDraft] = useState(null);

  function handleMinutes(raw) {
    if (!/^\d*$/.test(raw)) return;
    setMinutesDraft(raw);
    if (raw === '') return;
    const minutes = Number(raw);
    const total = combineDurationParts(minutes, parts.seconds);
    if (total === null) return;
    // Choosing the maximum minute value resets any leftover seconds.
    const next = minutes * 60 === maxSeconds ? maxSeconds : total;
    if (next <= maxSeconds) onChange(String(next));
  }

  function handleSeconds(raw) {
    if (!/^\d*$/.test(raw)) return;
    setSecondsDraft(raw);
    if (raw === '') return;
    const total = combineDurationParts(parts.minutes, Number(raw));
    if (total !== null && total <= maxSeconds) onChange(String(total));
  }

  function finishMinutes() {
    if (minutesDraft === '') {
      onChange(String(parts.seconds));
    }
    setMinutesDraft(null);
  }

  function finishSeconds() {
    if (secondsDraft === '') {
      onChange(String(parts.minutes * 60));
    }
    setSecondsDraft(null);
  }

  return (
    <div className="duration-mmss" role="group" aria-label={label}>
      <span className="duration-mmss__title">{label}</span>
      <div className="duration-mmss__fields">
        <label className="duration-mmss__field">
          Minutes
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max={Math.floor(maxSeconds / 60)}
            step="1"
            value={minutesDraft ?? String(parts.minutes)}
            disabled={disabled}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => handleMinutes(event.target.value)}
            onBlur={finishMinutes}
          />
        </label>
        <label className="duration-mmss__field">
          Seconds
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="59"
            step="1"
            value={secondsDraft ?? String(parts.seconds)}
            disabled={disabled}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => handleSeconds(event.target.value)}
            onBlur={finishSeconds}
          />
        </label>
      </div>
    </div>
  );
}

export default DurationMinutesSecondsInput;
