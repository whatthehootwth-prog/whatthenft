"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NETWORK } from "@/lib/config";
import { shortId } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

const PILL = ["#ffe14d", "#2ee6ff", "#b8ff3d", "#ff3ea5"];
const NAV = [
  { href: "/", label: "HOME", match: (p: string) => p === "/" },
  { href: "/marketplace", label: "MARKETPLACE", match: (p: string) => p.startsWith("/marketplace") || p.startsWith("/nft") },
  { href: "/my-nfts", label: "MY NFTS", match: (p: string) => p.startsWith("/my-nfts") },
  { href: "/wth", label: "WTH IS THIS?!", match: (p: string) => p.startsWith("/wth") },
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
      <div className="mx-auto flex max-w-[1320px] items-center gap-2 rounded-full border-4 border-ink bg-white px-2 py-1.5 text-ink shadow-[0_6px_0_#16110f,6px_6px_0_4px_#ff3ea5] sm:px-3">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl px-1 sm:px-2" aria-label="WHAT THE NFT?! home">
          <Image src="/logo.webp" alt="" width={56} height={56} priority className="size-11 shrink-0 -rotate-6 drop-shadow-[2px_2px_0_#16110f] transition-transform hover:rotate-12 hover:scale-110 sm:size-14" />
          <span className="whitespace-nowrap font-display text-[0.95rem] leading-none tracking-wide min-[360px]:text-[1.08rem] sm:text-[1.45rem]">
            WHAT THE <span className="text-hot">NFT</span>?!
          </span>
        </Link>
        {NETWORK === "testnet" && <span className="stamp hidden !text-[0.62rem] !text-ink/70 md:inline-block">testnet</span>}
        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n, i) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  style={{ ["--pill" as string]: PILL[i % PILL.length] }}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full border-[3px] border-transparent px-3.5 font-display text-[1.02rem] tracking-wide transition hover:-rotate-3 hover:border-ink hover:bg-[var(--pill)] aria-[current=page]:-rotate-2 aria-[current=page]:border-ink aria-[current=page]:bg-[var(--pill)] aria-[current=page]:shadow-[0_3px_0_#16110f]"
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
          className="btn btn-sm ml-auto max-w-[11.5rem] overflow-hidden text-ellipsis !rounded-full !bg-hot !px-3 sm:!px-4 lg:ml-2"
          title={accountId ? `${accountId} — click to disconnect` : undefined}
        >
          {!ready ? "…" : accountId ? shortId(accountId, 8, 6) : <><span className="sm:hidden">CONNECT</span><span className="hidden sm:inline">CONNECT WALLET</span></>}
        </button>
        <button type="button" className="btn btn-sm btn-yellow !rounded-full !px-3 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
            <path d={open ? "M3 2l16 14M19 2L3 16" : "M1 2h20M1 9h14M1 16h20"} stroke="#16110f" strokeWidth="3.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="confetti fixed inset-x-0 bottom-0 top-[84px] z-40 overflow-y-auto border-t-4 border-ink px-4 pb-10 pt-6 lg:hidden">
          <ul className="mx-auto grid max-w-md gap-3">
            {NAV.map((n, i) => (
              <li key={n.href} className="pop-in" style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  style={{ background: n.match(path) ? PILL[i % PILL.length] : "#fff" }}
                  className={`flex min-h-16 items-center justify-between rounded-2xl border-4 border-ink px-5 font-display text-2xl text-ink shadow-[0_6px_0_#16110f] ${i % 2 ? "rotate-1" : "-rotate-1"}`}
                >
                  {n.label}
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-8 max-w-md text-center">
            <Link href="/mint" className="btn-mad w-full">
              MINT NOW!
            </Link>
            {accountId && <p className="num mt-6 break-anywhere text-sm">Connected: {accountId}</p>}
          </div>
        </nav>
      )}
    </header>
  );
}
