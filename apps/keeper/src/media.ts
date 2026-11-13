/**
 * NFT media publisher: for every minted token without an image, compose the owl, pin the PNG to IPFS
 * (Pinata), and record it on-chain with core.set_token_media(token_id, "ipfs://<cid>", sha256).
 * The contract makes media immutable once set, so this is safe to re-run.
 */
import type { NearRpc } from "@wtn/chain";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type ArtLibrary, composeImage, mediaHashB64, specFromTraits } from "./compose";
import type { Caller } from "./cycle";

interface TokenJ {
  token_id: string;
  info: { season_id: number; traits: { slots: { meme_idx: number; variant: number }[] }; media_cid: string | null };
}
interface SeasonJ {
  id: number;
  config: { memes: { meme_id: string }[] };
}

export type Pinner = (png: Buffer, name: string) => Promise<string>;

/** Pin a PNG to IPFS through Pinata. Returns the CID. */
export const pinataPinner =
  (jwt: string, f: typeof fetch = fetch): Pinner =>
  async (png, name) => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), `${name}.png`);
    form.append("pinataMetadata", JSON.stringify({ name }));
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
    const r = await f("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: form, signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`Pinata → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { IpfsHash?: string };
    if (!j.IpfsHash) throw new Error("Pinata returned no CID");
    return j.IpfsHash;
  };

export interface MediaOptions {
  coreContract: string;
  send: boolean;
  limit?: number;
  pinner?: Pinner;
  previewDir: string;
  log?: (m: string) => void;
}

export async function runMediaCycle(art: ArtLibrary, rpc: NearRpc, caller: Caller, o: MediaOptions): Promise<{ done: string[]; pending: number }> {
  const log = o.log ?? console.log;
  const [tokens, seasons] = await Promise.all([rpc.view<TokenJ[]>(o.coreContract, "get_tokens", { from_index: 0, limit: 200 }), rpc.view<SeasonJ[]>(o.coreContract, "get_seasons")]);
  const todo = tokens.filter((t) => !t.info.media_cid);
  log(`${tokens.length} tokens · ${todo.length} without an image`);
  const done: string[] = [];
  for (const t of todo.slice(0, o.limit ?? 10)) {
    const season = seasons.find((s) => s.id === t.info.season_id);
    if (!season) {
      log(`  #${t.token_id}: season ${t.info.season_id} not found — skipped`);
      continue;
    }
    const spec = specFromTraits(t.info.traits.slots, season.config.memes.map((m) => m.meme_id));
    const png = await composeImage(art, spec);
    const hash = mediaHashB64(png);
    if (!o.send) {
      mkdirSync(o.previewDir, { recursive: true });
      const file = join(o.previewDir, `token-${t.token_id}.png`);
      writeFileSync(file, png);
      log(`  [dry-run] #${t.token_id} → ${file} (${(png.length / 1024).toFixed(0)} KB, sha256 ${hash})`);
      done.push(t.token_id);
      continue;
    }
    if (!o.pinner) throw new Error("--send needs PINATA_JWT");
    const cid = await o.pinner(png, `what-the-nft-${t.token_id}`);
    await caller.call("set_token_media", { token_id: t.token_id, media_uri: `ipfs://${cid}`, media_sha256_b64: hash }, 30, o.coreContract);
    log(`  #${t.token_id} → ipfs://${cid}`);
    done.push(t.token_id);
  }
  return { done, pending: todo.length - done.length };
}
