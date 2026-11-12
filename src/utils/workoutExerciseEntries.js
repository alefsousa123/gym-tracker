import {
  normalizeExerciseTarget,
} from "./workoutTargets";

// ==========================================
// U1.3 - EXERCISE OCCURRENCE IDENTIFIERS
// ==========================================
//
// exerciseId identifies a catalog exercise.
// entryId identifies one occurrence inside
// a workout session.
//
// Old plans remain readable without
// changing their saved structure.

function uniqueEntryId() {
  if (globalThis.crypto?.randomUUID) {
    return (
      "entry-" +
      globalThis.crypto.randomUUID()
    );
  }

  return (
    "entry-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

function legacyEntryId(session, index) {
  return (
    "legacy-" +
    (session?.id ?? "session") +
    "-" +
    index
  );
}

export function createExerciseEntry(
  exerciseId,
  target = null,
  entryId = uniqueEntryId()
) {
  if (
    typeof exerciseId !== "string" ||
    exerciseId.length === 0
  ) {
    throw new TypeError(
      "Exercise ID is required."
    );
  }

  if (
    typeof entryId !== "string" ||
    entryId.length === 0
  ) {
    throw new TypeError(
      "Entry ID is required."
    );
  }

  return {
    entryId,
    exerciseId,
    target: normalizeExerciseTarget(
      exerciseId,
      target
    ),
  };
}

// ==========================================
// READ NEW AND LEGACY SESSION FORMATS
// ==========================================

export function getExerciseEntries(session) {
  if (
    Array.isArray(
      session?.exerciseEntries
    )
  ) {
    return session.exerciseEntries.map(
      (item, index) =>
        createExerciseEntry(
          item.exerciseId,
          item.target ??
            session.exerciseTargets?.[
              item.exerciseId
            ],
          item.entryId ??
            legacyEntryId(session, index)
        )
    );
  }

  return (
    session?.exerciseIds ?? []
  ).map((exerciseId, index) =>
    createExerciseEntry(
      exerciseId,
      session.exerciseTargets?.[
        exerciseId
      ],
      legacyEntryId(session, index)
    )
  );
}

// ==========================================
// BUILD A NEW IMMUTABLE SESSION OBJECT
// ==========================================

export function saveExerciseEntriesToSession(
  session,
  entries
) {
  if (
    !session ||
    !Array.isArray(entries)
  ) {
    throw new TypeError(
      "Session and entries are required."
    );
  }

  const normalized = entries.map(
    (item) =>
      createExerciseEntry(
        item.exerciseId,
        item.target,
        item.entryId
      )
  );

  const entryIds = normalized.map(
    (item) => item.entryId
  );

  if (
    new Set(entryIds).size !==
    entryIds.length
  ) {
    throw new Error(
      "Entry IDs must be unique within a session."
    );
  }

  // Retain compatibility fields for
  // components using the old format.
  //
  // Repeated exercises require
  // exerciseEntries for separate targets.

  const legacyTargets = {};

  for (const item of normalized) {
    if (
      !Object.hasOwn(
        legacyTargets,
        item.exerciseId
      )
    ) {
      legacyTargets[item.exerciseId] = {
        ...item.target,
      };
    }
  }

  return {
    ...session,

    exerciseEntries: normalized,

    exerciseIds: normalized.map(
      (item) => item.exerciseId
    ),

    exerciseTargets: legacyTargets,
  };
}

// ==========================================
// ADD AN OCCURRENCE
// ==========================================

export function appendExerciseEntry(
  session,
  exerciseId,
  target = null,
  entryId = uniqueEntryId()
) {
  const entries =
    getExerciseEntries(session);

  if (
    entries.some(
      (item) =>
        item.entryId === entryId
    )
  ) {
    throw new Error(
      "Entry ID already exists in this session."
    );
  }

  return saveExerciseEntriesToSession(
    session,
    [
      ...entries,
      createExerciseEntry(
        exerciseId,
        target,
        entryId
      ),
    ]
  );
}

// ==========================================
// REMOVE ONLY ONE OCCURRENCE
// ==========================================

export function removeExerciseEntry(
  session,
  entryId
) {
  return saveExerciseEntriesToSession(
    session,
    getExerciseEntries(session).filter(
      (item) =>
        item.entryId !== entryId
    )
  );
}

// ==========================================
// MOVE ONE OCCURRENCE
// ==========================================

export function moveExerciseEntry(
  session,
  entryId,
  direction
) {
  const entries =
    getExerciseEntries(session);

  const index =
    entries.findIndex(
      (item) =>
        item.entryId === entryId
    );

  const next = index + direction;

  if (
    index < 0 ||
    !Number.isInteger(direction) ||
    next < 0 ||
    next >= entries.length
  ) {
    return saveExerciseEntriesToSession(
      session,
      entries
    );
  }

  [
    entries[index],
    entries[next],
  ] = [
    entries[next],
    entries[index],
  ];

  return saveExerciseEntriesToSession(
    session,
    entries
  );
}

// ==========================================
// UPDATE ONE OCCURRENCE'S TARGET
// ==========================================

export function updateExerciseEntryTarget(
  session,
  entryId,
  changes
) {
  if (
    !changes ||
    typeof changes !== "object" ||
    Array.isArray(changes)
  ) {
    throw new TypeError(
      "Target changes must be an object."
    );
  }

  const entries =
    getExerciseEntries(session);

  if (
    !entries.some(
      (item) =>
        item.entryId === entryId
    )
  ) {
    throw new Error(
      "Exercise entry was not found."
    );
  }

  return saveExerciseEntriesToSession(
    session,
    entries.map((item) =>
      item.entryId === entryId
        ? {
            ...item,
            target: {
              ...item.target,
              ...changes,
            },
          }
        : item
    )
  );
}
