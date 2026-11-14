"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const KEY = "wtn-hackathon-notice-v1";

/** Accepted in this browser session? (Storage can be blocked: then we just ask again.) */
export function noticeAccepted(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

function rememberAccepted() {
  try {
    sessionStorage.setItem(KEY, "yes");
  } catch {
    /* private mode: fine, we'll ask again next time */
  }
}

/** The modal itself. `onAccept` runs after the visitor confirms. */
export function HackathonNotice({ open, onAccept, onClose }: { open: boolean; onAccept: () => void; onClose: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body>: a transformed/animated ancestor (e.g. the hero CTA row) would otherwise trap `position: fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/70 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hn-title"
        aria-describedby="hn-body"
        className="pop-in relative my-auto w-full max-w-lg rounded-[26px] border-4 border-ink bg-paper p-6 pt-8 shadow-[10px_10px_0_#16110f] sm:p-8 sm:pt-9"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute -top-4 left-6 -rotate-3 rounded-lg border-[3px] border-ink bg-sun px-3 py-1 font-display text-sm tracking-wide text-ink shadow-[3px_3px_0_#16110f]">HEADS UP!</span>
        <h2 id="hn-title" className="font-display text-3xl leading-none text-ink sm:text-4xl">
          This is a hackathon demo
        </h2>
        <ul id="hn-body" className="mt-5 space-y-2.5 text-[0.98rem] leading-snug text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true">🦉</span>
            <span>
              <strong>Built for a hackathon</strong>, by Claude (AI).
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true">🛡️</span>
            <span>
              Smart contracts had an <strong>AI security audit by Claude and ChatGPT</strong>. That&apos;s not a professional audit firm.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true">⚡</span>
            <span>
              The contracts are <strong>live on NEAR mainnet</strong>: minting uses real NEAR and buys real, volatile meme tokens that can drop to zero.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true">🎲</span>
            <span>
              <strong>Mint at your own risk.</strong> Not financial advice. Read the{" "}
              <Link href="/risk" className="underline decoration-orange decoration-2 underline-offset-2" onClick={onClose}>
                risks
              </Link>
              .
            </span>
          </li>
        </ul>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            ref={okRef}
            type="button"
            className="btn-mad w-full sm:w-auto sm:flex-1"
            onClick={() => {
              rememberAccepted();
              onAccept();
            }}
          >
            I GET IT, LET&apos;S GO
          </button>
          <button type="button" className="btn-pop w-full sm:w-auto" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Ask once per session before `action` runs; afterwards it runs straight away. */
export function useHackathonGate() {
  const [pending, setPending] = useState<(() => void) | null>(null);
  const guard = useCallback((action: () => void) => {
    if (noticeAccepted()) action();
    else setPending(() => action);
  }, []);
  const close = useCallback(() => setPending(null), []);
  const modal = (
    <HackathonNotice
      open={pending !== null}
      onClose={close}
      onAccept={() => {
        const run = pending;
        setPending(null);
        run?.();
      }}
    />
  );
  return { guard, modal };
}

/** A "Mint now" link that shows the notice first (once per session). */
export function MintNowLink({ href = "/mint", className, children, onNavigate }: { href?: string; className?: string; children: ReactNode; onNavigate?: () => void }) {
  const router = useRouter();
  const { guard, modal } = useHackathonGate();
  return (
    <>
      <Link
        href={href}
        className={className}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new-tab clicks: let the mint page ask
          e.preventDefault();
          guard(() => {
            onNavigate?.();
            router.push(href);
          });
        }}
      >
        {children}
      </Link>
      {modal}
    </>
  );
}
