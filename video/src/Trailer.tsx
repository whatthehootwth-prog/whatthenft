import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { C } from "./brand";
import { Tag, useT, Wipe } from "./kit";
import { S1Hook } from "./scenes/S1Hook";
import { S2Reveal } from "./scenes/S2Reveal";
import { S3Core } from "./scenes/S3Core";
import { S4Bag } from "./scenes/S4Bag";
import { S5Rarity } from "./scenes/S5Rarity";
import { S6Market } from "./scenes/S6Market";
import { S7Econ } from "./scenes/S7Econ";
import { S8Next } from "./scenes/S8Next";
import { S9Finale } from "./scenes/S9Finale";
import { f, MUSIC, musicGain, SCENES, SFX, VO } from "./timeline";

export type TrailerProps = { url: string | null };

const WIPES: [number, [string, string]][] = [
  [SCENES.reveal[0], [C.ink, C.orange]],
  [SCENES.core[0], [C.pink, C.ink]],
  [SCENES.bag[0], [C.violet, C.yellow]],
  [SCENES.rarity[0], [C.ink, C.hot]],
  [SCENES.market[0], [C.yellow, C.ink]],
  [SCENES.econ[0], [C.aqua, C.ink]],
  [SCENES.next[0], [C.ink, C.yellow]],
  [SCENES.finale[0], [C.hot, C.ink]],
];

export const Trailer: React.FC<TrailerProps> = ({ url }) => {
  const t = useT();
  const inS = (k: keyof typeof SCENES) => t >= SCENES[k][0] && t < SCENES[k][1];
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {inS("hook") && <S1Hook />}
      {inS("reveal") && <S2Reveal />}
      {inS("core") && <S3Core />}
      {inS("bag") && <S4Bag />}
      {inS("rarity") && <S5Rarity />}
      {inS("market") && <S6Market />}
      {inS("econ") && <S7Econ />}
      {inS("next") && <S8Next />}
      {inS("finale") && <S9Finale url={url} />}
      {WIPES.map(([s, c]) => (
        <Wipe key={s} at={s} colors={c} />
      ))}
      {/* standing disclosure */}
      {t > 6.3 && t < SCENES.finale[0] ? (
        <div style={{ position: "absolute", right: 26, top: 22, opacity: 0.92 }}>
          <Tag size={16} bg={C.ink} color={C.yellow}>Pre-launch preview · not yet on mainnet</Tag>
        </div>
      ) : null}

      {/* audio */}
      <Sequence from={f(MUSIC.at)} name="music">
        <Audio src={staticFile(MUSIC.file)} trimBefore={f(MUSIC.trim)} volume={(fr) => musicGain(MUSIC.at + fr / 30)} />
      </Sequence>
      {VO.map((v) => (
        <Sequence key={v.id} from={f(v.at)} durationInFrames={Math.ceil(v.seconds * 30) + 3} name={`vo ${v.id}`}>
          <Audio src={staticFile(`audio/vo/${v.id}.wav`)} volume={1} />
        </Sequence>
      ))}
      {SFX.map(([s, id, vol], i) => (
        <Sequence key={`${id}${i}`} from={f(s)} name={`sfx ${id}`}>
          <Audio src={staticFile(`audio/sfx/${id}.mp3`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
