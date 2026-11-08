"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mutant } from "@/components/Mutant";
import { assetByContract, tokenAmount } from "@/lib/format";
import { MEME_STYLE, PART_BY_ID, SLOT_LABEL, SLOT_ORDER, specFromTraits } from "@/lib/mutant-parts";
import { RARITY, type OrderJ, type SeasonJ } from "@/lib/near";

type Phase = "shake" | "flip" | "shown";

/** Full-screen reveal. Only rendered after the contract reports FullyBackedLocked. */
export function Reveal({ order, season, onClose }: { order: OrderJ; season: SeasonJ | null; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("shake");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setPhase("shown");
    const a = setTimeout(() => setPhase("flip"), 800);
    const b = setTimeout(() => setPhase("shown"), 1450);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const memes = season?.config.memes ?? [];
  const slots = (order.traits?.slots ?? []).map((s) => ({ memeId: memes[s.meme_idx]?.meme_id ?? "wth", variant: s.variant }));
  const { spec } = specFromTraits(slots);
  const rarity = RARITY[order.traits?.rarity ?? 0] ?? "COMMON";
  const url = typeof window !== "undefined" && order.token_id ? `${window.location.origin}/nft/${order.token_id}` : "";

  const share = async () => {
    const text = `I just hatched a ${rarity} meme mutant on WHAT THE NFT?! 🦉 #${order.token_id}`;
    try {
      if (navigator.share) await navigator.share({ title: "WHAT THE NFT?!", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reveal-h" className="fixed inset-0 z-[70] overflow-y-auto bg-night">
      <div className="sunburst rays-spin pointer-events-none fixed left-1/2 top-1/2 aspect-square w-[240vmax] -translate-x-1/2 -translate-y-1/2 opacity-25" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-4 pb-10 pt-20">
        <button ref={closeRef} type="button" onClick={phase === "shown" ? onClose : () => setPhase("shown")} className="btn btn-sm btn-secondary absolute right-4 top-4">
          {phase === "shown" ? "CLOSE" : "SKIP"}
        </button>

        {phase !== "shown" ? (
          <div className={phase === "shake" ? "shake-card" : "flip-in"} aria-live="polite">
            <div className="grid h-[420px] w-[300px] place-items-center rounded-[26px] border-[5px] border-ink bg-ink shadow-[10px_10px_0_#ff7a1a]">
              <span className="font-display text-[9rem] leading-none text-yellow">?</span>
            </div>
            <p className="mt-6 text-center font-display text-2xl text-cream">OPENING…</p>
          </div>
        ) : (
          <div className="grid w-full items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flip-in mx-auto w-full max-w-[400px]">
              <div className={`card-frame rar-${rarity}`}>
                <div className="card-art aspect-square">
                  <Mutant spec={spec} className="h-full w-full p-3" label={`Your ${rarity} mutant`} />
                  <span className="absolute left-2 top-2 rounded-lg border-2 border-ink bg-paper px-2 py-0.5 font-display">{rarity}</span>
                </div>
                <p className="px-4 pb-4 font-display text-2xl">#{order.token_id}</p>
              </div>
            </div>
            <div className="pop-in text-cream">
              <h2 id="reveal-h" className="lettering text-[clamp(2.4rem,6vw,4rem)]">
                WHAT THE HELL DID YOU JUST MINT?!
              </h2>
              <ul className="mt-5 grid grid-cols-2 gap-2">
                {SLOT_ORDER.map((s) => {
                  const part = PART_BY_ID.get(spec[s]);
                  return (
                    <li key={s} className="rounded-xl border-2 border-cream/30 bg-ink/60 px-3 py-2">
                      <p className="text-[0.7rem] font-bold tracking-widest text-cream/60">{SLOT_LABEL[s]}</p>
                      <p className="font-display text-lg leading-tight" style={{ color: MEME_STYLE[part?.memeId ?? "wth"]?.color }}>
                        {MEME_STYLE[slots[SLOT_ORDER.indexOf(s)]?.memeId ?? "wth"]?.label ?? "WTH"}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 rounded-2xl border-[3px] border-ink bg-cream p-4 text-ink">
                <p className="font-display text-xl">Real tokens inside (locked 30 days)</p>
                <ul className="mt-2 space-y-1">
                  {order.legs.map((l) => {
                    const a = assetByContract(l.token);
                    return (
                      <li key={l.token} className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">{a?.symbol ?? l.token}</span>
                        <span className="num">{tokenAmount(l.acquired, a?.decimals)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/nft/${order.token_id}`} className="btn-mega">
                  VIEW MY NFT
                </Link>
                <button type="button" onClick={share} className="btn-ghost-cream">
                  {copied ? "LINK COPIED!" : "SHARE MY MUTANT"}
                </button>
              </div>
              <p className="mt-4 text-xs text-cream/60">Artwork shown with stand-in parts until the season&apos;s final art is pinned. Traits and holdings are read from the contract.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
