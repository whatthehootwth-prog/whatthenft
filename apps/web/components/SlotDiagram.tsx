/** The 6 economic slots of every card and their share of the variable 80% allocation. */
const SLOTS = [
  { key: "head", label: "HEAD", pct: 20, area: "head" },
  { key: "face", label: "FACE", pct: 10, area: "face" },
  { key: "body", label: "BODY", pct: 25, area: "body" },
  { key: "arms", label: "ARMS", pct: 10, area: "arms" },
  { key: "legs", label: "LEGS", pct: 10, area: "legs" },
  { key: "accessory", label: "CAPE / ACC.", pct: 25, area: "acc" },
];

const COLORS: Record<string, string> = { head: "#ffd23f", face: "#3ec6e0", body: "#ff7a1a", arms: "#ff5fa2", legs: "#fff4dc", accessory: "#b9a6dc" };

export function SlotDiagram({ className = "" }: { className?: string }) {
  return (
    <div className={`sticker w-full max-w-[25rem] rotate-[1.5deg] p-3 sm:p-4 ${className}`} role="img" aria-label="Card anatomy: head 20%, face 10%, body 25%, arms 10%, legs 10%, cape or accessory 25% of the variable meme allocation, plus a 20% WTH core.">
      <div
        className="grid aspect-[4/5] gap-2"
        style={{
          gridTemplateAreas: `"acc head head arms" "acc face face arms" "acc body body arms" "acc legs legs core"`,
          gridTemplateColumns: "1fr 1.2fr 1.2fr 1fr",
          gridTemplateRows: "1.1fr 0.8fr 1.4fr 0.9fr",
        }}
        aria-hidden="true"
      >
        {SLOTS.map((s) => (
          <div key={s.key} className="flex flex-col items-center justify-center rounded-lg border-[3px] border-ink p-1 text-center" style={{ gridArea: s.area, background: COLORS[s.key] }}>
            <span className="font-display text-[0.95rem] leading-none sm:text-lg">{s.label}</span>
            <span className="num mt-1 text-xs font-bold sm:text-sm">{s.pct}%</span>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center rounded-lg border-[3px] border-dashed border-ink bg-ink p-1 text-center text-cream" style={{ gridArea: "core" }}>
          <span className="font-display text-[0.8rem] leading-none sm:text-sm">WTH CORE</span>
          <span className="num mt-1 text-xs font-bold">+20%</span>
        </div>
      </div>
      <p className="mt-2 text-center font-hand text-lg leading-tight">each part = a real slice of the bag</p>
    </div>
  );
}
