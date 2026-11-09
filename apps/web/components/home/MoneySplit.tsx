/** Plain, readable trust block: where a mint payment goes. Numbers are the contract defaults. */
export function MoneySplit() {
  const rows = [
    { pct: 90, label: "Your meme bag", note: "Buys the real tokens your parts call for. Belongs to whoever owns the NFT.", c: "#c6f432" },
    { pct: 5, label: "WTH creator", note: "Paid only after your NFT is fully funded.", c: "#ffd23f" },
    { pct: 5, label: "WTH buyback treasury", note: "Paid only after your NFT is fully funded.", c: "#4dd8ff" },
  ];
  return (
    <section aria-labelledby="money-h" className="mt-24 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <span className="eyebrow">No funny business</span>
        <h2 id="money-h" className="mad-title mt-4 text-[clamp(2.4rem,5.5vw,4.2rem)]">
          WHERE YOUR NEAR GOES
        </h2>
        <p className="lead mt-4">The art is silly. The money isn&apos;t. 90% of the base price is your bag — storage and network fees are shown separately and never come out of it.</p>
        <ul className="mt-6 space-y-2 text-[1rem] font-semibold">
          <li>• Tokens locked 30 days after funding</li>
          <li>• Sell any time — the bag goes with the NFT</li>
          <li>• 2.5% royalty on marketplace sales (10% creator, 90% treasury)</li>
          <li>• Meme tokens can go to zero. Not yield, not advice.</li>
        </ul>
      </div>
      <div className="slab p-5 sm:p-7">
        <p className="text-sm font-extrabold uppercase tracking-wider text-ink/60">Every mint, split exactly</p>
        <div className="mt-4 flex h-14 overflow-hidden rounded-2xl border-[3px] border-ink">
          {rows.map((r) => (
            <div key={r.label} className="grid place-items-center border-r-[3px] border-ink font-display text-xl last:border-r-0" style={{ width: `${r.pct}%`, background: r.c }}>
              {r.pct >= 10 ? `${r.pct}%` : ""}
            </div>
          ))}
        </div>
        <ul className="mt-6 divide-y-2 divide-ink/10">
          {rows.map((r) => (
            <li key={r.label} className="flex gap-4 py-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl border-[3px] border-ink font-display text-xl" style={{ background: r.c }}>
                {r.pct}%
              </span>
              <div>
                <p className="font-display text-xl leading-tight">{r.label}</p>
                <p className="text-[0.95rem] text-ink/75">{r.note}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink/60">On a 0.1 NEAR mint: 0.09 to your bag, 0.005 creator, 0.005 treasury.</p>
      </div>
    </section>
  );
}
