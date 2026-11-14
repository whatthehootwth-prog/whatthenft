/**
 * One-time local setup for the Chatterbox voice. Everything lands in video/.tts (gitignored; delete it to uninstall):
 * uv (Astral, GitHub releases) → Python 3.11 → chatterbox-tts, faster-whisper, setuptools<81 (the Perth watermark needs pkg_resources).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = join(ROOT, ".tts");
const win = process.platform === "win32";
const uv = join(T, "bin", win ? "uv.exe" : "uv");
mkdirSync(join(T, "bin"), { recursive: true });
if (!existsSync(uv)) {
  const asset = win ? "uv-x86_64-pc-windows-msvc.zip" : process.platform === "darwin" ? "uv-aarch64-apple-darwin.tar.gz" : "uv-x86_64-unknown-linux-gnu.tar.gz";
  const archive = join(T, asset);
  execFileSync("curl", ["-sSL", "-o", archive, `https://github.com/astral-sh/uv/releases/latest/download/${asset}`], { stdio: "inherit" });
  execFileSync("tar", win ? ["-xf", archive, "-C", join(T, "bin")] : ["-xzf", archive, "-C", join(T, "bin"), "--strip-components=1"], { stdio: "inherit" });
}
const env = { ...process.env, UV_CACHE_DIR: join(T, "uv-cache"), UV_PYTHON_INSTALL_DIR: join(T, "python") };
execFileSync(uv, ["venv", join(T, "venv"), "--python", "3.11", "-q"], { stdio: "inherit", env });
const py = join(T, "venv", win ? "Scripts/python.exe" : "bin/python");
execFileSync(uv, ["pip", "install", "--python", py, "chatterbox-tts==0.1.7", "faster-whisper", "setuptools<81"], { stdio: "inherit", env });
console.log("Chatterbox ready in", T);
