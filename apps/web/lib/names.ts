/** Silly mutant names built from the owl's actual parts (e.g. "Yeehaw Laser-Eyed Doggo", "Captain Pearly Meerkat"). */
import { SLOT_ORDER, layerFor, providers, type MutantSpec, type Slot } from "./art";

/** The body decides who the owl *is*. */
const NOUN: Record<string, string[]> = {
  wth: ["Hoot", "Owl", "Hooter"],
  hoodl: ["Hodler", "Bagholder"],
  three: ["Pixel", "Glitch"],
  raen: ["Raen", "Firebird"],
  mallace: ["Mallace", "Vibe Lord"],
  "quantum-cat": ["Schrödinger", "Maybe-Cat"],
  inu: ["Doggo", "Pupper", "Shibe"],
  nearkat: ["Meerkat", "Kat"],
  cybernetic: ["Cyborg", "Unit 404"],
};

/** Every other part adds a flavour word. */
const WORD: Record<string, Partial<Record<Slot, string[]>>> = {
  hoodl: { head: ["Pointy"], arms: ["Bag-Clutching", "Diamond-Winged"] },
  hooters: { accessory: ["Beach Bod", "Bikini"], legs: ["Beach Bod", "Sun-Kissed"] },
  oyster: { head: ["Pearly", "Fancy"], accessory: ["Shellshocked", "Shelly"] },
  three: { face: ["Pixelated", "8-Bit"] },
  moonshot: { head: ["Yeehaw", "Cowboy"], accessory: ["Outlaw", "Bandit"], arms: ["Trigger-Happy", "Quickdraw"] },
  idp: { accessory: ["Cardboard", "Broke"], arms: ["Flag-Waving", "Patriotic"] },
  robinhoot: { head: ["Sherwood", "Feathered"], accessory: ["Caped", "Mysterious"], arms: ["Archer", "Sharpshooter"] },
  nearkat: { accessory: ["Certified", "On-Chain"] },
  cybernetic: { head: ["Armoured", "Titanium"], face: ["Laser-Eyed", "Cyber"], legs: ["Robo-Legged", "Bionic"] },
  batman: { head: ["Masked", "Dark Knight"], accessory: ["Caped", "Brooding"], legs: ["Gadget-Belted", "Vigilante"] },
};

const FILLER = ["Sleepy", "Turbo", "Feral", "Cursed", "Spicy", "Wobbly", "Unhinged", "Crispy", "Sus", "Bonkers", "Chonky", "Shook"];

function rng(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

function hashSpec(spec: MutantSpec): number {
  let h = 2166136261;
  for (const s of SLOT_ORDER) for (const ch of `${spec[s].memeId}:${spec[s].variant};`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Deterministic for the same spec + seed; change `seed` to re-roll the joke. Max ~22 chars. */
export function funnyName(spec: MutantSpec, seed = 0): string {
  const r = rng(hashSpec(spec) + seed * 7919);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  const prov = providers(spec);

  const noun = pick(NOUN[prov.body] ?? NOUN.wth!);
  const words = SLOT_ORDER.filter((s) => s !== "body" && layerFor(s, spec[s]))
    .map((s) => WORD[prov[s]]?.[s])
    .filter((w): w is string[] => !!w)
    .map(pick);
  // Shuffle the flavour words so the same parts don't always read the same way round.
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  const w1 = words[0] ?? pick(FILLER);
  const w2 = words[1];

  const templates = [
    `${w1} ${noun}`,
    w2 ? `${w1} ${w2} ${noun}` : `${pick(FILLER)} ${w1} ${noun}`,
    `Captain ${w1} ${noun}`,
    `Sir ${noun} the ${w1}`,
    `Lil' ${w1} ${noun}`,
    `${w1} ${noun} 9000`,
    `${noun}.EXE`,
    `Mega ${w1} ${noun}`,
    `${w1} ${noun} of Doom`,
    `Professor ${noun}`,
  ].filter((t) => t.length <= 22);
  return (templates.length ? pick(templates) : `${w1} ${noun}`).toUpperCase();
}
