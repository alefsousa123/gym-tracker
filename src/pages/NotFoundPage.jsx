
import { Link } from "react-router";

function NotFoundPage() {
  return (
    <section className="page-container not-found">
      <h1>404</h1>

      <h2>Page Not Found</h2>

      <p>
        The page you're looking for doesn't exist.
      </p>

      <Link to="/" className="primary-button">
        Back to Home
      </Link>
    </section>
  );
}

export default NotFoundPage;
