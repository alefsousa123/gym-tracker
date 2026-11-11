
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

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

  // Optional origin information supplied
  // by the page that opened this link.
  const origin = location.state?.from;

  const hasValidOrigin =
    typeof origin === "string" &&
    origin.startsWith("/") &&
    !origin.startsWith("//");

  const returnTo = hasValidOrigin
    ? origin
    : fallbackTo;

  const historyIndex =
    window.history.state?.idx;

  const hasPreviousPage =
    typeof historyIndex === "number" &&
    historyIndex > 0;

  const returnLabel =
    typeof location.state?.fromLabel === "string"
      ? location.state.fromLabel
      : hasPreviousPage
        ? "Previous Page"
        : fallbackLabel;

  // ========================================
  // RETURN TO PREVIOUS PAGE
  // ========================================

  function handleBack(event) {
    // Keep standard link behavior for
    // opening in a new tab.
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    // React Router keeps navigation history.
    // Going back preserves the previous URL.
    if (hasPreviousPage) {
      event.preventDefault();
      navigate(-1);
    }

    // Without application history, the
    // Link uses returnTo as a safe fallback.
  }

  return (
    <Link
      to={returnTo}
      className={className}
      onClick={handleBack}
    >
      ← Back to {returnLabel}
    </Link>
  );
}

export default BackToPreviousPage;
