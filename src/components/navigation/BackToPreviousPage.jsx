
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

import "./BackToPreviousPage.css";

// ==========================================
// REUSABLE BACK NAVIGATION
// ==========================================

function BackToPreviousPage({
  fallbackTo = "/exercises",
  fallbackLabel = "Exercises",
  className = "detail-back-link",
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // ========================================
  // OPTIONAL ORIGIN INFORMATION
  // ========================================

  const origin = location.state?.from;

  const hasValidOrigin =
    typeof origin === "string" &&
    origin.startsWith("/") &&
    !origin.startsWith("//");

  const returnTo = hasValidOrigin
    ? origin
    : fallbackTo;

  // ========================================
  // BROWSER HISTORY
  // ========================================

  const historyIndex =
    typeof window !== "undefined"
      ? window.history.state?.idx
      : null;

  const hasPreviousPage =
    typeof historyIndex === "number" &&
    historyIndex > 0;

  // ========================================
  // CONTEXTUAL LINK LABEL
  // ========================================

  const originLabel =
    location.state?.fromLabel;

  const hasOriginLabel =
    typeof originLabel === "string" &&
    originLabel.trim().length > 0;

  let linkLabel;

  if (hasOriginLabel) {
    linkLabel = `Back to ${originLabel.trim()}`;
  } else if (hasPreviousPage) {
    linkLabel = "Back";
  } else {
    linkLabel = `Back to ${fallbackLabel}`;
  }

  // ========================================
  // HANDLE BACK NAVIGATION
  // ========================================

  function handleBack(event) {
    // Preserve native browser behavior for
    // modified clicks and new tabs.

    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    // Navigate through the application
    // history whenever possible.

    if (hasPreviousPage) {
      event.preventDefault();
      navigate(-1);
    }

    // Otherwise, the Link navigates to
    // the configured fallback destination.
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <Link
      to={returnTo}
      className={[
        "back-to-previous-page",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleBack}
    >
      <span
        className="back-to-previous-page-arrow"
        aria-hidden="true"
      >
        ←
      </span>

      <span className="back-to-previous-page-label">
        {linkLabel}
      </span>
    </Link>
  );
}

export default BackToPreviousPage;
