
import { useEffect, useState } from "react";

/*
  A reusable version of useState that saves
  its value to the browser's localStorage.
*/

export function usePersistentState(
  storageKey,
  initialValue,
  isValid = () => true
) {
  const [state, setState] = useState(() => {
    const fallback =
      typeof initialValue === "function"
        ? initialValue()
        : initialValue;

    if (typeof window === "undefined") {
      return fallback;
    }

    try {
      const savedValue =
        window.localStorage.getItem(storageKey);

      if (savedValue === null) {
        return fallback;
      }

      const parsedValue = JSON.parse(savedValue);

      if (!isValid(parsedValue)) {
        return fallback;
      }

      return parsedValue;
    } catch {
      // Invalid or inaccessible localStorage.
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn(
        `Could not save ${storageKey}:`,
        error
      );
    }
  }, [storageKey, state]);

  return [state, setState];
}
