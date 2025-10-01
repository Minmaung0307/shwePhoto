import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

/* ===================== CONFIG ===================== */
const firebaseConfig = {
  apiKey: "AIzaSyAuzySrz5G6PldnTljOJjmg1emKV5mqzz4",
  authDomain: "shwephoto-mm.firebaseapp.com",
  projectId: "shwephoto-mm",
  storageBucket: "shwephoto-mm.firebasestorage.app",
  messagingSenderId: "580359744533",
  appId: "1:580359744533:web:363b3a0113fb9e94dff21c",
  measurementId: "G-QN5EF2D0JY"
};
/* === IMPORTANT ===
1) Firebase console တွင် project တည်ဆောက်ပြီး အထက်ပါ config ကိုပြန်လည်ထည့်ပါ
2) Authentication → Sign-in method → Email/Password ကို Enable လုပ်ပါ
3) Firestore Database တင်ပြီး Rules ကို လောက်လောက်ခံ Sample အောက်ပါနမူနာကိုအသုံးပြုပါ (Dev only!)
4) Storage → Rules ကိုလည်း Dev အတွက်သာ အောက်ပါနမူနာ အသုံးပြုပါ
*/

/* ===== Sample Firestore Rules (DEV) =====
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /albums/{id} {
      allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    match /photos/{id} {
      allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
*/
/* ===== Sample Storage Rules (DEV) =====
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
*/

/* ===================== INIT ===================== */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ===================== HELPERS ===================== */
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>Array.from(root.querySelectorAll(sel));
function uid(){ return auth.currentUser?.uid; }
function initials(name='U'){ return name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(); }
function imgPath(name){ return `users/${uid()}/images/${Date.now()}_${name}`; }
function audioPath(name){ return `users/${uid()}/audio/${Date.now()}_${name}`; }
function coverUrl(photo){ return photo?.url || ''; }

/* ===================== DOM ===================== */
const authScreen = $('#authScreen');
const appScreen = $('#appScreen');
const tabLogin = $('#tabLogin');
const tabSignup = $('#tabSignup');
const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const loginEmail = $('#loginEmail');
const loginPass = $('#loginPass');
const signupName = $('#signupName');
const signupEmail = $('#signupEmail');
const signupPass = $('#signupPass');

const btnMenu = $('#btnMenu');
const sidebar = $('#sidebar');
const btnUpload = $('#btnUpload');
const btnBatch = $('#btnBatch');
const btnLogout = $('#btnLogout');
const albumList = $('#albumList');
const btnNewAlbum = $('#btnNewAlbum');
const gallery = $('#gallery');
const viewTabs = $('#viewTabs');
const quickFilters = $('#quickFilters');
const fFav = $('#fFav');
const fEdited = $('#fEdited');
const fCategory = $('#fCategory');
const fSort = $('#fSort');
const fSearch = $('#fSearch');
const albumAudio = $('#albumAudio');
const btnAttachAudio = $('#btnAttachAudio');
const player = $('#player');
const userInitials = $('#userInitials');
const userName = $('#userName');
const userEmail = $('#userEmail');

const uploadDlg = $('#uploadDlg');
const uploadForm = $('#uploadForm');
const fileInput = $('#fileInput');
const uTitle = $('#uTitle');
const uCaption = $('#uCaption');
const uDesc = $('#uDesc');
const uTags = $('#uTags');
const uAlbum = $('#uAlbum');
const btnDoUpload = $('#btnDoUpload');

const viewerDlg = $('#viewerDlg');
const canvasEl = $('#canvas');
const ctx = canvasEl.getContext('2d', {willReadFrequently:true});
const mTitle = $('#mTitle');
const mCaption = $('#mCaption');
const mDesc = $('#mDesc');
const btnMove = $('#btnMove');
const btnCover = $('#btnCover');
const btnDelete = $('#btnDelete');
const btnCloseViewer = $('#btnCloseViewer');
const btnApply = $('#btnApply');
const btnDownload = $('#btnDownload');
const btnSticker = $('#btnSticker');
const btnFrame = $('#btnFrame');
const btnWatermark = $('#btnWatermark');
const btnFav = $('#btnFav');
const bgColor = $('#bgColor');
const bgImage = $('#bgImage');
const slBright = $('#slBright');
const slContrast = $('#slContrast');
const slSatu = $('#slSatu');
const slHue = $('#slHue');
const slBlur = $('#slBlur');

const batchBar = $('#batchBar');
const batchCount = $('#batchCount');
const batchMove = $('#batchMove');
const batchTag = $('#batchTag');
const batchDelete = $('#batchDelete');
const batchFilter = $('#batchFilter');
const batchClear = $('#batchClear');

const tplCard = $('#tplPhotoCard');

/* ===================== STATE ===================== */
let currentAlbumId = null;
let albums = [];
let photos = [];
let filtered = [];
let currentPhoto = null;
let originalImageBitmap = null;
let currentView = 'grid';
let effectPreset = 'none';
let bgLayer = null;
let selectMode = false;
let selectedIds = new Set();

/* ===================== AUTH ===================== */
tabLogin.addEventListener('click', ()=>{
  tabLogin.classList.add('active'); tabSignup.classList.remove('active');
  loginForm.classList.remove('hidden'); signupForm.classList.add('hidden');
});
tabSignup.addEventListener('click', ()=>{
  tabSignup.classList.add('active'); tabLogin.classList.remove('active');
  signupForm.classList.remove('hidden'); loginForm.classList.add('hidden');
});

loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPass.value);
});
signupForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const cred = await createUserWithEmailAndPassword(auth, signupEmail.value.trim(), signupPass.value);
  await updateProfile(cred.user, { displayName: signupName.value.trim() });
  await setDoc(doc(db,'users',cred.user.uid), { name: signupName.value.trim(), email: cred.user.email, createdAt: serverTimestamp() });
  // default album
  const a = await addDoc(collection(db,'albums'), { userId: cred.user.uid, name:'All Photos', category:'Other', createdAt: serverTimestamp(), coverPhoto:null, music:null });
  currentAlbumId = a.id;
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    await afterLogin(user);
  }else{
    showAuth();
  }
});

async function afterLogin(user){
  refreshUserHeader(user);
  await loadAlbums();
  await loadPhotos();
  if(!currentAlbumId && albums[0]) currentAlbumId = albums[0].id;
  showApp();
  refreshAlbumsUI();
  refreshGallery();
}

function refreshUserHeader(user){
  userInitials.textContent = initials(user.displayName||'U');
  userName.textContent = user.displayName || 'User';
  userEmail.textContent = user.email || '';
}

btnLogout.addEventListener('click', ()=> signOut(auth));

/* ===================== FIRESTORE LOAD ===================== */
async function loadAlbums(){
  const qs = await getDocs(query(collection(db,'albums'), where('userId','==',uid())));
  albums = qs.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=> (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
}
async function loadPhotos(){
  const qs = await getDocs(query(collection(db,'photos'), where('userId','==',uid())));
  photos = qs.docs.map(d=>({id:d.id, ...d.data()}));
}

/* ===================== UI SWITCH ===================== */
function showAuth(){
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}
function showApp(){
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  sidebar.classList.add('show');
}

/* ===================== ALBUMS ===================== */
function refreshAlbumsUI(){
  albumList.innerHTML=''; uAlbum.innerHTML='';
  albums.forEach(a=>{
    const el = document.createElement('button');
    el.className = 'pill'+(currentAlbumId===a.id?' active':'');
    el.textContent = a.name;
    el.onclick = ()=>{ currentAlbumId=a.id; handleAlbumMusic(a); refreshGallery(); refreshAlbumsUI(); };
    albumList.appendChild(el);

    const opt = document.createElement('option');
    opt.value = a.id; opt.textContent = a.name;
    uAlbum.appendChild(opt);
  });
  if(currentAlbumId) uAlbum.value = currentAlbumId;
}
btnNewAlbum.addEventListener('click', async ()=>{
  const name=prompt('Album name'); if(!name) return;
  const cat = prompt('Category (Family/Travel/Food/Art/Work/Other)','Other')||'Other';
  const a = await addDoc(collection(db,'albums'), { userId: uid(), name, category:cat, createdAt: serverTimestamp(), coverPhoto:null, music:null });
  albums.push({id:a.id, userId:uid(), name, category:cat});
  currentAlbumId = a.id;
  refreshAlbumsUI(); refreshGallery();
});

async function handleAlbumMusic(a){
  if(a.music?.url){
    player.src = a.music.url; player.play().catch(()=>{});
  }else{
    player.removeAttribute('src');
  }
}
btnAttachAudio.addEventListener('click', async ()=>{
  if(!currentAlbumId) return alert('Album ရွေးပါ');
  const file = albumAudio.files[0]; if(!file) return alert('audio ဖိုင်ရွေးပါ');
  const ar = ref(storage, audioPath(file.name));
  await uploadBytes(ar, file);
  const url = await getDownloadURL(ar);
  const idx = albums.findIndex(x=>x.id===currentAlbumId);
  const a = albums[idx];
  await updateDoc(doc(db,'albums',currentAlbumId), { music:{name:file.name, url} });
  albums[idx].music = {name:file.name, url};
  handleAlbumMusic(albums[idx]);
  alert('ချိတ်ပြီးပါပြီ');
});

/* ===================== GALLERY (filters/views/batch) ===================== */
function applyFilters(){
  filtered = photos.filter(p=> p.albumId===currentAlbumId);
  if(fFav.checked) filtered = filtered.filter(p=>p.fav);
  if(fEdited.checked) filtered = filtered.filter(p=>p.edited);
  if(fCategory.value) filtered = filtered.filter(p=>(p.category||'')===fCategory.value);
  const q = fSearch.value.trim().toLowerCase();
  if(q){
    filtered = filtered.filter(p=>(p.title||'').toLowerCase().includes(q) || (p.caption||'').toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q) || (p.tags||'').toLowerCase().includes(q));
  }
  const sort=fSort.value;
  filtered.sort((a,b)=> sort==='new'? (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0) :
                    sort==='old'? (a.createdAt?.seconds||0)-(b.createdAt?.seconds||0) :
                    (a.title||'').localeCompare(b.title||''));
}
function refreshGallery(){
  applyFilters();
  gallery.className = 'gallery '+currentView;
  gallery.innerHTML='';
  filtered.forEach(p=>{
    const node = tplCard.content.cloneNode(true);
    const card = node.querySelector('.card.photo');
    const img = node.querySelector('img');
    const title = node.querySelector('.title');
    const caption = node.querySelector('.caption');
    const pick = node.querySelector('.pick');
    const pickbox = node.querySelector('.pickbox');
    const fav = node.querySelector('.fav');

    img.src = p.url;
    img.alt = p.title||'';
    title.textContent = p.title||'(Untitled)';
    caption.textContent = p.caption||'';
    fav.style.opacity = p.fav?1:0.2;

    if(selectMode){
      pick.classList.remove('hidden');
      pickbox.checked = selectedIds.has(p.id);
      pickbox.onchange = ()=>{
        if(pickbox.checked) selectedIds.add(p.id); else selectedIds.delete(p.id);
        batchCount.textContent = selectedIds.size;
      };
      card.onclick = (e)=>{ if(e.target!==pickbox){ pickbox.checked = !pickbox.checked; pickbox.onchange(); } };
    }else{
      pick.classList.add('hidden');
      card.onclick = ()=> openViewer(p.id);
    }

    gallery.appendChild(node);
  });
}
viewTabs.addEventListener('click', (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  $$('#viewTabs .chip').forEach(c=>c.classList.remove('active'));
  b.classList.add('active');
  currentView = b.dataset.view;
  refreshGallery();
});
[fFav, fEdited, fCategory, fSort].forEach(el=> el.addEventListener('change', refreshGallery));
fSearch.addEventListener('input', ()=>{ clearTimeout(fSearch._t); fSearch._t=setTimeout(refreshGallery, 250); });
quickFilters.addEventListener('click', (e)=>{
  const b=e.target.closest('.chip'); if(!b) return;
  const key=b.dataset.q;
  fSearch.value = key==='bg'? '' : key;
  if(key==='bg'){ fEdited.checked=true; }
  refreshGallery();
});

/* Batch mode */
btnBatch.addEventListener('click', ()=>{
  selectMode = !selectMode;
  selectedIds.clear();
  batchBar.classList.toggle('hidden', !selectMode);
  batchCount.textContent = 0;
  refreshGallery();
});
batchClear.addEventListener('click', ()=>{
  selectedIds.clear(); batchCount.textContent = 0; refreshGallery();
});
batchDelete.addEventListener('click', async ()=>{
  if(selectedIds.size===0) return;
  if(!confirm('ရွေးထားသောပုံများကို ဖျက်မလား?')) return;
  for(const id of selectedIds){
    await deleteDoc(doc(db,'photos', id));
    photos = photos.filter(p=>p.id!==id);
  }
  selectedIds.clear();
  refreshGallery();
});
batchMove.addEventListener('click', async ()=>{
  if(selectedIds.size===0) return;
  const names = albums.map(a=>`${a.id}:${a.name}`).join('\n');
  const choice = prompt(`Album ပြောင်းရန်:\n${names}`);
  if(!choice) return;
  const id = choice.split(':')[0];
  for(const pid of selectedIds){
    await updateDoc(doc(db,'photos', pid), { albumId: id });
    const i = photos.findIndex(p=>p.id===pid); if(i>=0) photos[i].albumId = id;
  }
  refreshGallery();
});
batchTag.addEventListener('click', async ()=>{
  if(selectedIds.size===0) return;
  const t = prompt('Tag ထည့်ရန် (comma separated):'); if(!t) return;
  for(const pid of selectedIds){
    const p = photos.find(x=>x.id===pid); if(!p) continue;
    const tags = [ ...(p.tags||'').split(',').map(s=>s.trim()).filter(Boolean), ...t.split(',').map(s=>s.trim()).filter(Boolean) ];
    const uniq = Array.from(new Set(tags)).join(', ');
    await updateDoc(doc(db,'photos', pid), { tags: uniq });
    p.tags = uniq;
  }
  alert('Tag ထည့်ပြီးပါပြီ');
});
batchFilter.addEventListener('click', async ()=>{
  if(selectedIds.size===0) return;
  const preset = prompt('Preset (cartoon / watercolor / caricature):','cartoon');
  for(const pid of selectedIds){
    const p = photos.find(x=>x.id===pid); if(!p) continue;
    await updateDoc(doc(db,'photos', pid), { edited:true, effects:{preset} });
    p.edited = true; p.effects = {preset};
  }
  refreshGallery();
});

/* ===================== UPLOAD ===================== */
btnUpload.addEventListener('click', ()=>{
  refreshAlbumsUI();
  uploadDlg.showModal();
});
uploadForm.addEventListener('close', ()=> uploadForm.reset());
btnDoUpload.addEventListener('click', async (e)=>{
  e.preventDefault();
  const file = fileInput.files[0]; if(!file) return;
  const albumId = uAlbum.value || currentAlbumId;
  const title = uTitle.value.trim();
  const caption = uCaption.value.trim();
  const desc = uDesc.value.trim();
  const tags = uTags.value.trim();
  const cat = fCategory.value || '';

  const r = ref(storage, imgPath(file.name));
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);

  const docRef = await addDoc(collection(db,'photos'), {
    userId: uid(), albumId, title, caption, desc, tags, category:cat,
    url, edited:false, effects:{}, bgChanged:false, fav:false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  photos.push({id:docRef.id, userId:uid(), albumId, title, caption, desc, tags, category:cat, url, edited:false, effects:{}, fav:false});
  uploadDlg.close();
  refreshGallery();
});

/* ===================== VIEWER / EDITOR ===================== */
async function openViewer(photoId){
  const p = photos.find(x=>x.id===photoId);
  currentPhoto = p;
  mTitle.value = p.title||'';
  mCaption.value = p.caption||'';
  mDesc.value = p.desc||'';
  effectPreset = 'none';
  slBright.value=0; slContrast.value=0; slSatu.value=0; slHue.value=0; slBlur.value=0;
  bgColor.value='#ffffff'; bgImage.value=''; bgLayer=null;

  const img = await createImageBitmap(await (await fetch(p.url, {cache:'force-cache'})).blob());
  originalImageBitmap = img;
  fitCanvasToImage(img);
  drawWithCurrentSettings();
  viewerDlg.showModal();
}
function fitCanvasToImage(img){
  const maxW = Math.min(window.innerWidth-40, 1400);
  const maxH = Math.min(window.innerHeight-180, 900);
  let w = img.width, h = img.height;
  const r = Math.min(maxW/w, maxH/h, 1);
  canvasEl.width = Math.floor(w*r);
  canvasEl.height = Math.floor(h*r);
}
function computeCssFilter(){
  const b = Number(slBright.value);
  const c = Number(slContrast.value);
  const s = Number(slSatu.value);
  const h = Number(slHue.value);
  const bl = Number(slBlur.value);
  return `brightness(${100+b}%) contrast(${100+c}%) saturate(${100+s}%) hue-rotate(${h}deg) blur(${bl}px)`;
}
function drawWithCurrentSettings(){
  if(effectPreset==='background' && bgLayer){
    ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
    if(bgLayer.type==='color'){
      ctx.fillStyle = bgLayer.value; ctx.fillRect(0,0,canvasEl.width, canvasEl.height);
    }else if(bgLayer.type==='image' && bgLayer.img){
      const r = Math.max(canvasEl.width/bgLayer.img.width, canvasEl.height/bgLayer.img.height);
      const w = Math.floor(bgLayer.img.width*r);
      const h = Math.floor(bgLayer.img.height*r);
      const x = (canvasEl.width - w)/2, y = (canvasEl.height - h)/2;
      ctx.drawImage(bgLayer.img, x,y,w,h);
    }
  }else{
    ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
  }
  ctx.save();
  const css = computeCssFilter();
  const off = document.createElement('canvas');
  off.width = canvasEl.width; off.height = canvasEl.height;
  const octx = off.getContext('2d');
  try { octx.filter = css; } catch(e){}
  octx.drawImage(originalImageBitmap, 0,0, off.width, off.height);

  if(effectPreset==='cartoon'){ posterize(off, 6); edges(off, 0.7); }
  else if(effectPreset==='watercolor'){ posterize(off, 8); blur(off, 1.5); }
  else if(effectPreset==='caricature'){ bulge(off, 0.3); }

  if(currentFrame){ drawFrame(off, currentFrame); }
  if(stickers.length){ drawStickers(off, stickers); }
  if(watermark){ drawWatermark(off, watermark); }

  ctx.drawImage(off, 0,0);
  ctx.restore();
}

/* Decor state */
let stickers = [];
let currentFrame = null;
let watermark = null;

function drawStickers(c, list){
  const k = c.getContext('2d');
  list.forEach(s=>{
    k.save();
    k.font = `${s.size||24}px system-ui, emoji`;
    k.globalAlpha = .95;
    k.fillText(s.text, s.x, s.y);
    k.restore();
  });
}
function drawFrame(c, type){
  const k = c.getContext('2d');
  const w=c.width,h=c.height;
  k.save();
  if(type==='classic'){
    k.strokeStyle = '#ffffff'; k.lineWidth = 20; k.strokeRect(10,10,w-20,h-20);
  }else if(type==='polaroid'){
    k.fillStyle='#ffffff'; k.fillRect(0,0,w,h);
    const m=30, extra=60;
    k.clearRect(m,m,w-2*m,h-2*m-extra);
  }else if(type==='vintage'){
    k.strokeStyle = '#e0c9a6'; k.lineWidth = 30; k.strokeRect(15,15,w-30,h-30);
  }
  k.restore();
}
function drawWatermark(c, wm){
  const k = c.getContext('2d');
  k.save();
  k.globalAlpha = wm.opacity||0.25;
  k.translate(wm.x||c.width-20, wm.y||c.height-20);
  if(wm.rotate) k.rotate(wm.rotate*Math.PI/180);
  k.font = `${wm.size||28}px Inter, system-ui`;
  k.textAlign = 'right'; k.textBaseline='bottom';
  k.fillStyle = '#ffffff'; k.fillText(wm.text||'', 0,0);
  k.restore();
}

/* Decor controls */
btnSticker.addEventListener('click', ()=>{
  const t = prompt('Sticker (emoji/text):','😊');
  if(!t) return;
  const size = Number(prompt('Size(px):','36'))||36;
  stickers.push({text:t, x:40+Math.random()*100, y:40+Math.random()*100, size});
  drawWithCurrentSettings();
});
btnFrame.addEventListener('click', ()=>{
  const f = prompt('Frame (classic / polaroid / vintage)','classic');
  currentFrame = f;
  drawWithCurrentSettings();
});
btnWatermark.addEventListener('click', ()=>{
  const text = prompt('Watermark text','ShweLibrary');
  if(!text){ watermark=null; drawWithCurrentSettings(); return; }
  const size = Number(prompt('Size','28'))||28;
  const opacity = Number(prompt('Opacity 0-1','0.25'))||0.25;
  watermark = {text, size, opacity, x: undefined, y: undefined, rotate: -15};
  drawWithCurrentSettings();
});

/* Background */
bgColor.addEventListener('input', ()=>{
  effectPreset='background'; bgLayer={type:'color', value:bgColor.value}; drawWithCurrentSettings();
});
bgImage.addEventListener('change', async ()=>{
  if(bgImage.files[0]){
    const img = await createImageBitmap(bgImage.files[0]);
    effectPreset='background'; bgLayer={type:'image', img}; drawWithCurrentSettings();
  }
});
[slBright, slContrast, slSatu, slHue, slBlur].forEach(sl=> sl.addEventListener('input', drawWithCurrentSettings));

/* Save / Download / Move / Delete / Cover / Fav */
btnApply.addEventListener('click', async ()=>{
  if(!currentPhoto) return;
  canvasEl.toBlob(async (blob)=>{
    const r = ref(storage, imgPath('edited.jpg'));
    await uploadBytes(r, blob);
    const url = await getDownloadURL(r);

    const patch = {
      url, title: mTitle.value.trim(), caption: mCaption.value.trim(),
      desc: mDesc.value.trim(), edited: true,
      effects: {preset:effectPreset, bright:slBright.value, contrast:slContrast.value, satu:slSatu.value, hue:slHue.value, blur:slBlur.value},
      bgChanged: effectPreset==='background', updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db,'photos', currentPhoto.id), patch);
    Object.assign(currentPhoto, patch);
    const i = photos.findIndex(p=>p.id===currentPhoto.id); photos[i]=currentPhoto;
    refreshGallery();
    alert('Saved!');
  }, 'image/jpeg', .92);
});
btnDownload.addEventListener('click', ()=>{
  canvasEl.toBlob((blob)=>{
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (currentPhoto?.title || 'photo') + '.jpg';
    a.click();
  }, 'image/jpeg', .95);
});
btnMove.addEventListener('click', async ()=>{
  const names = albums.map(a=>`${a.id}:${a.name}`).join('\n');
  const choice = prompt(`Album ပြောင်းရန်:\n${names}`);
  if(!choice) return;
  const id = choice.split(':')[0];
  await updateDoc(doc(db,'photos', currentPhoto.id), { albumId: id });
  currentPhoto.albumId = id;
  refreshGallery();
  alert('Moved.');
});
btnCover.addEventListener('click', async ()=>{
  await updateDoc(doc(db,'albums', currentAlbumId), { coverPhoto: {photoId: currentPhoto.id, url: currentPhoto.url} });
  const idx = albums.findIndex(a=>a.id===currentAlbumId);
  if(idx>=0) albums[idx].coverPhoto = {photoId: currentPhoto.id, url: currentPhoto.url};
  alert('Album cover သတ်မှတ်ပြီး');
});
btnDelete.addEventListener('click', async ()=>{
  if(confirm('ဤပုံကို ဖျက်မလား?')){
    await deleteDoc(doc(db,'photos', currentPhoto.id));
    photos = photos.filter(p=>p.id!==currentPhoto.id);
    viewerDlg.close(); refreshGallery();
  }
});
btnFav.addEventListener('click', async ()=>{
  const v = !currentPhoto.fav;
  await updateDoc(doc(db,'photos', currentPhoto.id), { fav: v });
  currentPhoto.fav = v;
  refreshGallery();
});

btnCloseViewer.addEventListener('click', ()=> viewerDlg.close());

/* Keyboard shortcuts */
document.addEventListener('keydown', (e)=>{
  if(viewerDlg.open){
    if(e.key==='ArrowLeft'){ navPhoto(-1); }
    if(e.key==='ArrowRight'){ navPhoto(1); }
    if(e.key.toLowerCase()==='d'){ btnDownload.click(); }
    if(e.key.toLowerCase()==='e'){ btnApply.click(); }
    if(e.key==='Delete'){ btnDelete.click(); }
  }
});
function navPhoto(dir){
  if(!currentPhoto) return;
  const i = filtered.findIndex(p=>p.id===currentPhoto.id);
  const n = filtered[(i+dir+filtered.length)%filtered.length];
  if(n) openViewer(n.id);
}

/* Sidebar & topbar */
btnMenu.addEventListener('click', ()=> sidebar.classList.toggle('show'));

/* ===================== OPEN VIEWER FROM CARD ===================== */
window.openViewer = openViewer;

/* ===================== INIT ===================== */
(async function init(){
  // nothing here; login flow handles UI
})();
