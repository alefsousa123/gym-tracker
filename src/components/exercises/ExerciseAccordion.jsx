
function ExerciseAccordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}) {
  return (
    <details
      className={`exercise-accordion ${className}`.trim()}
      open={defaultOpen}
    >
      <summary className="exercise-accordion-summary">
        <span className="exercise-accordion-title">
          {title}
        </span>

        <span
          className="exercise-accordion-chevron"
          aria-hidden="true"
        >
          ⌄
        </span>
      </summary>

      <div className="exercise-accordion-content">
        {children}
      </div>
    </details>
  );
}

export default ExerciseAccordion;
