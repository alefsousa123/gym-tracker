
/*
  Body Fat Estimator

  Historical U.S. Navy circumference equations.

  Input: centimeters
  Formula: inches (converted internally)

  This is an approximate population-based
  estimate, not a clinical measurement.
*/

const CM_PER_INCH = 2.54;

function parseMeasurement(value) {
  const normalized = String(
    value ?? ""
  )
    .trim()
    .replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function toInches(valueInCm) {
  return valueInCm / CM_PER_INCH;
}

// ==========================================
// ESTIMATION
// ==========================================

export function estimateBodyFat({
  model,
  height,
  neck,
  waist,
  hip,
}) {
  if (
    model !== "male" &&
    model !== "female"
  ) {
    return {
      success: false,
      error: "Select a measurement model.",
    };
  }

  const heightCm = parseMeasurement(height);
  const neckCm = parseMeasurement(neck);
  const waistCm = parseMeasurement(waist);

  if (
    heightCm === null ||
    neckCm === null ||
    waistCm === null
  ) {
    return {
      success: false,
      error:
        "Enter valid positive measurements " +
        "for height, neck, and waist.",
    };
  }

  let hipCm = null;

  if (model === "female") {
    hipCm = parseMeasurement(hip);

    if (hipCm === null) {
      return {
        success: false,
        error:
          "Enter a valid positive hip measurement.",
      };
    }
  }

  const heightIn = toInches(heightCm);
  const neckIn = toInches(neckCm);
  const waistIn = toInches(waistCm);

  let estimate;

  if (model === "male") {
    const circumference =
      waistIn - neckIn;

    if (circumference <= 0) {
      return {
        success: false,
        error:
          "Abdominal circumference must be " +
          "greater than neck circumference.",
      };
    }

    estimate =
      86.010 * Math.log10(circumference) -
      70.041 * Math.log10(heightIn) +
      36.76;
  } else {
    const hipIn = toInches(hipCm);

    const circumference =
      waistIn + hipIn - neckIn;

    if (circumference <= 0) {
      return {
        success: false,
        error:
          "Waist plus hip circumference must " +
          "be greater than neck circumference.",
      };
    }

    estimate =
      163.205 * Math.log10(circumference) -
      97.684 * Math.log10(heightIn) -
      78.387;
  }

  // Don't silently clamp implausible values.
  // An invalid result should prompt the user
  // to review the measurements or method.
  if (
    !Number.isFinite(estimate) ||
    estimate <= 0 ||
    estimate >= 100
  ) {
    return {
      success: false,
      error:
        "These measurements produced an " +
        "implausible result. Please check " +
        "the measurements and selected model.",
    };
  }

  return {
    success: true,

    // Whole percentage points avoid
    // implying unnecessary precision.
    percentage: Math.round(estimate),

    model,
    method: "Historical Navy circumference",
  };
}
