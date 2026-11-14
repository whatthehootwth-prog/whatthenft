import React from "react";
import { Composition } from "remotion";
import { Teaser, TEASER_S } from "./Teaser";
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
      // Set the official link once it exists, e.g. --props='{"url":"whatthenft.xyz"}'. Until then the end card says "coming soon".
      defaultProps={{ url: null } satisfies TrailerProps}
    />
    {/* 9:16 teaser cut from the mastered trailer (run `npm run teaser` after `npm run render`) */}
    <Composition id="Teaser" component={Teaser} durationInFrames={Math.round(TEASER_S * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
