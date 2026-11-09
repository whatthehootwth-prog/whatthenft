/** Playful background stickers (decorative, aria-hidden by callers). */
export function Decor({ kind, color, size }: { kind: string; color: string; size: number }) {
  const s = { width: size, height: size };
  switch (kind) {
    case "star":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 1.8l3 6.4 7 .9-5.2 4.8 1.4 6.9L12 17.4l-6.2 3.4 1.4-6.9L2 9.1l7-.9z" fill={color} stroke="#16110f" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
    case "squiggle":
      return <svg viewBox="0 0 60 20" style={{ width: size, height: size / 3 }}><path d="M3 10c6-9 10 9 16 0s10 9 16 0 10 9 16 0" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" /><path d="M3 10c6-9 10 9 16 0s10 9 16 0 10 9 16 0" fill="none" stroke="#16110f" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" /></svg>;
    case "ring":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="5" /><circle cx="12" cy="12" r="8" fill="none" stroke="#16110f" strokeWidth="1.2" /></svg>;
    case "plus":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 3v18M3 12h18" stroke="#16110f" strokeWidth="7" strokeLinecap="round" /><path d="M12 3v18M3 12h18" stroke={color} strokeWidth="4" strokeLinecap="round" /></svg>;
    case "zigzag":
      return <svg viewBox="0 0 60 20" style={{ width: size, height: size / 3 }}><path d="M3 15l9-10 9 10 9-10 9 10 9-10 9 10" fill="none" stroke="#16110f" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" /><path d="M3 15l9-10 9 10 9-10 9 10 9-10 9 10" fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></svg>;
    default:
      return (
        <svg viewBox="0 0 40 40" style={s}>
          <path d="M20 2l4 9 9-5-3 10 9 3-9 4 5 9-10-3-2 10-4-9-8 6 2-10-10-1 8-6-6-8 10 2z" fill={color} stroke="#16110f" strokeWidth="1.8" strokeLinejoin="round" />
          <text x="20" y="25" textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" fill="#16110f">?!</text>
        </svg>
      );
  }
}
