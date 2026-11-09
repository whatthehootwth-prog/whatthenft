import type { Metadata, Viewport } from "next";
import { Lilita_One, Outfit, Space_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { HideOnHome } from "@/components/HideOnHome";
import { NETWORK } from "@/lib/config";
import { WalletProvider } from "@/lib/wallet";
import "./globals.css";
import "./collectible.css";

const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const outfit = Outfit({ weight: ["400", "500", "600", "700", "800"], subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const mono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-spacemono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "WHAT THE NFT?! — One owl. Too many memes.", template: "%s · WHAT THE NFT?!" },
  icons: { icon: "/logo.webp", apple: "/brand/apple-icon.png" },
  description: "Mint a ridiculous meme mutant owl. Its body parts decide which real NEAR meme tokens it holds. Locked 30 days, then the owner can redeem. Prices can fall to zero.",
};

export const viewport: Viewport = { themeColor: "#fff8e7", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lilita.variable} ${outfit.variable} ${mono.variable}`}>
      <body className="confetti">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-sun focus:px-4 focus:py-2 focus:font-display focus:text-ink">
          Skip to content
        </a>
        <WalletProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <HideOnHome>
          <footer className="border-t-[3px] border-ink bg-white">
            <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
              <div>
                <div className="flex items-center gap-3">
                  <Image src="/logo.webp" alt="" width={64} height={64} className="size-16" />
                  <p className="font-display text-3xl leading-none">
                    WHAT THE <span className="text-orange [text-shadow:2px_2px_0_#16110f]">NFT</span>?!
                  </p>
                </div>
                <p className="mt-5 max-w-md text-[0.98rem] text-ink/75">
                  Collectible art and a real token basket are two different things. Baskets hold volatile meme tokens that can fall to zero. Not yield, not a promise, not financial advice.
                </p>
              </div>
              <nav aria-label="Footer">
                <p className="pixel text-xs text-ink/60">The serious stuff</p>
                <ul className="mt-3 space-y-2 font-semibold">
                  <li><Link className="hover:text-orange" href="/risk">Risk disclosure</Link></li>
                  <li><Link className="hover:text-orange" href="/treasury">Treasury & fees</Link></li>
                  <li><Link className="hover:text-orange" href="/status">System status</Link></li>
                  <li><Link className="hover:text-orange" href="/terms">Terms (draft)</Link></li>
                </ul>
              </nav>
              <div>
                <p className="pixel text-xs text-ink/60">Part of WHAT THE HOOT?!</p>
                <p className="mt-3 font-semibold">
                  <a className="hover:text-orange" href="https://www.whatthehoot.lol/" target="_blank" rel="noreferrer">
                    whatthehoot.lol ↗
                  </a>
                </p>
                <p className="mt-4"><span className="stamp !bg-aqua">network: {NETWORK}</span></p>
              </div>
            </div>
            <div className="border-t-[3px] border-ink bg-orange py-3 text-center font-display text-lg">ONE OWL. TOO MANY MEMES.</div>
          </footer>
          </HideOnHome>
        </WalletProvider>
      </body>
    </html>
  );
}
