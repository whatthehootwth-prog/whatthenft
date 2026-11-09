"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Renders children everywhere except the homepage (which is a single full-screen hero). */
export function HideOnHome({ children }: { children: ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}
