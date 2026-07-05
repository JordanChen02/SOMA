export function SomaLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="soma-logo-gradient" x1="10" y1="48" x2="54" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--vital)" />
          <stop offset="0.52" stopColor="var(--signal)" />
          <stop offset="1" stopColor="var(--pulse)" />
        </linearGradient>
      </defs>
      <path
        d="M48.5 13.8A22 22 0 1 0 54 32"
        stroke="url(#soma-logo-gradient)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="50.5" cy="14" r="4.5" fill="var(--signal)" />
      <path
        d="M23.5 32.5c2.1-4.8 5.1-7.2 8.8-7.2 4.5 0 7.3 2.9 8.2 8.7"
        stroke="var(--fg)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
