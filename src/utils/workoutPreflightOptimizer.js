/**
 * D2.3W — bounded, deterministic preflight for automatic workout proposals.
 * Pure planning utility: never changes profiles, stored plans or equipment.
 * Eligibility is delegated to the existing validated selection rules.
 */

const SEARCH_WIDTH = 32;
const OPTIONS_PER_STEP = 14;
const SECONDS_TOLERANCE = 0.0001;

function finiteSeconds(estimate) {
  const value = Number(estimate?.estimatedSeconds);
  return Number.isFinite(value) && value > 0 ? value : Infinity;
}

function uniqueSets(planned) {
  const target = Math.max(1, Math.floor(Number(planned) || 1));
  return [...new Set([target, Math.max(1, target - 1), 1])];
}

function byObjective(first, second) {
  if (second.matched !== first.matched) {
    return second.matched - first.matched;
  }
  if (Math.abs(second.value - first.value) > 0.0001) {
    return second.value - first.value;
  }
  if (Math.abs(first.seconds - second.seconds) > 0.0001) {
    return first.seconds - second.seconds;
  }
  return first.signature.localeCompare(second.signature);
}

function copyIncrement(map, key) {
  const next = new Map(map);
  next.set(key, (next.get(key) ?? 0) + 1);
  return next;
}

/**
 * Explore viable allocations before the original selector commits to a slot.
 * Coverage is prioritized over score, while exercise/similarity duplication,
 * sets, available minutes and existing ranking remain considerations.
 * This is a bounded search, not a globally proven mathematical optimum.
 */
export function optimizeWorkoutSession({
  slots,
  ranking,
  profile,
  budgetSeconds,
  supports,
  appropriate,
  estimate,
  candidateScore,
  variationKey,
  similarityKey,
  movementFamily,
}) {
  if (!Array.isArray(slots) || !Array.isArray(ranking)) {
    throw new TypeError('Preflight requires slot and ranking arrays.');
  }
  if (!Number.isFinite(budgetSeconds) || budgetSeconds <= 0) {
    throw new RangeError('Preflight requires a positive time budget.');
  }

  const candidatesByIndex = slots.map((slot, index) => {
    const candidates = ranking.filter((item) =>
      item?.eligibleForAutomaticRecommendation === true &&
      item.exercise?.id &&
      appropriate(item.exercise, profile) &&
      supports(item.exercise, slot.role) &&
      finiteSeconds(estimate(item.exercise, profile, { sets: 1 })) <= budgetSeconds
    );
    return { index, slot, candidates };
  });

  // Resolve scarce positions first so an exercise shared by two roles
  // is not consumed before the role with fewer alternatives.
  const ordered = [...candidatesByIndex].sort((a, b) =>
    a.candidates.length - b.candidates.length || a.index - b.index
  );

  const initial = {
    choices: Array(slots.length).fill(null),
    used: new Set(),
    similarity: new Set(),
    variations: new Map(),
    families: new Map(),
    seconds: 0,
    matched: 0,
    value: 0,
    signature: '',
  };
  let beam = [initial];

  for (const { index, slot, candidates } of ordered) {
    const expanded = [];

    for (const state of beam) {
      const ranked = candidates
        .filter((item) => !state.used.has(item.exercise.id))
        .map((item) => ({
          item,
          value: candidateScore(item, slot, state),
        }))
        .sort((a, b) =>
          b.value - a.value ||
          a.item.exercise.id.localeCompare(b.item.exercise.id)
        )
        .slice(0, OPTIONS_PER_STEP);

      for (const { item, value } of ranked) {
        const exercise = item.exercise;
        const similarity = similarityKey(exercise);
        const variation = variationKey(exercise);
        const family = movementFamily(exercise);

        const varietyCost =
          (state.similarity.has(similarity) ? 26 : 0) +
          (state.families.get(family) ?? 0) * 6 +
          (state.variations.get(variation) ?? 0) * 9;

        for (const sets of uniqueSets(slot.sets)) {
          const timing = estimate(exercise, profile, { sets });
          const seconds = finiteSeconds(timing);
          if (state.seconds + seconds > budgetSeconds + SECONDS_TOLERANCE) {
            continue;
          }

          const choices = [...state.choices];
          choices[index] = { item, sets, estimate: timing };

          expanded.push({
            choices,
            used: new Set([...state.used, exercise.id]),
            similarity: new Set([...state.similarity, similarity]),
            variations: copyIncrement(state.variations, variation),
            families: copyIncrement(state.families, family),
            seconds: state.seconds + seconds,
            matched: state.matched + 1,
            value: state.value + value - varietyCost +
              (sets / Math.max(1, Number(slot.sets) || 1)) * 16,
            signature: `${state.signature}|${index}:${exercise.id}:${sets}`,
          });
        }
      }

      // An unfilled position is legal when the constraints are infeasible.
      expanded.push({
        ...state,
        choices: [...state.choices],
        signature: `${state.signature}|${index}:-`,
      });
    }

    beam = expanded.sort(byObjective).slice(0, SEARCH_WIDTH);
  }

  const best = [...beam].sort(byObjective)[0] ?? initial;
  const diagnostics = candidatesByIndex.map(({ index, slot, candidates }) => ({
    position: slot.position ?? index + 1,
    role: slot.role,
    region: slot.region,
    candidateCount: candidates.length,
    selectedExerciseId: best.choices[index]?.item.exercise.id ?? null,
    selectedSets: best.choices[index]?.sets ?? null,
    reason: best.choices[index]
      ? null
      : candidates.length === 0
        ? 'no-eligible-available-exercise'
        : 'combination-or-time-constraint',
  }));

  return {
    choices: best.choices,
    diagnostics,
    matchedCount: best.matched,
    plannedCount: slots.length,
    estimatedExerciseMinutes: Math.round(best.seconds / 60 * 10) / 10,
    algorithm: 'bounded-beam-search-v1',
  };
}

/**
 * Read-only final check. Keep the original proposal inspectable even if the
 * check finds issues; callers can surface diagnostics rather than hiding data.
 */
export function auditSelectedWorkoutSessions({
  sessions,
  exercises,
  isAvailable,
  supports,
  similarityKey = (exercise) => exercise.id,
  movementFamily = () => 'unknown',
}) {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const issues = [];
  const advisories = [];
  const roleDays = new Map();

  for (const session of sessions) {
    const seen = new Set();
    const similar = new Map();
    const families = new Map();
    const sessionRoles = new Set();
    for (const entry of session.exercises ?? []) {
      const exercise = byId.get(entry.id);
      if (!exercise) {
        issues.push({ dayId: session.dayId, exerciseId: entry.id, type: 'unknown-exercise' });
        continue;
      }
      if (!isAvailable(exercise)) {
        issues.push({ dayId: session.dayId, exerciseId: entry.id, type: 'unavailable-exercise' });
      }
      if (!supports(exercise, entry.role)) {
        issues.push({ dayId: session.dayId, exerciseId: entry.id, type: 'role-mismatch' });
      }
      if (seen.has(entry.id)) {
        issues.push({ dayId: session.dayId, exerciseId: entry.id, type: 'duplicate-exercise-id' });
      }
      seen.add(entry.id);
      sessionRoles.add(entry.role);
      const key = similarityKey(exercise);
      if (similar.has(key)) {
        advisories.push({ dayId: session.dayId, type: 'similar-variation',
          exerciseIds: [similar.get(key), exercise.id] });
      } else {
        similar.set(key, exercise.id);
      }
      const family = movementFamily(exercise);
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    for (const role of sessionRoles) {
      roleDays.set(role, (roleDays.get(role) ?? 0) + 1);
    }
    if (session.missingSlots?.length) {
      advisories.push({ dayId: session.dayId, type: 'unfilled-positions',
        count: session.missingSlots.length,
        roles: session.missingSlots.map((slot) => slot.role) });
    }
    for (const [family, count] of families) {
      if (family !== 'unknown' && count >= 3) {
        advisories.push({ dayId: session.dayId, type: 'movement-family-concentration',
          family, count });
      }
    }
    if (session.fitsEstimatedTime !== true) {
      issues.push({ dayId: session.dayId, type: 'time-budget-exceeded' });
    }
  }

  return {
    passed: issues.length === 0,
    checkedSessionCount: sessions.length,
    issues,
    advisories,
    trainingDaysByRole: Object.fromEntries(roleDays),
    algorithm: 'D2.3W-read-only-final-audit-v1',
  };
}
