import Link from "next/link";
import type { ReactNode } from "react";
import { explorerAccount, explorerTx } from "@/lib/config";
import { shortId } from "@/lib/format";

export type Backing = "FullyBackedLocked" | "Unlocked" | "Redeeming" | "RedeemedEmpty" | "Reloading";

export function StateChip({ state }: { state: Backing }) {
  switch (state) {
    case "FullyBackedLocked":
      return (
        <span className="chip chip-locked">
          <LockIcon closed /> Locked · Funded
        </span>
      );
    case "Unlocked":
      return (
        <span className="chip chip-unlocked">
          <LockIcon /> Unlocked · Funded
        </span>
      );
    case "Redeeming":
      return <span className="chip chip-pending dots">Redeeming</span>;
    case "Reloading":
      return <span className="chip chip-pending dots">Reloading</span>;
    case "RedeemedEmpty":
      return <span className="chip chip-empty">Empty · Redeemed · 0 assets</span>;
  }
}

export function LockIcon({ closed = false }: { closed?: boolean }) {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" aria-hidden="true" className="shrink-0">
      <rect x="1" y="6" width="10" height="6.5" rx="1.5" fill="currentColor" />
      <path d={closed ? "M3 6V4a3 3 0 0 1 6 0v2" : "M3 6V4a3 3 0 0 1 5.8-1"} fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function RarityChip({ rarity }: { rarity: string }) {
  const bg: Record<string, string> = { COMMON: "#efe5cc", RARE: "#3ec6e0", EPIC: "#ff5fa2", LEGENDARY: "#7c64a8" };
  return (
    <span className="chip" style={{ background: bg[rarity] ?? "#efe5cc", color: rarity === "LEGENDARY" ? "#fff4dc" : undefined }}>
      {rarity}
    </span>
  );
}

export function Panel({ children, className = "", as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "aside" }) {
  return <As className={`panel p-5 sm:p-6 ${className}`}>{children}</As>;
}

export function H1({ children, kicker }: { children: ReactNode; kicker?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      {kicker && <p className="font-hand text-xl text-muted">{kicker}</p>}
      <h1 className="font-display text-[2rem] leading-tight sm:text-[2.75rem]">{children}</h1>
    </header>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "warn" | "error" | "ok"; title: string; children?: ReactNode }) {
  const c = { info: "#3ec6e0", warn: "#ffd23f", error: "#e8402a", ok: "#1f9d55" }[tone];
  const icon = { info: "i", warn: "!", error: "×", ok: "✓" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className="flex gap-3 rounded-xl border-[3px] border-ink bg-paper p-4" style={{ boxShadow: `inset 8px 0 0 ${c}` }}>
      <span aria-hidden="true" className="ml-2 grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-sm" style={{ background: c }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-snug">{title}</p>
        {children && <div className="mt-1 text-[0.95rem] text-ink/85">{children}</div>}
      </div>
    </div>
  );
}

export function AccountLink({ id, full = false }: { id: string; full?: boolean }) {
  return (
    <a href={explorerAccount(id)} target="_blank" rel="noreferrer" className="num break-anywhere underline decoration-2 underline-offset-2 hover:bg-yellow" title={id}>
      {full ? id : shortId(id, 14, 10)}
    </a>
  );
}

export function TxLink({ hash }: { hash: string }) {
  return (
    <a href={explorerTx(hash)} target="_blank" rel="noreferrer" className="num underline decoration-2 underline-offset-2 hover:bg-yellow" title={hash}>
      {shortId(hash, 8, 6)} ↗
    </a>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr] gap-x-4 gap-y-0.5 border-b border-ink/15 py-2.5 last:border-b-0 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 break-anywhere">
        {children}
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </dd>
    </div>
  );
}

export function EmptyState({ title, aside, children, action }: { title: string; aside?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="sticker relative mx-auto max-w-xl -rotate-1 p-6 text-center sm:p-8">
      {aside && <p className="font-hand text-2xl text-orange">{aside}</p>}
      <p className="font-display text-2xl">{title}</p>
      {children && <div className="mt-2 text-ink/80">{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function NotDeployed({ what = "The WHAT THE NFT?! contracts" }: { what?: string }) {
  return (
    <Alert tone="warn" title="Not live yet">
      {what} are not deployed on this network yet, so there is nothing real to show here. No sample data is displayed. See <Link className="underline" href="/status">status</Link> for what is live.
    </Alert>
  );
}

export function Unavailable({ reason }: { reason: string }) {
  return (
    <span className="chip chip-pending" title={reason}>
      Unavailable
    </span>
  );
}

/** Honest placeholder until production art from the founder's layer folders exists. */
export function ArtSlot({ label, traits, rarity }: { label?: string; traits?: { slot: string; meme: string; variant: number }[]; rarity?: string }) {
  return (
    <figure className="relative aspect-square w-full overflow-hidden rounded-xl border-[3px] border-ink bg-cream">
      <div className="halftone absolute inset-0 opacity-[0.12]" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-center p-4 text-center">
        <span className="font-display text-lg leading-tight sm:text-xl">ARTWORK NOT YET AVAILABLE</span>
        <span className="mt-1 font-hand text-base text-muted sm:text-lg">{label ?? "layers land when the founder drops them"}</span>
        {traits && (
          <ul className="num mt-3 w-full max-w-[15rem] space-y-0.5 text-left text-[0.72rem] sm:text-xs">
            {traits.map((t) => (
              <li key={t.slot} className="flex justify-between gap-2 border-b border-dashed border-ink/25">
                <span className="uppercase">{t.slot}</span>
                <span>
                  {t.meme} #{t.variant + 1}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {rarity && (
        <div className="absolute left-2 top-2">
          <RarityChip rarity={rarity} />
        </div>
      )}
      <figcaption className="sr-only">Artwork for this card has not been rendered yet. Traits are listed.</figcaption>
    </figure>
  );
}
