import type { Metadata } from "next";
import { HatchClient } from "./HatchClient";

export const metadata: Metadata = { title: "Hatch" };

export default function HatchPage() {
  return <HatchClient />;
}
