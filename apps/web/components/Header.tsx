"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NETWORK } from "@/lib/config";
import { shortId } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const NAV = [
  { href: "/", label: "HOME", match: (p: string) => p === "/" },
  { href: "/marketplace", label: "MARKETPLACE", match: (p: string) => p.startsWith("/marketplace") || p.startsWith("/nft") },
  { href: "/my-nfts", label: "MY NFTS", match: (p: string) => p.startsWith("/my-nfts") },
  { href: "/wtf", label: "WTF IS THIS?!", match: (p: string) => p.startsWith("/wtf") },
];

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
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex max-w-[1320px] items-center gap-2 rounded-[18px] border-[3px] border-ink bg-cream px-2.5 py-2 text-ink shadow-[0_5px_0_#16110f] sm:px-3">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl px-2" aria-label="WHAT THE NFT?! home">
          <span className="whitespace-nowrap font-display text-[0.95rem] leading-none tracking-wide min-[360px]:text-[1.08rem] sm:text-[1.45rem]">
            WHAT THE <span className="text-orange [-webkit-text-stroke:1.5px_#16110f]">NFT</span>?!
          </span>
        </Link>
        {NETWORK === "testnet" && <span className="stamp hidden !text-[0.62rem] !text-ink/70 md:inline-block">testnet</span>}
        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-xl border-[3px] border-transparent px-3.5 font-display text-[1.02rem] tracking-wide transition hover:-rotate-2 hover:border-ink hover:bg-yellow aria-[current=page]:border-ink aria-[current=page]:bg-orange"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          onClick={() => (accountId ? disconnect() : connect())}
          disabled={!ready}
          className="btn btn-sm btn-ink ml-auto max-w-[11.5rem] overflow-hidden text-ellipsis !px-3 sm:!px-[0.9rem] lg:ml-2"
          title={accountId ? `${accountId} — click to disconnect` : undefined}
        >
          {!ready ? "…" : accountId ? shortId(accountId, 8, 6) : <><span className="sm:hidden">CONNECT</span><span className="hidden sm:inline">CONNECT WALLET</span></>}
        </button>
        <button type="button" className="btn btn-sm btn-yellow !px-3 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
            <path d={open ? "M3 2l16 14M19 2L3 16" : "M1 2h20M1 9h14M1 16h20"} stroke="#16110f" strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="fixed inset-x-0 bottom-0 top-[76px] z-40 overflow-y-auto bg-night/95 px-4 pb-10 pt-6 backdrop-blur-sm lg:hidden">
          <ul className="mx-auto grid max-w-md gap-3">
            {NAV.map((n, i) => (
              <li key={n.href} className="pop-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  className={`flex min-h-16 items-center justify-between rounded-2xl border-4 border-ink px-5 font-display text-2xl text-ink shadow-[0_6px_0_#16110f] ${i % 2 ? "rotate-1" : "-rotate-1"} ${n.match(path) ? "bg-orange" : "bg-cream"}`}
                >
                  {n.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-8 max-w-md text-center">
            <Link href="/mint" className="btn-mega w-full">
              MINT NOW!
            </Link>
            {accountId && <p className="num mt-6 break-anywhere text-sm text-cream/70">Connected: {accountId}</p>}
          </div>
        </nav>
      )}
    </header>
  );
}
