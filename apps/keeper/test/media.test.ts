import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NearRpc } from "@wtn/chain";
import { composeImage, loadArt, mediaHashB64, specFromTraits, stackFiles, type Spec } from "../src/compose";
import type { Caller } from "../src/cycle";
import { runMediaCycle } from "../src/media";

const art = loadArt();
const W = { memeId: "wth", variant: 0 };
const spec = (s: Partial<Spec>): Spec => ({ head: W, face: W, body: W, arms: W, legs: W, accessory: W, ...s });
const names = (s: Spec) => stackFiles(art, s).map((l) => `${l.file.split(/[\\/]/).slice(-4, -3)[0]}/${l.slot}/${basename(l.file)}`);

describe("compositor layer order (same rule as the website)", () => {
  it("bare owl = just the WTH body", () => {
    expect(names(spec({}))).toEqual(["wth/body/01-classic-wth.png"]);
  });

  it("behind parts first, then body, then skin markings, then legs → outfit → arms → head → face", () => {
    const s = spec({
      head: { memeId: "batman", variant: 0 },
      face: { memeId: "cybernetic", variant: 0 },
      body: { memeId: "mallace", variant: 0 },
      arms: { memeId: "robinhoot", variant: 0 },
      legs: { memeId: "batman", variant: 0 },
      accessory: { memeId: "nearkat", variant: 0 },
    });
    expect(names(s)).toEqual([
      "robinhoot/arms/01-quiver.png", // behind
      "mallace/body/01-gradient-fur.png",
      "nearkat/accessory/01-near-emblem.png", // skin
      "cybernetic/face/01-cyber-eye.png", // skin
      "batman/legs/01-utility-belt.png",
      "batman/head/01-cowl.png",
    ]);
  });

  it("a partner without art for a slot falls back to the bare owl there", () => {
    expect(names(spec({ head: { memeId: "raen", variant: 0 } }))).toEqual(["wth/body/01-classic-wth.png"]);
  });
});

describe("traits → spec", () => {
  it("maps season meme indexes in contract slot order", () => {
    const s = specFromTraits(
      [{ meme_idx: 1, variant: 0 }, { meme_idx: 0, variant: 0 }, { meme_idx: 2, variant: 0 }, { meme_idx: 0, variant: 0 }, { meme_idx: 0, variant: 0 }, { meme_idx: 1, variant: 0 }],
      ["wth", "batman", "mallace"],
    );
    expect(s.head.memeId).toBe("batman");
    expect(s.body.memeId).toBe("mallace");
    expect(s.accessory.memeId).toBe("batman");
    expect(s.face.memeId).toBe("wth");
  });
});

describe("image output", () => {
  it("is deterministic (same token → same bytes → same IPFS CID)", async () => {
    const s = spec({ body: { memeId: "batman", variant: 0 }, head: { memeId: "batman", variant: 0 } });
    const a = await composeImage(art, s, 256);
    const b = await composeImage(art, s, 256);
    expect(mediaHashB64(a)).toBe(mediaHashB64(b));
    expect(a.subarray(1, 4).toString()).toBe("PNG");
  }, 30_000);
});

describe("media cycle", () => {
  const tokens = [
    { token_id: "1", info: { season_id: 1, media_cid: "ipfs://already", traits: { slots: Array(6).fill({ meme_idx: 0, variant: 0 }) } } },
    { token_id: "2", info: { season_id: 1, media_cid: null, traits: { slots: Array(6).fill({ meme_idx: 1, variant: 0 }) } } },
  ];
  const rpc = {
    async view(_c: string, m: string) {
      if (m === "get_tokens") return tokens;
      if (m === "get_seasons") return [{ id: 1, config: { memes: [{ meme_id: "wth" }, { meme_id: "batman" }] } }];
      throw new Error(m);
    },
  } as unknown as NearRpc;

  it("pins only tokens without media and records ipfs:// + sha256 on the core contract", async () => {
    const calls: unknown[][] = [];
    const caller: Caller = { async call(...a) { calls.push(a); } };
    const r = await runMediaCycle(art, rpc, caller, { coreContract: "core.near", send: true, pinner: async () => "bafyTESTCID", previewDir: join(tmpdir(), "wtn-media-test"), log: () => {} });
    expect(r.done).toEqual(["2"]);
    expect(calls).toHaveLength(1);
    const [method, args, , target] = calls[0] as [string, { token_id: string; media_uri: string; media_sha256_b64: string }, number, string];
    expect(method).toBe("set_token_media");
    expect(target).toBe("core.near");
    expect(args.media_uri).toBe("ipfs://bafyTESTCID");
    expect(Buffer.from(args.media_sha256_b64, "base64")).toHaveLength(32);
  }, 30_000);

  it("dry run writes previews and never sends", async () => {
    const never: Caller = { async call() { throw new Error("sent!"); } };
    const r = await runMediaCycle(art, rpc, never, { coreContract: "core.near", send: false, previewDir: join(tmpdir(), "wtn-media-test"), log: () => {} });
    expect(r.done).toEqual(["2"]);
  }, 30_000);
});
