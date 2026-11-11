
function BrandMark() {
  return (
    <span
      className="brand-mark"
      aria-hidden="true"
    >
      <svg
        className="brand-mark-icon"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 33 L19 24 L26 29 L38 15"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M29 15 H38 V24"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx="12"
          cy="14"
          r="4.5"
          fill="#FFCF91"
        />
      </svg>
    </span>
  );
}

export default BrandMark;
