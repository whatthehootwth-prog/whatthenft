/** 29–41 s — 85% of the base mint price buys real meme tokens → locked 30 days → the NFT still trades. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, DISPLAY, MONO, SANS } from "../brand";
import { RarityCard } from "../card";
import { at, BrowserFrame, Burst, Coin, Halftone, Ink, Padlock, pop, shakeAll, Sticker, Tag, useT } from "../exports";
import { Mutant, memeColor, mixOf } from "../mutant";
import { CORE_SPEC } from "./S3Core";

const SPLIT = 33.8;

export const S4Bag: React.FC = () => {
  const t = useT();
  return <AbsoluteFill style={{ overflow: "hidden" }}>{t < SPLIT ? <Part85 t={t} /> : <PartLock t={t} />}</AbsoluteFill>;
};

const Part85: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.round(at(t, [29.4, 31.5], [0, 85], (x) => 1 - Math.pow(1 - x, 3)));
  const done = t >= 31.5;
  const frameIn = pop(t, 29.15, { damping: 14, stiffness: 120 });
  const sh = shakeAll(t, [[31.5, 0.3, 14]]);
  return (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Burst a={C.aqua} b="#7af0ff" rays={24} spin={-9} cx={420} cy={480} />
      <Halftone opacity={0.07} />
      <BrowserFrame clip="mint" from={29.0} start={2.6} width={1000} label="MINT PAGE" style={{ left: 860, top: 190, transform: `translateX(${(1 - frameIn) * 1200}px) rotate(${2.5 - frameIn * 0.5}deg)` }} />
      <div style={{ position: "absolute", left: 1480, top: 140, transform: `scale(${pop(t, 29.6)}) rotate(5deg)` }}>
        <Sticker bg={C.yellow} size={34}>FIXED 0.3 NEAR</Sticker>
      </div>
      <div style={{ position: "absolute", left: 80, top: 210, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ transform: `scale(${pop(t, 29.3)}) rotate(-4deg)`, transformOrigin: "left center" }}>
          <Ink size={330} color={C.yellow} shadow={18} style={{ transform: done ? `scale(${1 + Math.max(0, 0.12 - (t - 31.5) * 0.4)})` : undefined }}>{`${n}%`}</Ink>
        </div>
        <div style={{ marginTop: 10, transform: `scale(${pop(t, 30.0)})`, transformOrigin: "left center" }}>
          <Sticker bg={C.cream} size={44} rotate={-2}>OF THE BASE MINT PRICE</Sticker>
        </div>
        <div style={{ marginTop: 26, transform: `scale(${pop(t, 31.6)})`, transformOrigin: "left center" }}>
          <Sticker bg={C.orange} color={C.cream} size={50} rotate={2}>→ REAL MEME TOKENS</Sticker>
        </div>
        <div style={{ marginTop: 30, opacity: at(t, [32.0, 32.4], [0, 1]) }}>
          <Tag size={22}>Swapped on RHEA when your bag is funded</Tag>
        </div>
      </div>
      {/* coin shower on the 85 */}
      {done
        ? ["three", "robinhoot", "idp", "moonshot", "cybernetic", "batman", "hoodl", "nearkat"].map((id, i) => {
            const a = (i / 8) * Math.PI * 2 + 0.4;
            const k = at(t, [31.5, 32.4], [0, 1], (x) => 1 - Math.pow(1 - x, 2));
            const g = Math.max(0, t - 31.5) ** 2 * 900;
            return (
              <div key={id} style={{ position: "absolute", left: 360 + Math.cos(a) * 420 * k, top: 330 + Math.sin(a) * 260 * k + g, transform: `rotate(${k * 360}deg)`, opacity: 1 - at(t, [32.6, 33.2], [0, 1]) }}>
                <Coin size={80} color={memeColor(id)} />
              </div>
            );
          })
        : null}
    </AbsoluteFill>
  );
};

const PartLock: React.FC<{ t: number }> = ({ t }) => {
  const mix = mixOf(CORE_SPEC);
  const lockP = pop(t, 35.15, { damping: 10, stiffness: 260 });
  const lockDrop = at(t, [34.9, 35.25], [-700, 0], (x) => x * x);
  const lifted = at(t, [37.4, 37.8], [0, 1]);
  const trade = t >= 38.8;
  const swing = trade ? Math.sin((t - 38.8) * 5) * 120 * Math.min(1, (t - 38.8) * 2) : 0;
  const sh = shakeAll(t, [[35.35, 0.4, 22]]);
  const cardIn = pop(t, SPLIT + 0.05, { damping: 12 });
  const panelIn = pop(t, SPLIT + 0.35, { damping: 12 });
  return (
    <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Burst a={C.lime} b="#d4ff86" rays={24} spin={7} />
      <Halftone opacity={0.07} />
      {/* NFT card */}
      <div style={{ position: "absolute", left: 230, top: 205, transform: `translate(${swing}px, ${-lifted * 30}px) scale(${cardIn}) rotate(${-4 + lifted * 6 + (trade ? Math.sin((t - 38.8) * 5) * 6 : 0)}deg)` }}>
        <RarityCard tier={1} name="PIXEL OUTLAW" num="#042 / 111" width={430} art={<Mutant spec={CORE_SPEC} size={380} shadow={false} />} />
      </div>
      {/* bag panel */}
      <div style={{ position: "absolute", left: 830, top: 255, width: 860, transform: `scale(${panelIn})`, transformOrigin: "left center" }}>
        <div style={{ borderRadius: 30, background: C.paper, border: `8px solid ${C.ink}`, boxShadow: `16px 16px 0 ${C.ink}`, padding: "30px 38px" }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, color: C.muted, letterSpacing: "0.12em" }}>BAG INSIDE · BOUGHT AT MINT</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 110, color: C.ink, lineHeight: 1.05 }}>0.255 NEAR</div>
          <div style={{ display: "flex", height: 34, border: `5px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", marginTop: 6 }}>
            {mix.map((m) => (
              <div key={m.id} style={{ width: `${m.pct}%`, background: m.color, borderRight: `4px solid ${C.ink}` }} />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 26px", marginTop: 14, fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.ink }}>
            {mix.map((m) => (
              <span key={m.id}>
                <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 99, background: m.color, border: `3px solid ${C.ink}`, marginRight: 8 }} />
                {m.name} {m.pct}%
              </span>
            ))}
          </div>
          <div style={{ marginTop: 22, borderRadius: 18, border: `5px solid ${C.ink}`, background: t > 35.3 ? C.yellow : C.cream, padding: "16px 22px" }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 32, color: C.ink }}>{t > 35.3 ? "Locked · unlocks in 30 days" : "Bag funded"}</div>
            <div style={{ marginTop: 10, height: 18, borderRadius: 99, border: `4px solid ${C.ink}`, background: "#fff", overflow: "hidden" }}>
              <div style={{ width: `${at(t, [35.4, 36.4], [0, 4])}%`, height: "100%", background: C.orange }} />
            </div>
          </div>
        </div>
        {/* padlock drops */}
        {t > 34.9 ? (
          <div style={{ position: "absolute", right: -70, top: -150, transform: `translateY(${lockDrop}px) scale(${0.6 + lockP * 0.4}) rotate(${12 + (1 - lockP) * 20}deg)` }}>
            <Padlock size={250} open={at(t, [35.0, 35.3], [1, 0])} />
          </div>
        ) : null}
        {t > 35.45 ? (
          <div style={{ position: "absolute", left: 150, top: 300, transform: `scale(${1 + (1 - pop(t, 35.45, { damping: 12, stiffness: 300 })) * 2}) rotate(-9deg)`, opacity: Math.min(1, (t - 35.45) * 8) }}>
            <div style={{ border: `12px solid ${C.red}`, borderRadius: 20, padding: "6px 26px", background: "rgba(255,251,240,0.85)" }}>
              <Ink size={96} color={C.red} stroke={6} shadow={0}>30 DAYS LOCKED</Ink>
            </div>
          </div>
        ) : null}
      </div>
      {/* "But the NFT?" */}
      {t > 37.4 && !trade ? (
        <div style={{ position: "absolute", left: 560, top: 60, transform: `scale(${pop(t, 37.4, { damping: 7, stiffness: 260 })}) rotate(10deg)` }}>
          <Sticker bg={C.pink} color={C.cream} size={70}>BUT THE NFT?</Sticker>
        </div>
      ) : null}
      {trade ? (
        <>
          <div style={{ position: "absolute", left: 330, top: 40, transform: `scale(${pop(t, 38.8, { damping: 7, stiffness: 260 })}) rotate(-5deg)` }}>
            <Sticker bg={C.ink} color={C.lime} size={74}>YOU CAN STILL TRADE IT!</Sticker>
          </div>
          <div style={{ position: "absolute", left: 250, top: 900, display: "flex", gap: 40, transform: `scale(${pop(t, 39.05)})`, transformOrigin: "left center" }}>
            <Sticker bg={C.lime} size={50} rotate={-2}>NFT: TRADABLE</Sticker>
          </div>
          <div style={{ position: "absolute", left: 1080, top: 900, transform: `scale(${pop(t, 39.2)})`, transformOrigin: "left center" }}>
            <Sticker bg={C.yellow} size={50} rotate={2}>TOKENS: LOCKED 30 DAYS</Sticker>
          </div>
        </>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 28, textAlign: "center", fontFamily: MONO, fontSize: 21, color: C.ink, opacity: 0.8 }}>
        Sell the NFT and the buyer gets the bag · meme tokens are volatile and can fall to zero
      </div>
    </AbsoluteFill>
  );
};
