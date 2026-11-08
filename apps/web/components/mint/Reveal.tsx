"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { SLOT_LABEL, SLOT_ORDER, layerFor, memeColor, memeLabel, specFromTraits } from "@/lib/art";
import { assetByContract, tokenAmount } from "@/lib/format";
import { RARITY, type OrderJ, type SeasonJ } from "@/lib/near";

type Phase = "shake" | "flip" | "shown";

/** Full-screen reveal. Only rendered after the contract reports FullyBackedLocked. */
export function Reveal({ order, season, onClose }: { order: OrderJ; season: SeasonJ | null; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("shake");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setPhase("shown");
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
    const text = `I just hatched a ${rarity} meme mutant on WHAT THE NFT?! #${order.token_id}`;
    try {
      if (navigator.share) await navigator.share({ title: "WHAT THE NFT?!", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reveal-h" className="fixed inset-0 z-[70] overflow-y-auto bg-hot">
      <div className="halftone-white pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="spin-slow pointer-events-none fixed left-1/2 top-1/2 aspect-square w-[240vmax] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,225,77,0.55) 0deg 8deg, transparent 8deg 20deg)" }} />
      <div className="relative z-10 mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center px-4 pb-10 pt-20">
        <button ref={closeRef} type="button" onClick={phase === "shown" ? onClose : () => setPhase("shown")} className="btn-pop absolute right-4 top-4 !min-h-11">
          {phase === "shown" ? "CLOSE" : "SKIP"}
        </button>

        {phase !== "shown" ? (
          <div className={phase === "shake" ? "shake-card" : "flip-in"} aria-live="polite">
            <div className="grid h-[420px] w-[300px] place-items-center rounded-[26px] border-[5px] border-ink bg-sun shadow-[12px_12px_0_#16110f]">
              <span className="mad-title text-[9rem]">?</span>
            </div>
            <p className="mad-title mt-6 text-center text-4xl">OPENING…</p>
          </div>
        ) : (
          <div className="grid w-full items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flip-in mx-auto w-full max-w-[400px]">
              <div className={`card-frame rar-${rarity}`}>
                <div className="card-art aspect-square">
                  <ArtMutant spec={spec} priority className="relative h-full w-full" label={`Your ${rarity} mutant`} />
                  <span className="pixel absolute left-2 top-2 z-10 rounded-md border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold">{rarity}</span>
                </div>
                <p className="px-4 pb-4 font-display text-3xl">#{order.token_id}</p>
              </div>
            </div>
            <div className="pop-in">
              <h2 id="reveal-h" className="mad-title text-[clamp(2.6rem,6.5vw,4.4rem)]">
                WHAT THE HELL DID YOU JUST MINT?!
              </h2>
              <ul className="mt-6 grid grid-cols-2 gap-2">
                {SLOT_ORDER.map((s) => {
                  const l = layerFor(s, spec[s]);
                  const id = l ? spec[s].memeId : "wth";
                  return (
                    <li key={s} className="rounded-xl border-[3px] border-ink bg-white px-3 py-2 shadow-[3px_3px_0_#16110f]">
                      <p className="pixel text-[0.62rem] font-bold">{SLOT_LABEL[s]}</p>
                      <p className="font-display text-lg leading-tight">
                        <span className="rounded border-2 border-ink px-1" style={{ background: memeColor(id) }}>{memeLabel(id)}</span>
                      </p>
                      <p className="truncate text-xs">{l?.name ?? "bare owl"}</p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 rounded-2xl border-4 border-ink bg-white p-4 shadow-[5px_5px_0_#16110f]">
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
              <div className="mt-7 flex flex-wrap gap-4">
                <Link href={`/nft/${order.token_id}`} className="btn-mad">
                  VIEW MY NFT
                </Link>
                <button type="button" onClick={share} className="btn-pop">
                  {copied ? "LINK COPIED!" : "SHARE MY MUTANT"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
