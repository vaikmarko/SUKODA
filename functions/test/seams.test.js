const test = require('node:test');
const assert = require('node:assert/strict');
const hausing = require('../lib/hausing');
const sharepoint = require('../lib/sharepoint');
const pass = require('../lib/home-pass');

const ready = {
  routes: { warranty: 'hausing', building: 'desk' },
  hausing: { clientId: 'id', clientSecret: 'secret', companyId: 'co', buildingId: 'b1' },
};

test('Hausing without a client stays on the desk and does not throw', async () => {
  const desk = await hausing.relayTicket({ building: { routes: { warranty: 'desk' } }, text: 'Leke', email: 'a@b.ee', client: null });
  assert.equal(desk.sent, false);
  assert.equal(desk.channel, 'desk');
  const missing = await hausing.relayTicket({ building: ready, text: 'Leke', email: 'a@b.ee', client: null });
  assert.equal(missing.sent, false);
  assert.equal(missing.channel, 'desk');
  let called = 0;
  const sent = await hausing.relayTicket({
    building: ready,
    text: 'Leke',
    email: 'a@b.ee',
    client: { createTicket() { called += 1; return { number: 'H-1' }; } },
  });
  assert.equal(called, 1);
  assert.equal(sent.ticket.number, 'H-1');
  const file = await hausing.relayAttachment({ building: ready, step: 'start', client: null });
  assert.equal(file.uploaded, false);
  assert.equal(file.reason, 'no-hausing-key');
  assert.equal(file.step, 'upload-url');
  const quiet = await hausing.pollTickets([{ number: 'H-1', status: 'open' }], null);
  assert.equal(quiet.polled, false);
  assert.equal(quiet.reason, 'no-hausing-key');
  const withRoom = await hausing.relayTicket({
    building: { ...ready, apartment: '12', roomMap: { '12': 'room-12' }, clientRequestId: 'req-1' },
    text: 'Leke',
    email: 'a@b.ee',
    client: { createTicket(body) { called += 1; return body; } },
  });
  assert.equal(withRoom.ticket.roomId, 'room-12');
  assert.equal(withRoom.ticket.watcherEmail, 'a@b.ee');
});

test('SharePoint without permission does not throw', async () => {
  const miss = await sharepoint.deltaSync({ building: {}, graph: null });
  assert.equal(miss.ok, false);
  assert.equal(miss.reason, 'no-permission');
  const denied = await sharepoint.deltaSync({
    building: { sharepoint: { siteId: 'site' } },
    graph: { delta() { const err = new Error('no'); err.status = 403; throw err; } },
  });
  assert.equal(denied.reason, 'no-permission');
  const ok = await sharepoint.deltaSync({
    building: { sharepoint: { siteId: 'site' } },
    graph: { delta() { return [{ id: 'd1', title: 'Juhend' }]; } },
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.documents[0].title, 'Juhend');
});

test('ask finds an approved fact and a building document, and flags heating', () => {
  const facts = [{ key: 'filter', value: 'F7 280×220', status: 'approved', page: 14, sourceDocId: 'doc-1' }, { key: 'draft', value: 'secret', status: 'draft' }];
  const documents = { building: [{ id: 'doc-1', title: 'Ventilatsiooni juhend', category: 'manual' }], home: [] };
  const hit = pass.askHome({ question: 'mis filter on', facts, documents });
  assert.equal(hit.found, true);
  assert.equal(hit.fact.value, 'F7 280×220');
  assert.equal(hit.document.title, 'Ventilatsiooni juhend');
  const heat = pass.askHome({ question: 'kuidas küte töötab', facts, documents });
  assert.equal(heat.suggestTechnician, true);
  assert.equal(heat.fact, null);
  const inherited = pass.documentsForHome(documents.building, [{ id: 'h1', title: 'Akt' }]);
  assert.equal(inherited.length, 2);
  assert.equal(inherited[0].scope, 'building');
});

test('export zip contains the home pass and is a zip file', () => {
  const zip = pass.exportZip({
    id: 'home-1',
    facts: [{ key: 'filter', value: 'F7', status: 'approved', page: 14 }],
    buildingDocuments: [{ id: 'd1', title: 'Juhend', source: 'upload' }],
    documents: [],
  });
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.ok(zip.includes(Buffer.from('kodu.json')));
  assert.ok(zip.includes(Buffer.from('F7')));
});
