/**
 * SPMB AI Chatbot - SMK Bhakti Persada Kendal
 * Google Apps Script + Google Sheets
 * Versi: 2.0
 *
 * Fitur:
 * - Database Google Sheets otomatis
 * - Chatbot hybrid: database resmi + AI Gemini/OpenAI
 * - Form pendaftaran calon siswa
 * - Cek status dengan No. Pendaftaran + WhatsApp
 * - Rekomendasi jurusan
 * - Dashboard admin dan statistik
 * - Konfigurasi AI aman via Script Properties
 */

const APP = {
  VERSION: '2.0.0',
  TZ: 'Asia/Jakarta',
  SHEETS: {
    SETTINGS: 'Pengaturan',
    MAJORS: 'Jurusan',
    FAQ: 'FAQ',
    APPLICANTS: 'Pendaftar',
    CHAT: 'ChatLog',
    RECOMMEND: 'RekomendasiLog',
    ADMINS: 'Admin'
  },
  STATUS: ['BARU','TERVERIFIKASI','DITERIMA','CADANGAN','PERBAIKAN_BERKAS','DITOLAK','DAFTAR_ULANG'],
  PUBLIC_SETTING_KEYS: [
    'SCHOOL_NAME','ACADEMIC_YEAR','REG_OPEN','REG_CLOSE','REGISTRATION_OPEN',
    'ADDRESS','PHONE','WHATSAPP','WEBSITE','LOGO_URL','BUILDING_FEE_FREE',
    'UNIFORM_FREE','WELCOME_TEXT','CONTACT_TEXT','PRIVACY_TEXT'
  ],
  ADMIN_SETTING_KEYS: [
    'SCHOOL_NAME','ACADEMIC_YEAR','REG_OPEN','REG_CLOSE','REGISTRATION_OPEN',
    'ADDRESS','PHONE','WHATSAPP','WEBSITE','LOGO_URL','BUILDING_FEE_FREE',
    'UNIFORM_FREE','WELCOME_TEXT','CONTACT_TEXT','PRIVACY_TEXT',
    'AI_ENABLED','AI_PROVIDER','AI_MODEL_GEMINI','AI_MODEL_OPENAI'
  ]
};

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('SPMB - SMK Bhakti Persada Kendal')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* =========================================================
 * SETUP DATABASE
 * ========================================================= */

function setupDatabase() {
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) {
    ss = SpreadsheetApp.create('Database SPMB - SMK Bhakti Persada Kendal');
  }
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  ensureSheet_(ss, APP.SHEETS.SETTINGS, ['Key','Value','Description']);
  ensureSheet_(ss, APP.SHEETS.MAJORS, ['Kode','Nama','Deskripsi','Aktif','Keywords','Urutan']);
  ensureSheet_(ss, APP.SHEETS.FAQ, ['Keyword','Pertanyaan','Jawaban','Aktif','Urutan']);
  ensureSheet_(ss, APP.SHEETS.APPLICANTS, [
    'Timestamp','NoPendaftaran','NamaLengkap','NISN','AsalSekolah','TempatLahir','TanggalLahir',
    'JenisKelamin','WhatsApp','WhatsAppOrtu','Email','Alamat','Pilihan1','Pilihan2',
    'Status','CatatanAdmin','Sumber','Consent'
  ]);
  ensureSheet_(ss, APP.SHEETS.CHAT, [
    'Timestamp','SessionId','Pertanyaan','Intent','Provider','Jawaban','LatencyMs'
  ]);
  ensureSheet_(ss, APP.SHEETS.RECOMMEND, [
    'Timestamp','SessionId','Nama','AsalSekolah','Tags','Rekomendasi1','Skor1',
    'Rekomendasi2','Skor2','Rekomendasi3','Skor3'
  ]);
  ensureSheet_(ss, APP.SHEETS.ADMINS, [
    'Username','PasswordHash','Nama','Aktif','LastLogin'
  ]);

  seedSettings_();
  seedMajors_();
  seedFaq_();

  const adminSheet = ss.getSheetByName(APP.SHEETS.ADMINS);
  let tempPassword = '';
  if (adminSheet.getLastRow() < 2) {
    tempPassword = generateTempPassword_();
    adminSheet.appendRow(['admin', hashPassword_(tempPassword), 'Administrator SPMB', true, '']);
  }

  applyFormatting_(ss);

  const result = {
    success: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    adminUsername: 'admin',
    tempPassword: tempPassword || '(akun admin sudah ada, password tidak diubah)'
  };

  console.log('=== SETUP SPMB SELESAI ===');
  console.log('Spreadsheet: ' + ss.getUrl());
  console.log('Username admin: admin');
  if (tempPassword) console.log('Password sementara: ' + tempPassword);
  console.log('Segera ganti password setelah login.');
  return result;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  else {
    const current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
    const mismatch = headers.some((h, i) => current[i] !== h);
    if (mismatch) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function seedSettings_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.SETTINGS);
  if (sh.getLastRow() > 1) return;
  const rows = [
    ['SCHOOL_NAME','SMK Bhakti Persada Kendal','Nama sekolah'],
    ['ACADEMIC_YEAR','2027/2028','Tahun pelajaran SPMB'],
    ['REG_OPEN','Silakan isi tanggal pembukaan','Tanggal pembukaan pendaftaran'],
    ['REG_CLOSE','Silakan isi tanggal penutupan','Tanggal penutupan pendaftaran'],
    ['REGISTRATION_OPEN','TRUE','TRUE/FALSE untuk menerima pendaftaran'],
    ['ADDRESS','Silakan isi alamat lengkap sekolah','Alamat sekolah'],
    ['PHONE','Silakan isi nomor telepon panitia','Nomor telepon'],
    ['WHATSAPP','6280000000000','Nomor WhatsApp format 62...'],
    ['WEBSITE','Silakan isi website sekolah','Website sekolah'],
    ['LOGO_URL','','URL logo publik (opsional)'],
    ['BUILDING_FEE_FREE','TRUE','Bebas uang gedung'],
    ['UNIFORM_FREE','TRUE','Gratis seragam'],
    ['WELCOME_TEXT','Selamat datang di layanan SPMB SMK Bhakti Persada Kendal. Saya siap membantu informasi pendaftaran.','Pesan pembuka chatbot'],
    ['CONTACT_TEXT','Untuk informasi khusus, silakan hubungi panitia SPMB.','Pesan kontak'],
    ['PRIVACY_TEXT','Data pendaftar digunakan untuk proses SPMB dan administrasi sekolah sesuai kebutuhan layanan.','Pemberitahuan privasi'],
    ['AI_ENABLED','TRUE','Aktif/nonaktif AI'],
    ['AI_PROVIDER','gemini','gemini atau openai'],
    ['AI_MODEL_GEMINI','gemini-3.8-flash','Model Gemini'],
    ['AI_MODEL_OPENAI','gpt-6-luna','Model OpenAI']
  ];
  sh.getRange(2,1,rows.length,3).setValues(rows);
}

function seedMajors_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.MAJORS);
  if (sh.getLastRow() > 1) return;
  const rows = [
    ['AKL','Akuntansi dan Keuangan Lembaga','Mempelajari akuntansi, administrasi keuangan, laporan keuangan, dan aplikasi pendukung.',true,'angka,matematika,keuangan,bisnis,teliti,laporan,komputer',1],
    ['MP','Manajemen Perkantoran','Mempelajari administrasi, komunikasi bisnis, layanan, dokumen, dan teknologi perkantoran.',true,'komunikasi,administrasi,organisasi,layanan,dokumen,bahasa,komputer',2],
    ['RPL','Rekayasa Perangkat Lunak','Mempelajari pemrograman, aplikasi, website, basis data, dan pengembangan perangkat lunak.',true,'teknologi,komputer,coding,logika,matematika,desain,aplikasi',3],
    ['FAR','Farmasi','Mempelajari dasar kefarmasian, sediaan farmasi, laboratorium, dan pelayanan kefarmasian.',true,'kesehatan,kimia,biologi,teliti,laboratorium,pelayanan,sains',4],
    ['OTO','Teknik Otomotif','Mempelajari pemeriksaan, perawatan, dan praktik dasar kendaraan serta sistem otomotif.',true,'mesin,kendaraan,praktik,fisika,mekanik,teknologi,otomotif',5]
  ];
  sh.getRange(2,1,rows.length,6).setValues(rows);
}

function seedFaq_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.FAQ);
  if (sh.getLastRow() > 1) return;
  const rows = [
    ['syarat,berkas,dokumen','Apa syarat pendaftaran?','Persyaratan umum: Kartu Keluarga, Akta Kelahiran, identitas orang tua/wali, rapor/ijazah/SKL sesuai ketentuan, pas foto, dan nomor HP aktif. Panitia dapat menetapkan dokumen tambahan.',true,1],
    ['uang gedung,biaya,gratis','Apakah ada uang gedung?','Program SPMB mencantumkan BEBAS UANG GEDUNG. Rincian biaya lainnya tetap perlu dikonfirmasi kepada panitia.',true,2],
    ['seragam','Apakah seragam gratis?','Program SPMB mencantumkan GRATIS SERAGAM. Ketentuan paket dan periode program mengikuti pengumuman resmi panitia.',true,3],
    ['alur,cara daftar,pendaftaran','Bagaimana cara mendaftar?','Siapkan dokumen, isi formulir pendaftaran, kirim data, simpan nomor pendaftaran, lalu pantau status melalui menu Cek Status.',true,4],
    ['jadwal,tanggal,kapan,gelombang','Kapan pendaftaran dibuka?','Jadwal pendaftaran mengikuti tanggal yang tercantum pada sistem. Silakan lihat bagian Informasi SPMB untuk tanggal terbaru.',true,5],
    ['alamat,lokasi','Di mana lokasi sekolah?','Alamat sekolah dapat dilihat pada bagian Informasi SPMB. Hubungi panitia jika membutuhkan petunjuk lokasi.',true,6],
    ['kontak,whatsapp,wa,telepon','Bagaimana menghubungi panitia?','Gunakan tombol WhatsApp Panitia pada aplikasi atau lihat nomor kontak di bagian Informasi SPMB.',true,7]
  ];
  sh.getRange(2,1,rows.length,5).setValues(rows);
}

function applyFormatting_(ss) {
  Object.keys(APP.SHEETS).forEach(k => {
    const sh = ss.getSheetByName(APP.SHEETS[k]);
    if (!sh) return;
    const lastCol = sh.getLastColumn();
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,lastCol)
      .setFontWeight('bold')
      .setBackground('#174ea6')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');
    sh.autoResizeColumns(1, lastCol);
    for (let c=1; c<=lastCol; c++) {
      if (sh.getColumnWidth(c) > 360) sh.setColumnWidth(c, 320);
    }
  });
}

function setAISecrets(provider, apiKey, model) {
  provider = String(provider || '').toLowerCase().trim();
  if (!['gemini','openai'].includes(provider)) throw new Error('Provider harus gemini atau openai.');
  if (!apiKey || String(apiKey).trim().length < 10) throw new Error('API key tidak valid.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY', String(apiKey).trim());
  setSetting_('AI_PROVIDER', provider);
  if (model) setSetting_(provider === 'gemini' ? 'AI_MODEL_GEMINI' : 'AI_MODEL_OPENAI', String(model).trim());
  return {success:true, provider:provider};
}

/* =========================================================
 * PUBLIC API
 * ========================================================= */

function getPublicBootstrap() {
  const settings = getSettingsObject_();
  const pub = {};
  APP.PUBLIC_SETTING_KEYS.forEach(k => pub[k] = settings[k] || '');
  return {
    appVersion: APP.VERSION,
    settings: pub,
    majors: getActiveMajors_().map(m => ({
      code:m.code, name:m.name, description:m.description, order:m.order
    })),
    registrationOpen: asBool_(settings.REGISTRATION_OPEN)
  };
}

function submitRegistration(data) {
  data = data || {};
  if (String(data.website || '').trim()) throw new Error('Permintaan tidak valid.');
  if (!asBool_(getSettingsObject_().REGISTRATION_OPEN)) {
    throw new Error('Pendaftaran sedang ditutup. Silakan hubungi panitia SPMB.');
  }

  const name = cleanText_(data.name, 100);
  const nisn = cleanDigits_(data.nisn, 10);
  const origin = cleanText_(data.origin, 120);
  const birthPlace = cleanText_(data.birthPlace, 80);
  const birthDate = cleanText_(data.birthDate, 12);
  const gender = cleanText_(data.gender, 20);
  const wa = normalizePhone_(data.whatsapp);
  const waParent = normalizePhone_(data.parentWhatsapp);
  const email = cleanText_(data.email, 120);
  const address = cleanText_(data.address, 300);
  const choice1 = cleanText_(data.choice1, 120);
  const choice2 = cleanText_(data.choice2, 120);
  const consent = !!data.consent;

  if (name.length < 3) throw new Error('Nama lengkap wajib diisi.');
  if (nisn && nisn.length !== 10) throw new Error('NISN harus 10 digit atau dikosongkan.');
  if (origin.length < 3) throw new Error('Asal sekolah wajib diisi.');
  if (!/^\d{10,15}$/.test(wa)) throw new Error('Nomor WhatsApp calon siswa tidak valid.');
  if (waParent && !/^\d{10,15}$/.test(waParent)) throw new Error('Nomor WhatsApp orang tua tidak valid.');
  if (!consent) throw new Error('Persetujuan penggunaan data wajib dicentang.');

  const majors = getActiveMajors_().map(m => m.name);
  if (!majors.includes(choice1)) throw new Error('Pilihan jurusan pertama tidak valid.');
  if (choice2 && !majors.includes(choice2)) throw new Error('Pilihan jurusan kedua tidak valid.');
  if (choice1 && choice2 && choice1 === choice2) throw new Error('Pilihan jurusan pertama dan kedua harus berbeda.');

  const sh = getDb_().getSheetByName(APP.SHEETS.APPLICANTS);
  if (nisn) {
    const values = sh.getDataRange().getValues();
    for (let i=1;i<values.length;i++) {
      if (String(values[i][3]).replace(/\D/g,'') === nisn) {
        return {
          success:false,
          duplicate:true,
          message:'NISN tersebut sudah terdaftar.',
          registrationNo:String(values[i][1] || '')
        };
      }
    }
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let regNo;
  try {
    regNo = nextRegistrationNumber_();
    sh.appendRow([
      new Date(), regNo, name, nisn, origin, birthPlace, birthDate, gender,
      wa, waParent, email, address, choice1, choice2,
      'BARU', '', 'Web Chatbot', consent
    ]);
  } finally {
    lock.releaseLock();
  }

  return {
    success:true,
    registrationNo:regNo,
    name:name,
    status:'BARU',
    message:'Pendaftaran berhasil disimpan.'
  };
}

function checkRegistrationStatus(registrationNo, whatsapp) {
  const reg = cleanText_(registrationNo, 40).toUpperCase();
  const wa = normalizePhone_(whatsapp);
  if (!reg || !wa) throw new Error('Nomor pendaftaran dan WhatsApp wajib diisi.');

  const sh = getDb_().getSheetByName(APP.SHEETS.APPLICANTS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    const rowReg = String(values[i][1] || '').toUpperCase();
    const rowWa = normalizePhone_(values[i][8]);
    const rowWaParent = normalizePhone_(values[i][9]);
    if (rowReg === reg && (rowWa === wa || rowWaParent === wa)) {
      return {
        found:true,
        registrationNo:rowReg,
        name:maskName_(String(values[i][2] || '')),
        origin:String(values[i][4] || ''),
        choice1:String(values[i][12] || ''),
        choice2:String(values[i][13] || ''),
        status:String(values[i][14] || 'BARU'),
        note:String(values[i][15] || '')
      };
    }
  }
  return {found:false, message:'Data tidak ditemukan. Periksa nomor pendaftaran dan nomor WhatsApp.'};
}

function recommendMajor(data) {
  data = data || {};
  const sessionId = cleanText_(data.sessionId, 80);
  const name = cleanText_(data.name, 100);
  const origin = cleanText_(data.origin, 120);
  const tags = Array.isArray(data.tags) ? data.tags.map(x => cleanText_(x,40).toLowerCase()).filter(Boolean) : [];
  if (tags.length < 2) throw new Error('Pilih minimal 2 minat atau kecenderungan.');

  const majors = getActiveMajors_();
  const ranked = majors.map(m => {
    const keywords = m.keywords.map(k => k.toLowerCase());
    let score = 0;
    const matches = [];
    tags.forEach(tag => {
      keywords.forEach(kw => {
        if (tag === kw || tag.indexOf(kw) >= 0 || kw.indexOf(tag) >= 0) {
          score += 10;
          if (!matches.includes(kw)) matches.push(kw);
        }
      });
    });
    return {
      code:m.code,
      name:m.name,
      description:m.description,
      score:score,
      matches:matches
    };
  }).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));

  const max = Math.max(1, ranked[0].score);
  const top = ranked.slice(0,3).map(r => ({
    code:r.code,
    name:r.name,
    description:r.description,
    score:Math.round((r.score / max) * 100),
    matches:r.matches.slice(0,5)
  }));

  const sh = getDb_().getSheetByName(APP.SHEETS.RECOMMEND);
  sh.appendRow([
    new Date(), sessionId, name, origin, tags.join(', '),
    top[0]?.name || '', top[0]?.score || 0,
    top[1]?.name || '', top[1]?.score || 0,
    top[2]?.name || '', top[2]?.score || 0
  ]);

  return {
    top:top,
    disclaimer:'Rekomendasi ini bersifat orientasi awal. Pilihan akhir sebaiknya mempertimbangkan minat, kemampuan, dukungan orang tua, dan konsultasi dengan sekolah.'
  };
}

function chatMessage(question, sessionId) {
  const started = Date.now();
  const q = cleanText_(question, 600);
  const sid = cleanText_(sessionId, 80) || Utilities.getUuid();
  if (!q) throw new Error('Pertanyaan tidak boleh kosong.');
  rateLimitChat_(sid);

  const settings = getSettingsObject_();
  const intent = detectIntent_(q);
  let provider = 'database';
  let answer = getOfficialAnswer_(q, intent, settings);

  if (!answer) {
    if (asBool_(settings.AI_ENABLED)) {
      try {
        provider = String(settings.AI_PROVIDER || 'gemini').toLowerCase();
        answer = askAI_(q, settings, provider);
      } catch (err) {
        console.error('AI chatbot error [' + provider + ']: ' + (err && err.stack ? err.stack : err));
        provider = 'fallback';
        answer = 'Maaf, layanan AI sedang tidak tersedia. Anda tetap dapat memakai menu Jurusan, Pendaftaran, Cek Status, Rekomendasi Jurusan, atau menghubungi panitia.';
      }
    } else {
      provider = 'fallback';
      answer = fallbackAnswer_();
    }
  }

  logChat_(sid, q, intent, provider, answer, Date.now() - started);
  return {
    answer:answer,
    intent:intent,
    provider:provider,
    actions:chatActions_(intent)
  };
}

/* =========================================================
 * CHAT KNOWLEDGE + AI
 * ========================================================= */

function detectIntent_(q) {
  const t = normalizeText_(q);
  if (/(jurusan|program keahlian|kompetensi keahlian)/.test(t)) return 'jurusan';
  if (/(syarat|berkas|dokumen)/.test(t)) return 'syarat';
  if (/(jadwal|tanggal|kapan|gelombang|dibuka|ditutup)/.test(t)) return 'jadwal';
  if (/(biaya|uang gedung|gratis|seragam|bayar)/.test(t)) return 'biaya';
  if (/(cara daftar|alur|mendaftar|pendaftaran)/.test(t)) return 'daftar';
  if (/(status|cek pendaftaran|diterima|verifikasi)/.test(t)) return 'status';
  if (/(rekomendasi|cocok jurusan|minat|bakat)/.test(t)) return 'rekomendasi';
  if (/(alamat|lokasi|maps)/.test(t)) return 'alamat';
  if (/(kontak|whatsapp|wa|telepon|hubungi)/.test(t)) return 'kontak';
  return 'lainnya';
}

function getOfficialAnswer_(q, intent, settings) {
  const majors = getActiveMajors_();
  if (intent === 'jurusan') {
    return 'Program keahlian yang tersedia:\n\n' +
      majors.map((m,i) => (i+1)+'. '+m.name+'\n   '+m.description).join('\n\n') +
      '\n\nGunakan menu Rekomendasi Jurusan jika ingin melihat pilihan yang paling sesuai dengan minat Anda.';
  }
  if (intent === 'jadwal') {
    return 'Jadwal SPMB Tahun Pelajaran ' + (settings.ACADEMIC_YEAR || '') +
      ':\n• Pembukaan: ' + (settings.REG_OPEN || '-') +
      '\n• Penutupan: ' + (settings.REG_CLOSE || '-') +
      '\n• Status pendaftaran: ' + (asBool_(settings.REGISTRATION_OPEN) ? 'DIBUKA' : 'DITUTUP');
  }
  if (intent === 'biaya') {
    const lines = ['Informasi program biaya SPMB:'];
    if (asBool_(settings.BUILDING_FEE_FREE)) lines.push('✅ BEBAS UANG GEDUNG');
    if (asBool_(settings.UNIFORM_FREE)) lines.push('✅ GRATIS SERAGAM');
    lines.push('\nUntuk komponen biaya lain, konfirmasikan kepada panitia agar memperoleh informasi resmi terbaru.');
    return lines.join('\n');
  }
  if (intent === 'daftar') {
    return 'Alur pendaftaran:\n1. Buka menu Daftar SPMB.\n2. Isi identitas dan pilihan jurusan.\n3. Centang persetujuan penggunaan data.\n4. Kirim formulir.\n5. Simpan nomor pendaftaran.\n6. Pantau proses melalui menu Cek Status.';
  }
  if (intent === 'status') {
    return 'Untuk melindungi data pendaftar, pengecekan status dilakukan melalui menu Cek Status dengan memasukkan Nomor Pendaftaran dan nomor WhatsApp yang digunakan saat mendaftar.';
  }
  if (intent === 'rekomendasi') {
    return 'Saya dapat membantu orientasi pilihan jurusan. Buka menu Rekomendasi Jurusan, pilih minat dan kecenderungan Anda, lalu sistem akan menampilkan tiga jurusan teratas.';
  }
  if (intent === 'alamat') return 'Alamat sekolah: ' + (settings.ADDRESS || 'Belum diatur oleh admin.');
  if (intent === 'kontak') {
    return 'Kontak Panitia SPMB:\n• Telepon: ' + (settings.PHONE || '-') +
      '\n• WhatsApp: ' + (settings.WHATSAPP || '-') +
      '\n• Website: ' + (settings.WEBSITE || '-');
  }

  const t = normalizeText_(q);
  const faq = getFaq_();
  for (let i=0;i<faq.length;i++) {
    const keywords = faq[i].keywords;
    if (keywords.some(k => k && t.indexOf(normalizeText_(k)) >= 0)) {
      return faq[i].answer;
    }
  }
  return '';
}

function askAI_(q, settings, provider) {
  const context = buildAIContext_(settings);
  if (provider === 'openai') return askOpenAI_(q, context, settings);
  return askGemini_(q, context, settings);
}

function buildAIContext_(settings) {
  const majors = getActiveMajors_();
  const faq = getFaq_();
  return [
    'Anda adalah Asisten SPMB resmi untuk ' + (settings.SCHOOL_NAME || 'SMK Bhakti Persada Kendal') + '.',
    'Tugas Anda hanya menjawab hal yang relevan dengan SPMB dan sekolah berdasarkan data resmi berikut.',
    'Jangan mengarang tanggal, biaya, syarat, fasilitas, kuota, akreditasi, beasiswa, atau kebijakan yang tidak ada di konteks.',
    'Jika data tidak tersedia, katakan bahwa informasi belum tersedia dan arahkan pengguna menghubungi panitia.',
    'Gunakan Bahasa Indonesia yang ramah, ringkas, jelas, dan cocok untuk calon siswa/orang tua.',
    'Jangan meminta NIK, password, API key, atau data rahasia melalui percakapan.',
    '',
    'DATA SEKOLAH:',
    'Nama: ' + (settings.SCHOOL_NAME || ''),
    'Tahun Pelajaran: ' + (settings.ACADEMIC_YEAR || ''),
    'Pendaftaran dibuka: ' + (settings.REG_OPEN || ''),
    'Pendaftaran ditutup: ' + (settings.REG_CLOSE || ''),
    'Alamat: ' + (settings.ADDRESS || ''),
    'Telepon: ' + (settings.PHONE || ''),
    'WhatsApp: ' + (settings.WHATSAPP || ''),
    'Website: ' + (settings.WEBSITE || ''),
    'Bebas uang gedung: ' + (asBool_(settings.BUILDING_FEE_FREE) ? 'Ya' : 'Tidak/Belum ditetapkan'),
    'Gratis seragam: ' + (asBool_(settings.UNIFORM_FREE) ? 'Ya' : 'Tidak/Belum ditetapkan'),
    '',
    'PROGRAM KEAHLIAN:',
    majors.map(m => '- '+m.name+': '+m.description).join('\n'),
    '',
    'FAQ RESMI:',
    faq.slice(0,20).map(f => '- '+f.question+' Jawaban: '+f.answer).join('\n')
  ].join('\n');
}

function askGemini_(q, context, settings) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY belum diatur.');

  const model = cleanText_(settings.AI_MODEL_GEMINI || 'gemini-3.8-flash', 80);
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const payload = {
    systemInstruction: {
      parts: [{ text: context }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: q }]
    }],
    generationConfig: {
      maxOutputTokens: 700
    }
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const raw = res.getContentText();
  if (code < 200 || code >= 300) {
    console.error('Gemini API error HTTP ' + code + ': ' + raw.slice(0, 1000));
    throw new Error('Gemini HTTP ' + code + ': ' + getGeminiErrorMessage_(raw));
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error('Respons Gemini bukan JSON yang valid.');
  }

  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  if (!candidates.length) {
    const blocked = json.promptFeedback && json.promptFeedback.blockReason
      ? ' Prompt diblokir: ' + json.promptFeedback.blockReason
      : '';
    throw new Error('Gemini tidak menghasilkan kandidat jawaban.' + blocked);
  }

  const parts = candidates[0] && candidates[0].content && Array.isArray(candidates[0].content.parts)
    ? candidates[0].content.parts
    : [];
  const out = parts.map(function(part) {
    return part && part.text ? String(part.text) : '';
  }).filter(Boolean).join('\n').trim();

  if (!out) {
    const reason = candidates[0] && candidates[0].finishReason ? candidates[0].finishReason : 'UNKNOWN';
    throw new Error('Respons Gemini tidak berisi teks. Finish reason: ' + reason);
  }
  return out;
}

function getGeminiErrorMessage_(raw) {
  try {
    const json = JSON.parse(raw);
    if (json && json.error && json.error.message) return String(json.error.message).slice(0, 300);
  } catch (e) {}
  return String(raw || 'Kesalahan tidak diketahui').slice(0, 300);
}

function testGeminiConnection(token) {
  requireAdmin_(token);
  const settings = getSettingsObject_();
  const started = Date.now();
  const reply = askGemini_(
    'Balas tepat dengan kalimat: Koneksi Gemini SPMB berhasil.',
    'Anda sedang melakukan tes koneksi API. Ikuti instruksi pengguna secara ringkas.',
    settings
  );
  return {
    success: true,
    model: settings.AI_MODEL_GEMINI || 'gemini-3.8-flash',
    reply: reply,
    latencyMs: Date.now() - started
  };
}

function askOpenAI_(q, context, settings) {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY belum diatur.');
  const model = settings.AI_MODEL_OPENAI || 'gpt-6-luna';
  const payload = {
    model:model,
    instructions:context,
    input:q,
    store:false,
    max_output_tokens:600
  };
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method:'post',
    contentType:'application/json',
    headers:{Authorization:'Bearer '+key},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('OpenAI HTTP '+code+': '+text.slice(0,300));
  const json = JSON.parse(text);
  const out = extractOpenAIText_(json);
  if (!out) throw new Error('Respons OpenAI kosong.');
  return out.trim();
}

function extractOpenAIText_(json) {
  if (json.output_text) return String(json.output_text);
  const parts = [];
  (json.output || []).forEach(item => {
    (item.content || []).forEach(c => {
      if ((c.type === 'output_text' || c.type === 'text') && c.text) parts.push(String(c.text));
    });
  });
  return parts.join('\n');
}

function fallbackAnswer_() {
  return 'Saya belum menemukan jawaban pasti pada basis informasi SPMB. Silakan gunakan menu informasi yang tersedia atau hubungi panitia SPMB agar memperoleh jawaban resmi.';
}

function chatActions_(intent) {
  if (intent === 'daftar') return [{type:'tab',target:'register',label:'Daftar SPMB'}];
  if (intent === 'status') return [{type:'tab',target:'status',label:'Cek Status'}];
  if (intent === 'rekomendasi') return [{type:'tab',target:'recommend',label:'Rekomendasi Jurusan'}];
  if (intent === 'jurusan') return [{type:'tab',target:'info',label:'Lihat Jurusan'}];
  return [];
}

function logChat_(sid, q, intent, provider, answer, latency) {
  getDb_().getSheetByName(APP.SHEETS.CHAT).appendRow([
    new Date(), sid, q, intent, provider, String(answer).slice(0,2000), latency
  ]);
}

function rateLimitChat_(sid) {
  const cache = CacheService.getScriptCache();
  const key = 'chat_rate_' + sid;
  const n = Number(cache.get(key) || 0) + 1;
  if (n > 30) throw new Error('Batas pertanyaan sementara tercapai. Silakan coba beberapa menit lagi.');
  cache.put(key, String(n), 600);
}

/* =========================================================
 * ADMIN
 * ========================================================= */

function adminLogin(username, password) {
  username = cleanText_(username, 60).toLowerCase();
  password = String(password || '');
  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  const sh = getDb_().getSheetByName(APP.SHEETS.ADMINS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    const user = String(values[i][0] || '').toLowerCase();
    const hash = String(values[i][1] || '');
    const active = asBool_(values[i][3]);
    if (user === username && active && hash === hashPassword_(password)) {
      const token = Utilities.getUuid() + Utilities.getUuid();
      CacheService.getScriptCache().put('admin_session_'+token, username, 21600);
      sh.getRange(i+1,5).setValue(new Date());
      return {
        success:true,
        token:token,
        username:username,
        name:String(values[i][2] || username),
        dashboard:getAdminDashboard_(token, username)
      };
    }
  }
  return {success:false, message:'Username atau password salah.'};
}

function adminLogout(token) {
  if (token) CacheService.getScriptCache().remove('admin_session_'+String(token));
  return {success:true};
}

function getAdminDashboard(token) {
  const username = requireAdmin_(token);
  return getAdminDashboard_(token, username);
}

function getAdminDashboard_(token, username) {
  const sh = getDb_().getSheetByName(APP.SHEETS.APPLICANTS);
  const values = sh.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd');
  const stats = {
    total:0, today:0, BARU:0, TERVERIFIKASI:0, DITERIMA:0,
    CADANGAN:0, PERBAIKAN_BERKAS:0, DITOLAK:0, DAFTAR_ULANG:0
  };
  const majorCount = {};
  const applicants = [];

  for (let i=1;i<values.length;i++) {
    const r = values[i];
    if (!r[1]) continue;
    stats.total++;
    const dateStr = r[0] instanceof Date ? Utilities.formatDate(r[0], APP.TZ, 'yyyy-MM-dd') : '';
    if (dateStr === today) stats.today++;
    const st = String(r[14] || 'BARU');
    if (stats[st] !== undefined) stats[st]++;
    const major = String(r[12] || '-');
    majorCount[major] = (majorCount[major] || 0) + 1;
    applicants.push({
      row:i+1,
      timestamp:r[0] instanceof Date ? Utilities.formatDate(r[0], APP.TZ, 'dd/MM/yyyy HH:mm') : String(r[0] || ''),
      registrationNo:String(r[1] || ''),
      name:String(r[2] || ''),
      nisn:String(r[3] || ''),
      origin:String(r[4] || ''),
      whatsapp:String(r[8] || ''),
      choice1:String(r[12] || ''),
      choice2:String(r[13] || ''),
      status:st,
      note:String(r[15] || '')
    });
  }

  applicants.reverse();

  const chatStats = getChatStats_();
  return {
    username:username,
    stats:stats,
    majorDistribution:Object.keys(majorCount).map(k => ({name:k,count:majorCount[k]})).sort((a,b)=>b.count-a.count),
    chatStats:chatStats,
    applicants:applicants.slice(0,300),
    statuses:APP.STATUS,
    ai:getAIAdminStatus_()
  };
}

function getChatStats_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.CHAT);
  const values = sh.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd');
  let total = 0, todayCount = 0;
  const intents = {};
  const providers = {};
  for (let i=1;i<values.length;i++) {
    if (!values[i][2]) continue;
    total++;
    const ds = values[i][0] instanceof Date ? Utilities.formatDate(values[i][0], APP.TZ, 'yyyy-MM-dd') : '';
    if (ds === today) todayCount++;
    const intent = String(values[i][3] || 'lainnya');
    const provider = String(values[i][4] || 'database');
    intents[intent] = (intents[intent] || 0) + 1;
    providers[provider] = (providers[provider] || 0) + 1;
  }
  return {
    total:total,
    today:todayCount,
    intents:Object.keys(intents).map(k=>({name:k,count:intents[k]})).sort((a,b)=>b.count-a.count).slice(0,8),
    providers:Object.keys(providers).map(k=>({name:k,count:providers[k]})).sort((a,b)=>b.count-a.count)
  };
}

function adminUpdateStatus(token, registrationNo, status, note) {
  requireAdmin_(token);
  const reg = cleanText_(registrationNo, 40).toUpperCase();
  status = cleanText_(status, 40).toUpperCase();
  note = cleanText_(note, 300);
  if (!APP.STATUS.includes(status)) throw new Error('Status tidak valid.');

  const sh = getDb_().getSheetByName(APP.SHEETS.APPLICANTS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][1] || '').toUpperCase() === reg) {
      sh.getRange(i+1,15).setValue(status);
      sh.getRange(i+1,16).setValue(note);
      return {success:true, registrationNo:reg, status:status, note:note};
    }
  }
  throw new Error('Nomor pendaftaran tidak ditemukan.');
}

function adminGetSettings(token) {
  requireAdmin_(token);
  const settings = getSettingsObject_();
  const data = {};
  APP.ADMIN_SETTING_KEYS.forEach(k => data[k] = settings[k] || '');
  return {
    settings:data,
    geminiKeyConfigured:!!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
    openaiKeyConfigured:!!PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')
  };
}

function adminSaveSettings(token, data) {
  requireAdmin_(token);
  data = data || {};
  APP.ADMIN_SETTING_KEYS.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(data,k)) setSetting_(k, String(data[k]));
  });
  return {success:true};
}

function adminSaveAIConfig(token, data) {
  requireAdmin_(token);
  data = data || {};
  const provider = String(data.provider || '').toLowerCase();
  if (!['gemini','openai'].includes(provider)) throw new Error('Provider AI tidak valid.');
  setSetting_('AI_PROVIDER', provider);
  setSetting_('AI_ENABLED', data.enabled ? 'TRUE' : 'FALSE');

  if (provider === 'gemini') {
    if (data.model) setSetting_('AI_MODEL_GEMINI', cleanText_(data.model,80));
    if (String(data.apiKey || '').trim()) PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', String(data.apiKey).trim());
  } else {
    if (data.model) setSetting_('AI_MODEL_OPENAI', cleanText_(data.model,80));
    if (String(data.apiKey || '').trim()) PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', String(data.apiKey).trim());
  }
  return {success:true, status:getAIAdminStatus_()};
}

function adminChangePassword(token, oldPassword, newPassword) {
  const username = requireAdmin_(token);
  oldPassword = String(oldPassword || '');
  newPassword = String(newPassword || '');
  if (newPassword.length < 10) throw new Error('Password baru minimal 10 karakter.');

  const sh = getDb_().getSheetByName(APP.SHEETS.ADMINS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][0] || '').toLowerCase() === username) {
      if (String(values[i][1] || '') !== hashPassword_(oldPassword)) throw new Error('Password lama salah.');
      sh.getRange(i+1,2).setValue(hashPassword_(newPassword));
      return {success:true};
    }
  }
  throw new Error('Akun admin tidak ditemukan.');
}

function getAIAdminStatus_() {
  const s = getSettingsObject_();
  return {
    enabled:asBool_(s.AI_ENABLED),
    provider:s.AI_PROVIDER || 'gemini',
    geminiModel:s.AI_MODEL_GEMINI || 'gemini-3.8-flash',
    openaiModel:s.AI_MODEL_OPENAI || 'gpt-6-luna',
    geminiKeyConfigured:!!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
    openaiKeyConfigured:!!PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY')
  };
}

function requireAdmin_(token) {
  token = String(token || '');
  if (!token) throw new Error('Sesi admin tidak valid.');
  const cache = CacheService.getScriptCache();
  const username = cache.get('admin_session_'+token);
  if (!username) throw new Error('Sesi admin berakhir. Silakan login kembali.');
  cache.put('admin_session_'+token, username, 21600);
  return username;
}

/* =========================================================
 * HELPERS
 * ========================================================= */

function getDb_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Database belum disiapkan. Jalankan setupDatabase() terlebih dahulu.');
  return SpreadsheetApp.openById(id);
}

function getSettingsObject_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.SETTINGS);
  const values = sh.getDataRange().getValues();
  const obj = {};
  for (let i=1;i<values.length;i++) {
    const key = String(values[i][0] || '').trim();
    if (key) obj[key] = String(values[i][1] ?? '');
  }
  return obj;
}

function setSetting_(key, value) {
  const sh = getDb_().getSheetByName(APP.SHEETS.SETTINGS);
  const values = sh.getDataRange().getValues();
  for (let i=1;i<values.length;i++) {
    if (String(values[i][0]) === key) {
      sh.getRange(i+1,2).setValue(value);
      return;
    }
  }
  sh.appendRow([key,value,'']);
}

function getActiveMajors_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.MAJORS);
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i=1;i<values.length;i++) {
    if (!asBool_(values[i][3])) continue;
    out.push({
      code:String(values[i][0] || ''),
      name:String(values[i][1] || ''),
      description:String(values[i][2] || ''),
      keywords:String(values[i][4] || '').split(',').map(x=>x.trim()).filter(Boolean),
      order:Number(values[i][5] || 999)
    });
  }
  return out.sort((a,b)=>a.order-b.order);
}

function getFaq_() {
  const sh = getDb_().getSheetByName(APP.SHEETS.FAQ);
  const values = sh.getDataRange().getValues();
  const out = [];
  for (let i=1;i<values.length;i++) {
    if (!asBool_(values[i][3])) continue;
    out.push({
      keywords:String(values[i][0] || '').split(',').map(x=>x.trim()).filter(Boolean),
      question:String(values[i][1] || ''),
      answer:String(values[i][2] || ''),
      order:Number(values[i][4] || 999)
    });
  }
  return out.sort((a,b)=>a.order-b.order);
}

function nextRegistrationNumber_() {
  const props = PropertiesService.getScriptProperties();
  const settings = getSettingsObject_();
  const yearMatch = String(settings.ACADEMIC_YEAR || '2027').match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : Utilities.formatDate(new Date(), APP.TZ, 'yyyy');
  const key = 'REG_COUNTER_' + year;
  const next = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(next));
  return 'SPMB-' + year + '-' + String(next).padStart(6,'0');
}

function cleanText_(value, maxLen) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,maxLen || 500);
}

function cleanDigits_(value, maxLen) {
  return String(value == null ? '' : value).replace(/\D/g,'').slice(0,maxLen || 30);
}

function normalizePhone_(value) {
  let n = String(value == null ? '' : value).replace(/\D/g,'');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (n.startsWith('620')) n = '62' + n.slice(3);
  return n.slice(0,15);
}

function normalizeText_(value) {
  return String(value || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim();
}

function asBool_(value) {
  if (value === true) return true;
  return ['true','1','yes','ya','aktif'].includes(String(value || '').toLowerCase().trim());
}

function maskName_(name) {
  return name.split(/\s+/).map(p => {
    if (p.length <= 2) return p[0] + '*';
    return p[0] + '*'.repeat(Math.min(5,p.length-1));
  }).join(' ');
}

function hashPassword_(password) {
  const salt = 'SPMB-BPK-2027::';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + String(password), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function generateTempPassword_() {
  return 'BPK!' + Utilities.getUuid().replace(/-/g,'').slice(0,12) + '9a';
}
