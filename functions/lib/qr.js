/**
 * Byte-mode QR (ECC M, versions 1–5) as an SVG. No network and no library.
 * A phone camera opens https://sukoda.ee/lunasta?code=… from the printed card.
 */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function mul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Versions 1–5, ECC M. `blocks` are the data-codeword lengths; ecc is per block. */
const VERSIONS = {
  1: { data: 16, ecc: 10, blocks: [16], remainder: 0 },
  2: { data: 28, ecc: 16, blocks: [28], remainder: 7 },
  3: { data: 44, ecc: 26, blocks: [44], remainder: 7 },
  4: { data: 64, ecc: 18, blocks: [32, 32], remainder: 7 },
  5: { data: 86, ecc: 24, blocks: [43, 43], remainder: 7 },
};

/** High degree first: (x + α^0) … (x + α^{n-1}). */
function rsGenerator(nsym) {
  let gen = [1];
  for (let i = 0; i < nsym; i++) {
    const next = new Array(gen.length + 1).fill(0);
    const root = EXP[i];
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= mul(gen[j], root);
    }
    gen = next;
  }
  return gen;
}

function rsRemainder(data, nsym) {
  const gen = rsGenerator(nsym);
  const msg = data.concat(new Array(nsym).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) msg[i + j] ^= mul(gen[j], coef);
  }
  return msg.slice(data.length);
}

function pushBits(bits, value, len) {
  for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function bytesOf(bits) {
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    let n = 0;
    for (let b = 0; b < 8; b++) n = (n << 1) | (bits[i + b] || 0);
    out.push(n);
  }
  return out;
}

function utf8Bytes(text) {
  return new TextEncoder().encode(String(text ?? ''));
}

function chooseVersion(byteLen) {
  const bits = 4 + 8 + byteLen * 8;
  for (const version of [1, 2, 3, 4, 5]) {
    if (VERSIONS[version].data * 8 >= bits) return version;
  }
  return null;
}

function dataCodewords(text, version) {
  const spec = VERSIONS[version];
  const raw = utf8Bytes(text);
  const bits = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, raw.length, 8);
  for (const byte of raw) pushBits(bits, byte, 8);
  const cap = spec.data * 8;
  const term = Math.min(4, cap - bits.length);
  if (term > 0) pushBits(bits, 0, term);
  while (bits.length % 8) bits.push(0);
  const bytes = bytesOf(bits);
  const pads = [0xec, 0x11];
  let p = 0;
  while (bytes.length < spec.data) bytes.push(pads[p++ % 2]);
  return bytes;
}

function interleave(data, spec) {
  const blocks = [];
  let offset = 0;
  for (const len of spec.blocks) {
    blocks.push(data.slice(offset, offset + len));
    offset += len;
  }
  const eccs = blocks.map((block) => rsRemainder(block, spec.ecc));
  const out = [];
  const max = Math.max(...spec.blocks);
  for (let i = 0; i < max; i++) {
    for (const block of blocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < spec.ecc; i++) {
    for (const ecc of eccs) out.push(ecc[i]);
  }
  return out;
}

function empty(n) {
  return Array.from({ length: n }, () => Array(n).fill(false));
}

function inFinder(n, row, col) {
  const boxes = [[0, 0], [0, n - 7], [n - 7, 0]];
  return boxes.some(([r, c]) => row >= r - 1 && row <= r + 7 && col >= c - 1 && col <= c + 7 && row >= 0 && col >= 0 && row < n && col < n);
}

function drawFinder(modules, reserved, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = row + r;
      const x = col + c;
      if (y < 0 || x < 0 || y >= modules.length || x >= modules.length) continue;
      const edge = r < 0 || c < 0 || r > 6 || c > 6;
      const border = r === 0 || c === 0 || r === 6 || c === 6;
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[y][x] = !edge && (border || core);
      reserved[y][x] = true;
    }
  }
}

function drawAlignment(modules, reserved, row, col) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const y = row + r;
      const x = col + c;
      const ring = Math.max(Math.abs(r), Math.abs(c));
      modules[y][x] = ring !== 1;
      reserved[y][x] = true;
    }
  }
}

function functionPatterns(version) {
  const n = 17 + version * 4;
  const modules = empty(n);
  const reserved = empty(n);
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, 0, n - 7);
  drawFinder(modules, reserved, n - 7, 0);
  for (let i = 0; i < n; i++) {
    if (!reserved[6][i]) { modules[6][i] = i % 2 === 0; reserved[6][i] = true; }
    if (!reserved[i][6]) { modules[i][6] = i % 2 === 0; reserved[i][6] = true; }
  }
  if (version > 1) {
    const last = n - 7;
    for (const row of [6, last]) {
      for (const col of [6, last]) {
        if ((row === 6 && col === 6) || (row === 6 && col === last) || (row === last && col === 6)) continue;
        drawAlignment(modules, reserved, row, col);
      }
    }
  }
  modules[n - 8][8] = true;
  reserved[n - 8][8] = true;
  for (let i = 0; i <= 8; i++) {
    if (i === 6) continue;
    reserved[i][8] = true;
    reserved[8][i] = true;
  }
  for (let i = 0; i < 8; i++) reserved[8][n - 1 - i] = true;
  for (let i = 0; i < 7; i++) reserved[n - 7 + i][8] = true;
  return { modules, reserved, n };
}

function formatBits(mask) {
  const data = mask; // ECC M is 00, so the 5-bit value is just the mask
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >>> (i + 10)) & 1) rem ^= 0x537 << i;
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function applyFormat(modules, reserved, mask) {
  const n = modules.length;
  const bits = formatBits(mask);
  // Least-significant bit is placed first (ISO/IEC 18004).
  const bit = (i) => ((bits >>> i) & 1) === 1;
  const set = (x, y, i) => { modules[y][x] = bit(i); reserved[y][x] = true; };
  for (let i = 0; i <= 5; i++) set(8, i, i);
  set(8, 7, 6);
  set(8, 8, 7);
  set(7, 8, 8);
  for (let i = 9; i < 15; i++) set(14 - i, 8, i);
  for (let i = 0; i < 8; i++) set(n - 1 - i, 8, i);
  for (let i = 8; i < 15; i++) set(8, n - 15 + i, i);
}

function placeData(modules, reserved, codewords, remainder) {
  const bits = [];
  for (const byte of codewords) pushBits(bits, byte, 8);
  for (let i = 0; i < remainder; i++) bits.push(0);
  const n = modules.length;
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        if (reserved[y][x]) continue;
        modules[y][x] = i < bits.length ? bits[i] === 1 : false;
        i += 1;
      }
    }
  }
}

function maskFlip(mask, row, col) {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function applyMask(modules, reserved, mask) {
  const n = modules.length;
  const out = modules.map((row) => row.slice());
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!reserved[r][c] && maskFlip(mask, r, c)) out[r][c] = !out[r][c];
    }
  }
  return out;
}

function penalty(modules) {
  const n = modules.length;
  let score = 0;
  const run = (dark, len) => {
    if (len >= 5) score += 3 + (len - 5);
    return dark;
  };
  for (let r = 0; r < n; r++) {
    let dark = modules[r][0];
    let len = 1;
    for (let c = 1; c < n; c++) {
      if (modules[r][c] === dark) len += 1;
      else { run(dark, len); dark = modules[r][c]; len = 1; }
    }
    run(dark, len);
  }
  for (let c = 0; c < n; c++) {
    let dark = modules[0][c];
    let len = 1;
    for (let r = 1; r < n; r++) {
      if (modules[r][c] === dark) len += 1;
      else { run(dark, len); dark = modules[r][c]; len = 1; }
    }
    run(dark, len);
  }
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += 3;
    }
  }
  let darks = 0;
  for (const row of modules) for (const cell of row) if (cell) darks += 1;
  const pct = Math.abs(Math.floor((darks * 100) / (n * n) / 5) * 5 - 50);
  score += pct * 2;
  return score;
}

function qrMatrix(text) {
  const raw = utf8Bytes(text);
  const version = chooseVersion(raw.length);
  if (!version) return null;
  const spec = VERSIONS[version];
  const codewords = interleave(dataCodewords(String(text || ''), version), spec);
  const base = functionPatterns(version);
  placeData(base.modules, base.reserved, codewords, spec.remainder);
  let best = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(base.modules, base.reserved, mask);
    applyFormat(masked, base.reserved.map((row) => row.slice()), mask);
    const score = penalty(masked);
    if (score < bestScore) { bestScore = score; best = masked; bestMask = mask; }
  }
  return { modules: best, size: base.n, mask: bestMask, version };
}

function qrSvg(text) {
  const matrix = qrMatrix(text);
  if (!matrix) return '';
  const quiet = 4;
  const dim = matrix.size + quiet * 2;
  const rects = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) rects.push(`<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" fill="currentColor">${rects.join('')}</svg>`;
}

module.exports = { qrMatrix, qrSvg, chooseVersion };
