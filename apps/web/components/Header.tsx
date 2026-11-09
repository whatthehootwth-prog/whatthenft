"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shortId } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/marketplace", label: "Marketplace", match: (p: string) => p.startsWith("/marketplace") || p.startsWith("/nft") },
  { href: "/my-nfts", label: "My NFTs", match: (p: string) => p.startsWith("/my-nfts") },
  { href: "/wth", label: "WTH is this?!", match: (p: string) => p.startsWith("/wth") },
];

/** Floating dark pill nav, in the WHAT THE HOOT family style. */
export function Header() {
  const { accountId, connect, disconnect, ready } = useWallet();
  const [open, setOpen] = useState(false);
  const path = usePathname() ?? "/";
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[64px] max-w-[1320px] items-center gap-3 rounded-[18px] bg-ink pl-3 pr-2 text-cream shadow-[0_6px_0_rgba(22,17,15,0.18)] sm:pl-4 sm:pr-3">
        <Link href="/" className="group flex min-w-0 items-center gap-2" aria-label="WHAT THE NFT?! home">
          <Image src="/logo.webp" alt="" width={48} height={48} priority className="size-10 shrink-0 transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110 sm:size-11" />
          <span className="truncate font-display text-[1.2rem] leading-none tracking-wide text-orange xl:text-[1.6rem]">WHAT THE NFT?!</span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  className="inline-flex min-h-11 items-center px-3 font-display text-[1.02rem] uppercase tracking-wide text-cream transition-colors hover:text-orange aria-[current=page]:text-orange xl:px-4"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-2">
          <button
            type="button"
            onClick={() => (accountId ? disconnect() : connect())}
            disabled={!ready}
            className="hidden min-h-10 max-w-[11rem] items-center sm:inline-flex overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border-2 border-cream/40 px-3 font-display text-[0.95rem] uppercase tracking-wide text-cream transition hover:border-orange hover:text-orange disabled:opacity-60"
            title={accountId ? `${accountId} — click to disconnect` : undefined}
          >
            {!ready ? "…" : accountId ? shortId(accountId, 8, 6) : (
              <>
                <span className="sm:hidden">Connect</span>
                <span className="hidden sm:inline">Connect wallet</span>
              </>
            )}
          </button>
          <Link
            href="/mint"
            className="relative hidden min-h-11 items-center gap-2 rounded-xl border-[3px] border-ink bg-orange px-5 font-display text-[1.15rem] tracking-wide text-ink shadow-[0_0_0_3px_#ff7a1a] transition hover:-translate-y-0.5 hover:bg-sun hover:shadow-[0_0_0_3px_#ffe14d] sm:inline-flex"
          >
            <span className="size-2 rounded-full bg-ink/60" aria-hidden="true" />
            MINT NOW
          </Link>
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-xl bg-orange lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">
              <path d={open ? "M3 2l14 12M17 2L3 14" : "M1 2h18M1 8h18M1 14h18"} stroke="#16110f" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="fixed inset-x-0 bottom-0 top-[84px] z-40 overflow-y-auto bg-page/97 px-4 pb-10 pt-6 backdrop-blur-sm lg:hidden">
          <ul className="mx-auto grid max-w-md gap-3">
            {NAV.map((n, i) => (
              <li key={n.href} className="pop-in" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  className={`flex min-h-16 items-center justify-between rounded-2xl px-5 font-display text-2xl uppercase tracking-wide ${n.match(path) ? "bg-orange text-ink" : "bg-ink text-cream"}`}
                >
                  {n.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-8 max-w-md">
            <Link href="/mint" className="btn-mad w-full">
              MINT NOW
            </Link>
            <button type="button" onClick={() => (accountId ? disconnect() : connect())} disabled={!ready} className="btn-pop mt-4 w-full">
              {accountId ? "Disconnect" : "Connect wallet"}
            </button>
            {accountId && <p className="num mt-6 break-anywhere text-center text-sm">Connected: {accountId}</p>}
          </div>
        </nav>
      )}
    </header>
  );
}
