/**
 * Optional training personalization preferences.
 *
 * Muscle priorities will be used by the
 * recommendation engine in a later stage.
 */

export const MAX_MUSCLE_PRIORITIES = 3;

export const trainingFocusAreas = [
  { id: "glutes", label: "Glutes" },
  { id: "legs", label: "Legs" },
  { id: "abs", label: "Abs & Core" },
  { id: "back", label: "Back" },
  { id: "chest", label: "Chest" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "calves", label: "Calves" },
];

export const sexOptions = [
  { value: "", label: "Not specified" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  {
    value: "prefer-not-to-say",
    label: "Prefer not to say",
  },
];
