import { Cast } from "@/components/home/Cast";
import { Freaks } from "@/components/home/Freaks";
import { Hero } from "@/components/home/Hero";
import { HowPanels } from "@/components/home/HowPanels";
import { Ribbon } from "@/components/Ribbon";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="-mx-4 mt-8 overflow-hidden py-5 sm:-mx-6 lg:-mx-8">
        <Ribbon tilt={-2} bg="#ffe14d" items={["MINT A MUTANT", "REAL MEMES INSIDE", "LOCKED 30 DAYS", "TRADE YOUR FREAK", "WTH?!"]} />
      </div>
      <Cast />
      <HowPanels />
      <Freaks />
    </>
  );
}
