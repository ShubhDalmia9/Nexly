interface LogoProps {
  size?: number;
  /** Show only the mark, without the wordmark. */
  markOnly?: boolean;
  inverted?: boolean;
}

export function Logo({ size = 30, markOnly, inverted }: LogoProps) {
  return (
    <span className="logo" style={{ color: inverted ? '#fff' : undefined }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="9" fill={inverted ? '#fff' : 'var(--iris-600)'} />
        <path
          d="M10 22V10l12 12V11"
          fill="none"
          stroke={inverted ? 'var(--iris-600)' : '#fff'}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="9.5" r="2.6" fill={inverted ? 'var(--mint-600)' : '#6ee7b7'} />
      </svg>
      {markOnly ? <span className="sr-only">Nexly</span> : <span className="logo__word">Nexly</span>}
    </span>
  );
}
