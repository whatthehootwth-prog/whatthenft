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
      // Set the official link once it exists, e.g. --props='{"url":"whatthenft.xyz"}'. Until then the end card shows no link.
      defaultProps={{ url: null } satisfies TrailerProps}
    />
  </>
);
