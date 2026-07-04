interface Props {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function RecDropIcon({ className = "", size }: Props) {
  return (
    <svg
      width={size ?? "1em"}
      height={size ?? "1em"}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5C12 2.5 5 10.5 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 10.5 12 2.5 12 2.5Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 16C9 17.66 10.34 19 12 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
