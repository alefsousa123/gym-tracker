
import {
  loadMeasurementOptions,
} from "../../utils/workoutTargets";

import DurationMinutesSecondsInput from "./DurationMinutesSecondsInput";
import { formatDurationLabel } from "../../utils/workoutDuration";

import "./ExerciseTargetsEditor.css";

function ExerciseTargetsEditor({
  exerciseName,
  target,
  weightUnit,
  onChange,
}) {
  const isTimed = target.targetType === "duration";

  const targetSummary = isTimed
    ? formatDurationLabel(target.durationSeconds)
    : `${target.minReps}–${target.maxReps} reps`;

  const weightSummary =
    target.weight === "" ||
    target.weight === null ||
    target.weight === undefined
      ? "Weight not set"
      : `${target.weight} ${weightUnit}`;

  return (
    <details className="exercise-targets-editor">
      <summary className="exercise-targets-summary">
        <span className="exercise-targets-summary-title">
          Configure Sets, Reps, Time & Weight
        </span>

        <span className="exercise-targets-summary-values">
          {target.sets} sets
          {" · "}
          {targetSummary}
          {" · "}
          {weightSummary}
        </span>
      </summary>

      <div className="exercise-targets-content">
        <p className="exercise-targets-description">
          Set your preferred training targets for{" "}
          <strong>{exerciseName}</strong>.
        </p>

        <div className="exercise-targets-grid">
          <div className="exercise-targets-field">
            <label>
              Number of Sets
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                value={target.sets}
                onChange={(event) =>
                  onChange({
                    sets: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="exercise-targets-field">
            <label>
              Target Type
              <select
                value={target.targetType}
                onChange={(event) =>
                  onChange({
                    targetType: event.target.value,
                  })
                }
              >
                <option value="reps">
                  Repetitions
                </option>

                <option value="duration">
                  Timed Exercise
                </option>
              </select>
            </label>
          </div>

          {isTimed ? (
            <div className="exercise-targets-field">
              <DurationMinutesSecondsInput
                label="Planned Duration"
                value={target.durationSeconds}
                onChange={(durationSeconds) =>
                  onChange({ durationSeconds })
                }
              />
            </div>
          ) : (
            <>
              <div className="exercise-targets-field">
                <label>
                  Minimum Reps
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={target.minReps}
                    onChange={(event) =>
                      onChange({
                        minReps: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="exercise-targets-field">
                <label>
                  Maximum Reps
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={target.maxReps}
                    onChange={(event) =>
                      onChange({
                        maxReps: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          <div className="exercise-targets-field">
            <label>
              Rest Between Sets (seconds)
              <input
                type="number"
                min="0"
                max="900"
                step="1"
                value={target.restSeconds}
                onChange={(event) =>
                  onChange({
                    restSeconds: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="exercise-targets-field">
            <label>
              Planned Weight ({weightUnit})
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Not set"
                value={target.weight}
                onChange={(event) =>
                  onChange({
                    weight: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="exercise-targets-field">
            <label>
              Load Measurement
              <select
                value={target.loadMeasurement}
                onChange={(event) =>
                  onChange({
                    loadMeasurement:
                      event.target.value,
                  })
                }
              >
                {loadMeasurementOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>

        <div className="exercise-targets-note">
          <strong>Manual Weight Control</strong>

          <p>
            Weight is optional. Enter the load you
            normally use or leave it blank for now.
            Gym Tracker will never increase your
            weight automatically.
          </p>
        </div>
      </div>
    </details>
  );
}

export default ExerciseTargetsEditor;
