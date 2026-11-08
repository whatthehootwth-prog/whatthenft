import type { Metadata, Viewport } from "next";
import { Gochi_Hand, Lilita_One, Space_Mono } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { OwlSprite } from "@/components/Mutant";
import { NETWORK } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";
import "./globals.css";
import "./collectible.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const gochi = Gochi_Hand({ weight: "400", subsets: ["latin"], variable: "--font-gochi", display: "swap" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-spacemono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WHAT THE NFT?! — One owl. Too many memes.", template: "%s · WHAT THE NFT?!" },
  description: "Mint a ridiculous meme mutant owl. Its body parts decide which real NEAR meme tokens it holds. Locked 30 days, then the owner can redeem. Prices can fall to zero.",
};

export const viewport: Viewport = { themeColor: "#0b0a0c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lilita.variable} ${gochi.variable} ${mono.variable}`}>
      <body className="stage-dots">
        <OwlSprite />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-yellow focus:px-4 focus:py-2 focus:font-display focus:text-ink">
          Skip to content
        </a>
        <WalletProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="relative overflow-hidden border-t-4 border-ink bg-orange text-ink">
            <div className="overflow-hidden border-b-4 border-ink bg-ink py-3 text-cream" aria-hidden="true">
              <div className="marquee font-display text-2xl tracking-wide">
                {Array.from({ length: 2 }).map((_, k) => (
                  <span key={k} className="flex gap-12">
                    <span>ONE OWL.</span>
                    <span className="text-yellow">TOO MANY MEMES.</span>
                    <span>DIFFERENT BAGS.</span>
                    <span className="text-orange">SAME CONFUSED OWL.</span>
                    <span>WHAT THE NFT?!</span>
                    <span className="text-pink">HOOOOOT?!</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
              <div>
                <p className="lettering text-5xl">WHAT THE NFT?!</p>
                <p className="mt-4 max-w-md text-[0.95rem] font-semibold">
                  Collectible art and a real token basket are two different things. Baskets hold volatile meme tokens that can fall to zero. Not yield, not a promise, not financial advice.
                </p>
              </div>
              <nav aria-label="Footer">
                <p className="font-display text-xl">THE SERIOUS STUFF</p>
                <ul className="mt-3 space-y-2 font-semibold">
                  <li><Link className="underline-offset-4 hover:underline" href="/risk">Risk disclosure</Link></li>
                  <li><Link className="underline-offset-4 hover:underline" href="/treasury">Treasury & fees</Link></li>
                  <li><Link className="underline-offset-4 hover:underline" href="/status">System status</Link></li>
                  <li><Link className="underline-offset-4 hover:underline" href="/terms">Terms (draft)</Link></li>
                </ul>
              </nav>
              <div className="font-semibold">
                <p className="font-display text-xl">PART OF WHAT THE HOOT?!</p>
                <p className="mt-3">
                  <a className="underline underline-offset-4" href="https://www.whatthehoot.lol/" target="_blank" rel="noreferrer">
                    whatthehoot.lol ↗
                  </a>
                </p>
                <p className="num mt-3 text-xs">network: {NETWORK}</p>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
