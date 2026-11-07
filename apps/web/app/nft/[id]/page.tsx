import type { Metadata } from "next";
import { NftDetail } from "./NftDetail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Card #${id}` };
}

export default async function NftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NftDetail id={id} />;
}
