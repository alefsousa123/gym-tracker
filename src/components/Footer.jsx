
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>
        © {currentYear} Gym Tracker.
        Built for a stronger you.
      </p>

      <p className="media-credits">
        Exercise data by{" "}
        <a
          href="https://repdb.co"
          target="_blank"
          rel="noopener noreferrer"
        >
          RepDB
        </a>
      </p>
    </footer>
  );
}

export default Footer;
