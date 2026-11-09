"use client";

import { useEffect, useState } from "react";

/** Shared bits for the marketplace + My NFTs pages. */

/** NEAR "Ⓝ" mark. */
export function N({ className = "size-[0.8em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} aria-label="NEAR">
      <path d="M5 20V4l14 16V4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(target);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function Stat({ label, value, near = false, decimals = 2, color }: { label: string; value: number; near?: boolean; decimals?: number; color: string }) {
  const v = useCountUp(value);
  return (
    <div className="relative min-w-0 rounded-2xl border-[2.5px] border-ink bg-white px-3.5 py-2.5 shadow-[3px_3px_0_#16110f]">
      <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-ink" style={{ background: color }} aria-hidden="true" />
      <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-ink/55">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 font-display text-[1.45rem] leading-none">
        {near && <N />}
        {v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </p>
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="flex" aria-label={`${n} of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" className="-mr-px">
          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill={i < n ? "#ffd23f" : "#ffffff"} stroke="#16110f" strokeWidth="2.6" strokeLinejoin="round" opacity={i < n ? 1 : 0.4} />
        </svg>
      ))}
    </span>
  );
}
