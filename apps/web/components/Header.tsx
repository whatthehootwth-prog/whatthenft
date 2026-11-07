"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NETWORK } from "@/lib/config";
import { shortId } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const NAV = [
  { href: "/hatch", label: "Hatch" },
  { href: "/collection", label: "Collection" },
  { href: "/market", label: "Market" },
  { href: "/my-nfts", label: "My NFTs" },
  { href: "/treasury", label: "Treasury" },
  { href: "/status", label: "Status" },
];

export function Header() {
  const { accountId, connect, disconnect, ready } = useWallet();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex max-w-[1200px] items-center gap-2 rounded-2xl border-[3px] border-ink bg-ink px-3 py-2 text-cream shadow-[0_4px_0_#ff7a1a] sm:px-4">
        <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 rounded-lg px-1" aria-label="WHAT THE NFT?! home">
          <span className="font-display text-[1.15rem] leading-none tracking-wide text-yellow sm:text-[1.35rem]">
            WHAT THE <span className="text-orange">NFT</span>?!
          </span>
        </Link>
        {NETWORK === "testnet" && <span className="chip hidden border-cream bg-cyan text-ink sm:inline-flex">testnet</span>}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={path?.startsWith(n.href) ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 font-display text-[0.98rem] tracking-wide hover:bg-cream/10 aria-[current=page]:bg-orange aria-[current=page]:text-ink"
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
          className="btn btn-sm btn-yellow ml-1 max-w-[11rem] overflow-hidden text-ellipsis"
          title={accountId ?? undefined}
        >
          {!ready ? "Loading…" : accountId ? shortId(accountId, 8, 6) : "Connect"}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="sr-only">Menu</span>
          <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">
            <path d={open ? "M3 2l14 12M17 2L3 14" : "M1 2h18M1 8h18M1 14h18"} stroke="#16110f" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="mx-auto mt-2 max-w-[1200px] lg:hidden">
          <ul className="panel grid grid-cols-2 gap-1 p-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={path?.startsWith(n.href) ? "page" : undefined} className="flex min-h-12 items-center rounded-lg px-3 font-display text-lg hover:bg-yellow aria-[current=page]:bg-orange">
                  {n.label}
                </Link>
              </li>
            ))}
            {accountId && (
              <li className="col-span-2 border-t-2 border-ink/20 px-3 pt-2 text-sm">
                Signed in as <span className="num break-anywhere">{accountId}</span>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
