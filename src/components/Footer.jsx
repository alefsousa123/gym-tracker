
import "./Footer.css";

// ==========================================
// APPLICATION FOOTER
// ==========================================

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer gym-footer">
      <div className="gym-footer-content">

        {/* ==================================
            BRAND INFORMATION
        ================================== */}

        <div className="gym-footer-identity">
          <strong className="gym-footer-brand">
            GYM
          </strong>

          <p>Built for a stronger you.</p>
        </div>

        {/* ==================================
            COPYRIGHT AND CREDITS
        ================================== */}

        <div className="gym-footer-meta">
          <p className="gym-footer-copyright">
            © {currentYear} GYM.
          </p>

          <p className="gym-footer-credits">
            Exercise data by{" "}

            <a
              href="https://repdb.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              RepDB
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
