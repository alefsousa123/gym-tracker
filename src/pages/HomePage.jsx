
import { Link } from "react-router";

import WelcomeSection from "../components/WelcomeSection";
import FeatureCard from "../components/FeatureCard";

function HomePage() {
  return (
    <>
      <WelcomeSection />

      <section className="features-section" id="features">
        <div className="section-heading">
          <span className="section-label">
            OUR FEATURES
          </span>

          <h2>Everything You Need to Improve</h2>

          <p>
            Powerful tools to help you reach
            your fitness goals.
          </p>
        </div>

        <div className="features-grid">
          <FeatureCard
            icon="🏋️"
            title="Workout Planner"
            description="Create and organize your personalized workouts."
          />

          <FeatureCard
            icon="📈"
            title="Progressive Overload"
            description="Track your strength and increase your weights over time."
          />

          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Monitor your performance and visualize your results."
          />

          <FeatureCard
            icon="📚"
            title="Exercise Library"
            description="Explore exercises with instructions, images, and video tutorials when available."
          />
        </div>

        <div className="features-action">
          <Link to="/dashboard" className="primary-button">
            Go to Dashboard
          </Link>
        </div>
      </section>
    </>
  );
}

export default HomePage;
