/**
 * Sora 2 Video Generator
 * Features: password gate, history, balance, refresh/recheck, video preview
 *
 * ENV (Railway Variables tab / local .env):
 *   DEFAPI_KEY  — Defapi Bearer token (REQUIRED)
 *   PORT        — auto-set by Railway (defaults 3000)
 */

require("dotenv").config();

const express = require("express");
const fetch   = (...a) => import("node-fetch").then(({ default: f }) => f(...a));
const crypto  = require("crypto");

const DEFAPI_KEY = process.env.DEFAPI_KEY;
if (!DEFAPI_KEY) {
  console.error("\n DEFAPI_KEY is not set. Add it to Railway Variables or .env\n");
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "25mb" }));

/* ─── In-memory history store ───────────────────────────────────────────── */
// Survives server uptime; resets on redeploy (acceptable for now)
const history = [];  // [ { id, taskId, prompt, aspect, duration, quality, status, videoUrl, createdAt, updatedAt } ]
const MAX_HISTORY = 50;

function addHistory(entry) {
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();
}

function updateHistory(taskId, patch) {
  const item = history.find(h => h.taskId === taskId);
  if (item) Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  return item;
}

/* ─── HTML ───────────────────────────────────────────────────────────────── */
function buildHTML() {
  const lines = [];
  const p = s => lines.push(s);

  p('<!DOCTYPE html>');
  p('<html lang="en">');
  p('<head>');
  p('<meta charset="UTF-8"/>');
  p('<meta name="viewport" content="width=device-width,initial-scale=1"/>');
  p('<title>SORA 2 Studio</title>');
  p('<link rel="preconnect" href="https://fonts.googleapis.com"/>');
  p('<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:wght@300;400&display=swap" rel="stylesheet"/>');
  p('<style>');
  p('*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}');
  p(':root{');
  p('  --bg:#090909;--surface:#111;--panel:#161616;--border:#252525;');
  p('  --amber:#f5a623;--amber2:#ffcc66;--muted:#555;--text:#e8e0d4;');
  p('  --sub:#777;--red:#e05252;--green:#52e07a;--blue:#5299e0;--r:6px;');
  p('  --mono:"IBM Plex Mono",monospace;--display:"Bebas Neue",sans-serif;--body:"DM Sans",sans-serif;');
  p('}');
  p('html,body{background:var(--bg);color:var(--text);font-family:var(--body);min-height:100vh;overflow-x:hidden}');

  // Password overlay
  p('#pw-overlay{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px}');
  p('#pw-overlay.hidden{display:none}');
  p('.pw-box{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:40px 48px;max-width:380px;width:90%;text-align:center;position:relative;overflow:hidden}');
  p('.pw-box::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--amber),transparent);opacity:.6}');
  p('.pw-logo{font-family:var(--display);font-size:46px;letter-spacing:2px;background:linear-gradient(135deg,var(--amber),var(--amber2),#fff5cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 16px rgba(245,166,35,.4));margin-bottom:6px}');
  p('.pw-sub{font-family:var(--mono);font-size:10px;color:var(--sub);letter-spacing:.15em;text-transform:uppercase;margin-bottom:28px}');
  p('#pw-input{width:100%;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--mono);font-size:16px;padding:13px 16px;outline:none;text-align:center;letter-spacing:.15em;margin-bottom:14px;transition:border-color .2s,box-shadow .2s}');
  p('#pw-input:focus{border-color:var(--amber);box-shadow:0 0 0 3px rgba(245,166,35,.12)}');
  p('#pw-input.wrong{border-color:var(--red);animation:shake .35s ease}');
  p('@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}');
  p('#pw-btn{width:100%;background:var(--amber);color:#0a0700;font-family:var(--display);font-size:20px;letter-spacing:2px;padding:13px;border:none;border-radius:var(--r);cursor:pointer;transition:filter .2s}');
  p('#pw-btn:hover{filter:brightness(1.1)}');
  p('.pw-hint{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:12px}');

  // Main layout
  p('.page{max-width:1100px;margin:0 auto;padding:36px 20px 80px}');
  p('header{display:flex;align-items:center;gap:16px;margin-bottom:36px;padding-bottom:18px;border-bottom:1px solid var(--border);flex-wrap:wrap}');
  p('.logo{font-family:var(--display);font-size:44px;line-height:1;letter-spacing:2px;background:linear-gradient(135deg,var(--amber),var(--amber2),#fff5cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 16px rgba(245,166,35,.35))}');
  p('.logo-sub{font-family:var(--mono);font-size:10px;color:var(--sub);letter-spacing:.12em;text-transform:uppercase;margin-top:2px}');
  p('.header-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap}');
  p('.balance-chip{font-family:var(--mono);font-size:11px;color:var(--text);padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:20px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:border-color .2s}');
  p('.balance-chip:hover{border-color:var(--amber)}');
  p('.balance-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}');
  p('.balance-dot.loading{background:var(--amber);animation:pulse 1s ease-in-out infinite}');
  p('.balance-dot.error{background:var(--red);box-shadow:0 0 6px var(--red);animation:none}');

  // Grid
  p('.grid{display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start}');
  p('@media(max-width:900px){.grid{grid-template-columns:1fr}}');

  // Cards
  p('.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:28px;margin-bottom:20px;position:relative;overflow:hidden}');
  p('.card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--amber),transparent);opacity:.4}');
  p('.section-title{font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.18em;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid var(--border)}');
  p('label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--sub);margin-bottom:7px}');
  p('.field{margin-bottom:20px}.field:last-child{margin-bottom:0}');
  p('textarea,select,input[type=text]{width:100%;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:14px;padding:11px 13px;outline:none;transition:border-color .2s,box-shadow .2s;appearance:none;-webkit-appearance:none}');
  p('textarea:focus,select:focus,input[type=text]:focus{border-color:var(--amber);box-shadow:0 0 0 3px rgba(245,166,35,.1)}');
  p('textarea{resize:vertical;min-height:100px;line-height:1.6}');
  p('select option{background:var(--panel)}');
  p('.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}');
  p('@media(max-width:560px){.row3{grid-template-columns:1fr}}');
  p('.hint{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:5px;line-height:1.5}');

  // Dropzone
  p('.dropzone{background:var(--panel);border:1.5px dashed var(--border);border-radius:var(--r);padding:22px 16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;position:relative}');
  p('.dropzone:hover,.dropzone.drag{border-color:var(--amber);background:rgba(245,166,35,.04)}');
  p('.dropzone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}');
  p('.dz-icon{font-size:22px;margin-bottom:6px}.dz-lbl{font-family:var(--mono);font-size:11px;color:var(--sub)}');
  p('.dz-prev{margin-top:10px}.dz-prev img{max-height:80px;border-radius:4px;object-fit:cover;opacity:.85}');

  // Buttons
  p('.btn-gen{width:100%;background:var(--amber);color:#0a0700;font-family:var(--display);font-size:20px;letter-spacing:2px;padding:14px;border:none;border-radius:var(--r);cursor:pointer;position:relative;overflow:hidden;transition:filter .2s,transform .1s}');
  p('.btn-gen:hover{filter:brightness(1.12)}.btn-gen:active{transform:scale(.99)}.btn-gen:disabled{opacity:.4;cursor:not-allowed;filter:none}');
  p('.shimmer{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.3) 50%,transparent 60%);transform:translateX(-100%);transition:transform .6s}');
  p('.btn-gen:not(:disabled):hover .shimmer{transform:translateX(100%)}');
  p('.btn-sm{background:transparent;border:1px solid var(--border);color:var(--sub);font-family:var(--mono);font-size:10px;letter-spacing:.08em;padding:5px 10px;border-radius:4px;cursor:pointer;transition:border-color .2s,color .2s;white-space:nowrap}');
  p('.btn-sm:hover{border-color:var(--amber);color:var(--amber)}');
  p('.btn-sm.green:hover{border-color:var(--green);color:var(--green)}');
  p('.btn-sm.blue:hover{border-color:var(--blue);color:var(--blue)}');

  // Status panel
  p('#status-panel{display:none;margin-bottom:20px}');
  p('.status-bar{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px 22px}');
  p('.status-hdr{display:flex;align-items:center;gap:10px;margin-bottom:12px}');
  p('.dot{width:9px;height:9px;border-radius:50%;background:var(--amber);box-shadow:0 0 7px var(--amber);flex-shrink:0}');
  p('.dot.success{background:var(--green);box-shadow:0 0 7px var(--green)}.dot.error{background:var(--red);box-shadow:0 0 7px var(--red);animation:none}.dot.pending{animation:pulse 1.2s ease-in-out infinite}');
  p('@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}');
  p('.status-lbl{font-family:var(--mono);font-size:12px;letter-spacing:.06em;flex:1}');
  p('.status-task{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:3px;word-break:break-all}');
  p('.prog-wrap{background:var(--panel);border-radius:3px;height:3px;overflow:hidden}');
  p('.prog-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--amber2));border-radius:3px;width:0%;transition:width .5s ease}');
  p('.prog-fill.indet{animation:indet 1.4s linear infinite;width:40%!important}');
  p('@keyframes indet{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}');

  // Result panel
  p('#result-panel{display:none;margin-bottom:20px}');
  p('.result-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}');
  p('.result-card video{width:100%;display:block;background:#000;max-height:420px}');
  p('.result-footer{padding:14px 18px;display:flex;align-items:center;gap:10px;border-top:1px solid var(--border)}');
  p('.result-info{flex:1;min-width:0}.result-title{font-family:var(--mono);font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.1em}');
  p('.result-url{font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
  p('.btn-dl{background:transparent;border:1px solid var(--amber);color:var(--amber);font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:8px 14px;border-radius:var(--r);cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-block;transition:background .2s,color .2s;flex-shrink:0}');
  p('.btn-dl:hover{background:var(--amber);color:#0a0700}');

  // History panel
  p('#history-panel .card{padding:22px}');
  p('.history-empty{font-family:var(--mono);font-size:11px;color:var(--muted);text-align:center;padding:24px 0}');
  p('.hist-item{border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:10px;cursor:pointer;transition:border-color .2s,background .2s;position:relative}');
  p('.hist-item:hover{border-color:var(--border);background:rgba(255,255,255,.02)}');
  p('.hist-item:last-child{margin-bottom:0}');
  p('.hist-top{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px}');
  p('.hist-badge{font-family:var(--mono);font-size:9px;letter-spacing:.08em;padding:2px 7px;border-radius:3px;text-transform:uppercase;flex-shrink:0;margin-top:1px}');
  p('.hist-badge.success{background:rgba(82,224,122,.12);color:var(--green);border:1px solid rgba(82,224,122,.25)}');
  p('.hist-badge.pending{background:rgba(245,166,35,.1);color:var(--amber);border:1px solid rgba(245,166,35,.2)}');
  p('.hist-badge.failed{background:rgba(224,82,82,.1);color:var(--red);border:1px solid rgba(224,82,82,.2)}');
  p('.hist-prompt{font-size:12px;color:var(--text);line-height:1.4;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}');
  p('.hist-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}');
  p('.hist-time{font-family:var(--mono);font-size:10px;color:var(--muted);flex:1}');
  p('.hist-actions{display:flex;gap:6px}');
  p('.hist-preview{margin-top:10px;display:none}');
  p('.hist-preview.open{display:block}');
  p('.hist-preview video{width:100%;border-radius:4px;max-height:180px;background:#000}');
  p('.hist-task{font-family:var(--mono);font-size:9px;color:var(--muted);margin-top:4px;word-break:break-all}');

  // Toast
  p('#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#1a0a0a;border:1px solid var(--red);color:var(--red);font-family:var(--mono);font-size:11px;padding:11px 18px;border-radius:var(--r);z-index:9998;transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .35s;opacity:0;white-space:nowrap;max-width:92vw}');
  p('#toast.ok{background:#0a1a0f;border-color:var(--green);color:var(--green)}');
  p('#toast.show{transform:translateX(-50%) translateY(0);opacity:1}');

  // Tips
  p('.tips-hdr{display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;padding:14px 0;border-top:1px solid var(--border);user-select:none}');
  p('.chev{transition:transform .25s}.tips-hdr.open .chev{transform:rotate(180deg)}');
  p('.tips-body{display:none;padding-bottom:16px}.tips-body.open{display:block}');
  p('.tip-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}');
  p('@media(max-width:560px){.tip-grid{grid-template-columns:1fr}}');
  p('.chip{background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:9px 11px;font-family:var(--mono);font-size:10px;color:var(--sub);cursor:pointer;transition:border-color .2s,color .2s;line-height:1.5}');
  p('.chip:hover{border-color:var(--amber);color:var(--text)}');
  p('footer{margin-top:48px;padding-top:18px;border-top:1px solid var(--border);text-align:center;font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.08em}');
  p('</style>');
  p('</head>');
  p('<body>');

  // Password overlay
  p('<div id="pw-overlay">');
  p('  <div class="pw-box">');
  p('    <div class="pw-logo">SORA 2</div>');
  p('    <div class="pw-sub">AI Video Studio</div>');
  p('    <input type="password" id="pw-input" placeholder="Enter password" autocomplete="off"/>');
  p('    <button id="pw-btn" onclick="checkPassword()">ENTER</button>');
  p('    <p class="pw-hint">Access restricted</p>');
  p('  </div>');
  p('</div>');

  // Main page
  p('<div class="page">');

  // Header
  p('<header>');
  p('  <div>');
  p('    <div class="logo">SORA 2</div>');
  p('    <div class="logo-sub">AI Video Studio</div>');
  p('  </div>');
  p('  <div class="header-right">');
  p('    <div class="balance-chip" onclick="fetchBalance()" title="Click to refresh balance">');
  p('      <div class="balance-dot loading" id="bal-dot"></div>');
  p('      <span id="bal-text">Loading balance...</span>');
  p('    </div>');
  p('  </div>');
  p('</header>');

  // Main grid
  p('<div class="grid">');

  // Left column — form
  p('<div>');

  // Status panel
  p('<div id="status-panel">');
  p('  <div class="status-bar">');
  p('    <div class="status-hdr">');
  p('      <div class="dot pending" id="dot"></div>');
  p('      <div class="status-lbl" id="status-lbl">Submitting...</div>');
  p('    </div>');
  p('    <div class="status-task" id="status-task"></div>');
  p('    <div class="prog-wrap" style="margin-top:10px"><div class="prog-fill indet" id="prog-fill"></div></div>');
  p('  </div>');
  p('</div>');

  // Result panel
  p('<div id="result-panel">');
  p('  <div class="result-card">');
  p('    <video id="result-video" controls playsinline autoplay loop></video>');
  p('    <div class="result-footer">');
  p('      <div class="result-info">');
  p('        <div class="result-title">Generated Video</div>');
  p('        <div class="result-url" id="result-url">-</div>');
  p('      </div>');
  p('      <a class="btn-dl" id="btn-dl" href="#" target="_blank" download>Download</a>');
  p('    </div>');
  p('  </div>');
  p('</div>');

  // Form card
  p('<div class="card">');
  p('  <div class="section-title">New Generation</div>');
  p('  <div class="field">');
  p('    <label>Prompt *</label>');
  p('    <textarea id="prompt" placeholder="A cinematic drone shot over a misty forest at dawn, golden light breaking through the canopy, orchestral score swelling..."></textarea>');
  p('    <p class="hint">Prefix with <strong style="color:var(--amber2)">(15s,hd)</strong> for 15-second HD video.</p>');
  p('  </div>');
  p('  <div class="row3 field">');
  p('    <div><label>Duration</label>');
  p('      <select id="duration">');
  p('        <option value="10">10s — $0.175</option>');
  p('        <option value="15">15s — $0.200</option>');
  p('      </select></div>');
  p('    <div><label>Aspect Ratio</label>');
  p('      <select id="aspect">');
  p('        <option value="16:9">16:9 Landscape</option>');
  p('        <option value="9:16">9:16 Portrait</option>');
  p('        <option value="1:1">1:1 Square</option>');
  p('      </select></div>');
  p('    <div><label>Quality</label>');
  p('      <select id="quality">');
  p('        <option value="">Standard</option>');
  p('        <option value="hd">HD</option>');
  p('      </select></div>');
  p('  </div>');
  p('  <div class="field">');
  p('    <label>Reference Image <span style="color:var(--muted)">(optional)</span></label>');
  p('    <div class="dropzone" id="dropzone">');
  p('      <input type="file" id="ref-image" accept=".jpg,.jpeg,.png,.webp" onchange="previewImg(this)"/>');
  p('      <div class="dz-icon">&#127902;</div>');
  p('      <div class="dz-lbl">Drop image or click to browse</div>');
  p('      <div class="dz-prev" id="dz-prev"></div>');
  p('    </div>');
  p('    <p class="hint">No real human faces — rejected by content moderation.</p>');
  p('  </div>');
  p('  <div class="field">');
  p('    <label>Negative Prompt <span style="color:var(--muted)">(optional)</span></label>');
  p('    <input type="text" id="neg" placeholder="blurry, watermark, text overlay..."/>');
  p('  </div>');
  p('  <button class="btn-gen" id="btn-gen" onclick="generate()"><span class="shimmer"></span><span id="btn-lbl">GENERATE VIDEO</span></button>');
  p('</div>');

  // Prompt tips
  p('<div class="tips-hdr" id="tips-hdr" onclick="toggleTips()"><span>Prompt examples</span><span class="chev">&#9662;</span></div>');
  p('<div class="tips-body" id="tips-body">');
  p('  <div class="tip-grid">');
  p('    <div class="chip" onclick="loadPrompt(this)">A pack of dogs driving tiny cars in a high-speed city chase, wearing sunglasses, dramatic action music.</div>');
  p('    <div class="chip" onclick="loadPrompt(this)">(15s,hd) Fantasy landscape with floating islands, waterfalls into clouds, golden sunset, epic orchestral music.</div>');
  p('    <div class="chip" onclick="loadPrompt(this)">Lone astronaut on Mars at dusk, long shadows, red dust swirling, cinematic wide angle, ambient score.</div>');
  p('    <div class="chip" onclick="loadPrompt(this)">(15s,hd) Smart watch rotating 360 degrees on stone surface, dramatic key light, particle effects, minimal music.</div>');
  p('    <div class="chip" onclick="loadPrompt(this)">Timelapse of a seed sprouting into a full plant, macro lens, soft studio lighting, ambient sound.</div>');
  p('    <div class="chip" onclick="loadPrompt(this)">Abstract painting dissolving into liquid, slow swirling motion, purple gold cyan hues, ambient music.</div>');
  p('  </div>');
  p('</div>');
  p('</div>'); // end left column

  // Right column — history
  p('<div id="history-panel">');
  p('  <div class="card" style="padding:22px">');
  p('    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0;padding-bottom:0;border:none">');
  p('      <span>History</span>');
  p('      <div style="display:flex;gap:6px">');
  p('        <button class="btn-sm" onclick="loadHistory()">&#8635; Refresh</button>');
  p('        <button class="btn-sm" onclick="clearHistory()">Clear</button>');
  p('      </div>');
  p('    </div>');
  p('    <div style="margin-bottom:14px;margin-top:10px;height:1px;background:var(--border)"></div>');
  p('    <div id="hist-list"><div class="history-empty">No generations yet</div></div>');
  p('  </div>');
  p('</div>');

  p('</div>'); // end grid

  p('<footer>SORA 2 STUDIO &mdash; Defapi API Wrapper</footer>');
  p('</div>'); // end page

  p('<div id="toast"></div>');

  // Script
  p('<script>');

  // Password check
  p('(function() {');
  p('  if (localStorage.getItem("sora2_auth") === "olamide_ok") {');
  p('    document.getElementById("pw-overlay").classList.add("hidden");');
  p('    init();');
  p('  } else {');
  p('    document.getElementById("pw-input").addEventListener("keydown", function(e){ if(e.key==="Enter") checkPassword(); });');
  p('  }');
  p('})();');

  p('function checkPassword() {');
  p('  var val = document.getElementById("pw-input").value;');
  p('  if (val === "olamide") {');
  p('    localStorage.setItem("sora2_auth", "olamide_ok");');
  p('    document.getElementById("pw-overlay").classList.add("hidden");');
  p('    init();');
  p('  } else {');
  p('    var inp = document.getElementById("pw-input");');
  p('    inp.classList.add("wrong");');
  p('    inp.value = "";');
  p('    inp.placeholder = "Wrong password";');
  p('    setTimeout(function(){ inp.classList.remove("wrong"); inp.placeholder = "Enter password"; }, 1000);');
  p('  }');
  p('}');

  p('function init() {');
  p('  fetchBalance();');
  p('  loadHistory();');
  p('  setupDragDrop();');
  p('}');

  // Balance
  p('function fetchBalance() {');
  p('  var dot  = document.getElementById("bal-dot");');
  p('  var text = document.getElementById("bal-text");');
  p('  dot.className = "balance-dot loading";');
  p('  text.textContent = "Loading balance...";');
  p('  fetch("/api/balance")');
  p('    .then(function(r){ return r.json(); })');
  p('    .then(function(d){');
  p('      if (d.balance !== undefined && d.balance !== null) {');
  p('        dot.className = "balance-dot";');
  p('        text.textContent = "Balance: $" + parseFloat(d.balance).toFixed(4);');
  p('      } else {');
  p('        dot.className = "balance-dot error";');
  p('        text.textContent = d.error || "Balance unavailable";');
  p('      }');
  p('    })');
  p('    .catch(function(){ dot.className = "balance-dot error"; text.textContent = "Balance unavailable"; });');
  p('}');

  // History
  p('var histData = [];');
  p('function loadHistory() {');
  p('  fetch("/api/history")');
  p('    .then(function(r){ return r.json(); })');
  p('    .then(function(d){ histData = d; renderHistory(); })');
  p('    .catch(function(){ });');
  p('}');

  p('function clearHistory() {');
  p('  if (!confirm("Clear all history?")) return;');
  p('  fetch("/api/history", { method: "DELETE" })');
  p('    .then(function(){ histData = []; renderHistory(); toast("History cleared", true); });');
  p('}');

  p('function renderHistory() {');
  p('  var el = document.getElementById("hist-list");');
  p('  if (!histData || histData.length === 0) { el.innerHTML = \'<div class="history-empty">No generations yet</div>\'; return; }');
  p('  var html = "";');
  p('  histData.forEach(function(item) {');
  p('    var badge = item.status === "success" ? "success" : item.status === "failed" ? "failed" : "pending";');
  p('    var label = item.status === "success" ? "Done" : item.status === "failed" ? "Failed" : "Pending";');
  p('    var ago   = timeAgo(item.createdAt);');
  p('    var shortPrompt = item.prompt.length > 80 ? item.prompt.substring(0,80) + "..." : item.prompt;');
  p('    html += \'<div class="hist-item" id="hi-\' + item.id + \'">\';');
  p('    html += \'  <div class="hist-top">\';');
  p('    html += \'    <span class="hist-badge \' + badge + \'">\' + label + \'</span>\';');
  p('    html += \'    <div class="hist-prompt">\' + escHtml(shortPrompt) + \'</div>\';');
  p('    html += \'  </div>\';');
  p('    html += \'  <div class="hist-meta">\';');
  p('    html += \'    <span class="hist-time">\' + ago + \'</span>\';');
  p('    html += \'    <div class="hist-actions">\';');
  p('    if (item.status === "success" && item.videoUrl) {');
  p('      html += \'      <button class="btn-sm green" onclick="togglePreview(\\"\' + item.id + \'\\")">Preview</button>\';');
  p('      html += \'      <a class="btn-sm" href="\' + item.videoUrl + \'" target="_blank" download style="text-decoration:none">DL</a>\';');
  p('    }');
  p('    html += \'      <button class="btn-sm blue" onclick="recheckTask(\\"\' + item.taskId + \'\\",\\"\' + item.id + \'\\")">Recheck</button>\';');
  p('    html += \'    </div>\';');
  p('    html += \'  </div>\';');
  p('    if (item.taskId) html += \'  <div class="hist-task">ID: \' + item.taskId + \'</div>\';');
  p('    if (item.status === "success" && item.videoUrl) {');
  p('      html += \'  <div class="hist-preview" id="prev-\' + item.id + \'">\';');
  p('      html += \'    <video src="\' + item.videoUrl + \'" controls playsinline loop style="width:100%;border-radius:4px;max-height:180px;background:#000"></video>\';');
  p('      html += \'  </div>\';');
  p('    }');
  p('    html += \'</div>\';');
  p('  });');
  p('  el.innerHTML = html;');
  p('}');

  p('function togglePreview(id) {');
  p('  var el = document.getElementById("prev-" + id);');
  p('  if (el) el.classList.toggle("open");');
  p('}');

  p('function recheckTask(taskId, histId) {');
  p('  if (!taskId) { toast("No task ID available"); return; }');
  p('  toast("Rechecking task " + taskId.substring(0,12) + "...", true);');
  p('  fetch("/api/status/" + encodeURIComponent(taskId))');
  p('    .then(function(r){ return r.json(); })');
  p('    .then(function(data) {');
  p('      var status = (data.status || "").toLowerCase();');
  p('      if (status === "success" || status === "completed" || status === "succeeded") {');
  p('        var url = (data.result && (data.result.video || data.result.url)) || data.video_url || null;');
  p('        fetch("/api/history/update", {');
  p('          method: "POST",');
  p('          headers: { "Content-Type": "application/json" },');
  p('          body: JSON.stringify({ taskId: taskId, status: "success", videoUrl: url })');
  p('        }).then(function(){ loadHistory(); });');
  p('        if (url) { toast("Success! Video ready.", true); showResult(url); }');
  p('        else toast("Completed but no video URL yet");');
  p('      } else if (status === "failed" || status === "error") {');
  p('        fetch("/api/history/update", {');
  p('          method: "POST",');
  p('          headers: { "Content-Type": "application/json" },');
  p('          body: JSON.stringify({ taskId: taskId, status: "failed" })');
  p('        }).then(function(){ loadHistory(); });');
  p('        toast("Task is still failed on Defapi");');
  p('      } else {');
  p('        toast("Status: " + (status || "pending") + " — still processing", true);');
  p('        if (status === "pending" || !status) startPolling(taskId);');
  p('      }');
  p('    })');
  p('    .catch(function(e){ toast("Recheck error: " + e.message); });');
  p('}');

  // Drag drop setup
  p('function setupDragDrop() {');
  p('  var dz = document.getElementById("dropzone");');
  p('  dz.addEventListener("dragover",  function(e){ e.preventDefault(); dz.classList.add("drag"); });');
  p('  dz.addEventListener("dragleave", function(){ dz.classList.remove("drag"); });');
  p('  dz.addEventListener("drop", function(e){');
  p('    e.preventDefault(); dz.classList.remove("drag");');
  p('    var f = e.dataTransfer.files[0];');
  p('    if (f) { document.getElementById("ref-image").files = e.dataTransfer.files; previewImg(document.getElementById("ref-image")); }');
  p('  });');
  p('}');

  // Helpers
  p('function previewImg(input) {');
  p('  if (input.files && input.files[0]) {');
  p('    var r = new FileReader();');
  p('    r.onload = function(e){ document.getElementById("dz-prev").innerHTML = "<img src=" + e.target.result + " alt=preview/>"; };');
  p('    r.readAsDataURL(input.files[0]);');
  p('  }');
  p('}');

  p('function toggleTips(){ document.getElementById("tips-hdr").classList.toggle("open"); document.getElementById("tips-body").classList.toggle("open"); }');
  p('function loadPrompt(el){ document.getElementById("prompt").value = el.textContent.trim(); }');

  p('function escHtml(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }');

  p('function timeAgo(iso) {');
  p('  var d = new Date(iso), now = new Date();');
  p('  var sec = Math.floor((now - d) / 1000);');
  p('  if (sec < 60) return "just now";');
  p('  if (sec < 3600) return Math.floor(sec/60) + "m ago";');
  p('  if (sec < 86400) return Math.floor(sec/3600) + "h ago";');
  p('  return Math.floor(sec/86400) + "d ago";');
  p('}');

  p('function fileToBase64(file){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){res(r.result);}; r.onerror=rej; r.readAsDataURL(file); }); }');

  p('function buildPrompt(){');
  p('  var raw=document.getElementById("prompt").value.trim();');
  p('  var dur=document.getElementById("duration").value;');
  p('  var q=document.getElementById("quality").value;');
  p('  var neg=document.getElementById("neg").value.trim();');
  p('  var pre="";');
  p('  if(dur==="15"&&q==="hd"&&raw.indexOf("(15s,hd)")!==0) pre="(15s,hd) ";');
  p('  else if(dur==="15"&&raw.indexOf("(15s")!==0) pre="(15s) ";');
  p('  else if(q==="hd"&&raw.indexOf("(hd)")!==0&&raw.indexOf("(15s,hd)")!==0) pre="(hd) ";');
  p('  return pre + raw + (neg ? " [avoid: "+neg+"]" : "");');
  p('}');

  // Generate
  p('var pollTimer = null;');
  p('async function generate() {');
  p('  var prompt = buildPrompt();');
  p('  if (!prompt) { toast("Please enter a prompt."); return; }');
  p('  var imgInput = document.getElementById("ref-image");');
  p('  var imgB64 = null;');
  p('  if (imgInput.files && imgInput.files[0]) imgB64 = await fileToBase64(imgInput.files[0]);');
  p('  var btn = document.getElementById("btn-gen");');
  p('  btn.disabled = true;');
  p('  document.getElementById("btn-lbl").textContent = "SUBMITTING...";');
  p('  document.getElementById("result-panel").style.display = "none";');
  p('  setStatus("Submitting to Defapi...", "pending");');
  p('  var body = { prompt: prompt };');
  p('  if (imgB64) body.images = [imgB64];');
  p('  try {');
  p('    var res  = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({body:body}) });');
  p('    var data = await res.json();');
  p('    if (!res.ok || data.error) { setStatus("Submission failed: "+(data.error||res.status),"error"); toast("Submission failed: "+(data.error||"check server logs")); resetBtn(); return; }');
  p('    setStatus("Queued — polling for result...", "pending", data.task_id);');
  p('    startPolling(data.task_id);');
  p('    loadHistory();');
  p('  } catch(err) { setStatus("Network error: "+err.message,"error"); resetBtn(); }');
  p('}');

  // Polling
  p('function startPolling(taskId) {');
  p('  if (pollTimer) clearTimeout(pollTimer);');
  p('  var attempts = 0;');
  p('  function poll() {');
  p('    if (attempts++ > 120) { setStatus("Timed out.","error"); resetBtn(); return; }');
  p('    fetch("/api/status/"+encodeURIComponent(taskId))');
  p('      .then(function(r){ return r.json(); })');
  p('      .then(function(data) {');
  p('        if (data.error) { setStatus("Error: "+data.error,"error"); resetBtn(); return; }');
  p('        var s = (data.status||"").toLowerCase();');
  p('        if (s==="success"||s==="completed"||s==="succeeded") {');
  p('          var url=(data.result&&(data.result.video||data.result.url))||data.video_url||null;');
  p('          if (url) { setStatus("Done!","success",taskId); showResult(url); toast("Video ready!",true); }');
  p('          else setStatus("Complete but no video URL.","error");');
  p('          resetBtn(); loadHistory(); fetchBalance(); return;');
  p('        }');
  p('        if (s==="failed"||s==="error") { setStatus("Generation failed — try simplifying your prompt.","error"); resetBtn(); loadHistory(); return; }');
  p('        var pct=data.progress||0;');
  p('        if(pct>0){var f=document.getElementById("prog-fill");f.classList.remove("indet");f.style.width=pct+"%";}');
  p('        setStatus(pct>0?"Generating... "+pct+"% complete":"Generating video...","pending",taskId);');
  p('        pollTimer=setTimeout(poll,5000);');
  p('      })');
  p('      .catch(function(e){ setStatus("Poll error: "+e.message,"error"); resetBtn(); });');
  p('  }');
  p('  pollTimer=setTimeout(poll,8000);');
  p('}');

  // UI helpers
  p('function setStatus(lbl,state,taskId){');
  p('  document.getElementById("status-panel").style.display="block";');
  p('  document.getElementById("status-lbl").textContent=lbl;');
  p('  document.getElementById("status-task").textContent=taskId?"Task: "+taskId:"";');
  p('  document.getElementById("dot").className="dot "+state;');
  p('}');

  p('function showResult(url){');
  p('  document.getElementById("result-video").src=url;');
  p('  document.getElementById("result-url").textContent=url;');
  p('  document.getElementById("btn-dl").href=url;');
  p('  var p=document.getElementById("result-panel");');
  p('  p.style.display="block";');
  p('  p.scrollIntoView({behavior:"smooth",block:"start"});');
  p('}');

  p('function resetBtn(){');
  p('  document.getElementById("btn-gen").disabled=false;');
  p('  document.getElementById("btn-lbl").textContent="GENERATE VIDEO";');
  p('  if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}');
  p('}');

  p('var toastTimer=null;');
  p('function toast(msg,ok){');
  p('  var el=document.getElementById("toast");');
  p('  el.textContent=msg;');
  p('  el.className=ok?"ok show":"show";');
  p('  if(toastTimer) clearTimeout(toastTimer);');
  p('  toastTimer=setTimeout(function(){el.classList.remove("show");},4000);');
  p('}');

  p('<\/script>');
  p('</body></html>');

  return lines.join('\n');
}

/* ─── Routes ─────────────────────────────────────────────────────────────── */

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(buildHTML());
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Balance — try multiple Defapi endpoint patterns
app.get("/api/balance", async (req, res) => {
  const endpoints = [
    "https://api.defapi.org/api/user/balance",
    "https://api.defapi.org/api/user/info",
    "https://api.defapi.org/api/account/balance",
    "https://api.defapi.org/api/account",
  ];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${DEFAPI_KEY}` },
      });
      if (!r.ok) continue;
      const d = await r.json();
      // Defapi returns code:0 on success
      if (d.code === 0 || d.code === undefined) {
        const inner = d.data || d;
        const balance =
          inner.balance   ??
          inner.credits   ??
          inner.remaining ??
          inner.amount    ??
          null;
        if (balance !== null) return res.json({ balance });
      }
    } catch (_) { /* try next */ }
  }
  res.json({ balance: null, error: "Balance endpoint not available" });
});

// Generate
app.post("/api/generate", async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.prompt) return res.status(400).json({ error: "prompt is required" });

    const upstream = await fetch("https://api.defapi.org/api/sora2/gen", {
      method: "POST",
      headers: { "Authorization": `Bearer ${DEFAPI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();

    if (!upstream.ok)
      return res.status(upstream.status).json({ error: data.message || data.error || "Defapi error", details: data });
    if (data.code !== undefined && data.code !== 0)
      return res.status(400).json({ error: data.message || "Non-zero code", details: data });

    const taskId = (data.data && (data.data.task_id || data.data.id)) || data.task_id || null;
    if (!taskId) return res.status(500).json({ error: "No task_id in response", raw: data });

    // Save to history
    const entry = {
      id:        crypto.randomUUID(),
      taskId,
      prompt:    body.prompt,
      aspect:    body.aspect    || "16:9",
      duration:  body.duration  || "10",
      quality:   body.quality   || "standard",
      status:    "pending",
      videoUrl:  null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addHistory(entry);

    res.json({ task_id: taskId });

  } catch (err) {
    console.error("[/api/generate]", err);
    res.status(500).json({ error: err.message });
  }
});

// Status
app.get("/api/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const upstream = await fetch(
      `https://api.defapi.org/api/task/query?task_id=${encodeURIComponent(taskId)}`,
      { method: "GET", headers: { "Authorization": `Bearer ${DEFAPI_KEY}` } }
    );
    const data = await upstream.json();
    if (!upstream.ok)
      return res.status(upstream.status).json({ error: data.message || data.error || "Status error" });

    const inner    = data.data || data;
    const status   = inner.status   || data.status   || "pending";
    const progress = inner.progress || data.progress || 0;
    const result   = inner.result   || data.result   || null;
    const videoUrl = (result && (result.video || result.url)) || inner.video_url || null;

    // Auto-update history
    const statusLower = status.toLowerCase();
    if (statusLower === "success" || statusLower === "completed" || statusLower === "succeeded") {
      updateHistory(taskId, { status: "success", videoUrl });
    } else if (statusLower === "failed" || statusLower === "error") {
      updateHistory(taskId, { status: "failed" });
    }

    res.json({ status, progress, result, video_url: videoUrl });

  } catch (err) {
    console.error("[/api/status]", err);
    res.status(500).json({ error: err.message });
  }
});

// History — GET
app.get("/api/history", (req, res) => {
  res.json(history);
});

// History — manual update (recheck)
app.post("/api/history/update", (req, res) => {
  const { taskId, status, videoUrl } = req.body;
  const item = updateHistory(taskId, { status, videoUrl: videoUrl || null });
  res.json({ ok: true, item });
});

// History — clear
app.delete("/api/history", (req, res) => {
  history.length = 0;
  res.json({ ok: true });
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SORA 2 Studio → http://0.0.0.0:${PORT}`);
});
