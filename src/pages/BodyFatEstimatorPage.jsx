
import { useState } from "react";
import { Link } from "react-router";

import {
  estimateBodyFat,
} from "../utils/bodyFatEstimate";

import "./BodyFatEstimatorPage.css";

// ==========================================
// INITIAL FORM VALUES
// ==========================================

const initialMeasurements = {
  model: "",
  height: "",
  neck: "",
  waist: "",
  hip: "",
};

// ==========================================
// REUSABLE MEASUREMENT FIELD
// ==========================================

function MeasurementField({
  id,
  label,
  description,
  value,
  onChange,
}) {
  return (
    <label
      className="bf-field"
      htmlFor={id}
    >
      <span className="bf-field-label">
        {label}
      </span>

      <span className="bf-field-description">
        {description}
      </span>

      <div className="bf-input-wrapper">
        <input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 80"
          value={value}
          onChange={(event) =>
            onChange(
              id,
              event.target.value
            )
          }
          required
        />

        <span className="bf-input-unit">
          cm
        </span>
      </div>
    </label>
  );
}

// ==========================================
// BODY FAT ESTIMATOR PAGE
// ==========================================

function BodyFatEstimatorPage() {
  const [measurements, setMeasurements] =
    useState(initialMeasurements);

  const [result, setResult] =
    useState(null);

  const femaleModelSelected =
    measurements.model === "female";

  function handleChange(name, value) {
    setMeasurements((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Prevent showing a stale result.
    setResult(null);
  }

  function handleCalculate(event) {
    event.preventDefault();

    const calculation = estimateBodyFat(
      measurements
    );

    setResult(calculation);
  }

  function handleClear() {
    setMeasurements({
      ...initialMeasurements,
    });

    setResult(null);
  }

  return (
    <main className="bf-page">
      {/* ==================================
          HEADER
      ================================== */}

      <Link
        to="/progress"
        className="bf-back-link"
      >
        ← Back to Progress
      </Link>

      <header className="bf-header">
        <span className="bf-eyebrow">
          OPTIONAL BODY COMPOSITION TOOL
        </span>

        <h1>Body Fat Estimator</h1>

        <p>
          Use tape measurements to calculate
          an approximate body fat percentage.
          The result is not a clinical
          measurement or diagnosis.
        </p>
      </header>

      {/* ==================================
          CALCULATION FORM
      ================================== */}

      <section className="bf-panel">
        <div className="bf-section-heading">
          <h2>Your Measurements</h2>

          <p>
            All measurements are entered
            in centimeters.
          </p>
        </div>

        <form
          className="bf-form"
          autoComplete="off"
          onSubmit={handleCalculate}
        >
          <label
            className="bf-field"
            htmlFor="measurement-model"
          >
            <span className="bf-field-label">
              Measurement Model
            </span>

            <span className="bf-field-description">
              Select the historical equation
              to use. The original models
              were developed separately
              for men and women.
            </span>

            <select
              id="measurement-model"
              value={measurements.model}
              onChange={(event) =>
                handleChange(
                  "model",
                  event.target.value
                )
              }
              required
            >
              <option value="">
                Select a model
              </option>

              <option value="male">
                Male-based equation
              </option>

              <option value="female">
                Female-based equation
              </option>
            </select>
          </label>

          <div className="bf-measurement-grid">
            <MeasurementField
              id="height"
              label="Height"
              description="Measure your height without shoes."
              value={measurements.height}
              onChange={handleChange}
            />

            <MeasurementField
              id="neck"
              label="Neck Circumference"
              description="Measure just below the larynx, with the tape snug but not tight."
              value={measurements.neck}
              onChange={handleChange}
            />

            <MeasurementField
              id="waist"
              label={
                femaleModelSelected
                  ? "Natural Waist Circumference"
                  : "Abdominal Circumference"
              }
              description={
                femaleModelSelected
                  ? "Measure at the narrowest part of your natural waist."
                  : "Measure around the abdomen at the level of the navel."
              }
              value={measurements.waist}
              onChange={handleChange}
            />

            {femaleModelSelected && (
              <MeasurementField
                id="hip"
                label="Hip Circumference"
                description="Measure around the widest part of the hips and buttocks."
                value={measurements.hip}
                onChange={handleChange}
              />
            )}
          </div>

          <p className="bf-measurement-note">
            Keep the measuring tape level.
            Measure after a normal, relaxed
            exhalation, without pulling the
            tape tightly into the skin.
            Use the same measuring technique
            if repeating the estimate.
          </p>

          <div className="bf-actions">
            <button
              type="submit"
              className="bf-primary-button"
            >
              Calculate Estimate
            </button>

            <button
              type="button"
              className="bf-secondary-button"
              onClick={handleClear}
            >
              Clear Measurements
            </button>
          </div>
        </form>
      </section>

      {/* ==================================
          ESTIMATION RESULT
      ================================== */}

      {result && (
        <section
          className="bf-panel"
          aria-label="Body fat estimation result"
        >
          {result.success ? (
            <div
              className="bf-result"
              role="status"
            >
              <span className="bf-result-label">
                APPROXIMATE ESTIMATE
              </span>

              <strong className="bf-result-value">
                ≈ {result.percentage}%
              </strong>

              <p>
                Estimated body fat percentage
                using a historical
                circumference equation.
              </p>

              <div className="bf-result-divider" />

              <p className="bf-result-note">
                This is not your measured
                body fat percentage. The
                equation can have substantial
                individual error, and a
                small change in measurements
                may change the estimate.
              </p>

              <p className="bf-result-note">
                Do not use this estimate
                alone to make medical,
                nutritional, or training
                decisions.
              </p>
            </div>
          ) : (
            <div
              className="bf-error"
              role="alert"
            >
              <strong>
                Could Not Calculate
              </strong>

              <p>{result.error}</p>
            </div>
          )}
        </section>
      )}

      {/* ==================================
          METHOD EXPLANATION
      ================================== */}

      <section className="bf-panel">
        <div className="bf-section-heading">
          <h2>How This Estimate Works</h2>

          <p>
            Understanding the result is
            more important than the number
            itself.
          </p>
        </div>

        <div className="bf-information">
          <article>
            <h3>1. Circumference-Based Formula</h3>

            <p>
              The calculation uses body
              circumference measurements
              and height. It does not
              measure body fat directly.
            </p>
          </article>

          <article>
            <h3>2. Historical Models</h3>

            <p>
              The equations were created
              using particular reference
              populations. They may not
              accurately describe every
              body type or individual.
            </p>
          </article>

          <article>
            <h3>3. No Ideal Percentage</h3>

            <p>
              This page does not classify
              bodies or recommend an ideal
              body fat target. Physical
              performance and health cannot
              be summarized by this
              estimate alone.
            </p>
          </article>

          <article>
            <h3>4. No Automatic Changes</h3>

            <p>
              The result will not change
              workout weights, training
              frequency, or progression
              recommendations.
            </p>
          </article>
        </div>
      </section>

      {/* ==================================
          PRIVACY
      ================================== */}

      <section className="bf-privacy">
        <h2>Privacy & Data</h2>

        <p>
          This calculator does not save
          your measurements or estimate
          to local storage and does not
          send them to an external service.
          The values are held only in
          the current page's React state.
        </p>

        <p>
          Leaving or reloading the page
          clears the calculator's state.
          Persistent body measurement
          tracking, if you choose to use
          it, will be a separate feature
          in a later stage.
        </p>
      </section>
    </main>
  );
}

export default BodyFatEstimatorPage;
