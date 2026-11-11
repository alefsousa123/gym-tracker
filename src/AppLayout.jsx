
import { Outlet } from "react-router";

import Header from "./components/Header";
import Footer from "./components/Footer";

import ScrollRestorationManager from
  "./components/navigation/ScrollRestorationManager";

// ==========================================
// APPLICATION LAYOUT
// ==========================================

function AppLayout() {
  return (
    <div className="app">

      {/* ==================================
          GLOBAL SCROLL RESTORATION
      ================================== */}

      <ScrollRestorationManager />

      {/* ==================================
          APPLICATION HEADER
      ================================== */}

      <Header />

      {/* ==================================
          PAGE CONTENT
      ================================== */}

      <main>
        <Outlet />
      </main>

      {/* ==================================
          APPLICATION FOOTER
      ================================== */}

      <Footer />

    </div>
  );
}

export default AppLayout;
