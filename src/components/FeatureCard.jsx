
function FeatureCard({ icon, title, description }) {
  return (
    <article className="feature-card">
      <span className="feature-icon" aria-hidden="true">
        {icon}
      </span>

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}

export default FeatureCard;
