import React from "react";
import { Composition } from "remotion";
import { Trailer, type TrailerProps } from "./Trailer";
import { DURATION_S, FPS, H, W } from "./timeline";

export const Root: React.FC = () => (
  <>
    <Composition
      id="Trailer"
      component={Trailer}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={W}
      height={H}
      // End-card link (override with --props='{"url":"…"}').
      defaultProps={{ url: "nft.whatthehoot.lol" } satisfies TrailerProps}
    />
  </>
);
