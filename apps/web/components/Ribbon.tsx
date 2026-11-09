/** Tilted scrolling banner. Decorative (aria-hidden). */
export function Ribbon({ items, bg = "#ffe14d", color = "#16110f", tilt = 0, reverse = false }: { items: string[]; bg?: string; color?: string; tilt?: number; reverse?: boolean }) {
  const dots = ["#ff3ea5", "#2ee6ff", "#16110f", "#8b5cff"];
  return (
    <div className="ribbon py-3" style={{ background: bg, color, transform: tilt ? `rotate(${tilt}deg) scale(1.04)` : undefined }} aria-hidden="true">
      <div className={`marquee font-display text-xl tracking-wide sm:text-2xl ${reverse ? "marquee-rev" : ""}`}>
        {[0, 1].map((k) => (
          <span key={k} className="flex items-center gap-10">
            {items.map((t, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                {t}
                <span className="inline-block size-4 rotate-45 border-2 border-ink" style={{ background: dots[i % dots.length] }} />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
