import type { Metadata, Viewport } from "next";
import { Lilita_One, Outfit, Space_Mono } from "next/font/google";
import { Header } from "@/components/Header";
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
        </WalletProvider>
      </body>
    </html>
  );
}
