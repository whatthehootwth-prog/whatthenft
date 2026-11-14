"""
Hype voice-over with Chatterbox (Resemble AI, MIT licence), run locally. No account, no key.

  .tts/venv/Scripts/python.exe scripts/tts_chatterbox.py            # all lines
  .tts/venv/Scripts/python.exe scripts/tts_chatterbox.py s1a s5f    # only these
  .tts/venv/Scripts/python.exe scripts/tts_chatterbox.py --test     # 3 test lines x settings -> public/audio/vo-compare-cb/

Voice: the speaker is cloned from our own Kokoro am_puck lines (public/audio/vo-ref.wav, Apache-2.0 source),
then Chatterbox's `exaggeration` pushes the delivery into an intense, excited read.
Since nobody listens during the build, every line gets several takes; each take is transcribed with a local
Whisper model and the most energetic take whose words match the script is kept.
Writes public/audio/vo-raw/<id>.wav + src/vo-raw.json (then run `npm run vo`).
"""
import json, os, re, sys
import numpy as np
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
from faster_whisper import WhisperModel

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPT = json.load(open(os.path.join(ROOT, "src/script.json"), encoding="utf-8"))
# CB_VOICE=ref: clone our Kokoro am_puck clip · CB_VOICE=default: Chatterbox's built-in male voice
VOICE = os.environ.get("CB_VOICE", "ref")
REF = os.path.join(ROOT, "public/audio/vo-ref.wav") if VOICE == "ref" else None
EXAG = float(os.environ.get("CB_EXAG", 0.85))
CFG = float(os.environ.get("CB_CFG", 0.35))
TEMP = float(os.environ.get("CB_TEMP", 0.85))
TAKES = int(os.environ.get("CB_TAKES", 4))

torch.set_num_threads(max(4, (os.cpu_count() or 8) - 2))
dev = "cuda" if torch.cuda.is_available() else "cpu"
model = ChatterboxTTS.from_pretrained(device=dev)
asr = WhisperModel("base.en", device="cpu", compute_type="int8", download_root=os.path.join(ROOT, ".tts/whisper"))


def say(text: str) -> str:
    """Spoken form for Chatterbox: Kokoro spellings → natural text; ALL-CAPS words are read as letters, so de-cap them."""
    t = text.replace("N F T", "N.F.T.").replace("J PEG", "J-peg")
    return re.sub(r"\b([A-Z]{3,})\b", lambda m: m.group(1).capitalize(), t)


def norm(s: str) -> list[str]:
    s = s.lower().replace("n.f.t.", "nft").replace("n f t", "nft").replace("j-peg", "jpeg").replace("j peg", "jpeg")
    s = s.replace("85", "eighty five").replace("111", "one hundred and eleven").replace("%", " percent")
    for d, w in (("30", "thirty"), ("10", "ten"), ("5", "five"), ("1", "one")):
        s = re.sub(rf"\b{d}\b", w, s)
    s = s.replace("basement", "base mint").replace("mint revenue", "mint revenue")
    s = re.sub(r"[^a-z' ]+", " ", s.replace("-", " "))
    return [w for w in s.split() if w not in {"uh", "um"}]


def word_match(a: str, b: str) -> float:
    x, y = norm(a), norm(b)
    if not x:
        return 0.0
    # LCS ratio
    dp = [[0] * (len(y) + 1) for _ in range(len(x) + 1)]
    for i in range(len(x)):
        for j in range(len(y)):
            dp[i + 1][j + 1] = dp[i][j] + 1 if x[i] == y[j] else max(dp[i][j + 1], dp[i + 1][j])
    return dp[-1][-1] / max(len(x), len(y))


def energy(wav: np.ndarray, sr: int) -> float:
    """Expressiveness score: pitch spread (semitones) × loudness variation, on voiced frames."""
    win, hop = int(sr * 0.04), int(sr * 0.01)
    f0, rms = [], []
    for s in range(0, len(wav) - win, hop):
        fr = wav[s : s + win]
        r = float(np.sqrt(np.mean(fr * fr)))
        rms.append(r)
        if r < 0.02:
            continue
        ac = np.correlate(fr, fr, "full")[win - 1 :]
        lo, hi = int(sr / 400), int(sr / 60)
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] / (ac[0] + 1e-9) > 0.5:
            f0.append(sr / lag)
    if len(f0) < 5:
        return 0.0
    f0 = np.sort(f0)
    spread = 12 * np.log2(f0[int(len(f0) * 0.9)] / f0[int(len(f0) * 0.1)])
    v = np.array([r for r in rms if r > 0.02])
    return float(spread * (v.std() / (v.mean() + 1e-9)))


def best_take(pid: str, text: str, seed0: int, exag=EXAG, cfg=CFG):
    takes = []
    n = TAKES + (3 if len(norm(text)) <= 2 else 0)  # one-word shouts need more tries
    for k in range(n):
        torch.manual_seed(seed0 + k)
        wav = model.generate(say(text), audio_prompt_path=REF, exaggeration=exag, cfg_weight=cfg, temperature=TEMP)
        x = wav.squeeze(0).cpu().numpy()
        tmp = os.path.join(ROOT, ".tts", f"_take.wav")
        ta.save(tmp, wav, model.sr)
        segs, _ = asr.transcribe(tmp, beam_size=1, language="en")
        heard = " ".join(s.text for s in segs).strip()
        m = word_match(text, heard)
        e = energy(x, model.sr)
        takes.append((m, e, x, heard))
        print(f"  {pid} take {k}: match {m:.2f}  energy {e:.2f}  heard: {heard!r}", flush=True)
    good = [t for t in takes if t[0] >= 0.8] or sorted(takes, key=lambda t: -t[0])[:1]
    return max(good, key=lambda t: t[1])


if "--test" in sys.argv:
    out = os.path.join(ROOT, "public/audio/vo-compare-cb")
    os.makedirs(out, exist_ok=True)
    lines = [p for p in SCRIPT if p["id"] in ("s1b", "s3a", "s5f")]
    for exag, cfg in [(0.6, 0.45), (0.85, 0.35), (1.1, 0.3)]:
        for p in lines:
            m, e, x, heard = best_take(p["id"], p["text"], 7, exag, cfg)
            ta.save(os.path.join(out, f"exag{exag}-cfg{cfg}-{p['id']}.wav"), torch.from_numpy(x).unsqueeze(0), model.sr)
            print(f"exag {exag} cfg {cfg} {p['id']}: match {m:.2f} energy {e:.2f}")
    sys.exit(0)

def split_on_pauses(x: np.ndarray, sr: int, parts: int):
    """Cut a take at its (parts-1) longest pauses. Returns None if the pauses aren't clear."""
    hop = int(sr * 0.01)
    env = np.array([np.sqrt(np.mean(x[i : i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    thr = max(0.01, env.max() * 0.06)
    quiet = env < thr
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if i > 0 and j < len(quiet) and j - i >= 8:  # interior pause >= 80 ms
                runs.append((j - i, i, j))
            i = j
        else:
            i += 1
    if len(runs) < parts - 1:
        return None
    cuts = sorted(runs, reverse=True)[: parts - 1]
    cuts = sorted(((a + b) // 2) * hop for _, a, b in cuts)
    edges = [0, *cuts, len(x)]
    return [x[edges[k] : edges[k + 1]] for k in range(parts)]


if "--rarity" in sys.argv:
    ids = ["s5a", "s5b", "s5c", "s5d", "s5e", "s5f"]
    chant = "Common! ... Rare! ... Epic! ... Legendary! ... And... ... Mythic!"
    expect = "common rare epic legendary and mythic"
    meta_path = os.path.join(ROOT, f".tts/vo-raw-cb-{VOICE}.json")
    meta = {m["id"]: m for m in json.load(open(meta_path, encoding="utf-8"))}
    best = None
    for k in range(int(os.environ.get("CB_TAKES", 6)) + 4):
        torch.manual_seed(500 + k)
        wav = model.generate(chant, audio_prompt_path=REF, exaggeration=EXAG, cfg_weight=CFG, temperature=TEMP)
        x = wav.squeeze(0).cpu().numpy()
        tmp = os.path.join(ROOT, ".tts", "_take.wav")
        ta.save(tmp, wav, model.sr)
        heard = " ".join(seg.text for seg in asr.transcribe(tmp, beam_size=1, language="en")[0]).strip()
        m = word_match(expect, heard)
        parts = split_on_pauses(x, model.sr, 6)
        e = energy(x, model.sr)
        print(f"  chant take {k}: match {m:.2f} energy {e:.2f} split {'ok' if parts else 'no'} heard: {heard!r}", flush=True)
        if parts and m >= 0.83 and (best is None or (m, e) > (best[0], best[1])):
            best = (m, e, parts, heard)
    if not best:
        sys.exit("no clean chant take; rerun with more CB_TAKES")
    OUT = os.path.join(ROOT, f"public/audio/vo-raw-cb-{VOICE}")
    for pid, part in zip(ids, best[2]):
        ta.save(os.path.join(OUT, f"{pid}.wav"), torch.from_numpy(part).unsqueeze(0), model.sr)
        meta[pid] = {**meta[pid], "seconds": round(len(part) / model.sr, 3), "heard": f"(chant) {best[3]}", "match": round(best[0], 2)}
        print(f"{pid}: {len(part) / model.sr:.2f}s")
    json.dump([meta[p["id"]] for p in SCRIPT if p["id"] in meta], open(meta_path, "w", encoding="utf-8"), indent=2)
    sys.exit(0)

only = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = os.path.join(ROOT, f"public/audio/vo-raw-cb-{VOICE}")
os.makedirs(OUT, exist_ok=True)
meta_path = os.path.join(ROOT, f".tts/vo-raw-cb-{VOICE}.json")
meta = {m["id"]: m for m in json.load(open(meta_path, encoding="utf-8"))} if os.path.exists(meta_path) else {}
for i, p in enumerate(SCRIPT):
    if only and p["id"] not in only:
        continue
    m, e, x, heard = best_take(p["id"], p["text"], 100 + i * 10)
    ta.save(os.path.join(OUT, f"{p['id']}.wav"), torch.from_numpy(x).unsqueeze(0), model.sr)
    meta[p["id"]] = {**p, "voice": f"chatterbox({VOICE}, exag={EXAG}, cfg={CFG})", "seconds": round(len(x) / model.sr, 3), "heard": heard, "match": round(m, 2)}
    print(f"{p['id']}: {len(x) / model.sr:.2f}s match {m:.2f} energy {e:.2f}", flush=True)
json.dump([meta[p["id"]] for p in SCRIPT if p["id"] in meta], open(meta_path, "w", encoding="utf-8"), indent=2)
print("->", meta_path, "· pick a voice with: node scripts/use-vo.mjs", VOICE)
