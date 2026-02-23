/*********************************************************
 * DEMO Arsip Digital TMR - Mode Lokal (localStorage)
 * - Login: NIP(18) + password
 * - Role: user/admin
 * - User: upload & lihat dokumen sendiri (disimpan base64 lokal)
 * - Admin: lihat semua, detail pegawai, buka file, set status
 *********************************************************/

// ==================== MASTER DOKUMEN (22) ====================
const DOCS = [
  { id:"01_akta_kelahiran", no:1,  name:"Akta Kelahiran Pegawai" },
  { id:"02_ktp",            no:2,  name:"KTP" },
  { id:"03_kk",             no:3,  name:"Kartu Keluarga (KK)" },
  { id:"04_npwp",           no:4,  name:"NPWP" },
  { id:"05_bpjs",           no:5,  name:"Kartu BPJS / Asuransi (jika ada)" },
  { id:"06_sk_cpns",        no:6,  name:"SK CPNS (jika ada)" },
  { id:"07_sk_pns_pppk",    no:7,  name:"SK PNS / PPPK" },
  { id:"08_spmt",           no:8,  name:"SPMT / Surat Perintah Melaksanakan Tugas" },
  { id:"09_sk_jabatan",     no:9,  name:"SK Jabatan Terakhir" },
  { id:"10_ijazah_terakhir",no:10, name:"Ijazah Terakhir" },
  { id:"11_transkrip",      no:11, name:"Transkrip Nilai" },
  { id:"12_diklat",         no:12, name:"Sertifikat Diklat / Pelatihan (jika ada)" },
  { id:"13_skp_1",          no:13, name:"SKP (Tahun Terakhir 1)" },
  { id:"14_skp_2",          no:14, name:"SKP (Tahun Terakhir 2)" },
  { id:"15_surat_nikah",    no:15, name:"Surat Nikah (jika ada)" },
  { id:"16_akta_anak",      no:16, name:"Akta Kelahiran Anak (jika ada)" },
  { id:"17_buku_tabungan",  no:17, name:"Buku Tabungan (halaman identitas)" },
  { id:"18_sertifikat_profesi", no:18, name:"Sertifikat Profesi/Kompetensi (jika ada)" },
  { id:"19_sk_pangkat",     no:19, name:"SK Kenaikan Pangkat (jika ada)" },
  { id:"20_sk_mutasi",      no:20, name:"SK Mutasi/Rotasi (jika ada)" },
  { id:"21_pakta_integritas", no:21, name:"Pakta Integritas / Pernyataan (jika ada)" },
  { id:"22_pas_foto_3x4",   no:22, name:"Pas Foto 3x4" }
];

// ==================== STORAGE KEYS ====================
const KEY_DB = "TMR_DEMO_ARSIP_DB_V1";
const KEY_SESSION = "TMR_DEMO_ARSIP_SESSION_V1";

// ==================== UI HELPERS ====================
const el = (id) => document.getElementById(id);
const show = (node) => node.classList.remove("hidden");
const hide = (node) => node.classList.add("hidden");
const setText = (node, text) => node.textContent = text;

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function pillStatus(status){
  const st = (status || "BELUM").toUpperCase();
  if (st === "ADA") return `<span class="pill ok">ADA</span>`;
  if (st === "REVISI") return `<span class="pill warn">REVISI</span>`;
  return `<span class="pill bad">BELUM</span>`;
}

function nipNormalize(s){ return (s || "").replace(/\D/g,""); }
function isNip18(s){ return /^\d{18}$/.test(s); }

function percentComplete(docsMap){
  let ok = 0;
  for (const d of DOCS){
    const st = (docsMap?.[d.id]?.status || "BELUM").toUpperCase();
    if (st === "ADA") ok++;
  }
  return { ok, total: DOCS.length, pct: Math.round((ok / DOCS.length) * 100) };
}

// ==================== DB LOCAL ====================
function loadDB(){
  const raw = localStorage.getItem(KEY_DB);
  if (!raw) return null;
  try{ return JSON.parse(raw); }catch{ return null; }
}

function saveDB(db){
  localStorage.setItem(KEY_DB, JSON.stringify(db));
}

function defaultDB(){
  // 1 admin + 3 user demo
  const adminNip = "199901012000000001";
  const now = Date.now();

  const users = {};
  const docs = {};

  function makeUser(nip, nama, email, role, password, unit){
    users[nip] = { nip, nama, email, role, password, unit, isActive:true, createdAt: now, updatedAt: now };
    docs[nip] = {}; // docs map
  }

  makeUser(adminNip, "ADMIN TMR", "admin@tmr.local", "admin", "admin123", "Admin");
  makeUser("197801012000000002", "User Demo 1", "user1@tmr.local", "user", "user12345", "Yaninfo");
  makeUser("197901012000000003", "User Demo 2", "user2@tmr.local", "user", "user12345", "Pelayanan");
  makeUser("198001012000000004", "User Demo 3", "user3@tmr.local", "user", "user12345", "Operasional");

  // set default status BELUM
  for (const nip of Object.keys(docs)){
    for (const d of DOCS){
      docs[nip][d.id] = { status:"BELUM", note:"", updatedAt: now };
    }
  }

  return { users, docs };
}

function ensureDB(){
  let db = loadDB();
  if (!db || !db.users || !db.docs){
    db = defaultDB();
    saveDB(db);
  }
  return db;
}

// ==================== SESSION ====================
function setSession(sess){
  localStorage.setItem(KEY_SESSION, JSON.stringify(sess));
}
function getSession(){
  const raw = localStorage.getItem(KEY_SESSION);
  if (!raw) return null;
  try{ return JSON.parse(raw); }catch{ return null; }
}
function clearSession(){
  localStorage.removeItem(KEY_SESSION);
}

// ==================== AUTH (LOCAL) ====================
function loginLocal(nip, password){
  const db = ensureDB();
  const u = db.users[nip];
  if (!u || u.isActive === false) throw new Error("NIP tidak terdaftar / nonaktif.");
  if (u.password !== password) throw new Error("Password salah.");
  setSession({ nip, role: u.role, at: Date.now() });
  return u;
}

function changePasswordLocal(nip, newPass){
  const db = ensureDB();
  const u = db.users[nip];
  if (!u) throw new Error("User tidak ditemukan.");
  if (!newPass || newPass.length < 6) throw new Error("Password minimal 6 karakter (demo).");
  u.password = newPass;
  u.updatedAt = Date.now();
  saveDB(db);
}

function forgotPasswordDemo(nip){
  const db = ensureDB();
  const u = db.users[nip];
  if (!u) throw new Error("NIP tidak terdaftar.");
  // Demo: tampilkan hint (di produksi: kirim email reset)
  return `Demo reset: silakan hubungi admin / atau ganti password lewat menu jika sudah login.\nEmail terdaftar: ${u.email}`;
}

// ==================== FILE LOCAL (BASE64) ====================
function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // data:<mime>;base64,xxxx
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function saveDocFileLocal(nip, docId, fileObj){
  const db = ensureDB();
  if (!db.docs[nip]) db.docs[nip] = {};
  db.docs[nip][docId] = {
    status: "ADA",
    note: "",
    fileName: fileObj.fileName,
    mimeType: fileObj.mimeType,
    size: fileObj.size,
    dataUrl: fileObj.dataUrl, // base64
    uploadedAt: Date.now(),
    updatedAt: Date.now()
  };
  saveDB(db);
}

function setDocStatusLocal(targetNip, docId, status, note=""){
  const db = ensureDB();
  if (!db.docs[targetNip]) db.docs[targetNip] = {};
  const cur = db.docs[targetNip][docId] || {};
  db.docs[targetNip][docId] = {
    ...cur,
    status,
    note: note || cur.note || "",
    updatedAt: Date.now()
  };
  saveDB(db);
}

function getUserDocsLocal(nip){
  const db = ensureDB();
  return db.docs[nip] || {};
}

function getUsersLocal(){
  const db = ensureDB();
  return Object.values(db.users || {}).filter(u => u && u.isActive !== false);
}

function getUserLocal(nip){
  const db = ensureDB();
  return db.users[nip] || null;
}

// ==================== RENDER ====================
const loginBox = el("loginBox");
const profileBox = el("profileBox");
const welcomeBox = el("welcomeBox");
const userDash = el("userDash");
const adminDash = el("adminDash");
const adminDetail = el("adminDetail");

const who = el("who");
const btnLogout = el("btnLogout");

async function render(){
  ensureDB();
  const sess = getSession();

  // reset view
  hide(profileBox); show(loginBox);
  hide(userDash); hide(adminDash); hide(adminDetail);
  show(welcomeBox);
  hide(who); hide(btnLogout);

  if (!sess) return;

  const u = getUserLocal(sess.nip);
  if (!u) { clearSession(); return; }

  // Logged
  hide(loginBox); show(profileBox);
  hide(welcomeBox);
  show(who); show(btnLogout);

  who.className = "pill";
  who.innerHTML = `${u.role.toUpperCase()} • ${escapeHtml(u.nama)} • ${escapeHtml(u.nip)}`;

  el("profileInfo").textContent =
`Nama: ${u.nama}
NIP: ${u.nip}
Email: ${u.email}
Unit: ${u.unit}
Role: ${u.role}`;

  if (u.role === "admin"){
    show(adminDash);
    await renderAdmin();
  } else {
    show(userDash);
    await renderUser(u.nip);
  }
}

async function renderUser(nip){
  const u = getUserLocal(nip);
  const docsMap = getUserDocsLocal(nip);

  setText(el("userSub"), `${u.nama} • NIP ${u.nip} • ${u.unit}`);

  const prog = percentComplete(docsMap);
  el("userProgress").innerHTML = `${prog.ok}/${prog.total} • ${prog.pct}%`;

  const tbody = el("userTable").querySelector("tbody");
  tbody.innerHTML = "";

  for (const d of DOCS){
    const rec = docsMap[d.id] || { status:"BELUM" };
    const status = (rec.status || "BELUM").toUpperCase();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.no}</td>
      <td>
        <div><b>${escapeHtml(d.name)}</b></div>
        ${rec.note ? `<div class="tiny muted">Catatan: ${escapeHtml(rec.note)}</div>` : ``}
        ${rec.fileName ? `<div class="tiny muted">File: ${escapeHtml(rec.fileName)} • ${(rec.size?Math.round(rec.size/1024):0)}KB</div>` : ``}
      </td>
      <td>${pillStatus(status)}</td>
      <td>
        <div class="actions">
          <button class="ghost tiny" data-act="upload" data-doc="${d.id}">Upload</button>
          <button class="tiny" data-act="view" data-doc="${d.id}" ${status === "ADA" ? "" : "disabled"}>Lihat</button>
          <button class="ghost tiny" data-act="delete" data-doc="${d.id}" ${status === "ADA" ? "" : "disabled"}>Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button[data-act='upload']").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const docId = btn.getAttribute("data-doc");
      await pickAndUploadLocal(nip, docId);
      await renderUser(nip);
      await renderAdminIfOpen(); // kalau admin detail lagi terbuka (tidak harus)
    });
  });

  tbody.querySelectorAll("button[data-act='view']").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const docId = btn.getAttribute("data-doc");
      viewFileLocal(nip, docId);
    });
  });

  tbody.querySelectorAll("button[data-act='delete']").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const docId = btn.getAttribute("data-doc");
      if (!confirm("Hapus file lokal untuk dokumen ini?")) return;
      setDocStatusLocal(nip, docId, "BELUM", "");
      // hapus dataUrl biar hemat storage
      const db = ensureDB();
      if (db.docs[nip] && db.docs[nip][docId]) {
        delete db.docs[nip][docId].dataUrl;
        delete db.docs[nip][docId].fileName;
        delete db.docs[nip][docId].mimeType;
        delete db.docs[nip][docId].size;
        delete db.docs[nip][docId].uploadedAt;
        db.docs[nip][docId].updatedAt = Date.now();
        saveDB(db);
      }
      renderUser(nip);
    });
  });
}

async function pickAndUploadLocal(nip, docId){
  // Batas demo untuk menghindari storage penuh
  const MAX_MB = 2; // demo 2MB agar aman
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.jpg,.jpeg,.png";
  input.onchange = async ()=>{
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024){
      alert(`File terlalu besar untuk DEMO lokal. Maks ${MAX_MB}MB.`);
      return;
    }

    const dataUrl = await fileToBase64(file);
    saveDocFileLocal(nip, docId, {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      dataUrl
    });
  };
  input.click();
}

function viewFileLocal(nip, docId){
  const docsMap = getUserDocsLocal(nip);
  const rec = docsMap[docId];
  if (!rec?.dataUrl) {
    alert("File belum ada (demo lokal).");
    return;
  }

  // Buka di tab baru
  const w = window.open("", "_blank", "noopener");
  const safeName = escapeHtml(rec.fileName || "file");
  const isPDF = (rec.mimeType || "").includes("pdf");

  // Untuk PDF, embed; untuk gambar, tampilkan img
  w.document.write(`
    <html><head><title>${safeName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      body{margin:0;font-family:system-ui;background:#0b1220;color:#e2e8f0}
      header{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.12);display:flex;justify-content:space-between;gap:12px;align-items:center}
      a{color:#93c5fd}
      .box{padding:14px}
      iframe,img{width:100%;height:calc(100vh - 70px);border:0;background:#111827}
      img{object-fit:contain}
    </style></head>
    <body>
      <header>
        <div><b>${safeName}</b><div style="font-size:12px;opacity:.8">${escapeHtml(nip)} • ${escapeHtml(docId)}</div></div>
        <div><a href="${rec.dataUrl}" download="${safeName}">Download</a></div>
      </header>
      ${isPDF
        ? `<iframe src="${rec.dataUrl}"></iframe>`
        : `<img src="${rec.dataUrl}" alt="preview"/>`
      }
    </body></html>
  `);
  w.document.close();
}

let _adminSelectedNip = null;

async function renderAdmin(){
  const q = (el("q").value || "").trim().toLowerCase();
  const users = getUsersLocal();

  const filtered = users.filter(u=>{
    if (!q) return true;
    return (u.nip || "").toLowerCase().includes(q) || (u.nama || "").toLowerCase().includes(q);
  });

  const tbody = el("adminTable").querySelector("tbody");
  tbody.innerHTML = "";

  for (const u of filtered){
    const docsMap = getUserDocsLocal(u.nip);
    const prog = percentComplete(docsMap);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${escapeHtml(u.nip)}</td>
      <td><b>${escapeHtml(u.nama)}</b><div class="tiny muted">${escapeHtml(u.email)}</div></td>
      <td>${escapeHtml(u.unit)}</td>
      <td>${prog.ok}/${prog.total} • ${prog.pct}%</td>
      <td><button class="ghost tiny" data-open="${escapeHtml(u.nip)}">Detail</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button[data-open]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const nip = btn.getAttribute("data-open");
      await renderAdminDetail(nip);
    });
  });
}

async function renderAdminDetail(targetNip){
  _adminSelectedNip = targetNip;
  const u = getUserLocal(targetNip);
  if (!u) return;

  show(adminDetail);
  setText(el("detailTitle"), `Detail: ${u.nama} • ${u.nip}`);

  const docsMap = getUserDocsLocal(targetNip);
  const tbody = el("detailTable").querySelector("tbody");
  tbody.innerHTML = "";

  for (const d of DOCS){
    const rec = docsMap[d.id] || { status:"BELUM" };
    const status = (rec.status || "BELUM").toUpperCase();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.no}</td>
      <td>
        <div><b>${escapeHtml(d.name)}</b></div>
        ${rec.fileName ? `<div class="tiny muted">File: ${escapeHtml(rec.fileName)} • ${(rec.size?Math.round(rec.size/1024):0)}KB</div>` : ``}
        ${rec.note ? `<div class="tiny muted">Catatan: ${escapeHtml(rec.note)}</div>` : ``}
      </td>
      <td>${pillStatus(status)}</td>
      <td>
        <div class="actions">
          <button class="tiny" data-act="view" data-doc="${d.id}" ${status==="ADA" ? "" : "disabled"}>Lihat</button>
          <button class="ghost tiny" data-act="setAda" data-doc="${d.id}">Set ADA</button>
          <button class="ghost tiny" data-act="setRevisi" data-doc="${d.id}">Set REVISI</button>
          <button class="ghost tiny" data-act="setBelum" data-doc="${d.id}">Set BELUM</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("button[data-act='view']").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const docId = btn.getAttribute("data-doc");
      viewFileLocal(targetNip, docId);
    });
  });

  tbody.querySelectorAll("button[data-act='setAda']").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const docId = btn.getAttribute("data-doc");
      setDocStatusLocal(targetNip, docId, "ADA", "");
      await renderAdminDetail(targetNip);
    });
  });

  tbody.querySelectorAll("button[data-act='setBelum']").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const docId = btn.getAttribute("data-doc");
      setDocStatusLocal(targetNip, docId, "BELUM", "");
      // hapus file data untuk hemat
      const db = ensureDB();
      if (db.docs[targetNip] && db.docs[targetNip][docId]) {
        delete db.docs[targetNip][docId].dataUrl;
        delete db.docs[targetNip][docId].fileName;
        delete db.docs[targetNip][docId].mimeType;
        delete db.docs[targetNip][docId].size;
        delete db.docs[targetNip][docId].uploadedAt;
        db.docs[targetNip][docId].updatedAt = Date.now();
        saveDB(db);
      }
      await renderAdminDetail(targetNip);
    });
  });

  tbody.querySelectorAll("button[data-act='setRevisi']").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const docId = btn.getAttribute("data-doc");
      const note = prompt("Catatan revisi (opsional):", "") || "";
      setDocStatusLocal(targetNip, docId, "REVISI", note);
      await renderAdminDetail(targetNip);
    });
  });
}

async function renderAdminIfOpen(){
  // helper ringan kalau admin detail sedang terbuka
  const sess = getSession();
  if (!sess) return;
  const u = getUserLocal(sess.nip);
  if (u?.role !== "admin") return;
  // refresh list & detail jika sedang terbuka
  await renderAdmin();
  if (_adminSelectedNip) await renderAdminDetail(_adminSelectedNip);
}

// ==================== EVENTS ====================
el("btnLogin").addEventListener("click", async ()=>{
  const nip = nipNormalize(el("nip").value);
  const pass = el("pass").value || "";
  try{
    setText(el("loginMsg"), "Memproses...");
    if (!isNip18(nip)) throw new Error("NIP harus 18 digit.");
    loginLocal(nip, pass);
    setText(el("loginMsg"), "");
    await render();
  }catch(e){
    setText(el("loginMsg"), e.message || String(e));
  }
});

el("btnForgot").addEventListener("click", ()=>{
  const nip = nipNormalize(el("nip").value);
  try{
    if (!isNip18(nip)) throw new Error("Isi NIP 18 digit dulu.");
    const msg = forgotPasswordDemo(nip);
    alert(msg);
  }catch(e){
    alert(e.message || String(e));
  }
});

el("btnResetDemo").addEventListener("click", ()=>{
  if (!confirm("Yakin reset demo? Semua data lokal akan hilang.")) return;
  localStorage.removeItem(KEY_DB);
  clearSession();
  ensureDB();
  render();
});

el("btnLogout").addEventListener("click", ()=>{
  clearSession();
  render();
});

el("btnChangePass").addEventListener("click", async ()=>{
  const sess = getSession();
  if (!sess) return;
  const np = el("newPass").value || "";
  try{
    changePasswordLocal(sess.nip, np);
    el("newPass").value = "";
    setText(el("profileMsg"), "Password berhasil diubah ✅");
  }catch(e){
    setText(el("profileMsg"), e.message || String(e));
  }
});

el("btnRefresh")?.addEventListener("click", async ()=> renderAdmin());
el("q")?.addEventListener("input", async ()=> {
  // debounce halus
  const v = el("q").value;
  setTimeout(()=>{ if (el("q").value === v) renderAdmin(); }, 200);
});

el("btnCloseDetail")?.addEventListener("click", ()=>{
  hide(adminDetail);
  _adminSelectedNip = null;
});

// ==================== INIT ====================
ensureDB();
render();
