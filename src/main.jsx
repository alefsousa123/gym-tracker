
import React from "react";

import ReactDOM from "react-dom/client";

import {
  BrowserRouter,
} from "react-router";

import {
  ThemeProvider,
} from "./context/ThemeContext";

import App from "./App";

// ==========================================
// LEGACY GLOBAL STYLES
// ==========================================

import "./index.css";

// ==========================================
// TERRA ACTIVE DESIGN SYSTEM
// ==========================================

// Colors and global layout
import "./styles/theme.css";

// Shared interactive behavior
import "./styles/interactions.css";

// Migrated page appearance
import "./styles/theme-pages.css";

// Final global visual compatibility
import "./styles/global-polish.css";

// ==========================================
// APPLICATION ENTRY POINT
// ==========================================

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
