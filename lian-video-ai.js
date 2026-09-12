import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

function clean(value, max = 3000) { return String(value ?? "").trim().slice(0, max); }

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "\\%").replace(/\n/g, " ");
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    p.stderr.on("data", d => { stderr += d.toString(); if (stderr.length > 8000) stderr = stderr.slice(-8000); });
    p.on("error", reject);
    p.on("close", code => code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exited ${code}`)));
  });
}

export class LianVideoAI {
  constructor(outputDir) { this.outputDir = outputDir; }

  async generate({ prompt, seconds = 4, size = "1280x720" }) {
    const id = `lianvideo_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const safeSeconds = Math.min(12, Math.max(2, Number(seconds) || 4));
    const [width, height] = size.split("x").map(Number);
    if (![720, 1280, 1024, 1792].includes(width) || ![720, 1280, 1024, 1792].includes(height)) throw new Error("Tamaño no soportado.");

    await fs.mkdir(this.outputDir, { recursive: true });
    const output = path.join(this.outputDir, `${id}.mp4`);
    const title = escapeDrawtext(clean(prompt, 180));

    // Lian Video AI 1.5: generador de escenas propio, sin Sora.
    // Crea un MP4 real mediante una escena procedural animada. Es una base extensible
    // para añadir sprites, imágenes, audio, partículas y plantillas de Lian Parkur.
    const filter = [
      `drawbox=x=0:y=0:w=iw:h=ih:color=black@0.15:t=fill`,
      `drawbox=x='(w-260)*abs(sin(t*1.2))':y='(h-160)*abs(cos(t*0.9))':w=260:h=160:color=white@0.12:t=fill`,
      `drawtext=text='LIAN VIDEO AI':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=70:enable='between(t,0,${safeSeconds})'`,
      `drawtext=text='${title}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h-100:enable='between(t,0,${safeSeconds})'`
    ].join(",");

    await runFfmpeg([
      "-f", "lavfi", "-i", `nullsrc=s=${width}x${height}:r=30`,
      "-t", String(safeSeconds),
      "-vf", filter,
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", output
    ]);

    return { id, status: "completed", progress: 100, model: "lian-video-ai-1.5", seconds: safeSeconds, size, filePath: output };
  }
}
