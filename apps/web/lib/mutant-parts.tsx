/**
 * Mutant part library for the WTH owl rig.
 *
 * WTH parts reuse the official owl accessories from whatthehoot.lol (party hat, crown, cone, shades).
 * Partner parts (SHITZU / BLACKDRAGON / KAT) are STAND-IN illustrations using generic dog / dragon /
 * cat motifs in the WTH style. They do not reproduce any partner mascot and are replaced by the
 * founder-supplied layer files (assets/memes/<memeId>/slots/<slot>/) once approved.
 */
import type { ReactNode } from "react";
import { INK } from "./owl-geometry";

export type Slot = "head" | "face" | "body" | "arms" | "legs" | "accessory";
export const SLOT_ORDER: Slot[] = ["head", "face", "body", "arms", "legs", "accessory"];
export const SLOT_LABEL: Record<Slot, string> = { head: "HEAD", face: "FACE", body: "BODY", arms: "ARMS", legs: "LEGS", accessory: "CAPE / ACC." };

export type Layer = "back" | "arms" | "legs" | "face" | "head" | "front";

export interface Part {
  id: string;
  slot: Slot;
  memeId: string;
  name: string;
  layer: Layer;
  /** Anchor in owl coordinates, used by annotations. */
  anchor: [number, number];
  /** Body parts only: owl fill colour. */
  bodyColor?: string;
  render: (ctx: { body: string }) => ReactNode;
}

export const MEME_STYLE: Record<string, { label: string; color: string }> = {
  wth: { label: "WTH", color: "#FF7A1A" },
  shitzu: { label: "SHITZU", color: "#C8894A" },
  blackdragon: { label: "BLACKDRAGON", color: "#7C64A8" },
  kat: { label: "KAT", color: "#FFB13B" },
  jambo: { label: "JAMBO", color: "#3EC6E0" },
};

const S = { stroke: INK, strokeWidth: 30, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const HAT = "translate(620 290) scale(10) translate(-60 -32)";

function Pupil({ cx, cy, r, slit = false, fill = INK }: { cx: number; cy: number; r: number; slit?: boolean; fill?: string }) {
  return (
    <g className="wtn-pupil">
      {slit ? <ellipse cx={cx} cy={cy} rx={r * 0.38} ry={r * 1.9} fill={fill} /> : <circle cx={cx} cy={cy} r={r} fill={fill} />}
    </g>
  );
}

function Eyes({ fill = "#fff", slit = false, pupilScale = 1 }: { fill?: string; slit?: boolean; pupilScale?: number }) {
  return (
    <>
      <g className="wtn-eye">
        <circle cx={437} cy={522} r={177} fill={fill} stroke={INK} strokeWidth={46} />
        <Pupil cx={437} cy={522} r={34 * pupilScale} slit={slit} />
      </g>
      <g className="wtn-eye">
        <circle cx={923} cy={451} r={115} fill={fill} stroke={INK} strokeWidth={46} />
        <Pupil cx={923} cy={451} r={27 * pupilScale} slit={slit} />
      </g>
    </>
  );
}

function Feet({ fill, toe }: { fill: string; toe?: string }) {
  return (
    <g {...S}>
      <ellipse cx={402} cy={1130} rx={118} ry={64} fill={fill} />
      <ellipse cx={850} cy={1128} rx={118} ry={64} fill={fill} />
      {toe && (
        <g fill={toe} strokeWidth={0}>
          {[402, 850].map((x) => (
            <g key={x}>
              <circle cx={x - 52} cy={1112} r={17} />
              <circle cx={x} cy={1100} r={17} />
              <circle cx={x + 52} cy={1112} r={17} />
              <ellipse cx={x} cy={1148} rx={34} ry={22} />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

const WING_L = "M190 640 Q -30 820 80 1020 Q 200 960 240 760 Z";
const WING_R = "M1090 600 Q 1300 790 1200 990 Q 1080 930 1040 730 Z";

export const PARTS: Part[] = [
  // ───────── HEAD ─────────
  {
    id: "wth-party", slot: "head", memeId: "wth", name: "Party Hat", layer: "head", anchor: [600, 0],
    render: () => (
      <g transform={HAT}>
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d="M44 34 L58 -2 L74 32 Z" fill="#FF5FA2" />
          <path d="M51 18 L68 22 M47 27 L71 30" stroke="#3EC6E0" strokeWidth={4} />
          <circle cx={58} cy={-2} r={6} fill="#FFD23F" />
        </g>
      </g>
    ),
  },
  {
    id: "wth-crown", slot: "head", memeId: "wth", name: "Crown of Nothing", layer: "head", anchor: [620, 140],
    render: () => (
      <g transform={HAT}>
        <path d="M38 32 L40 8 L50 20 L60 2 L70 20 L80 8 L82 32 Z" fill="#FFD23F" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      </g>
    ),
  },
  {
    id: "wth-cone", slot: "head", memeId: "wth", name: "Traffic Cone", layer: "head", anchor: [620, 40],
    render: () => (
      <g transform={HAT}>
        <g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
          <path d="M42 34 L54 -6 L66 -6 L78 34 Z" fill="#FF7A1A" />
          <path d="M48 16 L72 16 L74 24 L46 24 Z" fill="#FFF4DC" />
          <path d="M36 34 H84" strokeWidth={5} />
        </g>
      </g>
    ),
  },
  {
    id: "shitzu-ears", slot: "head", memeId: "shitzu", name: "Floppy Dog Ears", layer: "head", anchor: [130, 480],
    render: () => (
      <g {...S}>
        <path d="M330 290 C 230 250 120 300 95 420 C 70 540 95 660 160 700 C 215 730 245 670 240 590 C 235 500 280 390 340 340 Z" fill="#B8753A" />
        <path d="M290 330 C 220 330 160 400 150 480 C 145 560 165 620 195 640" fill="none" stroke="#E0A96D" strokeWidth={26} />
        <path d="M900 250 C 1000 200 1130 250 1160 370 C 1190 490 1170 610 1110 650 C 1060 680 1035 620 1040 545 C 1045 460 1000 350 920 310 Z" fill="#B8753A" />
        <path d="M960 290 C 1050 290 1110 360 1120 440 C 1128 520 1110 580 1085 600" fill="none" stroke="#E0A96D" strokeWidth={26} />
      </g>
    ),
  },
  {
    id: "dragon-horns", slot: "head", memeId: "blackdragon", name: "Dragon Horns", layer: "head", anchor: [260, 90],
    render: () => (
      <g {...S}>
        <path d="M440 300 C 410 200 350 120 240 60 C 300 170 315 250 340 340 Z" fill="#2C2257" />
        <path d="M800 250 C 840 150 930 70 1060 30 C 990 130 955 205 905 300 Z" fill="#2C2257" />
        <path d="M262 90 C 300 110 320 130 330 150 M1020 55 C 990 80 975 95 965 115" stroke="#FFF4DC" strokeWidth={18} fill="none" />
      </g>
    ),
  },
  {
    id: "kat-ears", slot: "head", memeId: "kat", name: "Cat Ears", layer: "head", anchor: [400, 140],
    render: () => (
      <g {...S}>
        <path d="M320 340 L380 100 L550 270 Z" fill="#FFB13B" />
        <path d="M380 290 L398 175 L480 262 Z" fill="#FF5FA2" strokeWidth={0} />
        <path d="M770 250 L960 60 L995 320 Z" fill="#FFB13B" />
        <path d="M840 255 L945 150 L962 280 Z" fill="#FF5FA2" strokeWidth={0} />
      </g>
    ),
  },

  // ───────── FACE ─────────
  { id: "wth-eyes", slot: "face", memeId: "wth", name: "Confused Eyes", layer: "face", anchor: [437, 522], render: () => <Eyes /> },
  {
    id: "wth-shades", slot: "face", memeId: "wth", name: "Too-Cool Shades", layer: "face", anchor: [440, 560],
    render: () => (
      <>
        <Eyes />
        <g fill={INK} stroke={INK} strokeWidth={20}>
          <path d="M230 430 H650 V500 Q640 700 440 700 Q240 700 230 500 Z" />
          <path d="M770 380 H1080 V430 Q1070 590 925 590 Q780 590 770 430 Z" />
          <path d="M650 450 L770 410" strokeWidth={40} fill="none" />
          <path d="M300 470 L400 470" stroke="#fff" strokeWidth={26} strokeLinecap="round" />
        </g>
      </>
    ),
  },
  {
    id: "wth-dizzy", slot: "face", memeId: "wth", name: "Dizzy Spirals", layer: "face", anchor: [923, 451],
    render: () => (
      <>
        <circle cx={437} cy={522} r={177} fill="#fff" stroke={INK} strokeWidth={46} />
        <circle cx={923} cy={451} r={115} fill="#fff" stroke={INK} strokeWidth={46} />
        <g fill="none" stroke={INK} strokeWidth={18} strokeLinecap="round" className="wtn-spin">
          <path d="M437 522 m-10 0 a10 10 0 1 1 20 0 a30 30 0 1 1 -60 0 a50 50 0 1 1 100 0 a75 75 0 1 1 -150 0 a100 100 0 1 1 200 0" />
        </g>
        <g fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" className="wtn-spin-rev">
          <path d="M923 451 m-8 0 a8 8 0 1 1 16 0 a24 24 0 1 1 -48 0 a40 40 0 1 1 80 0 a60 60 0 1 1 -120 0" />
        </g>
      </>
    ),
  },
  {
    id: "shitzu-snout", slot: "face", memeId: "shitzu", name: "Dog Nose + Tongue", layer: "face", anchor: [730, 860],
    render: () => (
      <>
        <Eyes pupilScale={1.6} />
        <g {...S}>
          <path d="M675 805 Q 682 915 728 920 Q 778 918 784 805 Z" fill="#FF5FA2" />
          <path d="M729 820 V 890" strokeWidth={14} />
          <ellipse cx={735} cy={512} rx={74} ry={50} fill={INK} />
        </g>
        <ellipse cx={712} cy={498} rx={18} ry={10} fill="#fff" />
      </>
    ),
  },
  {
    id: "dragon-eyes", slot: "face", memeId: "blackdragon", name: "Dragon Glare", layer: "face", anchor: [923, 451],
    render: () => (
      <>
        <Eyes fill="#FFD23F" slit pupilScale={1.2} />
        <g stroke={INK} strokeWidth={40} strokeLinecap="round">
          <path d="M270 330 L560 400" />
          <path d="M800 340 L1040 290" />
        </g>
      </>
    ),
  },
  {
    id: "kat-whiskers", slot: "face", memeId: "kat", name: "Whiskers", layer: "face", anchor: [300, 700],
    render: () => (
      <>
        <Eyes slit />
        <g stroke={INK} strokeWidth={16} strokeLinecap="round" fill="none">
          <path d="M600 660 L320 610 M600 700 L300 700 M610 740 L330 800" />
          <path d="M850 640 L1110 580 M855 680 L1140 670 M850 720 L1110 770" />
        </g>
        <path d="M700 500 L770 500 L735 545 Z" fill="#FF5FA2" stroke={INK} strokeWidth={14} strokeLinejoin="round" />
      </>
    ),
  },

  // ───────── BODY ─────────
  { id: "wth-white", slot: "body", memeId: "wth", name: "Classic Fluff", layer: "back", anchor: [640, 980], bodyColor: "#FEFEFE", render: () => null },
  { id: "wth-yellow", slot: "body", memeId: "wth", name: "Banana Fluff", layer: "back", anchor: [640, 980], bodyColor: "#FFD23F", render: () => null },
  { id: "wth-pink", slot: "body", memeId: "wth", name: "Bubblegum Fluff", layer: "back", anchor: [640, 980], bodyColor: "#FF5FA2", render: () => null },
  { id: "wth-cyan", slot: "body", memeId: "wth", name: "Pool Party Fluff", layer: "back", anchor: [640, 980], bodyColor: "#3EC6E0", render: () => null },
  {
    id: "shitzu-spots", slot: "body", memeId: "shitzu", name: "Dog Spots", layer: "back", anchor: [380, 920], bodyColor: "#F3DDB8",
    render: () => (
      <g fill="#B8753A">
        <ellipse cx={330} cy={880} rx={90} ry={70} />
        <ellipse cx={980} cy={760} rx={70} ry={90} />
        <ellipse cx={560} cy={1010} rx={60} ry={45} />
        <ellipse cx={900} cy={990} rx={80} ry={55} />
        <ellipse cx={200} cy={640} rx={45} ry={60} />
      </g>
    ),
  },
  {
    id: "dragon-scales", slot: "body", memeId: "blackdragon", name: "Dragon Scales", layer: "back", anchor: [640, 980], bodyColor: "#8B78C4",
    render: () => (
      <g fill="none" stroke="#2C2257" strokeWidth={14} strokeLinecap="round">
        {[700, 770, 840, 910, 980, 1050].flatMap((y, r) =>
          Array.from({ length: 13 }, (_, i) => {
            const x = 100 + i * 90 + (r % 2 ? 45 : 0);
            return <path key={`${y}-${i}`} d={`M${x} ${y} q 45 50 90 0`} />;
          }),
        )}
      </g>
    ),
  },
  {
    id: "kat-stripes", slot: "body", memeId: "kat", name: "Tabby Stripes", layer: "back", anchor: [300, 860], bodyColor: "#FFC46B",
    render: () => (
      <g fill="none" stroke="#E07B12" strokeWidth={40} strokeLinecap="round">
        <path d="M100 760 Q 220 720 300 790" />
        <path d="M90 880 Q 230 840 320 910" />
        <path d="M150 1000 Q 260 960 350 1030" />
        <path d="M1160 700 Q 1040 670 960 740" />
        <path d="M1170 830 Q 1040 800 950 870" />
        <path d="M1110 960 Q 1000 930 920 1000" />
      </g>
    ),
  },

  // ───────── ARMS ─────────
  {
    id: "wth-wings", slot: "arms", memeId: "wth", name: "Flappy Wings", layer: "arms", anchor: [70, 900],
    render: ({ body }) => (
      <g fill={body} {...S} strokeWidth={34}>
        <path d={WING_L} />
        <path d={WING_R} />
      </g>
    ),
  },
  {
    id: "dragon-wings", slot: "arms", memeId: "blackdragon", name: "Bat Wings", layer: "arms", anchor: [-60, 520],
    render: () => (
      <g {...S}>
        <path d="M220 560 L -60 360 L -20 560 L -130 610 L -40 720 L -110 820 L 40 870 L 230 760 Z" fill="#4B3A8C" />
        <path d="M1034 560 L 1314 360 L 1274 560 L 1384 610 L 1294 720 L 1364 820 L 1214 870 L 1024 760 Z" fill="#4B3A8C" />
        <path d="M220 600 L -20 560 M220 650 L -40 720 M225 710 L 40 870 M1034 600 L 1274 560 M1034 650 L 1294 720 M1029 710 L 1214 870" strokeWidth={14} fill="none" />
      </g>
    ),
  },
  {
    id: "kat-paws", slot: "arms", memeId: "kat", name: "Kitty Arms", layer: "arms", anchor: [60, 980],
    render: () => (
      <g {...S}>
        <path d="M210 640 Q 40 760 50 960 Q 120 1020 190 950 Q 210 820 260 760 Z" fill="#FFC46B" />
        <path d="M1060 610 Q 1220 720 1215 940 Q 1150 1000 1080 935 Q 1065 810 1020 740 Z" fill="#FFC46B" />
        <g fill="#FF5FA2" strokeWidth={0}>
          <circle cx={95} cy={965} r={18} /><circle cx={140} cy={980} r={15} />
          <circle cx={1160} cy={950} r={18} /><circle cx={1120} cy={965} r={15} />
        </g>
      </g>
    ),
  },
  {
    id: "shitzu-paws", slot: "arms", memeId: "shitzu", name: "Good Boy Paws", layer: "arms", anchor: [60, 980],
    render: () => (
      <g {...S}>
        <path d="M210 640 Q 40 760 50 960 Q 120 1020 190 950 Q 210 820 260 760 Z" fill="#B8753A" />
        <path d="M1060 610 Q 1220 720 1215 940 Q 1150 1000 1080 935 Q 1065 810 1020 740 Z" fill="#B8753A" />
        <g fill={INK} strokeWidth={0}>
          <circle cx={90} cy={960} r={14} /><circle cx={130} cy={978} r={14} />
          <circle cx={1165} cy={945} r={14} /><circle cx={1125} cy={963} r={14} />
        </g>
      </g>
    ),
  },

  // ───────── LEGS ─────────
  { id: "wth-feet", slot: "legs", memeId: "wth", name: "Orange Toes", layer: "legs", anchor: [850, 1140], render: () => null },
  {
    id: "wth-sneakers", slot: "legs", memeId: "wth", name: "Hype Sneakers", layer: "legs", anchor: [850, 1140],
    render: () => (
      <g {...S}>
        {[402, 850].map((x) => (
          <g key={x}>
            <path d={`M${x - 120} 1150 Q ${x - 125} 1070 ${x - 40} 1070 L ${x + 20} 1090 Q ${x + 110} 1095 ${x + 130} 1150 Z`} fill="#E8402A" />
            <path d={`M${x - 125} 1150 H ${x + 132} V 1185 H ${x - 125} Z`} fill="#FFF4DC" />
            <path d={`M${x - 30} 1095 L ${x + 20} 1110 M${x - 20} 1080 L ${x + 30} 1098`} stroke="#FFF4DC" strokeWidth={14} />
          </g>
        ))}
      </g>
    ),
  },
  {
    id: "dragon-claws", slot: "legs", memeId: "blackdragon", name: "Dragon Claws", layer: "legs", anchor: [850, 1150],
    render: () => (
      <g {...S}>
        {[402, 850].map((x) => (
          <g key={x}>
            <path d={`M${x - 115} 1095 Q ${x} 1040 ${x + 115} 1095 L ${x + 115} 1150 Q ${x} 1185 ${x - 115} 1150 Z`} fill="#2C2257" />
            {[-80, 0, 80].map((dx) => (
              <path key={dx} d={`M${x + dx - 18} 1160 L ${x + dx} 1210 L ${x + dx + 18} 1160 Z`} fill="#FFF4DC" strokeWidth={14} />
            ))}
          </g>
        ))}
      </g>
    ),
  },
  { id: "kat-beans", slot: "legs", memeId: "kat", name: "Toe Beans", layer: "legs", anchor: [850, 1140], render: () => <Feet fill="#FFC46B" toe="#FF5FA2" /> },
  { id: "shitzu-feet", slot: "legs", memeId: "shitzu", name: "Muddy Paws", layer: "legs", anchor: [402, 1140], render: () => <Feet fill="#B8753A" toe={INK} /> },

  // ───────── ACCESSORY ─────────
  { id: "wth-none", slot: "accessory", memeId: "wth", name: "Nothing (Brave)", layer: "back", anchor: [1150, 1050], render: () => null },
  {
    id: "wth-cape", slot: "accessory", memeId: "wth", name: "Hero Cape", layer: "back", anchor: [1180, 1120],
    render: () => <path d="M280 430 Q 110 880 40 1240 L 1220 1240 Q 1160 870 990 380 Z" fill="#E8402A" {...S} />,
  },
  {
    id: "wth-sign", slot: "accessory", memeId: "wth", name: "Protest Sign", layer: "front", anchor: [1230, 640],
    render: () => (
      <g {...S}>
        <path d="M1180 980 L 1230 760" strokeWidth={34} />
        <path d="M1050 560 L 1400 540 L 1410 760 L 1060 780 Z" fill="#FFF4DC" />
        <text x={1232} y={690} textAnchor="middle" fontFamily="var(--font-lilita), Impact, sans-serif" fontSize={104} fill={INK} stroke="none" transform="rotate(-3 1232 660)">
          HOOT?!
        </text>
      </g>
    ),
  },
  {
    id: "dragon-tail", slot: "accessory", memeId: "blackdragon", name: "Spiky Tail", layer: "back", anchor: [1330, 860],
    render: () => (
      <g>
        <path d="M940 1050 Q 1250 1160 1300 950 Q 1325 820 1230 790" fill="none" stroke={INK} strokeWidth={110} strokeLinecap="round" />
        <path d="M940 1050 Q 1250 1160 1300 950 Q 1325 820 1230 790" fill="none" stroke="#4B3A8C" strokeWidth={60} strokeLinecap="round" />
        <path d="M1230 790 L 1150 700 L 1280 690 Z" fill="#2C2257" {...S} />
      </g>
    ),
  },
  {
    id: "kat-tail", slot: "accessory", memeId: "kat", name: "Curly Tail", layer: "back", anchor: [1320, 640],
    render: () => (
      <g>
        <path d="M980 1060 Q 1330 1060 1280 790 Q 1250 640 1340 590" fill="none" stroke={INK} strokeWidth={100} strokeLinecap="round" />
        <path d="M980 1060 Q 1330 1060 1280 790 Q 1250 640 1340 590" fill="none" stroke="#FFC46B" strokeWidth={54} strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "shitzu-bone", slot: "accessory", memeId: "shitzu", name: "Emotional Support Bone", layer: "front", anchor: [-40, 1000],
    render: () => (
      <g transform="rotate(-28 80 1000)" {...S}>
        <path d="M-30 975 H 190 V 1025 H -30 Z" fill="#FFF4DC" />
        {[
          [-40, 960], [-40, 1040], [200, 960], [200, 1040],
        ].map(([cx, cy]) => (
          <circle key={`${cx}${cy}`} cx={cx} cy={cy} r={34} fill="#FFF4DC" />
        ))}
        <path d="M-10 978 H 170 V 1022 H -10 Z" fill="#FFF4DC" strokeWidth={0} />
      </g>
    ),
  },
];

export const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));
export const partsFor = (slot: Slot, memeId: string) => PARTS.filter((p) => p.slot === slot && p.memeId === memeId);

export type MutantSpec = Record<Slot, string>;

/** Map on-chain traits (memeId + variant per slot) to rig parts. Unknown memes fall back to WTH, flagged. */
export function specFromTraits(slots: { memeId: string; variant: number }[]): { spec: MutantSpec; standIn: boolean; missing: string[] } {
  const missing: string[] = [];
  const spec = {} as MutantSpec;
  SLOT_ORDER.forEach((slot, i) => {
    const t = slots[i];
    let opts = t ? partsFor(slot, t.memeId) : [];
    if (opts.length === 0) {
      if (t) missing.push(`${slot}:${t.memeId}`);
      opts = partsFor(slot, "wth");
    }
    spec[slot] = opts[(t?.variant ?? 0) % opts.length]!.id;
  });
  return { spec, standIn: true, missing };
}
