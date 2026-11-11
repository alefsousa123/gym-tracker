
import { useLayoutEffect, useRef } from "react";

import {
  useLocation,
  useNavigationType,
} from "react-router";

// ==========================================
// SCROLL POSITION STORAGE
// ==========================================

const scrollPositions = new Map();

// ==========================================
// SCROLL RESTORATION MANAGER
// ==========================================

function ScrollRestorationManager() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const previousPathnameRef = useRef(null);

  // ========================================
  // RESTORE SCROLL ON NAVIGATION
  // ========================================

  useLayoutEffect(() => {
    const previousPathname =
      previousPathnameRef.current;

    const currentPathname =
      location.pathname;

    const pathnameChanged =
      previousPathname !== null &&
      previousPathname !== currentPathname;

    // First render: do not force scrolling.
    if (previousPathname === null) {
      previousPathnameRef.current =
        currentPathname;

      return;
    }

    // Changing only URL search parameters
    // should not reset scroll position.
    if (!pathnameChanged) {
      previousPathnameRef.current =
        currentPathname;

      return;
    }

    // Browser back or forward navigation.
    if (navigationType === "POP") {
      const savedPosition =
        scrollPositions.get(location.key);

      if (savedPosition) {
        window.scrollTo({
          left: savedPosition.x,
          top: savedPosition.y,
          behavior: "instant",
        });
      } else {
        window.scrollTo({
          left: 0,
          top: 0,
          behavior: "instant",
        });
      }
    } else {
      // New page navigation.
      window.scrollTo({
        left: 0,
        top: 0,
        behavior: "instant",
      });
    }

    previousPathnameRef.current =
      currentPathname;
  }, [
    location.pathname,
    location.key,
    navigationType,
  ]);

  // ========================================
  // TRACK SCROLL POSITION
  // ========================================

  useLayoutEffect(() => {
    const currentKey = location.key;

    function saveScrollPosition() {
      scrollPositions.set(currentKey, {
        x: window.scrollX,
        y: window.scrollY,
      });
    }

    window.addEventListener(
      "scroll",
      saveScrollPosition,
      { passive: true }
    );

    saveScrollPosition();

    return () => {
      saveScrollPosition();

      window.removeEventListener(
        "scroll",
        saveScrollPosition
      );
    };
  }, [location.key]);

  return null;
}

export default ScrollRestorationManager;
