/**
 * D1.4.1 - Scientific research sources.
 *
 * These sources describe general training
 * principles, not exercise-specific rankings.
 */

export const exerciseResearchSources = [
  {
    id: "acsm-resistance-2026",
    title:
      "Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews",
    year: 2026,
    type: "umbrella-review-position-stand",
    url: "https://pubmed.ncbi.nlm.nih.gov/41843416/",
    goals: [
      "strength",
      "hypertrophy",
      "power",
      "endurance",
    ],
    scope:
      "Healthy adults; resistance training programming variables.",
    finding:
      "Progressive resistance training improves multiple outcomes. Training variables should be adapted to the goal.",
    limitation:
      "Does not rank individual Gym Tracker exercises.",
  },
  {
    id: "exercise-variation-2022",
    title:
      "Does Varying Resistance Exercises Promote Superior Muscle Hypertrophy and Strength Gains? A Systematic Review",
    year: 2022,
    type: "systematic-review",
    url: "https://pubmed.ncbi.nlm.nih.gov/35438660/",
    goals: [
      "strength",
      "hypertrophy",
    ],
    scope:
      "Exercise variation and muscular adaptation.",
    finding:
      "Planned variation may be useful, while excessive random exercise changes may hinder adaptations.",
    limitation:
      "Does not define a universal ranking of movements.",
  },
  {
    id: "muscle-length-2025",
    title:
      "Does Muscle Length Influence Regional Hypertrophy? A Systematic Review and Meta-Analysis",
    year: 2025,
    type: "systematic-review-meta-analysis",
    url: "https://pubmed.ncbi.nlm.nih.gov/40570881/",
    goals: [
      "hypertrophy",
    ],
    scope:
      "Muscle length and regional hypertrophy.",
    finding:
      "Regional effects were estimated to be small, with uncertainty and a possible distal trend.",
    limitation:
      "Does not prove that a particular exercise is universally superior.",
  },
];

export function getExerciseResearchSource(id) {
  return exerciseResearchSources.find(
    (source) => source.id === id
  ) ?? null;
}
