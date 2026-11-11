import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ==========================================
// C5.3 - SPLIT REPDB DATA FOR LAZY LOADING
// ==========================================
// Run from the gym-tracker project root:
// node scripts/splitRepdb.mjs
//
// The original repdb.generated.json is never
// modified. It remains the source of truth.

const root = process.cwd();
const dataDirectory = resolve(root, "src/data");
const sourcePath = resolve(dataDirectory, "repdb.generated.json");

const PART_COUNT = 4;
const DETAILS_FIELDS = ["description", "instructions", "tips"];

const source = JSON.parse(readFileSync(sourcePath, "utf8"));

if (!Array.isArray(source) || source.length === 0) {
  throw new Error("Expected a non-empty RepDB exercise array.");
}

const catalog = [];
const detailParts = Array.from({ length: PART_COUNT }, () => ({}));
const seenIds = new Set();

for (const [index, exercise] of source.entries()) {
  if (
    !exercise ||
    typeof exercise !== "object" ||
    typeof exercise.id !== "string" ||
    !exercise.id.trim()
  ) {
    throw new Error(`Invalid exercise record at index ${index}.`);
  }

  if (seenIds.has(exercise.id)) {
    throw new Error(`Duplicate RepDB exercise ID: ${exercise.id}`);
  }

  seenIds.add(exercise.id);

  // Preserve all existing metadata, including
  // IDs, equipment, locations, media, muscles,
  // difficulty, variationGroup and tags.
  const metadata = { ...exercise };
  const details = {};

  for (const field of DETAILS_FIELDS) {
    if (Object.hasOwn(exercise, field)) {
      details[field] = exercise[field];
      delete metadata[field];
    }
  }

  // Round-robin distribution keeps every
  // details file relatively small.
  const detailsPart = index % PART_COUNT;
  metadata.detailsPart = detailsPart;

  catalog.push(metadata);
  detailParts[detailsPart][exercise.id] = details;
}

const catalogPath = resolve(
  dataDirectory,
  "repdb.catalog.generated.json"
);

writeFileSync(catalogPath, JSON.stringify(catalog) + "\n");

for (let index = 0; index < PART_COUNT; index += 1) {
  const detailsPath = resolve(
    dataDirectory,
    `repdb.details.${index}.generated.json`
  );

  writeFileSync(
    detailsPath,
    JSON.stringify(detailParts[index]) + "\n"
  );
}

// Verify that every exercise has a matching
// details record in the assigned part.
for (const metadata of catalog) {
  if (!Object.hasOwn(detailParts[metadata.detailsPart], metadata.id)) {
    throw new Error(`Missing details for exercise: ${metadata.id}`);
  }
}

function kb(value) {
  return (Buffer.byteLength(JSON.stringify(value), "utf8") / 1024)
    .toFixed(2);
}

console.log(`RepDB source: ${source.length} exercises`);
console.log(`Catalog metadata: ${catalog.length} exercises (${kb(catalog)} KB)`);

for (let index = 0; index < PART_COUNT; index += 1) {
  console.log(
    `Details part ${index}: ` +
    `${Object.keys(detailParts[index]).length} exercises ` +
    `(${kb(detailParts[index])} KB)`
  );
}

console.log("C5.3 data files created successfully.");
