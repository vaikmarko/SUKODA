const test = require('node:test');
const assert = require('node:assert/strict');
const qr = require('../lib/qr');

const URL = 'https://sukoda.ee/lunasta?code=AB12CD34';

/** Byte-mode ECC M, version 3. Matches an independent encoder bit for bit. */
const GOLDEN = [
  '11111110110111111001101111111',
  '10000010101101100000001000001',
  '10111010000011011011001011101',
  '10111010101100101100001011101',
  '10111010001011001111001011101',
  '10000010011100001011001000001',
  '11111110101010101010101111111',
  '00000000100010110101000000000',
  '10110111011101110110001001011',
  '01111001010011111011111110001',
  '00000110001001100100010010110',
  '10010001011101011011101110001',
  '10101010000110001110100001100',
  '10101101110011101011001000111',
  '00101010101110101111001110111',
  '00110100110011000000100000010',
  '11110110000110011011100111010',
  '01111001111011000000100101110',
  '10111110101110010110101110100',
  '00100100101010010111001000100',
  '01111011100101010110111111100',
  '00000000110001111110100011111',
  '11111110101111001011101011010',
  '10000010101110000011100011010',
  '10111010011000101100111110100',
  '10111010110101110101110011001',
  '10111010110100100010000100101',
  '10000010010111111010100101010',
  '11111110110011100011110101010',
];

function rows(matrix) {
  return matrix.modules.map((row) => row.map((cell) => (cell ? '1' : '0')).join(''));
}

test('handover QR is version 3 and carries the redeem link', () => {
  const matrix = qr.qrMatrix(URL);
  assert.equal(matrix.version, 3);
  assert.equal(matrix.size, 29);
  assert.equal(matrix.modules[0][0], true);
  assert.equal(matrix.modules[3][3], true);
  const svg = qr.qrSvg(URL);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 37 37"'));
  assert.equal((svg.match(/<rect /g) || []).length > 0, true);
});

test('QR matrix matches the reference byte-mode code', () => {
  const matrix = qr.qrMatrix('https://sukoda.ee/lunasta?code=ZZZZZZZZ');
  assert.deepEqual(rows(matrix), GOLDEN);
});

test('QR longer than version 5 is refused', () => {
  assert.equal(qr.qrMatrix('x'.repeat(120)), null);
});
