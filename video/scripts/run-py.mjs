/** Runs a Python script with the local venv in video/.tts (CB_VOICE defaults to the built-in voice). */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const py = join(ROOT, ".tts/venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const r = spawnSync(py, process.argv.slice(2), { cwd: ROOT, stdio: "inherit", env: { CB_VOICE: "default", HF_HOME: join(ROOT, ".tts/hf"), ...process.env } });
process.exit(r.status ?? 1);
