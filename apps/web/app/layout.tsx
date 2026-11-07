import type { Metadata, Viewport } from "next";
import { Gochi_Hand, Lilita_One, Space_Mono } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { NETWORK } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";
import "./globals.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const gochi = Gochi_Hand({ weight: "400", subsets: ["latin"], variable: "--font-gochi", display: "swap" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-spacemono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WHAT THE NFT?! — One owl. Too many memes.", template: "%s · WHAT THE NFT?!" },
  description: "WTH-themed collectible NFTs, each backed by a segregated basket of real NEAR meme tokens. Locked 30 days, then redeemable by the current owner. Prices can fall to zero.",
};

export const viewport: Viewport = { themeColor: "#16110f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lilita.variable} ${gochi.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-yellow focus:px-4 focus:py-2 focus:font-display">
          Skip to content
        </a>
        <WalletProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t-[3px] border-ink bg-ink text-cream">
            <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6 lg:px-8">
              <div>
                <p className="font-display text-2xl text-yellow">WHAT THE NFT?!</p>
                <p className="mt-1 font-hand text-xl text-cream/80">ONE OWL. TOO MANY MEMES.</p>
                <p className="mt-3 max-w-md text-sm text-cream/75">
                  Collectible art and real token baskets are two different things. Baskets hold volatile meme tokens that can fall to zero. Nothing here is yield, a
                  promise of returns, or financial advice.
                </p>
              </div>
              <nav aria-label="Disclosures">
                <p className="font-display text-lg">Read this first</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li><Link className="underline-offset-2 hover:underline" href="/risk">Risk disclosure</Link></li>
                  <li><Link className="underline-offset-2 hover:underline" href="/faq">FAQ — fees, custody, randomness</Link></li>
                  <li><Link className="underline-offset-2 hover:underline" href="/terms">Terms (draft)</Link></li>
                  <li><Link className="underline-offset-2 hover:underline" href="/status">System status</Link></li>
                </ul>
              </nav>
              <div className="text-sm text-cream/75">
                <p className="font-display text-lg text-cream">Part of WHAT THE HOOT?!</p>
                <p className="mt-2">
                  <a className="underline" href="https://www.whatthehoot.lol/" target="_blank" rel="noreferrer">whatthehoot.lol</a>
                </p>
                <p className="mt-2 num text-xs">network: {NETWORK}</p>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
