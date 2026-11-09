import type { Metadata } from "next";
import { WthRoadmap } from "@/components/wth/WthRoadmap";

export const metadata: Metadata = { title: "WTH is this?!" };

export default function WthPage() {
  return <WthRoadmap />;
}
