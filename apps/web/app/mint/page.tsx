import type { Metadata } from "next";
import { MintClient } from "./MintClient";

export const metadata: Metadata = { title: "Mint" };

export default function MintPage() {
  return <MintClient />;
}
