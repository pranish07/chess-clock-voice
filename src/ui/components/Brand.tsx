export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Chess Clock Voice">
      <defs>
        <linearGradient id="ccv-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ccv-grad)" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="#ffffff" strokeWidth="2.2" />
      <path
        d="M20 13.5V20l4.5 3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="1.6" fill="#ffffff" />
      <path
        d="M13.5 33.2c1.7-1.1 2.6-2.3 2.6-3.6M20 34c1.1-.9 1.6-1.8 1.6-2.8M26.5 33.2c-1.7-1.1-2.6-2.3-2.6-3.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
