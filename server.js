/**
 * Sora 2 Video Generator — Unified Server + Frontend
 * Defapi (api.defapi.org) backend  |  Single-file Express app
 * Deploy directly to Railway — no modifications needed.
 *
 * ENV VARS (set in Railway Variables tab, or a local .env file):
 *   DEFAPI_KEY  — your Defapi Bearer token  (REQUIRED)
 *   PORT        — auto-set by Railway        (defaults to 3000)
 */

require("dotenv").config();

const express = require("express");
const fetch   = (...a) => import("node-fetch").then(({ default: f }) => f(...a));

const DEFAPI_KEY = process.env.DEFAPI_KEY;
if (!DEFAPI_KEY) {
  console.error(
    "\n DEFAPI_KEY environment variable is not set.\n" +
    "    Local:   create a .env file  ->  DEFAPI_KEY=dk-xxxxxxxx\n" +
    "    Railway: add it in the project Variables tab.\n"
  );
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "25mb" }));

/* ─── Frontend HTML ──────────────────────────────────────────────────────── */
function getHTML() {
  const html = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>SORA 2 - AI Video Studio</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com"/>',
    '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@300;400;500&family=DM+Sans:wght@300;400&display=swap" rel="stylesheet"/>',
    '<style>',
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}',
    ':root{',
    '  --bg:#090909;--surface:#111;--panel:#161616;--border:#252525;',
    '  --amber:#f5a623;--amber2:#ffcc66;--muted:#555;--text:#e8e0d4;',
    '  --sub:#888;--red:#e05252;--green:#52e07a;--r:6px;',
    '  --mono:"IBM Plex Mono",monospace;',
    '  --display:"Bebas Neue",sans-serif;',
    '  --body:"DM Sans",sans-serif;',
    '}',
    'html,body{background:var(--bg);color:var(--text);font-family:var(--body);min-height:100vh;overflow-x:hidden}',
    '.page{position:relative;z-index:1;max-width:820px;margin:0 auto;padding:48px 24px 80px}',
    'header{display:flex;align-items:flex-end;gap:16px;margin-bottom:52px;padding-bottom:20px;border-bottom:1px solid var(--border)}',
    '.logo{font-family:var(--display);font-size:52px;line-height:1;letter-spacing:2px;',
    '  background:linear-gradient(135deg,var(--amber) 0%,var(--amber2) 60%,#fff5cc 100%);',
    '  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;',
    '  filter:drop-shadow(0 0 18px rgba(245,166,35,.35))}',
    '.logo-sub{font-family:var(--mono);font-size:11px;color:var(--sub);letter-spacing:.12em;text-transform:uppercase;padding-bottom:6px}',
    '.tag{margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.1em;padding:4px 8px;border:1px solid var(--border);border-radius:3px;white-space:nowrap}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:32px;margin-bottom:24px;position:relative;overflow:hidden}',
    '.card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--amber),transparent);opacity:.5}',
    'label{display:block;font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--sub);margin-bottom:8px}',
    '.field{margin-bottom:24px}',
    '.field:last-child{margin-bottom:0}',
    'textarea,select,input[type=text]{width:100%;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:15px;padding:12px 14px;outline:none;transition:border-color .2s,box-shadow .2s;appearance:none;-webkit-appearance:none}',
    'textarea:focus,select:focus,input:focus{border-color:var(--amber);box-shadow:0 0 0 3px rgba(245,166,35,.12)}',
    'textarea{resize:vertical;min-height:120px;line-height:1.6}',
    'select option{background:var(--panel)}',
    '.row{display:grid;gap:16px}',
    '.row-3{grid-template-columns:1fr 1fr 1fr}',
    '@media(max-width:560px){.row-3{grid-template-columns:1fr}}',
    '.dropzone{background:var(--panel);border:1.5px dashed var(--border);border-radius:var(--r);padding:28px 20px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;position:relative}',
    '.dropzone:hover,.dropzone.drag{border-color:var(--amber);background:rgba(245,166,35,.04)}',
    '.dropzone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}',
    '.dz-icon{font-size:28px;margin-bottom:8px}',
    '.dz-label{font-family:var(--mono);font-size:12px;color:var(--sub)}',
    '.dz-preview{margin-top:12px}',
    '.dz-preview img{max-height:100px;border-radius:4px;object-fit:cover;opacity:.85}',
    '.hint{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:6px;line-height:1.6}',
    '.hint a{color:var(--amber);text-decoration:none}',
    '.section-title{font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.18em;text-transform:uppercase;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid var(--border)}',
    '.btn-gen{width:100%;background:var(--amber);color:#0a0700;font-family:var(--display);font-size:22px;letter-spacing:2px;padding:16px;border:none;border-radius:var(--r);cursor:pointer;position:relative;overflow:hidden;transition:filter .2s,transform .1s}',
    '.btn-gen:hover{filter:brightness(1.12)}',
    '.btn-gen:active{transform:scale(.99)}',
    '.btn-gen:disabled{opacity:.45;cursor:not-allowed;filter:none}',
    '.shimmer{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);transform:translateX(-100%);transition:transform .6s}',
    '.btn-gen:not(:disabled):hover .shimmer{transform:translateX(100%)}',
    '#status-panel{display:none;margin-top:20px}',
    '.status-bar{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:20px 24px}',
    '.status-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
    '.dot{width:10px;height:10px;border-radius:50%;background:var(--amber);box-shadow:0 0 8px var(--amber);flex-shrink:0}',
    '.dot.success{background:var(--green);box-shadow:0 0 8px var(--green)}',
    '.dot.error{background:var(--red);box-shadow:0 0 8px var(--red);animation:none}',
    '.dot.pending{animation:pulse 1.2s ease-in-out infinite}',
    '@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}',
    '.status-label{font-family:var(--mono);font-size:13px;letter-spacing:.08em}',
    '.status-task{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px;word-break:break-all}',
    '.prog-wrap{background:var(--panel);border-radius:3px;height:4px;overflow:hidden}',
    '.prog-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--amber2));border-radius:3px;width:0%;transition:width .5s ease}',
    '.prog-fill.indet{animation:indet 1.4s linear infinite;width:40%!important}',
    '@keyframes indet{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}',
    '#result-panel{display:none;margin-top:20px}',
    '.result-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}',
    '.result-card video{width:100%;display:block;background:#000}',
    '.result-footer{padding:16px 20px;display:flex;align-items:center;gap:12px;border-top:1px solid var(--border)}',
    '.result-info{flex:1}',
    '.result-title{font-family:var(--mono);font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:.1em}',
    '.result-label{font-size:13px;color:var(--text);margin-top:2px;word-break:break-all}',
    '.btn-dl{background:transparent;border:1px solid var(--amber);color:var(--amber);font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:9px 16px;border-radius:var(--r);cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-block;transition:background .2s,color .2s}',
    '.btn-dl:hover{background:var(--amber);color:#0a0700}',
    '.tips-hdr{display:flex;align-items:center;gap:10px;cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;padding:16px 0;border-top:1px solid var(--border);user-select:none}',
    '.chev{transition:transform .25s}',
    '.tips-hdr.open .chev{transform:rotate(180deg)}',
    '.tips-body{display:none;padding-bottom:20px}',
    '.tips-body.open{display:block}',
    '.tip-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}',
    '@media(max-width:560px){.tip-grid{grid-template-columns:1fr}}',
    '.chip{background:var(--panel);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;font-family:var(--mono);font-size:10px;color:var(--sub);cursor:pointer;transition:border-color .2s,color .2s;line-height:1.5}',
    '.chip:hover{border-color:var(--amber);color:var(--text)}',
    '#toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(80px);background:#1e0e0e;border:1px solid var(--red);color:var(--red);font-family:var(--mono);font-size:12px;padding:12px 20px;border-radius:var(--r);z-index:999;transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .35s;opacity:0;white-space:nowrap;max-width:90vw}',
    '#toast.show{transform:translateX(-50%) translateY(0);opacity:1}',
    'footer{margin-top:56px;padding-top:20px;border-top:1px solid var(--border);text-align:center;font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.08em}',
    '</style>',
    '</head>',
    '<body>',
    '<div class="page">',
    '<header>',
    '  <div>',
    '    <div class="logo">SORA 2</div>',
    '    <div class="logo-sub">AI Video Studio</div>',
    '  </div>',
    '  <div class="tag">powered by Defapi</div>',
    '</header>',
    '<div class="card">',
    '  <div class="section-title">Video Generation</div>',
    '  <div class="field">',
    '    <label>Prompt *</label>',
    '    <textarea id="prompt" placeholder="A cinematic drone shot over a misty forest at dawn, warm golden light breaking through the canopy, orchestral score swelling..."></textarea>',
    '    <p class="hint">Tip: start with (15s,hd) for a 15-second HD video.</p>',
    '  </div>',
    '  <div class="row row-3 field">',
    '    <div>',
    '      <label>Duration</label>',
    '      <select id="duration">',
    '        <option value="10">10 seconds</option>',
    '        <option value="15">15 seconds</option>',
    '      </select>',
    '    </div>',
    '    <div>',
    '      <label>Aspect Ratio</label>',
    '      <select id="aspect">',
    '        <option value="16:9">16:9 Landscape</option>',
    '        <option value="9:16">9:16 Portrait</option>',
    '        <option value="1:1">1:1 Square</option>',
    '      </select>',
    '    </div>',
    '    <div>',
    '      <label>Quality</label>',
    '      <select id="quality">',
    '        <option value="">Standard</option>',
    '        <option value="hd">HD</option>',
    '      </select>',
    '    </div>',
    '  </div>',
    '  <div class="field">',
    '    <label>Reference Image (optional)</label>',
    '    <div class="dropzone" id="dropzone">',
    '      <input type="file" id="ref-image" accept=".jpg,.jpeg,.png,.webp" onchange="previewImage(this)"/>',
    '      <div class="dz-icon">&#127902;</div>',
    '      <div class="dz-label">Drop an image here or click to browse</div>',
    '      <div class="dz-preview" id="dz-preview"></div>',
    '    </div>',
    '    <p class="hint">Avoid images with real human faces - they are rejected by content moderation.</p>',
    '  </div>',
    '  <div class="field">',
    '    <label>Negative Prompt (optional)</label>',
    '    <input type="text" id="neg-prompt" placeholder="blurry, low quality, watermark..."/>',
    '  </div>',
    '  <button class="btn-gen" id="btn-gen" onclick="generate()">',
    '    <span class="shimmer"></span>',
    '    <span id="btn-label">GENERATE VIDEO</span>',
    '  </button>',
    '</div>',
    '<div id="status-panel">',
    '  <div class="status-bar">',
    '    <div class="status-header">',
    '      <div class="dot pending" id="dot"></div>',
    '      <div>',
    '        <div class="status-label" id="status-label">Submitting request...</div>',
    '        <div class="status-task" id="status-task"></div>',
    '      </div>',
    '    </div>',
    '    <div class="prog-wrap">',
    '      <div class="prog-fill indet" id="prog-fill"></div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div id="result-panel">',
    '  <div class="result-card">',
    '    <video id="result-video" controls playsinline autoplay loop></video>',
    '    <div class="result-footer">',
    '      <div class="result-info">',
    '        <div class="result-title">Generated Video</div>',
    '        <div class="result-label" id="result-label">-</div>',
    '      </div>',
    '      <a class="btn-dl" id="btn-dl" href="#" target="_blank" download>Download</a>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div style="margin-top:8px">',
    '  <div class="tips-hdr" id="tips-hdr" onclick="toggleTips()">',
    '    <span>Prompt tips and examples</span>',
    '    <span class="chev">&#9662;</span>',
    '  </div>',
    '  <div class="tips-body" id="tips-body">',
    '    <div class="tip-grid">',
    '      <div class="chip" onclick="loadPrompt(this)">A pack of dogs driving tiny cars in a high-speed city chase, wearing sunglasses, dramatic action music.</div>',
    '      <div class="chip" onclick="loadPrompt(this)">(15s,hd) Animated fantasy landscape with floating islands, waterfalls into clouds, golden sunset, orchestral music.</div>',
    '      <div class="chip" onclick="loadPrompt(this)">A lone astronaut walking on Mars at dusk, long shadows, red dust swirling, cinematic wide angle, ambient electronic score.</div>',
    '      <div class="chip" onclick="loadPrompt(this)">(15s,hd) Product showcase: sleek watch rotating 360 degrees, dramatic key light, particle effects, minimal music.</div>',
    '      <div class="chip" onclick="loadPrompt(this)">Timelapse of a seed sprouting into a full plant, macro lens, soft studio lighting, gentle ambient sound.</div>',
    '      <div class="chip" onclick="loadPrompt(this)">Abstract painting dissolving into colourful liquid, slow swirling motion, purple gold and cyan hues, ambient music.</div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<footer>SORA 2 STUDIO - Defapi API Wrapper</footer>',
    '</div>',
    '<div id="toast"></div>',
    '<script>',
    'var pollTimer = null;',
    'function toggleTips(){',
    '  document.getElementById("tips-hdr").classList.toggle("open");',
    '  document.getElementById("tips-body").classList.toggle("open");',
    '}',
    'function loadPrompt(el){',
    '  document.getElementById("prompt").value = el.textContent.trim();',
    '}',
    'function previewImage(input){',
    '  var p = document.getElementById("dz-preview");',
    '  if(input.files && input.files[0]){',
    '    var r = new FileReader();',
    '    r.onload = function(e){ p.innerHTML = "<img src=" + e.target.result + " alt=preview/>"; };',
    '    r.readAsDataURL(input.files[0]);',
    '  }',
    '}',
    'var dz = document.getElementById("dropzone");',
    'dz.addEventListener("dragover",function(e){e.preventDefault();dz.classList.add("drag");});',
    'dz.addEventListener("dragleave",function(){dz.classList.remove("drag");});',
    'dz.addEventListener("drop",function(e){',
    '  e.preventDefault();dz.classList.remove("drag");',
    '  var f=e.dataTransfer.files[0];',
    '  if(f){document.getElementById("ref-image").files=e.dataTransfer.files;previewImage(document.getElementById("ref-image"));}',
    '});',
    'function toast(msg){',
    '  var el=document.getElementById("toast");',
    '  el.textContent=msg;el.classList.add("show");',
    '  setTimeout(function(){el.classList.remove("show");},4200);',
    '}',
    'function buildPrompt(){',
    '  var raw=document.getElementById("prompt").value.trim();',
    '  var dur=document.getElementById("duration").value;',
    '  var q=document.getElementById("quality").value;',
    '  var neg=document.getElementById("neg-prompt").value.trim();',
    '  var pre="";',
    '  if(dur==="15"&&q==="hd"&&raw.indexOf("(15s,hd)")!==0) pre="(15s,hd) ";',
    '  else if(dur==="15"&&raw.indexOf("(15s")!==0) pre="(15s) ";',
    '  else if(q==="hd"&&raw.indexOf("(hd)")!==0&&raw.indexOf("(15s,hd)")!==0) pre="(hd) ";',
    '  var full=pre+raw;',
    '  if(neg) full+=" [avoid: "+neg+"]";',
    '  return full;',
    '}',
    'function fileToBase64(file){',
    '  return new Promise(function(resolve,reject){',
    '    var r=new FileReader();',
    '    r.onload=function(){resolve(r.result);};',
    '    r.onerror=reject;',
    '    r.readAsDataURL(file);',
    '  });',
    '}',
    'async function generate(){',
    '  var prompt=buildPrompt();',
    '  if(!prompt){toast("Please enter a prompt.");return;}',
    '  var imgInput=document.getElementById("ref-image");',
    '  var imgB64=null;',
    '  if(imgInput.files&&imgInput.files[0]) imgB64=await fileToBase64(imgInput.files[0]);',
    '  var btn=document.getElementById("btn-gen");',
    '  btn.disabled=true;',
    '  document.getElementById("btn-label").textContent="SUBMITTING...";',
    '  document.getElementById("result-panel").style.display="none";',
    '  setStatus("Submitting request to Defapi...","pending");',
    '  var body={prompt:prompt};',
    '  if(imgB64) body.images=[imgB64];',
    '  try{',
    '    var res=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:body})});',
    '    var data=await res.json();',
    '    if(!res.ok||data.error){setStatus("Submission failed: "+(data.error||res.status),"error");toast("Submission failed.");resetBtn();return;}',
    '    setStatus("Queued - polling for completion...","pending",data.task_id);',
    '    startPolling(data.task_id);',
    '  }catch(err){setStatus("Network error: "+err.message,"error");resetBtn();}',
    '}',
    'function startPolling(taskId){',
    '  var attempts=0;',
    '  function poll(){',
    '    if(attempts++>120){setStatus("Timed out.","error");resetBtn();return;}',
    '    fetch("/api/status/"+encodeURIComponent(taskId))',
    '      .then(function(r){return r.json();})',
    '      .then(function(data){',
    '        if(data.error){setStatus("Error: "+data.error,"error");resetBtn();return;}',
    '        var s=(data.status||"").toLowerCase();',
    '        if(s==="success"||s==="completed"||s==="succeeded"){',
    '          var url=(data.result&&(data.result.video||data.result.url))||data.video_url||null;',
    '          if(url){setStatus("Generation complete!","success",taskId);showResult(url);}',
    '          else setStatus("Done but no video URL returned.","error");',
    '          resetBtn();return;',
    '        }',
    '        if(s==="failed"||s==="error"){setStatus("Generation failed - simplify your prompt.","error");resetBtn();return;}',
    '        var pct=data.progress||0;',
    '        if(pct>0){var f=document.getElementById("prog-fill");f.classList.remove("indet");f.style.width=pct+"%";}',
    '        setStatus(pct>0?"Generating... "+pct+"% complete":"Generating video...","pending",taskId);',
    '        pollTimer=setTimeout(poll,5000);',
    '      })',
    '      .catch(function(err){setStatus("Poll error: "+err.message,"error");resetBtn();});',
    '  }',
    '  pollTimer=setTimeout(poll,8000);',
    '}',
    'function setStatus(label,state,taskId){',
    '  var p=document.getElementById("status-panel");',
    '  p.style.display="block";',
    '  document.getElementById("status-label").textContent=label;',
    '  document.getElementById("status-task").textContent=taskId?"Task ID: "+taskId:"";',
    '  document.getElementById("dot").className="dot "+state;',
    '}',
    'function showResult(url){',
    '  var p=document.getElementById("result-panel");',
    '  document.getElementById("result-video").src=url;',
    '  document.getElementById("result-label").textContent=url;',
    '  document.getElementById("btn-dl").href=url;',
    '  p.style.display="block";',
    '  p.scrollIntoView({behavior:"smooth",block:"start"});',
    '}',
    'function resetBtn(){',
    '  var btn=document.getElementById("btn-gen");',
    '  btn.disabled=false;',
    '  document.getElementById("btn-label").textContent="GENERATE VIDEO";',
    '  if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}',
    '}',
    '<\/script>',
    '</body>',
    '</html>'
  ].join('\n');
  return html;
}

/* ─── Routes ─────────────────────────────────────────────────────────────── */

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(getHTML());
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const upstream = await fetch("https://api.defapi.org/api/sora2/gen", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEFAPI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.message || data.error || "Defapi API error",
        details: data,
      });
    }

    if (data.code !== undefined && data.code !== 0) {
      return res.status(400).json({
        error: data.message || "Defapi returned a non-zero code",
        details: data,
      });
    }

    const taskId =
      (data.data && (data.data.task_id || data.data.id)) ||
      data.task_id ||
      null;

    if (!taskId) {
      return res.status(500).json({ error: "No task_id in response", raw: data });
    }

    res.json({ task_id: taskId });

  } catch (err) {
    console.error("[/api/generate]", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/status/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const upstream = await fetch(
      `https://api.defapi.org/api/task/query?task_id=${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${DEFAPI_KEY}` },
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.message || data.error || "Status check error",
        details: data,
      });
    }

    const inner    = data.data || data;
    const status   = inner.status   || data.status   || "pending";
    const progress = inner.progress || data.progress || 0;
    const result   = inner.result   || data.result   || null;
    const videoUrl = (result && (result.video || result.url)) || inner.video_url || null;

    res.json({ status, progress, result, video_url: videoUrl });

  } catch (err) {
    console.error("[/api/status]", err);
    res.status(500).json({ error: err.message });
  }
});

/* ─── Start ──────────────────────────────────────────────────────────────── */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SORA 2 Studio running on http://0.0.0.0:${PORT}`);
});
