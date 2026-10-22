import React from 'react';

/**
 * Official Google Play Store icon with authentic brand geometry and colors.
 */
export default function GooglePlayIcon({ className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 29 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Bottom Red Segment */}
      <path
        d="M13.54 15.28 0.12 29.34a3.64 3.64 0 0 0 5.33 2.16l15.1-8.6z"
        fill="#EA4335"
      />
      {/* Right Yellow Tip Segment */}
      <path
        d="m27.11 12.89-6.53-3.74-7.35 6.45 7.38 7.28 6.48-3.7a3.55 3.55 0 0 0 0-6.29z"
        fill="#FBBC04"
      />
      {/* Left Blue Spine Segment */}
      <path
        d="M0.12 2.66a3.46 3.46 0 0 0-0.12 0.92v24.84a3.66 3.66 0 0 0 0.12 0.92L14 15.64Z"
        fill="#4285F4"
      />
      {/* Top Green Segment */}
      <path
        d="m13.64 16 6.94-6.85L5.5 0.51A3.72 3.72 0 0 0 3.63 0 3.64 3.64 0 0 0 0.12 2.65Z"
        fill="#34A853"
      />
    </svg>
  );
}
