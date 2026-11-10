
import { Link } from "react-router";

function WelcomeSection() {
  return (
    <section className="welcome-section" id="home">
      <span className="section-label">
        YOUR FITNESS JOURNEY
      </span>

      <h2>Train Smarter. Get Stronger.</h2>

      <p>
        Plan your workouts, track your progress,
        and achieve your fitness goals.
      </p>

      <Link to="/workouts" className="primary-button">
        Start Training
      </Link>
    </section>
  );
}

export default WelcomeSection;
