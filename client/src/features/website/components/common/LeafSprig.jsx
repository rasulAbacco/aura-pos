/** Decorative line-art leaves (the blush sprigs in the template corners). Purely decorative. */
export function LeafSprig({ className = '', flip = false }) {
  return (
    <svg viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden
      className={`pointer-events-none text-mauve/30 ${flip ? '-scale-x-100' : ''} ${className}`}>
      <path d="M20 155C40 120 55 80 95 10" />
      {[[34, 128, -38], [44, 108, -30], [54, 88, -24], [66, 66, -18], [80, 42, -12]].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x} ${y}c-18-4-30-14-34-28 16 0 30 10 34 28z`} transform={`rotate(${r} ${x} ${y})`} />
          <path d={`M${x} ${y}c16-10 30-12 40-6-8 12-24 14-40 6z`} />
        </g>
      ))}
    </svg>
  );
}
