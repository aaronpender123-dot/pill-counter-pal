interface CapsuleLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export function CapsuleLogo({ className = '', size = 'md' }: CapsuleLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} ${className}`}
    >
      {/* Capsule body - rotated 45 degrees */}
      <g transform="rotate(-45 32 32)">
        {/* Left half - teal */}
        <path
          d="M20 18C20 12.477 24.477 8 30 8H32V56H30C24.477 56 20 51.523 20 46V18Z"
          className="fill-accent"
        />
        {/* Right half - white/light */}
        <path
          d="M32 8H34C39.523 8 44 12.477 44 18V46C44 51.523 39.523 56 34 56H32V8Z"
          className="fill-primary-foreground"
          fillOpacity="0.95"
        />
        {/* Center line */}
        <line
          x1="32"
          y1="8"
          x2="32"
          y2="56"
          className="stroke-primary"
          strokeWidth="1"
          strokeOpacity="0.3"
        />
        {/* Highlight on left */}
        <ellipse
          cx="26"
          cy="22"
          rx="3"
          ry="6"
          className="fill-primary-foreground"
          fillOpacity="0.25"
        />
        {/* Highlight on right */}
        <ellipse
          cx="38"
          cy="22"
          rx="2"
          ry="5"
          className="fill-primary"
          fillOpacity="0.15"
        />
      </g>
    </svg>
  );
}
