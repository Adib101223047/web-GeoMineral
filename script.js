"use strict";

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */

/** @type {Object[]} Database mineral dari CSV */
let mineralDB = [];

/** Nilai kekerasan Mohs yang dipilih (0 = tidak ditentukan) */
let mohsValue = 0;

/* ═══════════════════════════════════════════════
   INISIALISASI
═══════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  loadDatabase();
  initMohsSlider();
  initNavHighlight();
  initSmoothScroll();
  initSelectFeedback();
  initModal();
});

/**
 * Muat data mineral dari file CSV menggunakan PapaParse.
 * Baris kosong (tanpa nama) akan difilter.
 */
function loadDatabase() {
  Papa.parse("mineral.csv", {
    download: true,
    header: true,
    delimiter: ";",
    dynamicTyping: true,
    skipEmptyLines: true,

    complete(results) {
      mineralDB = results.data.filter(row => row.nama && row.nama.trim() !== "");
      console.log(`[GeoMineral] ${mineralDB.length} mineral berhasil dimuat.`);
    },

    error(err) {
      console.error("[GeoMineral] Gagal memuat mineral.csv:", err);
    }
  });
}

/**
 * Inisialisasi slider kekerasan Mohs:
 * update tampilan nilai saat slider digeser.
 */
function initMohsSlider() {
  const slider = document.getElementById("mohs");
  const display = document.getElementById("mohs-display");

  if (!slider || !display) return;

  slider.addEventListener("input", () => {
    mohsValue = parseFloat(slider.value);

    display.textContent = mohsValue === 0
      ? "tidak ditentukan"
      : `${mohsValue} — ${getMohsMineral(mohsValue)}`;
  });
}

/**
 * Kembalikan nama referensi mineral pada skala Mohs tertentu.
 * @param {number} val - Nilai Mohs (0–10)
 * @returns {string}
 */
function getMohsMineral(val) {
  const refs = {
    1: "Talk", 2: "Gipsum", 3: "Kalsit", 4: "Fluorit",
    5: "Apatit", 6: "Ortoklas", 7: "Kuarsa", 8: "Topaz",
    9: "Korundum", 10: "Berlian"
  };

  const keys = Object.keys(refs).map(Number);
  const nearest = keys.reduce((a, b) => Math.abs(b - val) < Math.abs(a - val) ? b : a);
  return refs[nearest];
}

/**
 * Tandai nav-link sebagai aktif saat section yang bersangkutan terlihat.
 */
function initNavHighlight() {
  const sections = document.querySelectorAll("section[id]");
  const links = document.querySelectorAll(".nav-link");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove("active"));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach(s => observer.observe(s));
}

/**
 * Aktifkan smooth scroll untuk semua link anchor (href="#...").
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/**
 * Tandai elemen <select> dengan class "has-value" saat sudah dipilih,
 * untuk feedback visual pada border/background.
 */
function initSelectFeedback() {
  document.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", e => {
      e.target.classList.toggle("has-value", Boolean(e.target.value));
    });
  });
}

/* ═══════════════════════════════════════════════
   MODAL (pengganti alert() bawaan browser)
═══════════════════════════════════════════════ */

/**
 * @param {string} message
 */
function showAlert(message) {
  const overlay = document.getElementById("modal-overlay");
  const msgEl = document.getElementById("modal-message");

  if (!overlay || !msgEl) {
    alert(message); // fallback jika markup modal tidak ditemukan
    return;
  }

  msgEl.textContent = message;
  overlay.classList.add("active");
}

/**
 * Sembunyikan modal peringatan.
 */
function hideAlert() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.classList.remove("active");
}

/**
 * Pasang event listener untuk modal: tombol OK, klik di luar box,
 * dan tombol Escape.
 */
function initModal() {
  const overlay = document.getElementById("modal-overlay");
  const okBtn = document.getElementById("modal-ok-btn");

  if (!overlay || !okBtn) return;

  okBtn.addEventListener("click", hideAlert);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) hideAlert();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hideAlert();
  });
}

/* ═══════════════════════════════════════════════
   INPUT & VALIDASI
═══════════════════════════════════════════════ */

/**
 * Kumpulkan semua nilai input dari form.
 * @returns {Object} Objek berisi nilai setiap parameter
 */
function collectInput() {
  return {
    kilap: document.getElementById("kilap").value,
    warna_primer: document.getElementById("warna_primer").value,
    warna_sekunder: document.getElementById("warna_sekunder").value,
    cerat: document.getElementById("cerat").value,
    transparansi: document.getElementById("transparansi").value,
    belahan: document.getElementById("belahan").value,
    pecahan: document.getElementById("pecahan").value,
    bj: document.getElementById("bj").value,
    magnet: document.getElementById("magnet").value,
    hcl: document.getElementById("hcl").value,
    mohs: mohsValue
  };
}

/**
 * Validasi parameter wajib (Sifat Optik).
 * @param {Object} input
 * @returns {boolean}
 */
function validateInput(input) {
  const requiredFields = ["kilap", "warna_primer", "cerat", "transparansi"];
  return requiredFields.every(f => input[f] !== "");
}

/* ═══════════════════════════════════════════════
   HELPER — NORMALISASI & MULTI-VALUE MATCHING
═══════════════════════════════════════════════ */

/**
 * Normalisasi string sebelum perbandingan:
 *   - Spasi di sekitar "|" dihapus  → "A | B"      → "A|B"
 *   - Spasi di sekitar "-" dihapus  → "Abu - abu"  → "Abu-abu"
 *   - Spasi di sekitar "/" dihapus  → "Putih / Tidak" → "Putih/Tidak"
 *   - Spasi berulang digabung, lalu trim
 *   - Huruf kecil semua (case-insensitive)
 *
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
function normalize(str) {
  return String(str)
    .replace(/\s*\|\s*/g, "|")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ═══════════════════════════════════════════════
   FORMAT WARNA
═══════════════════════════════════════════════ */

/**
 *
 * @param {string} dbColor - Nilai warna dari CSV, dipisah "|"
 * @returns {string}
 */
function formatColor(dbColor) {
  if (!dbColor) return "";

  const colors = String(dbColor)
    .split("|")
    .map(c => c.trim());

  const map = {
    "Hijau|Kuning": "Hijau kekuningan",
    "Hijau|Cokelat": "Hijau kecokelatan",
    "Hitam|Cokelat": "Hitam kecokelatan",
    "Cokelat|Hitam": "Hitam kecokelatan",
    "Putih / Tidak berwarna|Abu-abu": "Putih keabu-abuan",
    "Abu-abu|Putih": "Putih keabu-abuan",
    "Merah|Cokelat": "Merah kecokelatan",
    "Cokelat|Merah": "Merah kecokelatan",
    "Hijau|Hitam": "Hijau kehitaman",
    "Hitam|Hijau": "Hijau kehitaman",
    "Abu-abu|Hijau": "Abu-abu kehijauan",
    "Hijau|Abu-abu": "Abu-abu kehijauan",
    "Biru|Hijau": "Biru kehijauan",
    "Hijau|Biru": "Biru kehijauan",
    "Kuning|Hijau": "Kuning kehijauan",
    "Kuning|Emas": "Kuning keemasan",
    "Emas|Kuning": "Kuning keemasan",
    "Biru|Ungu": "Biru kekunguan",
    "Ungu|Biru": "Biru kekunguan",
  };

  const hasil = [];

  for (let i = 0; i < colors.length; i++) {
    const current = colors[i];
    const next = colors[i + 1];
    const key = `${current}|${next}`;

    if (map[key]) {
      hasil.push(map[key]);
      i++;
    } else {
      hasil.push(current);
    }
  }

  return hasil.join(" | ");
}

/**
 * Periksa apakah inputValue terdapat dalam daftar nilai dbValue
 * yang dipisahkan oleh karakter "|".
 *
 * Contoh:
 *   dbValue    = "Konkoidal | Tidak beraturan"
 *   inputValue = "Konkoidal"
 *   → true
 *
 * @param {string|number|null|undefined} dbValue    - Nilai dari CSV (bisa multi)
 * @param {string}                       inputValue - Pilihan pengguna
 * @returns {boolean}
 */
function matchValue(dbValue, inputValue) {
  if (dbValue === null || dbValue === undefined || dbValue === "") return false;
  if (!inputValue || inputValue === "") return false;

  const needle = normalize(inputValue);

  return String(dbValue)
    .split("|")
    .map(v => normalize(v))
    .some(v => v === needle);
}

/* ═══════════════════════════════════════════════
   PENILAIAN (SCORING)
═══════════════════════════════════════════════ */

/**
 * Hitung skor kecocokan satu mineral terhadap input pengguna.
 * Semua parameter string menggunakan matchValue() agar
 * nilai multi (dipisah "|") tetap dihitung cocok.
 *
 * Total 10 parameter; setiap kecocokan bernilai 1 poin.
 *
 * @param {Object} mineral - Satu baris data dari CSV
 * @param {Object} input   - Input pengguna
 * @returns {number} Skor mentah (0–10)
 */
function scoreMineral(mineral, input) {
  let score = 0;

  // ── Sifat Optik (wajib) ─────────────────────
  if (matchValue(mineral.kilap, input.kilap)) score++;

  if (matchValue(mineral.warna, input.warna_primer)) {
    score++;
    if (input.warna_sekunder && !matchValue(mineral.warna, input.warna_sekunder)) {
      score--;
    }
  }

  if (matchValue(mineral.cerat, input.cerat)) score++;
  if (matchValue(mineral.transparansi, input.transparansi)) score++;

  // ── Kekerasan Mohs ───────────────────────────
  if (matchMohs(mineral.mohs, input.mohs)) score++;

  // ── Sifat Fisik (opsional) ───────────────────
  if (input.belahan && matchValue(mineral.belahan, input.belahan)) score++;
  if (input.pecahan && matchValue(mineral.pecahan, input.pecahan)) score++;
  if (input.bj && matchValue(mineral.bj, input.bj)) score++;
  if (input.magnet && matchValue(mineral.magnet, input.magnet)) score++;
  if (input.hcl && matchValue(mineral.hcl, input.hcl)) score++;

  return score;
}

/**
 * Periksa kecocokan kekerasan Mohs, mendukung nilai tunggal
 * maupun rentang (mis. "2-3").
 * @param {string|number} dbMohs
 * @param {number} inputMohs
 * @returns {boolean}
 */
function matchMohs(dbMohs, inputMohs) {
  if (!dbMohs || inputMohs <= 0) return false;

  const value = String(dbMohs).trim();

  // Jika berupa rentang
  if (value.includes("-")) {
    const [min, max] = value.split("-").map(v => parseFloat(v.trim()));
    return inputMohs >= min && inputMohs <= max;
  }

  // Jika hanya satu angka
  return Math.abs(parseFloat(value) - inputMohs) <= 0.5;
}

/**
 * Jalankan scoring pada seluruh database, filter, urutkan,
 * dan kembalikan kandidat teratas.
 *
 * @param {Object} input
 * @returns {Object[]}
 */
function rankCandidates(input) {
  return mineralDB
    .map(mineral => ({
      ...mineral,
      skor: scoreMineral(mineral, input),
      persen: 0
    }))
    .map(m => ({ ...m, persen: Math.round((m.skor / 10) * 100) }))
    .filter(m => m.persen > 0)
    .sort((a, b) => b.persen - a.persen)
    .slice(0, 11);
}

/* ═══════════════════════════════════════════════
   HANDLER UTAMA
═══════════════════════════════════════════════ */

/**
 * Dipanggil oleh tombol "Identifikasi Mineral".
 * Validasi input → scoring → tampilkan hasil.
 */
function handleIdentify() {
  if (mineralDB.length === 0) {
    showAlert("Database mineral belum selesai dimuat. Tunggu sebentar lalu coba lagi.");
    return;
  }

  const input = collectInput();

  if (!validateInput(input)) {
    showAlert("Lengkapi seluruh parameter Sifat Optik (Kilap, Warna, Cerat, Transparansi) terlebih dahulu.");
    return;
  }

  const candidates = rankCandidates(input);
  renderResults(candidates, input);

  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ═══════════════════════════════════════════════
   RENDERING HASIL
═══════════════════════════════════════════════ */

/**
 * Render daftar kandidat mineral ke dalam container hasil.
 * @param {Object[]} candidates
 * @param {Object} input
 */
function renderResults(candidates, input) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (candidates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-search-off"></i>
        <p>
          Tidak ditemukan mineral yang cocok.<br>
          Coba ubah parameter.
        </p>
      </div>`;
    return;
  }

  // Judul
  const title = document.createElement("div");
  title.className = "results-title";
  title.textContent = `${candidates.length} Kandidat Mineral Ditemukan`;
  container.appendChild(title);

  // Kandidat terbaik (full)
  container.appendChild(buildResultCard(candidates[0], 1, true, input));

  // Kandidat lain
  if (candidates.length > 1) {
    const grid = document.createElement("div");
    grid.className = "results-grid";

    candidates.slice(1).forEach((mineral, index) => {
      grid.appendChild(buildResultCard(mineral, index + 2, false, input));
    });

    container.appendChild(grid);
  }
}

/**
 * Buat elemen DOM untuk satu kartu hasil.
 * Parameter yang cocok dengan input pengguna mendapat class "prop-item--match".
 *
 * @param {Object}  mineral
 * @param {number}  rank   - Peringkat (1 = terbaik)
 * @param {boolean} isBest - Tandai sebagai kandidat terbaik
 * @param {Object}  input  - Input pengguna untuk pengecekan kecocokan
 * @returns {HTMLElement}
 */
function buildResultCard(mineral, rank, isBest, input) {
  const card = document.createElement("div");
  card.className = `result-card ${isBest ? "result-card--best" : "result-card--small"}`;

  // ── Cek kecocokan per-parameter ──────────────
  const mohsMatch = matchMohs(mineral.mohs, input.mohs);

  card.innerHTML = `
    ${buildImageHTML(mineral)}
    <div class="result-body">
      <div class="result-head">
        <div class="result-name-wrap">
          <span class="result-name">${mineral.nama}</span>
          <span class="result-formula">${mineral.rumuskimia ?? "—"}</span>
          ${isBest ? '<span class="badge-best">★ Kandidat Terbaik</span>' : ""}
        </div>
        <span class="rank-num">#${rank}</span>
      </div>

      <div class="match-bar-wrap">
        <div class="match-bar-header">
          <span class="match-bar-label">Kecocokan</span>
          <span class="match-pct">${mineral.persen}% (${mineral.skor}/10)</span>
        </div>
        <div class="match-bar">
          <div class="match-fill" style="width: 0%" data-width="${mineral.persen}%"></div>
        </div>
      </div>

      <div class="prop-grid">
        ${buildProp("Kekerasan", `Mohs ${mineral.mohs ?? "—"}`, mohsMatch)}
        ${buildProp("Kilap", mineral.kilap ?? "—", matchValue(mineral.kilap, input.kilap))}
        ${buildProp("Warna", formatColor(mineral.warna), matchValue(mineral.warna, input.warna_primer))}
        ${buildProp("Cerat", mineral.cerat ?? "—", matchValue(mineral.cerat, input.cerat))}
        ${buildProp("Transparansi", mineral.transparansi ?? "—", matchValue(mineral.transparansi, input.transparansi))}
        ${buildProp("Belahan", mineral.belahan ?? "—", input.belahan ? matchValue(mineral.belahan, input.belahan) : false)}
        ${buildProp("Pecahan", mineral.pecahan ?? "—", input.pecahan ? matchValue(mineral.pecahan, input.pecahan) : false)}
        ${buildProp("Massa Jenis (g/cm³)", mineral.bj ?? "—", input.bj ? matchValue(mineral.bj, input.bj) : false)}
        ${buildProp("Magnetik", mineral.magnet ?? "—", input.magnet ? matchValue(mineral.magnet, input.magnet) : false)}
        ${buildProp("Reaksi HCl", mineral.hcl ?? "—", input.hcl ? matchValue(mineral.hcl, input.hcl) : false)}
      </div>

      <div class="result-desc">${mineral.desc ?? ""}</div>
    </div>`;

  requestAnimationFrame(() => {
    const fill = card.querySelector(".match-fill");
    if (fill) {
      requestAnimationFrame(() => {
        fill.style.width = fill.dataset.width;
      });
    }
  });

  return card;
}

/**
 * Buat HTML gambar mineral, dengan fallback placeholder.
 * @param {Object} mineral
 * @returns {string}
 */
function buildImageHTML(mineral) {
  if (!mineral.image) {
    return buildPlaceholderHTML(mineral.nama);
  }

  const images = mineral.image
    .split("|")
    .map(img => img.trim())
    .filter(Boolean);

  const mainImage = images[0];

  // Jika hanya 1 gambar
  if (images.length === 1) {
    return `
      <div class="mineral-gallery">
        <div class="gallery-main">
          <img class="gallery-main-img" src="${mainImage}" alt="${mineral.nama}">
        </div>
      </div>`;
  }

  // Jika lebih dari 1 gambar
  const thumbs = images.map((img, index) => `
      <img
        src="${img}"
        class="gallery-thumb ${index === 0 ? "active" : ""}"
        onclick="changeImage(this,'${img}')">
  `).join("");

  return `
    <div class="mineral-gallery">
      <div class="gallery-main">
        <img class="gallery-main-img" src="${mainImage}" alt="${mineral.nama}">
      </div>
      <div class="gallery-thumbs">
        ${thumbs}
      </div>
    </div>`;
}

/**
 * Ganti gambar utama pada gallery saat thumbnail diklik.
 * Dipanggil via onclick inline pada elemen thumbnail.
 * @param {HTMLElement} thumb - Elemen thumbnail yang diklik
 * @param {string}      src   - Path gambar yang akan ditampilkan
 */
function changeImage(thumb, src) {
  const gallery = thumb.closest(".mineral-gallery");
  const mainImg = gallery.querySelector(".gallery-main-img");

  mainImg.src = src;

  gallery.querySelectorAll(".gallery-thumb")
    .forEach(t => t.classList.remove("active"));

  thumb.classList.add("active");
}

/**
 * Buat string HTML placeholder untuk kasus tanpa path gambar.
 * @param {string} nama
 * @returns {string}
 */
function buildPlaceholderHTML(nama) {
  return `
    <div class="result-img-placeholder">
      <i class="ti ti-diamond"></i>
      <span>${nama}</span>
    </div>`;
}

/**
 * Buat satu item properti mineral.
 * Parameter yang cocok dengan input pengguna akan diberi class "prop-item--match".
 *
 * @param {string}  key     - Label parameter
 * @param {string}  val     - Nilai dari database
 * @param {boolean} matched - true jika parameter ini cocok dengan input pengguna
 * @returns {string}
 */
function buildProp(key, val, matched = false) {
  return `
    <div class="prop-item${matched ? " prop-item--match" : ""}">
      <span class="prop-key">${key}</span>
      <span class="prop-val">${val}</span>
    </div>`;
}

/* ═══════════════════════════════════════════════
   RESET FORM
═══════════════════════════════════════════════ */

/**
 * Dipanggil oleh tombol "Reset". Mengosongkan semua input
 * (select, slider Mohs) dan menghapus hasil identifikasi.
 */
function resetForm() {
  [
    "kilap",
    "warna_primer",
    "warna_sekunder",
    "cerat",
    "transparansi",
    "belahan",
    "pecahan",
    "bj",
    "magnet",
    "hcl"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      el.classList.remove("has-value");
    }
  });

  // Reset slider Mohs
  const slider = document.getElementById("mohs");
  if (slider) {
    slider.value = 0;
    slider.dispatchEvent(new Event("input"));
  }

  // Reset nilai Mohs yang dipakai scoring
  mohsValue = 0;

  // Hapus hasil identifikasi
  const results = document.getElementById("results");
  if (results) {
    results.innerHTML = "";
  }
}