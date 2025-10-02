// Photo Studio Pro — app.js
/* global emailjs, faceapi */
const fileInput = document.getElementById('fileInput');
const stage = document.getElementById('stage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const exportBtn = document.getElementById('exportBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const noImageHint = document.getElementById('noImageHint');
const sizeSelect = document.getElementById('sizeSelect');
const frameSelect = document.getElementById('frameSelect');
const roleBadge = document.getElementById('roleBadge');

// AI controls
const bgPrompt = document.getElementById('bgPrompt');
const bgReplaceBtn = document.getElementById('bgReplaceBtn');
const fgReplaceBtn = document.getElementById('fgReplaceBtn');
const ageMode = document.getElementById('ageMode');
const ageRunBtn = document.getElementById('ageRunBtn');
const celebName = document.getElementById('celebName');
const celebRunBtn = document.getElementById('celebRunBtn');

// Email
const sendEmailBtn = document.getElementById('sendEmailBtn');
const emailTo = document.getElementById('emailTo');

// Text tool
const textInput = document.getElementById('textInput');
const textFont = document.getElementById('textFont');
const textSize = document.getElementById('textSize');
const textColor = document.getElementById('textColor');
const textBold = document.getElementById('textBold');
const textShadow = document.getElementById('textShadow');
const addTextBtn = document.getElementById('addTextBtn');

// Multi-page export
const addPageBtn = document.getElementById('addPageBtn');
const clearPagesBtn = document.getElementById('clearPagesBtn');
const pagesInfo = document.getElementById('pagesInfo');
let pages = [];

// State
let baseImg = null;
let currentFilter = 'none';
let currentTheme = null;
let landmarks = null; // face landmarks results
const accessories = {};
const ACC_DEFS = {
  glasses: { text:'🕶️' },
  hat: { text:'🎩' },
  earrings: { text:'💎' },
  necklace: { text:'📿' },
};

// Role gating
let ROLE = 'viewer';
function applyRoleGates(){
  roleBadge.textContent = 'role: ' + ROLE;
  const isPro = (ROLE === 'admin' || ROLE === 'editor');
  document.querySelectorAll('.gated-pro .btn, .gated-pro input, .gated-pro select')
    .forEach(el => { el.disabled = !isPro; el.title = isPro ? '' : 'Pro feature (admin/editor only)'; });
}
window.addEventListener('role-change', (e)=>{
  ROLE = e.detail.role || 'viewer';
  applyRoleGates();
});

// Face-api model loading
let faceModelsReady = false;
async function loadFaceModels(){
  try{
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    faceModelsReady = true;
  }catch(e){
    console.warn('face-api models failed to load', e);
  }
}
loadFaceModels();

function setCanvasSizeByOption(){
  const val = sizeSelect.value;
  const w = parseInt(val, 10);
  const h = (val === '1350') ? 1350 : (val === '1920' ? 1080 : (val === '3000' ? 2000 : 1080));
  canvas.width = w;
  canvas.height = h;
}

function drawBase(){
  if(!baseImg) return;
  setCanvasSizeByOption();
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
  applyClientFilter();
  applyTheme();
  applyFrame();
}

function applyClientFilter(){
  if(currentFilter === 'none') return;
  const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const d = imgData.data;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2];
    switch(currentFilter){
      case 'cartoon': {
        const q = v => Math.round(v/32)*32;
        d[i]=q(r); d[i+1]=q(g); d[i+2]=q(b);
        break;
      }
      case 'caricature': {
        const boost = (v)=>{
          const x=(v/255)-0.5;
          return Math.max(0, Math.min(255, 255*(0.5 + 1.4*x)));
        };
        d[i]=boost(r); d[i+1]=boost(g); d[i+2]=boost(b);
        break;
      }
      case 'watercolor': {
        const gamma = v => Math.pow(v/255, 0.9)*255;
        d[i]=gamma((r*0.9+g*0.05+b*0.05)); d[i+1]=gamma((g*0.9+r*0.05+b*0.05)); d[i+2]=gamma((b*0.9+r*0.05+g*0.05));
        break;
      }
      case 'oil': {
        const c = (v)=>Math.min(255, Math.max(0, (v-128)*1.25 + 128));
        d[i]=c(r*1.05); d[i+1]=c(g*0.98); d[i+2]=c(b*0.92);
        break;
      }
      case 'posterize': {
        const q = v => Math.round(v/64)*64;
        d[i]=q(r); d[i+1]=q(g); d[i+2]=q(b);
        break;
      }
    }
  }
  ctx.putImageData(imgData,0,0);
}

function applyFrame(){
  canvas.classList.remove('frame-simple','frame-ornate','frame-film');
  switch(frameSelect.value){
    case 'simple': canvas.classList.add('frame-simple'); break;
    case 'ornate': canvas.classList.add('frame-ornate'); break;
    case 'film': canvas.classList.add('frame-film'); break;
  }
}

function applyTheme(){
  if(!currentTheme) return;
  ctx.save();
  switch(currentTheme){
    case 'graduation': tone('#1e3a8a',0.18); sticker('🎓', 0.1, 0.1); break;
    case 'speech': tone('#0ea5e9',0.18); sticker('🎤', 0.85, 0.1); break;
    case 'campaign': tone('#ef4444',0.15); sticker('⭐', 0.08, 0.08); sticker('⭐', 0.92, 0.08); break;
    case 'sports': tone('#16a34a',0.15); sticker('🏆', 0.9, 0.1); break;
  }
  ctx.restore();
}

function tone(color,alpha){
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalAlpha = 1;
}
function sticker(text, nx, ny){
  const x = Math.round(nx*canvas.width);
  const y = Math.round(ny*canvas.height);
  ctx.font = Math.round(canvas.width*0.06)+'px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

// ---------- File load & face landmarks ----------
fileInput.addEventListener('change', async (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  baseImg = await loadImage(URL.createObjectURL(f));
  noImageHint.style.display = 'none';
  drawBase();
  landmarks = null;
  if(faceModelsReady){
    // run detector on a scaled temporary canvas for speed
    const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
    if(det && det.landmarks){
      landmarks = det.landmarks;
      autoFitAccessories();
    }
  }
});

function loadImage(src){
  return new Promise((res,rej)=>{
    const img = new Image(); img.crossOrigin='anonymous';
    img.onload = ()=>res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ---------- Accessories auto-fit ----------
function autoFitAccessories(){
  if(!landmarks) return;
  const pts = landmarks.positions;
  const leftEye = avgPoint(pts[36], pts[39]);  // eye region indices
  const rightEye = avgPoint(pts[42], pts[45]);
  const nose = pts[33];
  const jawLeft = pts[2], jawRight = pts[14];
  const earSpan = dist(jawLeft, jawRight);

  // Glasses — span across eyes
  placeAccessory('glasses', midPoint(leftEye, rightEye), angleBetween(leftEye,rightEye), earSpan*0.55);

  // Hat — above midpoint between eyes
  const center = midPoint(leftEye, rightEye);
  placeAccessory('hat', {x:center.x, y:center.y - earSpan*0.7}, 0, earSpan*0.9);

  // Earrings — near jaw points
  placeAccessory('earrings', {x:jawLeft.x, y:jawLeft.y+10}, 0, earSpan*0.12);
  placeAccessory('earrings', {x:jawRight.x, y:jawRight.y+10}, 0, earSpan*0.12, true);

  // Necklace — under nose/chin
  const chin = pts[8];
  placeAccessory('necklace', {x:chin.x, y:chin.y+earSpan*0.25}, 0, earSpan*0.4);
}

function placeAccessory(key, pt, angle=0, pxSize=40, mirror=false){
  const el = accessories[key] || document.querySelector(`.overlay[data-acc="${key}"]`) || createAccessoryElement(key);
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  const left = rect.left + pt.x * scaleX;
  const top = rect.top + pt.y * scaleY;
  el.style.left = (left - stage.getBoundingClientRect().left) + 'px';
  el.style.top  = (top - stage.getBoundingClientRect().top) + 'px';
  el.style.fontSize = (pxSize * scaleX) + 'px';
  el.style.transform = `translate(-50%,-50%) rotate(${angle}rad) ${mirror?'scaleX(-1)':''}`;
}

function createAccessoryElement(key){
  const el = document.createElement('div');
  el.className = 'overlay';
  el.dataset.acc = key;
  el.textContent = ACC_DEFS[key].text;
  enableDrag(el);
  stage.appendChild(el);
  accessories[key] = el;
  return el;
}

function avgPoint(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }
function midPoint(a,b){ return avgPoint(a,b); }
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function angleBetween(a,b){ return Math.atan2(b.y-a.y, b.x-a.x); }

// Toggle from checkboxes (manual add/remove)
document.querySelectorAll('input[type="checkbox"][data-acc]').forEach(ch=>{
  ch.addEventListener('change', ()=>{
    const key = ch.dataset.acc;
    if(ch.checked){
      const el = accessories[key] || createAccessoryElement(key);
      if(landmarks) autoFitAccessories();
    }else{
      if(accessories[key]){ accessories[key].remove(); delete accessories[key]; }
    }
  });
});

// Drag & pinch resize
function enableDrag(el){
  let sx=0, sy=0, startX=0, startY=0;
  el.addEventListener('pointerdown', (e)=>{
    const r = el.getBoundingClientRect();
    startX = r.left + r.width/2;
    startY = r.top + r.height/2;
    sx = e.clientX; sy = e.clientY;
    const onMove = (ev)=>{
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      el.style.left = ( (startX+dx) - stage.getBoundingClientRect().left ) + 'px';
      el.style.top  = ( (startY+dy) - stage.getBoundingClientRect().top ) + 'px';
    };
    const onUp = ()=>{
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once:true });
  }, {passive:true});
}

// ---------- Text tool ----------
addTextBtn.addEventListener('click', ()=>{
  const text = textInput.value.trim();
  if(!text) return;
  const el = document.createElement('div');
  el.className = 'overlay textbox';
  el.contentEditable = true;
  el.textContent = text;
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.transform = 'translate(-50%,-50%)';
  applyTextStyle(el);
  enableDrag(el);
  enableWheelResize(el);
  stage.appendChild(el);
});

function applyTextStyle(el){
  el.style.fontFamily = textFont.value || 'system-ui';
  el.style.fontSize = (parseInt(textSize.value||48,10)) + 'px';
  el.style.color = textColor.value || '#ffffff';
  el.style.fontWeight = textBold.checked ? '800' : '500';
  el.style.textShadow = textShadow.checked ? '0 2px 6px rgba(0,0,0,.9)' : 'none';
}
[textFont, textSize, textColor, textBold, textShadow].forEach(ctrl=>{
  ctrl.addEventListener('input', ()=>{
    document.querySelectorAll('.textbox').forEach(applyTextStyle);
  });
});
function enableWheelResize(el){
  el.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const cur = parseFloat(getComputedStyle(el).fontSize);
    const next = Math.max(8, Math.min(200, cur + (e.deltaY < 0 ? 2 : -2)));
    el.style.fontSize = next + 'px';
  }, {passive:false});
}

// ---------- Compose (canvas + overlays) ----------
function composeToCanvas(){
  drawBase();
  const cRect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / cRect.width;
  const scaleY = canvas.height / cRect.height;
  stage.querySelectorAll('.overlay').forEach(el=>{
    const r = el.getBoundingClientRect();
    const cx = (r.left - cRect.left) + r.width/2;
    const cy = (r.top  - cRect.top ) + r.height/2;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    ctx.save();
    // read rotation/scale from transform
    const tr = getComputedStyle(el).transform;
    if(tr && tr !== 'none'){
      const m = new DOMMatrix(tr);
      ctx.translate(cx*scaleX, cy*scaleY);
      const angle = Math.atan2(m.b, m.a);
      ctx.rotate(angle);
      const scale = Math.hypot(m.a, m.b);
      ctx.scale(scale, scale);
      ctx.translate(-0, -0);
      ctx.font = fs*scaleX + 'px ' + (el.classList.contains('textbox') ? (textFont.value||'system-ui') : 'system-ui');
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = el.style.color || '#fff';
      const shadow = el.style.textShadow;
      if(shadow && shadow !== 'none'){ ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
      ctx.fillText(el.textContent, 0, 0);
    }else{
      ctx.font = fs*scaleX + 'px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(el.textContent, cx*scaleX, cy*scaleY);
    }
    ctx.restore();
  });
}

// ---------- Export PNG (upload + log) ----------
exportBtn.addEventListener('click', async ()=>{
  if(!baseImg){ alert('ဓာတ်ပုံတင်ပြီးမှ Export လုပ်နိုင်ပါသည်'); return; }
  composeToCanvas();
  canvas.toBlob(async (blob)=>{
    try{
      const { storage, db } = window.__fb;
      const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js');
      const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js');
      const path = `exports/${window.__uid||'anon'}/${Date.now()}.png`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db,'exports'), { uid: window.__uid||null, url, path, ts: serverTimestamp(), filter: currentFilter, theme: currentTheme });
      alert('Uploaded: ' + url);
      window.__lastExportURL = url;
    }catch(err){ console.error(err); alert('Upload failed: '+err.message); }
  }, 'image/png');
});

// ---------- Multi-page PDF ----------
addPageBtn.addEventListener('click', ()=>{
  if(!baseImg){ alert('ပုံတင်ပါ'); return; }
  composeToCanvas();
  pages.push(canvas.toDataURL('image/jpeg', 0.92));
  pagesInfo.textContent = 'Pages: ' + pages.length;
});
clearPagesBtn.addEventListener('click', ()=>{
  pages = []; pagesInfo.textContent = 'Pages: 0';
});
exportPdfBtn.addEventListener('click', async ()=>{
  if(pages.length===0){ alert('Add pages first'); return; }
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  pages.forEach((dataUrl, i)=>{
    if(i>0) pdf.addPage();
    // fit image into A4 (595x842pt) with margins
    const pageW = 595, pageH = 842, margin = 24;
    const img = new Image(); img.src = dataUrl;
    // Since synchronous addImage is fine with dataUrl, compute scaled size roughly
    // We'll assume square-ish; scale to width
    const w = pageW - margin*2;
    const h = pageH - margin*2;
    pdf.addImage(dataUrl, 'JPEG', margin, margin, w, h, undefined, 'FAST');
  });
  pdf.save('poster.pdf');
});

// ---------- EmailJS ----------
(function(){
  const EMAILJS_PUBLIC_KEY = "WT0GOYrL9HnDKvLUf";
  const EMAILJS_SERVICE_ID = "service_z9tkmvr";
  const EMAILJS_TEMPLATE_ID = "template_q5q471f";
  emailjs.init(EMAILJS_PUBLIC_KEY);
  sendEmailBtn.addEventListener('click', async ()=>{
    try{
      if(!window.__lastExportURL){ composeToCanvas(); window.__lastExportURL = canvas.toDataURL('image/png'); }
      const params = { to_email: emailTo.value || "you@example.com", image_url: window.__lastExportURL };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
      alert('Email sent!');
    }catch(err){ console.error(err); alert('Email failed: ' + err.message); }
  });
})();

// ---------- AI calls via Cloud Function ----------
async function runAIEdit(kind, extra){
  if(!baseImg){ alert('ဓာတ်ပုံတင်ပြီးမှ AI ကို အလုပ်လုပ်ခိုင်းနိုင်ပါသည်'); return; }
  if(!(ROLE==='admin' || ROLE==='editor')){ alert('Pro feature — admin/editor only'); return; }
  composeToCanvas();
  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch('/api/image-edit', {
    method:'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ kind, extra, image: dataUrl })
  });
  if(!res.ok){
    const t = await res.text();
    alert('AI Error: ' + t);
    return;
  }
  const j = await res.json();
  const img = await loadImage(j.imageDataUrl);
  baseImg = img;
  // clear overlays after AI rewrite (optional)
  stage.querySelectorAll('.overlay').forEach(el=>el.remove());
  Object.keys(accessories).forEach(k=>delete accessories[k]);
  currentTheme = null;
  drawBase();
  // re-run landmarks
  try{
    if(faceModelsReady){
      const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
      landmarks = det?.landmarks || null;
      if(landmarks) autoFitAccessories();
    }
  }catch(e){ console.warn(e); }
}

bgReplaceBtn?.addEventListener('click', ()=> runAIEdit('bg', { prompt: bgPrompt.value||'' }));
fgReplaceBtn?.addEventListener('click', ()=> runAIEdit('fg', { prompt: bgPrompt.value||'' }));
ageRunBtn?.addEventListener('click', ()=> runAIEdit('age', { mode: ageMode.value||'older' }));
celebRunBtn?.addEventListener('click', ()=> runAIEdit('celeb', { celeb: celebName.value||'' }));

// ---------- UI bindings ----------
document.querySelectorAll('[data-filter]').forEach(btn=> btn.addEventListener('click', ()=>{ currentFilter = btn.dataset.filter; drawBase(); }));
document.querySelectorAll('[data-theme]').forEach(btn=> btn.addEventListener('click', ()=>{ currentTheme = btn.dataset.theme; drawBase(); }));
sizeSelect.addEventListener('change', drawBase);
frameSelect.addEventListener('change', ()=>{ applyFrame(); drawBase(); });
