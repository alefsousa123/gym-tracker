
import {
  useMemo,
  useState,
} from "react";

import { Link } from "react-router";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

import {
  measurementFields,
  getLocalDateKey,
  isValidDateKey,
  formatMeasurementDate,
  createEmptyMeasurementForm,
  createFormFromEntry,
  parseMeasurementForm,
  isValidMeasurementHistory,
  sortMeasurementHistory,
  getMeasurementTimeline,
  getMeasurementSummary,
} from "../utils/bodyMeasurements";

import "./BodyMeasurementsPage.css";

// ==========================================
// STORAGE
// ==========================================

const STORAGE_KEY =
  "gym-tracker:body-measurements:v1";

// ==========================================
// FORMAT HELPERS
// ==========================================

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDifference(value, unit) {
  if (value === null) {
    return "—";
  }

  const prefix =
    value > 0 ? "+" : "";

  return (
    `${prefix}${formatNumber(value)} ${unit}`
  );
}

function dateToTimestamp(dateKey) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day,
    12
  ).getTime();
}

// ==========================================
// SVG MEASUREMENT CHART
// ==========================================

function MeasurementChart({
  timeline,
  unit,
}) {
  if (timeline.length === 0) {
    return (
      <div className="bm-chart-empty">
        <strong>No Measurements Yet</strong>

        <p>
          Save at least one value for
          this measurement to display
          its history.
        </p>
      </div>
    );
  }

  const width = Math.max(
    720,
    Math.min(
      1800,
      timeline.length * 70
    )
  );

  const height = 270;

  const left = 66;
  const right = 28;
  const top = 25;
  const bottom = 55;

  const plotWidth =
    width - left - right;

  const plotHeight =
    height - top - bottom;

  const values = timeline.map(
    (entry) => entry.value
  );

  const lowestValue =
    Math.min(...values);

  const highestValue =
    Math.max(...values);

  const difference =
    highestValue - lowestValue;

  // Zoom to the recorded value range.
  // The chart explicitly tells the user
  // that the vertical axis may not start at 0.
  const padding = Math.max(
    0.5,
    difference * 0.3
  );

  const yMin = Math.max(
    0,
    lowestValue - padding
  );

  const yMax =
    highestValue + padding;

  const firstTimestamp =
    dateToTimestamp(
      timeline[0].date
    );

  const lastTimestamp =
    dateToTimestamp(
      timeline[
        timeline.length - 1
      ].date
    );

  const points = timeline.map(
    (entry) => {
      const timestamp =
        dateToTimestamp(
          entry.date
        );

      const x =
        firstTimestamp === lastTimestamp
          ? left + plotWidth / 2
          : left +
            (
              (timestamp - firstTimestamp) /
              (lastTimestamp - firstTimestamp)
            ) * plotWidth;

      const y =
        top +
        plotHeight -
        (
          (entry.value - yMin) /
          (yMax - yMin)
        ) * plotHeight;

      return {
        ...entry,
        x,
        y,
      };
    }
  );

  const gridFractions = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

  return (
    <div className="bm-chart-scroll">
      <svg
        className="bm-svg"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          minWidth: `${width}px`,
        }}
        role="img"
        aria-label={
          `Measurement trend with ` +
          `${timeline.length} observations`
        }
      >
        <title>Measurement Trend</title>

        <desc>
          Measurements are plotted in
          chronological order. The horizontal
          distance represents elapsed time.
          See the history below for exact data.
        </desc>

        {gridFractions.map((fraction) => {
          const y =
            top +
            plotHeight * (1 - fraction);

          const value =
            yMin +
            fraction * (yMax - yMin);

          return (
            <g key={fraction}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                stroke="#3f3f46"
                strokeDasharray="4 5"
              />

              <text
                x={left - 10}
                y={y + 4}
                fill="#a1a1aa"
                textAnchor="end"
                fontSize="11"
              >
                {formatNumber(value)}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <polyline
            points={points
              .map(
                (point) =>
                  `${point.x},${point.y}`
              )
              .join(" ")}
            fill="none"
            stroke="#4ade80"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#4ade80"
            stroke="#18181b"
            strokeWidth="2"
          >
            <title>
              {formatMeasurementDate(
                point.date
              )}
              {": "}
              {formatNumber(
                point.value
              )}
              {" "}
              {unit}
            </title>
          </circle>
        ))}

        <text
          x={
            points.length === 1
              ? left + plotWidth / 2
              : left
          }
          y={height - 25}
          textAnchor={
            points.length === 1
              ? "middle"
              : "start"
          }
          fill="#a1a1aa"
          fontSize="11"
        >
          {formatMeasurementDate(
            timeline[0].date
          )}
        </text>

        {points.length > 1 && (
          <text
            x={width - right}
            y={height - 25}
            textAnchor="end"
            fill="#a1a1aa"
            fontSize="11"
          >
            {formatMeasurementDate(
              timeline[
                timeline.length - 1
              ].date
            )}
          </text>
        )}

        <text
          x={width / 2}
          y={height - 5}
          fill="#71717a"
          fontSize="11"
          textAnchor="middle"
        >
          Measurement date
        </text>
      </svg>
    </div>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================

function BodyMeasurementsPage() {
  const [history, setHistory] =
    usePersistentState(
      STORAGE_KEY,
      [],
      isValidMeasurementHistory
    );

  const todayKey =
    getLocalDateKey();

  const [selectedDate, setSelectedDate] =
    useState(todayKey);

  const [form, setForm] = useState(
    () =>
      createFormFromEntry(
        history.find(
          (entry) =>
            entry.date === todayKey
        )
      )
  );

  const [selectedField, setSelectedField] =
    useState("waist");

  const [feedback, setFeedback] =
    useState(null);

  const sortedHistory = useMemo(
    () =>
      sortMeasurementHistory(history),
    [history]
  );

  const selectedEntry = history.find(
    (entry) =>
      entry.date === selectedDate
  );

  const selectedDefinition =
    measurementFields.find(
      (field) =>
        field.key === selectedField
    ) ?? measurementFields[0];

  const timeline = useMemo(
    () =>
      getMeasurementTimeline(
        history,
        selectedField
      ),
    [history, selectedField]
  );

  const summary = useMemo(
    () =>
      getMeasurementSummary(timeline),
    [timeline]
  );

  // ========================================
  // FORM HANDLERS
  // ========================================

  function handleDateChange(nextDate) {
    setSelectedDate(nextDate);

    const entry = history.find(
      (item) =>
        item.date === nextDate
    );

    setForm(
      createFormFromEntry(entry)
    );

    setFeedback(null);
  }

  function handleFieldChange(
    fieldKey,
    value
  ) {
    setForm((previous) => ({
      ...previous,
      [fieldKey]: value,
    }));

    setFeedback(null);
  }

  function handleClearForm() {
    setForm(
      createEmptyMeasurementForm()
    );

    setFeedback(null);
  }

  function handleSave(event) {
    event.preventDefault();

    if (
      !isValidDateKey(selectedDate) ||
      selectedDate > getLocalDateKey()
    ) {
      setFeedback({
        type: "error",
        message:
          "Choose a valid date that is " +
          "not in the future.",
      });

      return;
    }

    const parsed =
      parseMeasurementForm(form);

    if (!parsed.success) {
      setFeedback({
        type: "error",
        message: parsed.error,
      });

      return;
    }

    const updatedEntry = {
      date: selectedDate,

      measurements:
        parsed.measurements,
    };

    // Exactly one entry per calendar day.
    // Existing values for that day are
    // replaced by the form's current values.
    setHistory((previous) =>
      sortMeasurementHistory([
        ...previous.filter(
          (entry) =>
            entry.date !== selectedDate
        ),
        updatedEntry,
      ])
    );

    setFeedback({
      type: "success",

      message: selectedEntry
        ? "Measurements updated successfully."
        : "Measurements saved successfully.",
    });
  }

  function handleEdit(entry) {
    setSelectedDate(
      entry.date
    );

    setForm(
      createFormFromEntry(entry)
    );

    setFeedback({
      type: "info",
      message:
        `Editing measurements from ` +
        `${formatMeasurementDate(entry.date)}. ` +
        `Use Save Measurements to apply changes.`,
    });
  }

  function handleDelete(entry) {
    const confirmed = window.confirm(
      `Delete measurements recorded on ` +
      `${formatMeasurementDate(entry.date)}? ` +
      `This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setHistory((previous) =>
      previous.filter(
        (item) =>
          item.date !== entry.date
      )
    );

    if (selectedDate === entry.date) {
      setForm(
        createEmptyMeasurementForm()
      );
    }

    setFeedback({
      type: "success",
      message:
        "Measurement entry deleted.",
    });
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="bm-page">
      <Link
        to="/progress"
        className="bm-back-link"
      >
        ← Back to Progress
      </Link>

      <header className="bm-header">
        <span className="bm-eyebrow">
          BODY MEASUREMENTS
        </span>

        <h1>Measurement Tracker</h1>

        <p>
          Record optional body measurements
          and review their changes over time.
          Only the measurements you enter
          are stored.
        </p>
      </header>

      {/* ==================================
          MEASUREMENT FORM
      ================================== */}

      <section className="bm-panel">
        <div className="bm-section-heading">
          <div>
            <h2>
              {selectedEntry
                ? "Edit Measurements"
                : "Record Measurements"}
            </h2>

            <p>
              Fill in any measurements
              you want to track. You do
              not need to complete
              every field.
            </p>
          </div>
        </div>

        <form
          className="bm-form"
          onSubmit={handleSave}
          autoComplete="off"
        >
          <label className="bm-field">
            <span>Measurement Date</span>

            <input
              type="date"
              value={selectedDate}
              max={todayKey}
              required
              onChange={(event) =>
                handleDateChange(
                  event.target.value
                )
              }
            />
          </label>

          {selectedEntry && (
            <p className="bm-existing-note">
              A record already exists for
              this date. Saving will update
              that day's measurements.
              Empty fields will not be kept.
            </p>
          )}

          <div className="bm-form-grid">
            {measurementFields.map(
              (field) => (
                <label
                  key={field.key}
                  className="bm-field"
                >
                  <span>
                    {field.label}
                  </span>

                  <small>
                    {field.description}
                  </small>

                  <div className="bm-input-wrapper">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Optional"
                      value={
                        form[field.key] ?? ""
                      }
                      onChange={(event) =>
                        handleFieldChange(
                          field.key,
                          event.target.value
                        )
                      }
                    />

                    <span className="bm-unit">
                      {field.unit}
                    </span>
                  </div>
                </label>
              )
            )}
          </div>

          <div className="bm-actions">
            <button
              type="submit"
              className="bm-primary-button"
            >
              {selectedEntry
                ? "Update Measurements"
                : "Save Measurements"}
            </button>

            <button
              type="button"
              className="bm-secondary-button"
              onClick={handleClearForm}
            >
              Clear Fields
            </button>
          </div>

          {feedback && (
            <p
              className={
                `bm-feedback is-${feedback.type}`
              }
              role="status"
            >
              {feedback.message}
            </p>
          )}
        </form>
      </section>

      {/* ==================================
          MEASUREMENT CHART
      ================================== */}

      <section className="bm-panel">
        <div className="bm-section-heading">
          <div>
            <h2>Measurement Progress</h2>

            <p>
              Explore one measurement
              at a time.
            </p>
          </div>
        </div>

        <label className="bm-field bm-chart-select">
          <span>
            Select Measurement
          </span>

          <select
            value={selectedField}
            onChange={(event) =>
              setSelectedField(
                event.target.value
              )
            }
          >
            {measurementFields.map(
              (field) => (
                <option
                  key={field.key}
                  value={field.key}
                >
                  {field.label}
                </option>
              )
            )}
          </select>
        </label>

        <div className="bm-stats-grid">
          <article className="bm-stat-card">
            <span>First Recorded</span>

            <strong>
              {summary.first
                ? `${formatNumber(
                    summary.first.value
                  )} ${selectedDefinition.unit}`
                : "—"}
            </strong>

            <small>
              {summary.first
                ? formatMeasurementDate(
                    summary.first.date
                  )
                : "No record"}
            </small>
          </article>

          <article className="bm-stat-card">
            <span>Latest Recorded</span>

            <strong>
              {summary.latest
                ? `${formatNumber(
                    summary.latest.value
                  )} ${selectedDefinition.unit}`
                : "—"}
            </strong>

            <small>
              {summary.latest
                ? formatMeasurementDate(
                    summary.latest.date
                  )
                : "No record"}
            </small>
          </article>

          <article className="bm-stat-card">
            <span>Recorded Difference</span>

            <strong>
              {formatDifference(
                summary.difference,
                selectedDefinition.unit
              )}
            </strong>

            <small>
              {summary.count}
              {" "}
              {summary.count === 1
                ? "observation"
                : "observations"}
            </small>
          </article>
        </div>

        <MeasurementChart
          timeline={timeline}
          unit={selectedDefinition.unit}
        />

        <p className="bm-chart-note">
          The chart follows measurement
          dates, not training sessions.
          Its vertical axis is zoomed
          to the recorded range and may
          not start at zero. Small
          differences can appear visually
          larger because of this scale.
        </p>
      </section>

      {/* ==================================
          HISTORY
      ================================== */}

      <section className="bm-panel">
        <div className="bm-section-heading">
          <div>
            <h2>Measurement History</h2>

            <p>
              {history.length}
              {" "}
              {history.length === 1
                ? "saved date"
                : "saved dates"}
              . Select Edit to load
              an earlier entry.
            </p>
          </div>
        </div>

        {sortedHistory.length === 0 ? (
          <div className="bm-empty">
            <strong>
              No Measurements Saved
            </strong>

            <p>
              Your first saved entry
              will appear here.
            </p>
          </div>
        ) : (
          <div className="bm-history-list">
            {sortedHistory.map(
              (entry) => (
                <article
                  key={entry.date}
                  className="bm-history-card"
                >
                  <div className="bm-history-top">
                    <strong>
                      {formatMeasurementDate(
                        entry.date
                      )}
                    </strong>

                    <div className="bm-history-actions">
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(entry)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="bm-delete-button"
                        onClick={() =>
                          handleDelete(entry)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="bm-history-values">
                    {measurementFields
                      .filter(
                        (field) =>
                          typeof entry
                            .measurements[
                              field.key
                            ] === "number"
                      )
                      .map((field) => (
                        <div
                          key={field.key}
                          className="bm-value-chip"
                        >
                          <span>
                            {field.label}
                          </span>

                          <strong>
                            {formatNumber(
                              entry.measurements[
                                field.key
                              ]
                            )}
                            {" "}
                            {field.unit}
                          </strong>
                        </div>
                      ))}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* ==================================
          GUIDANCE
      ================================== */}

      <section className="bm-panel">
        <div className="bm-section-heading">
          <h2>Measuring Consistently</h2>
        </div>

        <div className="bm-guidance">
          <p>
            <strong>Use the same method.</strong>{" "}
            Try to measure at the same
            anatomical location and use
            a consistent tape position.
          </p>

          <p>
            <strong>Compare comparable conditions.</strong>{" "}
            Body weight and circumferences
            can vary with hydration,
            food intake, and measurement
            technique.
          </p>

          <p>
            <strong>Interpret changes carefully.</strong>{" "}
            An increase in arm or thigh
            circumference does not prove
            muscle growth. A decrease
            in waist circumference does
            not directly measure body
            fat loss.
          </p>

          <p>
            <strong>Keep tracking optional.</strong>{" "}
            You do not need to record
            body measurements to use
            your workout plan or progression
            features.
          </p>
        </div>
      </section>

      <section className="bm-privacy">
        <h2>Local Data & Privacy</h2>

        <p>
          These measurements are saved in
          this browser's local storage,
          without encryption or cloud
          backup. They may be accessible
          to other people using the same
          browser profile.
        </p>

        <p>
          Use this feature only if you
          are comfortable storing body
          measurements on this device.
          Deleting an entry removes it
          from this app's saved history.
        </p>
      </section>
    </main>
  );
}

export default BodyMeasurementsPage;
