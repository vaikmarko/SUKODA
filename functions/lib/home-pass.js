/**
 * Home folder helpers: inherited documents, a title/fact search, and a stored ZIP of the pass.
 * No network. Search is not a chatbot.
 */

const SENSITIVE = ['küte', 'kütte', 'elekter', 'vesi', 'gaas', 'heating', 'electric', 'water', 'gas', 'отопл', 'электр', 'вода', 'газ'];

function documentsForHome(buildingDocs, homeDocs) {
  const fromBuilding = (buildingDocs || []).map((d) => ({ ...d, scope: 'building' }));
  const fromHome = (homeDocs || []).map((d) => ({ ...d, scope: 'home' }));
  return fromBuilding.concat(fromHome);
}

function foldAsk(text) {
  return String(text || '').toLowerCase()
    .replace(/filtr[a-zõäöüšž]*/g, 'filter')
    .replace(/filter[a-zõäöüšž]*/g, 'filter')
    .replace(/mõõ[a-zõäöüšž]*/g, 'mõõt')
    .replace(/moot[a-zõäöüšž]*/g, 'mõõt')
    .replace(/suurus[a-zõäöüšž]*/g, 'mõõt');
}

const ASK_STOP = new Set(['mis', 'on', 'ja', 'kui', 'kus', 'kust', 'see', 'seda', 'kuidas', 'palun', 'the', 'and', 'what', 'where', 'how', 'from']);

function askWords(question) {
  return foldAsk(question).split(/\s+/).filter((word) => word.length > 3 && !ASK_STOP.has(word));
}

function askScore(text, words) {
  const blob = foldAsk(text);
  return words.reduce((score, word) => score + (blob.includes(word) || (word.length >= 5 && blob.includes(word.slice(0, 5))) ? word.length : 0), 0);
}

function bestByScore(list, words, textOf) {
  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const score = askScore(textOf(item), words);
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}

function sentencesOf(text) {
  return String(text || '').split(/\n+|(?<=[.!?])\s+/).map((part) => part.trim()).filter((part) => part.length > 12);
}

function wordsHit(text, words) {
  const blob = foldAsk(text);
  return words.filter((word) => blob.includes(word) || (word.length >= 5 && blob.includes(word.slice(0, 5))));
}

/** The sentence that carries the words the prepared fact does not already say. */
function sentenceHit(text, words) {
  let best = '';
  let bestCover = 0;
  let bestScore = 0;
  for (const part of sentencesOf(text)) {
    const cover = wordsHit(part, words).length;
    const score = askScore(part, words);
    if (cover > bestCover || (cover === bestCover && score > bestScore)) {
      best = part;
      bestCover = cover;
      bestScore = score;
    }
  }
  return best ? String(best).slice(0, 500) : '';
}

function askHome({ question, facts, documents }) {
  const q = foldAsk(question).trim();
  const words = askWords(question);
  const sensitive = SENSITIVE.some((w) => q.includes(w));
  if (!q) return { found: false, fact: null, document: null, sensitive, suggestTechnician: sensitive };
  const approved = (facts || []).filter((f) => f && f.status === 'approved');
  const fact = bestByScore(approved, words, (f) => `${f.key || ''} ${f.value || ''}`);
  const factScore = fact ? askScore(`${fact.key || ''} ${fact.value || ''}`, words) : 0;
  const docs = documentsForHome(documents?.building, documents?.home);
  const titled = bestByScore(docs, words, (d) => `${d.title || ''} ${d.note || ''} ${d.text || ''} ${d.category || ''}`);
  const factHits = fact ? wordsHit(`${fact.key || ''} ${fact.value || ''}`, words) : [];
  const extra = titled ? wordsHit(`${titled.title || ''} ${titled.note || ''} ${titled.text || ''}`, words).filter((word) => !factHits.includes(word)) : [];
  const snippetWords = extra.length ? extra : words;
  const snippet = titled ? sentenceHit(`${titled.text || ''}\n${titled.note || ''}`, snippetWords) : '';
  const snippetScore = snippet ? askScore(snippet, words) : 0;
  const linked = fact?.sourceDocId ? docs.find((d) => d.id === fact.sourceDocId) : null;
  const document = (extra.length || snippetScore > factScore ? titled : null) || linked || titled;
  const page = document?.page || fact?.page || null;
  const url = /^https:\/\//.test(String(document?.url || '')) ? String(document.url).slice(0, 500) : '';
  const fromPdf = snippet && (extra.length || snippetScore > factScore) ? snippet : '';
  const note = !fact && !fromPdf && document && words.length && askScore(document.note || '', words) > 0
    ? String(document.note).slice(0, 500)
    : '';
  return {
    found: !!(fact || document),
    fact: fromPdf
      ? { key: 'text', value: fromPdf, page: document.page || null, sourceDocId: document.id || null }
      : fact
      ? { key: fact.key, value: fact.value, page: fact.page || null, sourceDocId: fact.sourceDocId || null }
      : (note ? { key: 'note', value: note, page: document.page || null, sourceDocId: document.id || null } : null),
    document: document ? {
      id: document.id,
      title: document.title,
      page,
      scope: document.scope,
      url,
      hasFile: !!(document.file && document.file.path),
    } : null,
    sensitive,
    suggestTechnician: sensitive,
  };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/** Store-only ZIP (no compression) so a home can download its pass without a library. */
function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(String(file.name || 'fail.txt'));
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(String(file.data ?? ''));
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, data);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat(parts.concat(centralBuf, end));
}

function text(value, max) {
  return String(value || '').trim().slice(0, max);
}

/** Home fields a resident may take with them. Door codes, payments and sessions stay out. */
function homeRecord(home) {
  const hp = home?.homeProfile || {};
  const handover = home?.handover || {};
  const person = home?.type === 'gift' ? (home?.recipient || {}) : (home?.customer || {});
  return {
    id: home?.id || null,
    name: text(person.name || handover.buyerName, 120),
    email: text(person.email || handover.buyerEmail, 160),
    address: text(person.address || home?.customer?.address, 200),
    apartment: text(handover.apartment, 40),
    size: home?.size || null,
    homeType: hp.homeType || null,
    pets: text(hp.pets, 300),
    allergies: text(hp.allergies, 300),
    flowerPreference: text(hp.flowerPreference, 300),
    linens: text(hp.linens, 300),
    towels: text(hp.towels, 300),
    specialRequests: text(hp.specialRequests, 500),
  };
}

function historyRows(list) {
  return (Array.isArray(list) ? list : []).slice(0, 200).map((row) => ({
    id: row?.id || null,
    status: text(row?.status, 40),
    at: row?.at || null,
    serviceId: row?.serviceId || null,
    note: text(row?.note || row?.completedNote, 500),
  }));
}

function exportZip(home) {
  const kodu = {
    ...homeRecord(home),
    facts: (home?.facts || []).filter((f) => f && f.status === 'approved').map((f) => ({
      key: f.key, value: f.value, page: f.page || null, sourceDocId: f.sourceDocId || null,
    })),
    documents: documentsForHome(home?.buildingDocuments, home?.documents).map((d) => ({
      id: d.id, title: d.title, source: d.source || 'upload', scope: d.scope,
    })),
  };
  const ajalugu = {
    visits: historyRows(home?.history?.visits),
    wishes: historyRows(home?.history?.wishes),
  };
  return zipStore([
    { name: 'kodu.json', data: JSON.stringify(kodu, null, 2) },
    { name: 'ajalugu.json', data: JSON.stringify(ajalugu, null, 2) },
  ]);
}

module.exports = { documentsForHome, askHome, zipStore, exportZip };
