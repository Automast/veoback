/**
 * Sora 2 Video Generator — Unified Server + Frontend
 * Defapi (api.defapi.org) backend  |  Single-file Express app
 * Deploy directly to Railway — no modifications needed.
 *
 * ENV VARS  (set in Railway dashboard or a local .env file):
 *   DEFAPI_KEY  — your Defapi Bearer token  (REQUIRED — server will not start without it)
 *   PORT        — auto-set by Railway        (defaults to 3000)
 */

// ── Load .env for local development (ignored in production) ──────────────
require("dotenv").config();

const express = require("express");
const multer  = require("multer");
const fetch   = (...a) => import("node-fetch").then(({ default: f }) => f(...a));

// ── Fail fast if the API key is missing ──────────────────────────────────
const DEFAPI_KEY = process.env.DEFAPI_KEY;
if (!DEFAPI_KEY) {
  console.error(
    "\n❌  DEFAPI_KEY environment variable is not set.\n" +
    "    • Local: create a .env file with  DEFAPI_KEY=dk-xxxxxxxx\n" +
    "    • Railway: add it in the project Variables tab.\n"
  );
  process.exit(1);
}

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const PORT   = process.env.PORT || 3000;

app.use(express.json());

/* ─── Inline HTML frontend ──────────────────────────────────────────────── */
const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SORA·2 — AI Video Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet"/>
<style>
  /* ── Reset & Variables ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #090909;
    --surface:  #111111;
    --panel:    #161616;
    --border:   #252525;
    --amber:    #f5a623;
    --amber2:   #ffcc66;
    --muted:    #555;
    --text:     #e8e0d4;
    --sub:      #888;
    --red:      #e05252;
    --green:    #52e07a;
    --radius:   6px;
    --mono: "IBM Plex Mono", monospace;
    --display: "Bebas Neue", sans-serif;
    --body: "DM Sans", sans-serif;
  }

  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--body);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── Grain overlay ── */
  body::before {
    content: "";
    position: fixed; inset: 0; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    opacity: .025;
    pointer-events: none;
  }

  /* ── Layout ── */
  .page { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 48px 24px 80px; }

  /* ── Header ── */
  header { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 52px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .logo-mark {
    font-family: var(--display);
    font-size: 52px;
    line-height: 1;
    letter-spacing: 2px;
    background: linear-gradient(135deg, var(--amber) 0%, var(--amber2) 60%, #fff5cc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 18px rgba(245,166,35,.35));
  }
  .logo-sub { font-family: var(--mono); font-size: 11px; color: var(--sub); letter-spacing: .12em; text-transform: uppercase; padding-bottom: 6px; }
  .tag { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .1em; padding: 4px 8px; border: 1px solid var(--border); border-radius: 3px; white-space: nowrap; }

  /* ── Form card ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--amber), transparent);
    opacity: .5;
  }

  /* ── Labels ── */
  label { display: block; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--sub); margin-bottom: 8px; }
  .field { margin-bottom: 24px; }
  .field:last-child { margin-bottom: 0; }

  /* ── Inputs ── */
  textarea, select, input[type=text], input[type=password] {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--body);
    font-size: 15px;
    padding: 12px 14px;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    appearance: none;
  }
  textarea:focus, select:focus, input:focus {
    border-color: var(--amber);
    box-shadow: 0 0 0 3px rgba(245,166,35,.12);
  }
  textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
  select option { background: var(--panel); }

  /* ── Grid row ── */
  .row { display: grid; gap: 16px; }
  .row-2 { grid-template-columns: 1fr 1fr; }
  .row-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width: 560px) { .row-2, .row-3 { grid-template-columns: 1fr; } }

  /* ── File drop zone ── */
  .dropzone {
    background: var(--panel);
    border: 1.5px dashed var(--border);
    border-radius: var(--radius);
    padding: 28px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color .2s, background .2s;
    position: relative;
  }
  .dropzone:hover, .dropzone.drag { border-color: var(--amber); background: rgba(245,166,35,.04); }
  .dropzone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .dropzone .dz-icon { font-size: 28px; margin-bottom: 8px; }
  .dropzone .dz-label { font-family: var(--mono); font-size: 12px; color: var(--sub); }
  .dropzone .dz-preview { margin-top: 12px; }
  .dropzone .dz-preview img { max-height: 100px; border-radius: 4px; object-fit: cover; opacity: .85; }

  /* ── Hint text ── */
  .hint { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 6px; line-height: 1.6; }
  .hint a { color: var(--amber); text-decoration: none; }
  .hint a:hover { text-decoration: underline; }

  /* ── Generate button ── */
  .btn-generate {
    width: 100%;
    background: var(--amber);
    color: #0a0700;
    font-family: var(--display);
    font-size: 22px;
    letter-spacing: 2px;
    padding: 16px;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: filter .2s, transform .1s;
  }
  .btn-generate:hover { filter: brightness(1.12); }
  .btn-generate:active { transform: scale(.99); }
  .btn-generate:disabled { opacity: .45; cursor: not-allowed; filter: none; }
  .btn-generate .shimmer {
    position: absolute; inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%);
    transform: translateX(-100%);
    transition: transform .6s;
  }
  .btn-generate:not(:disabled):hover .shimmer { transform: translateX(100%); }

  /* ── Status panel ── */
  #status-panel { display: none; margin-top: 20px; }
  .status-bar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
  }
  .status-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .status-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--amber);
    box-shadow: 0 0 8px var(--amber);
    flex-shrink: 0;
  }
  .status-dot.success { background: var(--green); box-shadow: 0 0 8px var(--green); }
  .status-dot.error   { background: var(--red);   box-shadow: 0 0 8px var(--red); animation: none; }
  .status-dot.pending { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.7); } }
  .status-label { font-family: var(--mono); font-size: 13px; letter-spacing: .08em; }
  .status-task  { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px; word-break: break-all; }

  /* ── Progress bar ── */
  .progress-wrap { background: var(--panel); border-radius: 3px; height: 4px; overflow: hidden; }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--amber), var(--amber2));
    border-radius: 3px;
    width: 0%;
    transition: width .5s ease;
  }
  .indeterminate { animation: indeterminate 1.4s linear infinite; width: 40% !important; }
  @keyframes indeterminate {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }

  /* ── Video result ── */
  #result-panel { display: none; margin-top: 20px; }
  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .result-card video {
    width: 100%; display: block;
    background: #000;
  }
  .result-footer {
    padding: 16px 20px;
    display: flex; align-items: center; gap: 12px;
    border-top: 1px solid var(--border);
  }
  .result-info { flex: 1; }
  .result-title { font-family: var(--mono); font-size: 11px; color: var(--sub); text-transform: uppercase; letter-spacing: .1em; }
  .result-label { font-size: 13px; color: var(--text); margin-top: 2px; word-break: break-all; }
  .btn-dl {
    background: transparent; border: 1px solid var(--amber); color: var(--amber);
    font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
    padding: 9px 16px; border-radius: var(--radius); cursor: pointer; white-space: nowrap;
    text-decoration: none; display: inline-block;
    transition: background .2s, color .2s;
  }
  .btn-dl:hover { background: var(--amber); color: #0a0700; }

  /* ── Prompt tips ── */
  .tips-header {
    display: flex; align-items: center; gap: 10px; cursor: pointer;
    font-family: var(--mono); font-size: 11px; color: var(--sub); letter-spacing: .1em; text-transform: uppercase;
    padding: 16px 0; border-top: 1px solid var(--border); user-select: none;
  }
  .tips-header .chevron { transition: transform .25s; }
  .tips-header.open .chevron { transform: rotate(180deg); }
  .tips-body { display: none; padding-bottom: 20px; }
  .tips-body.open { display: block; }
  .tip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  @media (max-width: 560px) { .tip-grid { grid-template-columns: 1fr; } }
  .tip-chip {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 12px; font-family: var(--mono); font-size: 10px; color: var(--sub);
    cursor: pointer; transition: border-color .2s, color .2s; line-height: 1.5;
  }
  .tip-chip:hover { border-color: var(--amber); color: var(--text); }

  /* ── Error toast ── */
  #toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(80px);
    background: #1e0e0e; border: 1px solid var(--red); color: var(--red);
    font-family: var(--mono); font-size: 12px; padding: 12px 20px; border-radius: var(--radius);
    z-index: 999; transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s;
    opacity: 0; white-space: nowrap; max-width: 90vw;
  }
  #toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

  /* ── Divider ── */
  .section-title {
    font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .18em;
    text-transform: uppercase; margin-bottom: 20px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  /* ── Footer ── */
  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .08em; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <header>
    <div>
      <div class="logo-mark">SORA·2</div>
      <div class="logo-sub">AI Video Studio</div>
    </div>
    <div class="tag">powered by Defapi</div>
  </header>

  <!-- Generation form -->
  <div class="card">
    <div class="section-title">Video Generation</div>

    <!-- Prompt -->
    <div class="field">
      <label>Prompt <span style="color:var(--amber)">*</span></label>
      <textarea id="prompt" placeholder="A cinematic drone shot over a misty forest at dawn, warm golden light breaking through the canopy, orchestral score swelling…"></textarea>
      <p class="hint">Tip: Start with <strong style="color:var(--amber2)">(15s,hd)</strong> to generate a 15-second HD video.</p>
    </div>

    <!-- Controls row -->
    <div class="row row-3 field">
      <div>
        <label>Duration</label>
        <select id="duration">
          <option value="10">10 seconds  — $0.175</option>
          <option value="15">15 seconds  — $0.200</option>
        </select>
      </div>
      <div>
        <label>Aspect Ratio</label>
        <select id="aspect">
          <option value="16:9">16:9 — Landscape</option>
          <option value="9:16">9:16 — Portrait / TikTok</option>
          <option value="1:1">1:1 — Square</option>
        </select>
      </div>
      <div>
        <label>Quality</label>
        <select id="quality">
          <option value="">Standard</option>
          <option value="hd">HD</option>
        </select>
      </div>
    </div>

    <!-- Reference image -->
    <div class="field">
      <label>Reference Image <span style="color:var(--muted)">(optional — image-to-video)</span></label>
      <div class="dropzone" id="dropzone">
        <input type="file" id="ref-image" accept=".jpg,.jpeg,.png,.webp" onchange="previewImage(this)"/>
        <div class="dz-icon">🎞</div>
        <div class="dz-label">Drop an image here or click to browse<br/>.jpg · .png · .webp — max 20 MB</div>
        <div class="dz-preview" id="dz-preview"></div>
      </div>
      <p class="hint">⚠ Avoid images with real human faces — they will be rejected by content moderation.</p>
    </div>

    <!-- Negative prompt -->
    <div class="field">
      <label>Negative Prompt <span style="color:var(--muted)">(optional)</span></label>
      <input type="text" id="neg-prompt" placeholder="blurry, low quality, watermark, text overlay…"/>
    </div>

    <!-- Generate button -->
    <button class="btn-generate" id="btn-gen" onclick="generate()">
      <span class="shimmer"></span>
      GENERATE VIDEO
    </button>
  </div>

  <!-- Status panel -->
  <div id="status-panel">
    <div class="status-bar">
      <div class="status-header">
        <div class="status-dot pending" id="status-dot"></div>
        <div>
          <div class="status-label" id="status-label">Submitting request…</div>
          <div class="status-task" id="status-task"></div>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-fill indeterminate" id="progress-fill"></div>
      </div>
    </div>
  </div>

  <!-- Result panel -->
  <div id="result-panel">
    <div class="result-card">
      <video id="result-video" controls playsinline autoplay loop></video>
      <div class="result-footer">
        <div class="result-info">
          <div class="result-title">Generated Video</div>
          <div class="result-label" id="result-url-label">—</div>
        </div>
        <a class="btn-dl" id="btn-download" href="#" target="_blank" download>↓ Download</a>
      </div>
    </div>
  </div>

  <!-- Prompt tips -->
  <div style="margin-top:8px;">
    <div class="tips-header" id="tips-toggle" onclick="toggleTips()">
      <span>Prompt tips &amp; examples</span>
      <span class="chevron">▾</span>
    </div>
    <div class="tips-body" id="tips-body">
      <p style="font-size:13px;color:var(--sub);margin-bottom:4px;">Click a chip to load the prompt.</p>
      <div class="tip-grid">
        <div class="tip-chip" onclick="loadPrompt(this)">A pack of dogs driving tiny cars in a high-speed city chase, wearing sunglasses, dramatic action music, slow-motion jumps over fire hydrants.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">(15s,hd) Animated fantasy landscape with floating islands, waterfalls cascading into clouds, magical creatures flying, golden sunset, epic orchestral music.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">A lone astronaut walking on the surface of Mars at dusk, long shadows, red dust swirling, cinematic wide angle lens, ambient electronic score.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">(15s,hd) Product showcase — sleek smart watch rotating 360° on a stone surface, dramatic key light, particle effects, minimal electronic background music.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">Timelapse of a seed sprouting into a full plant, macro lens, soft studio lighting, gentle ambient sound, slow zoom out.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">An abstract painting dissolving into colourful liquid, slow swirling motion, vibrant hues of purple gold and cyan, no narration, just ambient music.</div>
      </div>
    </div>
  </div>

  <footer>SORA·2 STUDIO — Defapi API wrapper — open source</footer>
</div>

<!-- Toast -->
<div id="toast"></div>

<script>
/* ── State ── */
let pollTimer = null;
let currentTaskId = null;

/* ── Prompt tips toggle ── */
function toggleTips() {
  const hdr  = document.getElementById("tips-toggle");
  const body = document.getElementById("tips-body");
  hdr.classList.toggle("open");
  body.classList.toggle("open");
}

/* ── Load example prompt ── */
function loadPrompt(el) {
  document.getElementById("prompt").value = el.textContent.trim();
  document.getElementById("prompt").focus();
}

/* ── Image preview ── */
function previewImage(input) {
  const preview = document.getElementById("dz-preview");
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = '<img src="' + e.target.result + '" alt="preview"/>';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/* ── Drag-and-drop styling ── */
const dropzone = document.getElementById("dropzone");
dropzone.addEventListener("dragover",  e => { e.preventDefault(); dropzone.classList.add("drag"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  const file = e.dataTransfer.files[0];
  if (file) {
    document.getElementById("ref-image").files = e.dataTransfer.files;
    previewImage(document.getElementById("ref-image"));
  }
});

/* ── Toast ── */
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4200);
}

/* ── Build prompt string with modifiers ── */
function buildPrompt() {
  const raw      = document.getElementById("prompt").value.trim();
  const duration = document.getElementById("duration").value;
  const quality  = document.getElementById("quality").value;
  const negPrompt = document.getElementById("neg-prompt").value.trim();

  // Only prepend (15s,hd) if NOT already in prompt
  let prefix = "";
  if (duration === "15" && quality === "hd" && !raw.startsWith("(15s,hd)")) prefix = "(15s,hd) ";
  else if (duration === "15" && !raw.startsWith("(15s,") && !raw.startsWith("(15s,hd)")) prefix = "(15s) ";
  else if (quality === "hd" && !raw.startsWith("(hd)") && !raw.startsWith("(15s,hd)")) prefix = "(hd) ";

  let full = prefix + raw;
  if (negPrompt) full += " [avoid: " + negPrompt + "]";
  return full;
}

/* ── Generate ── */
async function generate() {
  const prompt = buildPrompt();

  if (!prompt) { toast("⚠  Please enter a prompt."); return; }

  // Read optional reference image
  const imgInput = document.getElementById("ref-image");
  let imageBase64 = null;
  if (imgInput.files && imgInput.files[0]) {
    imageBase64 = await fileToBase64(imgInput.files[0]);
  }

  // UI — loading state
  const btn = document.getElementById("btn-gen");
  btn.disabled = true;
  btn.querySelector("span:last-child") && null;
  btn.childNodes[1].textContent = "SUBMITTING…";

  hideResult();
  showStatus("Submitting request to Defapi…", "pending");

  // Build request body
  const body = { prompt };
  if (imageBase64) body.images = [imageBase64];

  try {
    const res  = await fetch("/api/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ body })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showStatus("Submission failed: " + (data.error || data.message || res.status), "error");
      toast("✕ " + (data.error || "Submission failed. Check your API key."));
      btn.disabled = false;
      btn.childNodes[1].textContent = "GENERATE VIDEO";
      return;
    }

    currentTaskId = data.task_id;
    showStatus("Request queued — polling for status…", "pending", currentTaskId);
    startPolling(currentTaskId);

  } catch (err) {
    showStatus("Network error: " + err.message, "error");
    toast("✕ Network error — is the server running?");
    btn.disabled = false;
    btn.childNodes[1].textContent = "GENERATE VIDEO";
  }
}

/* ── File to base64 ── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);   // data URL: "data:image/...;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Polling ── */
function startPolling(taskId) {
  let attempts = 0;
  const MAX = 120;   // ~10 minutes

  function poll() {
    if (attempts++ > MAX) {
      showStatus("Timed out — video generation is taking too long.", "error");
      resetBtn();
      return;
    }

    fetch("/api/status/" + encodeURIComponent(taskId))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          showStatus("Status check error: " + data.error, "error");
          resetBtn();
          return;
        }

        const status = (data.status || "").toLowerCase();

        if (status === "success" || status === "completed" || status === "succeeded") {
          // Extract video URL from various possible response shapes
          const videoUrl = data.result?.video
            || data.result?.url
            || data.video_url
            || data.videoUrl
            || data.url
            || null;

          if (videoUrl) {
            showStatus("Generation complete ✓", "success", taskId);
            showResult(videoUrl);
            resetBtn();
          } else {
            showStatus("Completed but no video URL in response.", "error");
            resetBtn();
          }
          return;
        }

        if (status === "failed" || status === "error") {
          showStatus("Generation failed: " + (data.message || data.error || "unknown error"), "error");
          toast("✕ Generation failed — try simplifying your prompt.");
          resetBtn();
          return;
        }

        // Still processing
        const pct = data.progress || 0;
        updateProgress(pct);
        const label = pct > 0 ? "Generating… " + pct + "% complete" : "Generating video…";
        showStatus(label, "pending", taskId);
        pollTimer = setTimeout(poll, 5000);
      })
      .catch(err => {
        showStatus("Poll error: " + err.message, "error");
        resetBtn();
      });
  }

  pollTimer = setTimeout(poll, 8000);   // first check after 8 s
}

/* ── UI helpers ── */
function showStatus(label, state, taskId) {
  const panel = document.getElementById("status-panel");
  const dot   = document.getElementById("status-dot");
  const lbl   = document.getElementById("status-label");
  const task  = document.getElementById("status-task");

  panel.style.display = "block";
  lbl.textContent = label;
  task.textContent = taskId ? "Task ID: " + taskId : "";

  dot.className = "status-dot " + state;
  if (state === "pending") dot.classList.add("pending");
}

function updateProgress(pct) {
  const fill = document.getElementById("progress-fill");
  if (pct > 0) {
    fill.classList.remove("indeterminate");
    fill.style.width = pct + "%";
  }
}

function showResult(videoUrl) {
  const panel  = document.getElementById("result-panel");
  const video  = document.getElementById("result-video");
  const label  = document.getElementById("result-url-label");
  const dlBtn  = document.getElementById("btn-download");

  video.src = videoUrl;
  label.textContent = videoUrl;
  dlBtn.href = videoUrl;

  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideResult() {
  document.getElementById("result-panel").style.display = "none";
  document.getElementById("result-video").src = "";
}

function resetBtn() {
  const btn = document.getElementById("btn-gen");
  btn.disabled = false;
  btn.childNodes[1].textContent = "GENERATE VIDEO";
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}
</script>
</body>
</html>`;

/* ─── Serve frontend ────────────────────────────────────────────────────── */
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(HTML);
});

/* ─── POST /api/generate — proxy to Defapi gen ──────────────────────────── */
app.post("/api/generate", async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.prompt) return res.status(400).json({ error: "prompt is required" });

    const upstream = await fetch("https://api.defapi.org/api/sora2/gen", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${DEFAPI_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:   data.message || data.error || "Defapi API error",
        details: data,
      });
    }

    if (data.code !== 0 && data.code !== undefined) {
      return res.status(400).json({
        error:   data.message || "Defapi returned non-zero code",
        details: data,
      });
    }

    // Normalize — Defapi returns task_id inside data.data
    const taskId = data?.data?.task_id || data?.data?.id || data?.task_id;
    if (!taskId) {
      return res.status(500).json({ error: "No task_id in response", raw: data });
    }

    res.json({ task_id: taskId, raw: data });

  } catch (err) {
    console.error("[/api/generate]", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/status/:taskId — proxy to Defapi task query ─────────────── */
app.get("/api/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const upstream = await fetch(
      `https://api.defapi.org/api/task/query?task_id=${encodeURIComponent(taskId)}`,
      {
        method:  "GET",
        headers: { "Authorization": `Bearer ${DEFAPI_KEY}` },
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:   data.message || data.error || "Status check error",
        details: data,
      });
    }

    // Normalize response for the frontend
    const inner   = data?.data || data;
    const status  = inner?.status  || data?.status  || "pending";
    const progress= inner?.progress|| data?.progress|| 0;
    const result  = inner?.result  || data?.result  || null;
    const videoUrl= result?.video  || result?.url   || inner?.video_url || null;

    res.json({
      status,
      progress,
      result,
      video_url: videoUrl,
      raw: data,
    });

  } catch (err) {
    console.error("[/api/status]", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Health check (Railway uses this) ──────────────────────────────────── */
app.get("/health", (_, res) => res.json({ ok: true }));

/* ─── Start ─────────────────────────────────────────────────────────────── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SORA·2 Studio running → http://0.0.0.0:${PORT}`);
});<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SORA·2 — AI Video Studio</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet"/>
<style>
  /* ── Reset & Variables ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #090909;
    --surface:  #111111;
    --panel:    #161616;
    --border:   #252525;
    --amber:    #f5a623;
    --amber2:   #ffcc66;
    --muted:    #555;
    --text:     #e8e0d4;
    --sub:      #888;
    --red:      #e05252;
    --green:    #52e07a;
    --radius:   6px;
    --mono: "IBM Plex Mono", monospace;
    --display: "Bebas Neue", sans-serif;
    --body: "DM Sans", sans-serif;
  }

  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--body);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* ── Grain overlay ── */
  body::before {
    content: "";
    position: fixed; inset: 0; z-index: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    opacity: .025;
    pointer-events: none;
  }

  /* ── Layout ── */
  .page { position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 48px 24px 80px; }

  /* ── Header ── */
  header { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 52px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
  .logo-mark {
    font-family: var(--display);
    font-size: 52px;
    line-height: 1;
    letter-spacing: 2px;
    background: linear-gradient(135deg, var(--amber) 0%, var(--amber2) 60%, #fff5cc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 18px rgba(245,166,35,.35));
  }
  .logo-sub { font-family: var(--mono); font-size: 11px; color: var(--sub); letter-spacing: .12em; text-transform: uppercase; padding-bottom: 6px; }
  .tag { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .1em; padding: 4px 8px; border: 1px solid var(--border); border-radius: 3px; white-space: nowrap; }

  /* ── Form card ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: "";
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--amber), transparent);
    opacity: .5;
  }

  /* ── Labels ── */
  label { display: block; font-family: var(--mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--sub); margin-bottom: 8px; }
  .field { margin-bottom: 24px; }
  .field:last-child { margin-bottom: 0; }

  /* ── Inputs ── */
  textarea, select, input[type=text], input[type=password] {
    width: 100%;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-family: var(--body);
    font-size: 15px;
    padding: 12px 14px;
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    appearance: none;
  }
  textarea:focus, select:focus, input:focus {
    border-color: var(--amber);
    box-shadow: 0 0 0 3px rgba(245,166,35,.12);
  }
  textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
  select option { background: var(--panel); }

  /* ── Grid row ── */
  .row { display: grid; gap: 16px; }
  .row-2 { grid-template-columns: 1fr 1fr; }
  .row-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media (max-width: 560px) { .row-2, .row-3 { grid-template-columns: 1fr; } }

  /* ── File drop zone ── */
  .dropzone {
    background: var(--panel);
    border: 1.5px dashed var(--border);
    border-radius: var(--radius);
    padding: 28px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color .2s, background .2s;
    position: relative;
  }
  .dropzone:hover, .dropzone.drag { border-color: var(--amber); background: rgba(245,166,35,.04); }
  .dropzone input[type=file] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .dropzone .dz-icon { font-size: 28px; margin-bottom: 8px; }
  .dropzone .dz-label { font-family: var(--mono); font-size: 12px; color: var(--sub); }
  .dropzone .dz-preview { margin-top: 12px; }
  .dropzone .dz-preview img { max-height: 100px; border-radius: 4px; object-fit: cover; opacity: .85; }

  /* ── Hint text ── */
  .hint { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 6px; line-height: 1.6; }
  .hint a { color: var(--amber); text-decoration: none; }
  .hint a:hover { text-decoration: underline; }

  /* ── Generate button ── */
  .btn-generate {
    width: 100%;
    background: var(--amber);
    color: #0a0700;
    font-family: var(--display);
    font-size: 22px;
    letter-spacing: 2px;
    padding: 16px;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: filter .2s, transform .1s;
  }
  .btn-generate:hover { filter: brightness(1.12); }
  .btn-generate:active { transform: scale(.99); }
  .btn-generate:disabled { opacity: .45; cursor: not-allowed; filter: none; }
  .btn-generate .shimmer {
    position: absolute; inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%);
    transform: translateX(-100%);
    transition: transform .6s;
  }
  .btn-generate:not(:disabled):hover .shimmer { transform: translateX(100%); }

  /* ── Status panel ── */
  #status-panel { display: none; margin-top: 20px; }
  .status-bar {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 24px;
  }
  .status-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .status-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--amber);
    box-shadow: 0 0 8px var(--amber);
    flex-shrink: 0;
  }
  .status-dot.success { background: var(--green); box-shadow: 0 0 8px var(--green); }
  .status-dot.error   { background: var(--red);   box-shadow: 0 0 8px var(--red); animation: none; }
  .status-dot.pending { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.4; transform:scale(.7); } }
  .status-label { font-family: var(--mono); font-size: 13px; letter-spacing: .08em; }
  .status-task  { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px; word-break: break-all; }

  /* ── Progress bar ── */
  .progress-wrap { background: var(--panel); border-radius: 3px; height: 4px; overflow: hidden; }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--amber), var(--amber2));
    border-radius: 3px;
    width: 0%;
    transition: width .5s ease;
  }
  .indeterminate { animation: indeterminate 1.4s linear infinite; width: 40% !important; }
  @keyframes indeterminate {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }

  /* ── Video result ── */
  #result-panel { display: none; margin-top: 20px; }
  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .result-card video {
    width: 100%; display: block;
    background: #000;
  }
  .result-footer {
    padding: 16px 20px;
    display: flex; align-items: center; gap: 12px;
    border-top: 1px solid var(--border);
  }
  .result-info { flex: 1; }
  .result-title { font-family: var(--mono); font-size: 11px; color: var(--sub); text-transform: uppercase; letter-spacing: .1em; }
  .result-label { font-size: 13px; color: var(--text); margin-top: 2px; word-break: break-all; }
  .btn-dl {
    background: transparent; border: 1px solid var(--amber); color: var(--amber);
    font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
    padding: 9px 16px; border-radius: var(--radius); cursor: pointer; white-space: nowrap;
    text-decoration: none; display: inline-block;
    transition: background .2s, color .2s;
  }
  .btn-dl:hover { background: var(--amber); color: #0a0700; }

  /* ── Prompt tips ── */
  .tips-header {
    display: flex; align-items: center; gap: 10px; cursor: pointer;
    font-family: var(--mono); font-size: 11px; color: var(--sub); letter-spacing: .1em; text-transform: uppercase;
    padding: 16px 0; border-top: 1px solid var(--border); user-select: none;
  }
  .tips-header .chevron { transition: transform .25s; }
  .tips-header.open .chevron { transform: rotate(180deg); }
  .tips-body { display: none; padding-bottom: 20px; }
  .tips-body.open { display: block; }
  .tip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  @media (max-width: 560px) { .tip-grid { grid-template-columns: 1fr; } }
  .tip-chip {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 12px; font-family: var(--mono); font-size: 10px; color: var(--sub);
    cursor: pointer; transition: border-color .2s, color .2s; line-height: 1.5;
  }
  .tip-chip:hover { border-color: var(--amber); color: var(--text); }

  /* ── Error toast ── */
  #toast {
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(80px);
    background: #1e0e0e; border: 1px solid var(--red); color: var(--red);
    font-family: var(--mono); font-size: 12px; padding: 12px 20px; border-radius: var(--radius);
    z-index: 999; transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .35s;
    opacity: 0; white-space: nowrap; max-width: 90vw;
  }
  #toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

  /* ── Divider ── */
  .section-title {
    font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .18em;
    text-transform: uppercase; margin-bottom: 20px; padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }

  /* ── Footer ── */
  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid var(--border); text-align: center; font-family: var(--mono); font-size: 10px; color: var(--muted); letter-spacing: .08em; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <header>
    <div>
      <div class="logo-mark">SORA·2</div>
      <div class="logo-sub">AI Video Studio</div>
    </div>
    <div class="tag">powered by Defapi</div>
  </header>

  <!-- Generation form -->
  <div class="card">
    <div class="section-title">Video Generation</div>

    <!-- Prompt -->
    <div class="field">
      <label>Prompt <span style="color:var(--amber)">*</span></label>
      <textarea id="prompt" placeholder="A cinematic drone shot over a misty forest at dawn, warm golden light breaking through the canopy, orchestral score swelling…"></textarea>
      <p class="hint">Tip: Start with <strong style="color:var(--amber2)">(15s,hd)</strong> to generate a 15-second HD video.</p>
    </div>

    <!-- Controls row -->
    <div class="row row-3 field">
      <div>
        <label>Duration</label>
        <select id="duration">
          <option value="10">10 seconds  — $0.175</option>
          <option value="15">15 seconds  — $0.200</option>
        </select>
      </div>
      <div>
        <label>Aspect Ratio</label>
        <select id="aspect">
          <option value="16:9">16:9 — Landscape</option>
          <option value="9:16">9:16 — Portrait / TikTok</option>
          <option value="1:1">1:1 — Square</option>
        </select>
      </div>
      <div>
        <label>Quality</label>
        <select id="quality">
          <option value="">Standard</option>
          <option value="hd">HD</option>
        </select>
      </div>
    </div>

    <!-- Reference image -->
    <div class="field">
      <label>Reference Image <span style="color:var(--muted)">(optional — image-to-video)</span></label>
      <div class="dropzone" id="dropzone">
        <input type="file" id="ref-image" accept=".jpg,.jpeg,.png,.webp" onchange="previewImage(this)"/>
        <div class="dz-icon">🎞</div>
        <div class="dz-label">Drop an image here or click to browse<br/>.jpg · .png · .webp — max 20 MB</div>
        <div class="dz-preview" id="dz-preview"></div>
      </div>
      <p class="hint">⚠ Avoid images with real human faces — they will be rejected by content moderation.</p>
    </div>

    <!-- Negative prompt -->
    <div class="field">
      <label>Negative Prompt <span style="color:var(--muted)">(optional)</span></label>
      <input type="text" id="neg-prompt" placeholder="blurry, low quality, watermark, text overlay…"/>
    </div>

    <!-- Generate button -->
    <button class="btn-generate" id="btn-gen" onclick="generate()">
      <span class="shimmer"></span>
      GENERATE VIDEO
    </button>
  </div>

  <!-- Status panel -->
  <div id="status-panel">
    <div class="status-bar">
      <div class="status-header">
        <div class="status-dot pending" id="status-dot"></div>
        <div>
          <div class="status-label" id="status-label">Submitting request…</div>
          <div class="status-task" id="status-task"></div>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-fill indeterminate" id="progress-fill"></div>
      </div>
    </div>
  </div>

  <!-- Result panel -->
  <div id="result-panel">
    <div class="result-card">
      <video id="result-video" controls playsinline autoplay loop></video>
      <div class="result-footer">
        <div class="result-info">
          <div class="result-title">Generated Video</div>
          <div class="result-label" id="result-url-label">—</div>
        </div>
        <a class="btn-dl" id="btn-download" href="#" target="_blank" download>↓ Download</a>
      </div>
    </div>
  </div>

  <!-- Prompt tips -->
  <div style="margin-top:8px;">
    <div class="tips-header" id="tips-toggle" onclick="toggleTips()">
      <span>Prompt tips &amp; examples</span>
      <span class="chevron">▾</span>
    </div>
    <div class="tips-body" id="tips-body">
      <p style="font-size:13px;color:var(--sub);margin-bottom:4px;">Click a chip to load the prompt.</p>
      <div class="tip-grid">
        <div class="tip-chip" onclick="loadPrompt(this)">A pack of dogs driving tiny cars in a high-speed city chase, wearing sunglasses, dramatic action music, slow-motion jumps over fire hydrants.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">(15s,hd) Animated fantasy landscape with floating islands, waterfalls cascading into clouds, magical creatures flying, golden sunset, epic orchestral music.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">A lone astronaut walking on the surface of Mars at dusk, long shadows, red dust swirling, cinematic wide angle lens, ambient electronic score.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">(15s,hd) Product showcase — sleek smart watch rotating 360° on a stone surface, dramatic key light, particle effects, minimal electronic background music.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">Timelapse of a seed sprouting into a full plant, macro lens, soft studio lighting, gentle ambient sound, slow zoom out.</div>
        <div class="tip-chip" onclick="loadPrompt(this)">An abstract painting dissolving into colourful liquid, slow swirling motion, vibrant hues of purple gold and cyan, no narration, just ambient music.</div>
      </div>
    </div>
  </div>

  <footer>SORA·2 STUDIO — Defapi API wrapper — open source</footer>
</div>

<!-- Toast -->
<div id="toast"></div>

<script>
/* ── State ── */
let pollTimer = null;
let currentTaskId = null;

/* ── Prompt tips toggle ── */
function toggleTips() {
  const hdr  = document.getElementById("tips-toggle");
  const body = document.getElementById("tips-body");
  hdr.classList.toggle("open");
  body.classList.toggle("open");
}

/* ── Load example prompt ── */
function loadPrompt(el) {
  document.getElementById("prompt").value = el.textContent.trim();
  document.getElementById("prompt").focus();
}

/* ── Image preview ── */
function previewImage(input) {
  const preview = document.getElementById("dz-preview");
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = '<img src="' + e.target.result + '" alt="preview"/>';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/* ── Drag-and-drop styling ── */
const dropzone = document.getElementById("dropzone");
dropzone.addEventListener("dragover",  e => { e.preventDefault(); dropzone.classList.add("drag"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  const file = e.dataTransfer.files[0];
  if (file) {
    document.getElementById("ref-image").files = e.dataTransfer.files;
    previewImage(document.getElementById("ref-image"));
  }
});

/* ── Toast ── */
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4200);
}

/* ── Build prompt string with modifiers ── */
function buildPrompt() {
  const raw      = document.getElementById("prompt").value.trim();
  const duration = document.getElementById("duration").value;
  const quality  = document.getElementById("quality").value;
  const negPrompt = document.getElementById("neg-prompt").value.trim();

  // Only prepend (15s,hd) if NOT already in prompt
  let prefix = "";
  if (duration === "15" && quality === "hd" && !raw.startsWith("(15s,hd)")) prefix = "(15s,hd) ";
  else if (duration === "15" && !raw.startsWith("(15s,") && !raw.startsWith("(15s,hd)")) prefix = "(15s) ";
  else if (quality === "hd" && !raw.startsWith("(hd)") && !raw.startsWith("(15s,hd)")) prefix = "(hd) ";

  let full = prefix + raw;
  if (negPrompt) full += " [avoid: " + negPrompt + "]";
  return full;
}

/* ── Generate ── */
async function generate() {
  const prompt = buildPrompt();

  if (!prompt) { toast("⚠  Please enter a prompt."); return; }

  // Read optional reference image
  const imgInput = document.getElementById("ref-image");
  let imageBase64 = null;
  if (imgInput.files && imgInput.files[0]) {
    imageBase64 = await fileToBase64(imgInput.files[0]);
  }

  // UI — loading state
  const btn = document.getElementById("btn-gen");
  btn.disabled = true;
  btn.querySelector("span:last-child") && null;
  btn.childNodes[1].textContent = "SUBMITTING…";

  hideResult();
  showStatus("Submitting request to Defapi…", "pending");

  // Build request body
  const body = { prompt };
  if (imageBase64) body.images = [imageBase64];

  try {
    const res  = await fetch("/api/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ body })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      showStatus("Submission failed: " + (data.error || data.message || res.status), "error");
      toast("✕ " + (data.error || "Submission failed. Check your API key."));
      btn.disabled = false;
      btn.childNodes[1].textContent = "GENERATE VIDEO";
      return;
    }

    currentTaskId = data.task_id;
    showStatus("Request queued — polling for status…", "pending", currentTaskId);
    startPolling(currentTaskId);

  } catch (err) {
    showStatus("Network error: " + err.message, "error");
    toast("✕ Network error — is the server running?");
    btn.disabled = false;
    btn.childNodes[1].textContent = "GENERATE VIDEO";
  }
}

/* ── File to base64 ── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);   // data URL: "data:image/...;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Polling ── */
function startPolling(taskId) {
  let attempts = 0;
  const MAX = 120;   // ~10 minutes

  function poll() {
    if (attempts++ > MAX) {
      showStatus("Timed out — video generation is taking too long.", "error");
      resetBtn();
      return;
    }

    fetch("/api/status/" + encodeURIComponent(taskId))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          showStatus("Status check error: " + data.error, "error");
          resetBtn();
          return;
        }

        const status = (data.status || "").toLowerCase();

        if (status === "success" || status === "completed" || status === "succeeded") {
          // Extract video URL from various possible response shapes
          const videoUrl = data.result?.video
            || data.result?.url
            || data.video_url
            || data.videoUrl
            || data.url
            || null;

          if (videoUrl) {
            showStatus("Generation complete ✓", "success", taskId);
            showResult(videoUrl);
            resetBtn();
          } else {
            showStatus("Completed but no video URL in response.", "error");
            resetBtn();
          }
          return;
        }

        if (status === "failed" || status === "error") {
          showStatus("Generation failed: " + (data.message || data.error || "unknown error"), "error");
          toast("✕ Generation failed — try simplifying your prompt.");
          resetBtn();
          return;
        }

        // Still processing
        const pct = data.progress || 0;
        updateProgress(pct);
        const label = pct > 0 ? "Generating… " + pct + "% complete" : "Generating video…";
        showStatus(label, "pending", taskId);
        pollTimer = setTimeout(poll, 5000);
      })
      .catch(err => {
        showStatus("Poll error: " + err.message, "error");
        resetBtn();
      });
  }

  pollTimer = setTimeout(poll, 8000);   // first check after 8 s
}

/* ── UI helpers ── */
function showStatus(label, state, taskId) {
  const panel = document.getElementById("status-panel");
  const dot   = document.getElementById("status-dot");
  const lbl   = document.getElementById("status-label");
  const task  = document.getElementById("status-task");

  panel.style.display = "block";
  lbl.textContent = label;
  task.textContent = taskId ? "Task ID: " + taskId : "";

  dot.className = "status-dot " + state;
  if (state === "pending") dot.classList.add("pending");
}

function updateProgress(pct) {
  const fill = document.getElementById("progress-fill");
  if (pct > 0) {
    fill.classList.remove("indeterminate");
    fill.style.width = pct + "%";
  }
}

function showResult(videoUrl) {
  const panel  = document.getElementById("result-panel");
  const video  = document.getElementById("result-video");
  const label  = document.getElementById("result-url-label");
  const dlBtn  = document.getElementById("btn-download");

  video.src = videoUrl;
  label.textContent = videoUrl;
  dlBtn.href = videoUrl;

  panel.style.display = "block";
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideResult() {
  document.getElementById("result-panel").style.display = "none";
  document.getElementById("result-video").src = "";
}

function resetBtn() {
  const btn = document.getElementById("btn-gen");
  btn.disabled = false;
  btn.childNodes[1].textContent = "GENERATE VIDEO";
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}
</script>
</body>
</html>`;

/* ─── Serve frontend ────────────────────────────────────────────────────── */
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(HTML);
});

/* ─── POST /api/generate — proxy to Defapi gen ──────────────────────────── */
app.post("/api/generate", async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.prompt) return res.status(400).json({ error: "prompt is required" });

    const upstream = await fetch("https://api.defapi.org/api/sora2/gen", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${DEFAPI_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:   data.message || data.error || "Defapi API error",
        details: data,
      });
    }

    if (data.code !== 0 && data.code !== undefined) {
      return res.status(400).json({
        error:   data.message || "Defapi returned non-zero code",
        details: data,
      });
    }

    // Normalize — Defapi returns task_id inside data.data
    const taskId = data?.data?.task_id || data?.data?.id || data?.task_id;
    if (!taskId) {
      return res.status(500).json({ error: "No task_id in response", raw: data });
    }

    res.json({ task_id: taskId, raw: data });

  } catch (err) {
    console.error("[/api/generate]", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /api/status/:taskId — proxy to Defapi task query ─────────────── */
app.get("/api/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const upstream = await fetch(
      `https://api.defapi.org/api/task/query?task_id=${encodeURIComponent(taskId)}`,
      {
        method:  "GET",
        headers: { "Authorization": `Bearer ${DEFAPI_KEY}` },
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:   data.message || data.error || "Status check error",
        details: data,
      });
    }

    // Normalize response for the frontend
    const inner   = data?.data || data;
    const status  = inner?.status  || data?.status  || "pending";
    const progress= inner?.progress|| data?.progress|| 0;
    const result  = inner?.result  || data?.result  || null;
    const videoUrl= result?.video  || result?.url   || inner?.video_url || null;

    res.json({
      status,
      progress,
      result,
      video_url: videoUrl,
      raw: data,
    });

  } catch (err) {
    console.error("[/api/status]", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Health check (Railway uses this) ──────────────────────────────────── */
app.get("/health", (_, res) => res.json({ ok: true }));

/* ─── Start ─────────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`SORA·2 Studio running → http://localhost:${PORT}`);
});
