// Inline Fitats logo: italic F in white, lime parallelogram accent below.
// Sized via the size prop (square). Background is transparent so it adopts
// whatever surface it's placed on.
export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      shapeRendering="geometricPrecision"
      aria-label="Fitats logo"
    >
      <path
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M 32 18 L 86 18 L 80 32 L 50 32 L 47 47 L 72 47 L 66 60 L 44 60 L 39 76 L 23 76 Z"
      />
      <path
        fill="#D4FF3A"
        stroke="#D4FF3A"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M 19 80 L 41 80 L 36 94 L 14 94 Z"
      />
    </svg>
  );
}
