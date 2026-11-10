
export const measurementFields = [
  {
    key: "bodyWeight",
    label: "Body Weight",
    unit: "kg",
    description: "Measured body weight",
  },
  {
    key: "waist",
    label: "Waist",
    unit: "cm",
    description: "Waist circumference",
  },
  {
    key: "chest",
    label: "Chest",
    unit: "cm",
    description: "Chest circumference",
  },
  {
    key: "hips",
    label: "Hips",
    unit: "cm",
    description: "Hip circumference",
  },
  {
    key: "upperArm",
    label: "Upper Arm",
    unit: "cm",
    description: "Upper arm circumference",
  },
  {
    key: "thigh",
    label: "Thigh",
    unit: "cm",
    description: "Thigh circumference",
  },
  {
    key: "calf",
    label: "Calf",
    unit: "cm",
    description: "Calf circumference",
  },
];

// ==========================================
// DATE HELPERS
// ==========================================

export function getLocalDateKey(
  date = new Date()
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isValidDateKey(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    getLocalDateKey(date) === value
  );
}

export function formatMeasurementDate(
  dateKey
) {
  if (!isValidDateKey(dateKey)) {
    return dateKey;
  }

  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    12
  );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
}

// ==========================================
// FORM HELPERS
// ==========================================

export function createEmptyMeasurementForm() {
  return Object.fromEntries(
    measurementFields.map(
      (field) => [field.key, ""]
    )
  );
}

export function createFormFromEntry(entry) {
  const values =
    createEmptyMeasurementForm();

  if (!entry) {
    return values;
  }

  for (const field of measurementFields) {
    const value =
      entry.measurements?.[field.key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      values[field.key] = String(value);
    }
  }

  return values;
}

// ==========================================
// FORM VALIDATION
// ==========================================

export function parseMeasurementForm(form) {
  const measurements = {};

  for (const field of measurementFields) {
    const raw = String(
      form?.[field.key] ?? ""
    )
      .trim()
      .replace(",", ".");

    // Blank fields are optional.
    if (raw === "") {
      continue;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      return {
        success: false,
        error:
          `${field.label} must be a valid ` +
          `positive number with up to ` +
          `two decimal places.`,
      };
    }

    const value = Number(raw);

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 1000
    ) {
      return {
        success: false,
        error:
          `Check the value entered ` +
          `for ${field.label}.`,
      };
    }

    measurements[field.key] = value;
  }

  if (
    Object.keys(measurements).length === 0
  ) {
    return {
      success: false,
      error:
        "Enter at least one measurement.",
    };
  }

  return {
    success: true,
    measurements,
  };
}

// ==========================================
// LOCAL STORAGE VALIDATION
// ==========================================

export function isValidMeasurementHistory(
  value
) {
  if (!Array.isArray(value)) {
    return false;
  }

  const allowedKeys = new Set(
    measurementFields.map(
      (field) => field.key
    )
  );

  const dates = new Set();

  return value.every((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !isValidDateKey(entry.date) ||
      !entry.measurements ||
      typeof entry.measurements !== "object" ||
      Array.isArray(entry.measurements)
    ) {
      return false;
    }

    if (dates.has(entry.date)) {
      return false;
    }

    dates.add(entry.date);

    const measurements =
      Object.entries(entry.measurements);

    return (
      measurements.length > 0 &&
      measurements.every(
        ([key, number]) =>
          allowedKeys.has(key) &&
          typeof number === "number" &&
          Number.isFinite(number) &&
          number > 0 &&
          number <= 1000
      )
    );
  });
}

// ==========================================
// SORT AND FILTER
// ==========================================

export function sortMeasurementHistory(
  history
) {
  return [...history].sort(
    (first, second) =>
      second.date.localeCompare(
        first.date
      )
  );
}

export function getMeasurementTimeline(
  history,
  fieldKey
) {
  return history
    .filter(
      (entry) =>
        typeof entry.measurements?.[
          fieldKey
        ] === "number"
    )
    .map((entry) => ({
      date: entry.date,
      value:
        entry.measurements[fieldKey],
    }))
    .sort(
      (first, second) =>
        first.date.localeCompare(
          second.date
        )
    );
}

// ==========================================
// SUMMARY
// ==========================================

export function getMeasurementSummary(
  timeline
) {
  if (timeline.length === 0) {
    return {
      count: 0,
      first: null,
      latest: null,
      difference: null,
    };
  }

  const first = timeline[0];
  const latest =
    timeline[timeline.length - 1];

  return {
    count: timeline.length,
    first,
    latest,

    difference:
      timeline.length > 1
        ? Math.round(
            (
              latest.value -
              first.value
            ) * 100
          ) / 100
        : null,
  };
}
