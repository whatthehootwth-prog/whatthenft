import type { Metadata, Viewport } from "next";
import { Gochi_Hand, Lilita_One, Silkscreen, Space_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Ribbon } from "@/components/Ribbon";
import { NETWORK } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";
import "./globals.css";
import "./collectible.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const gochi = Gochi_Hand({ weight: "400", subsets: ["latin"], variable: "--font-gochi", display: "swap" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-spacemono", display: "swap" });
const pixel = Silkscreen({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-silkscreen", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WHAT THE NFT?! — One owl. Too many memes.", template: "%s · WHAT THE NFT?!" },
  icons: { icon: "/logo.webp", apple: "/logo.webp" },
  description: "Mint a ridiculous meme mutant owl. Its body parts decide which real NEAR meme tokens it holds. Locked 30 days, then the owner can redeem. Prices can fall to zero.",
};

export const viewport: Viewport = { themeColor: "#ff3ea5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lilita.variable} ${gochi.variable} ${mono.variable} ${pixel.variable}`}>
      <body className="confetti">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-sun focus:px-4 focus:py-2 focus:font-display focus:text-ink">
          Skip to content
        </a>
        <WalletProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="relative mt-10 overflow-hidden border-t-4 border-ink bg-lilac text-ink">
            <Ribbon bg="#b8ff3d" items={["ONE OWL.", "TOO MANY MEMES.", "DIFFERENT BAGS.", "SAME CONFUSED OWL.", "WHAT THE NFT?!", "HOOOOOT?!"]} />
            <div className="halftone-white absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
              <div>
                <div className="flex items-center gap-4">
                  <Image src="/logo.webp" alt="" width={96} height={96} className="size-20 -rotate-6 drop-shadow-[4px_4px_0_#16110f] sm:size-24" />
                  <p className="mad-title text-5xl sm:text-6xl">WHAT THE NFT?!</p>
                </div>
                <p className="mt-6 max-w-md rounded-2xl border-[3px] border-ink bg-white p-4 text-[0.95rem] font-semibold shadow-[5px_5px_0_#16110f]">
                  Collectible art and a real token basket are two different things. Baskets hold volatile meme tokens that can fall to zero. Not yield, not a promise, not financial advice.
                </p>
              </div>
              <nav aria-label="Footer">
                <p className="pixel text-sm font-bold">THE SERIOUS STUFF</p>
                <ul className="mt-3 space-y-2 font-display text-xl">
                  <li><Link className="hover:text-hot" href="/risk">Risk disclosure</Link></li>
                  <li><Link className="hover:text-hot" href="/treasury">Treasury & fees</Link></li>
                  <li><Link className="hover:text-hot" href="/status">System status</Link></li>
                  <li><Link className="hover:text-hot" href="/terms">Terms (draft)</Link></li>
                </ul>
              </nav>
              <div>
                <p className="pixel text-sm font-bold">PART OF WHAT THE HOOT?!</p>
                <p className="mt-3 font-display text-xl">
                  <a className="hover:text-hot" href="https://www.whatthehoot.lol/" target="_blank" rel="noreferrer">
                    whatthehoot.lol ↗
                  </a>
                </p>
                <p className="stamp mt-5">network: {NETWORK}</p>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
