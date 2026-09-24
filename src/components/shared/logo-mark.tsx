export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="6" r="3.4" fill="var(--sidebar-primary)" />
      <circle cx="6" cy="24" r="3.4" fill="currentColor" opacity="0.55" />
      <circle cx="26" cy="24" r="3.4" fill="currentColor" opacity="0.85" />
      <path
        d="M16 9.2 8 21M16 9.2l8 11.8M9.2 24h13.6"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
