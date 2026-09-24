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
  const onlyDoc = pass.askHome({ question: 'juhend', facts, documents });
  assert.equal(onlyDoc.fact, null);
  assert.equal(onlyDoc.document.title, 'Ventilatsiooni juhend');
  const fromFact = pass.askHome({
    question: 'filtri mõõt',
    facts: [{ key: 'filter', value: 'F7 280×220', status: 'approved', page: 14, sourceDocId: 'doc-1' }],
    documents: { building: [], home: [] },
  });
  assert.equal(fromFact.fact.value, 'F7 280×220');
  const notWarranty = pass.askHome({
    question: 'Mis on filtrite mõõt ja kust tellin',
    facts: [{ key: 'filter', value: 'Ventilatsioonifilter: sissepuhe F7 280×220 mm. Tellimine käib siit.', status: 'approved', sourceDocId: 'doc-vent' }],
    documents: {
      home: [
        { id: 'doc-garantii', title: 'Ehitusgarantii tingimused', note: '2-aastane garantii. Pöördumised siit portaalist — jõuavad otse garantiimeeskonnale.' },
        { id: 'doc-vent', title: 'Ventilatsiooniseadme kasutusjuhend', note: 'Ventilatsioonifilter: sissepuhe F7 280×220 mm.' },
      ],
    },
  });
  assert.match(notWarranty.fact.value, /280×220/);
  assert.equal(notWarranty.document.title, 'Ventilatsiooniseadme kasutusjuhend');
  const fromPdf = pass.askHome({
    question: 'kas katusel on päikesepaneelid',
    facts: [{ key: 'filter', value: 'Ventilatsioonifilter F7.', status: 'approved', sourceDocId: 'doc-vent' }],
    documents: {
      home: [
        { id: 'doc-vent', title: 'Ventilatsioon', note: 'Filtrid.', text: 'Filtrid vahetada iga kuue kuu tagant.' },
        { id: 'doc-energia', title: 'Energiamärgis', note: 'Klass A.', text: 'Taastuvenergia: päikesepaneelid katusel 42 kWp, üldelekter.' },
      ],
    },
  });
  assert.match(fromPdf.fact.value, /päikesepaneelid/);
  assert.equal(fromPdf.document.title, 'Energiamärgis');
  const meter = pass.askHome({
    question: 'mis on elektri arvesti number',
    facts: [{ key: 'filter', value: 'Ventilatsioonifilter F7.', status: 'approved', sourceDocId: 'doc-vent' }],
    documents: {
      home: [
        { id: 'doc-garantii', title: 'Ehitusgarantii', note: 'Pöördumised portaalis.', text: 'Avariiline puudus, leke või elektririke: helista 24h avariinumbrile.' },
        { id: 'doc-akt', title: 'Üleandmise akt', note: 'Näidud üleandmisel.', text: 'Elektri arvesti number on EE-77410825, näit üleandmisel 12 kWh.' },
      ],
    },
  });
  assert.match(meter.fact.value, /EE-77410825/);
  assert.equal(meter.document.title, 'Üleandmise akt');
  const model = pass.askHome({
    question: 'mis mudel on ventilatsiooniseade',
    facts: [{ key: 'filter', value: 'Ventilatsioonifilter: sissepuhe F7 280×220 mm.', status: 'approved', sourceDocId: 'doc-vent' }],
    documents: { home: [{ id: 'doc-vent', title: 'Ventilatsiooniseade', note: 'Filtrid.', text: 'Ventilatsiooniseade.\nMudel on VHR-250. Paigaldatud 02.2026.' }] },
  });
  assert.match(model.fact.value, /VHR-250/);
  assert.equal(model.document.title, 'Ventilatsiooniseade');
  const fromNote = pass.askHome({
    question: 'mis on filtri mõõt',
    facts: [],
    documents: { building: [], home: [{ id: 'doc-vent', title: 'Ventilatsiooniseadme kasutusjuhend', note: 'Ventilatsioonifilter: sissepuhe F7 280×220 mm, väljatõmme M5 280×220 mm.' }] },
  });
  assert.equal(fromNote.found, true);
  assert.match(fromNote.fact.value, /280×220/);
  assert.equal(fromNote.document.title, 'Ventilatsiooniseadme kasutusjuhend');
  const homeFacts = [
    { key: 'avarii', value: 'Avarii 24h: +372 600 0000.', status: 'approved', sourceDocId: 'doc-haldur' },
    { key: 'prügi', value: 'Prügimaja kood on 2580.', status: 'approved', sourceDocId: 'doc-ky' },
  ];
  const docs = {
    building: [],
    home: [
      { id: 'doc-haldur', title: 'Maja haldur ja avariinumber' },
      { id: 'doc-ky', title: 'Kodukord' },
    ],
  };
  const emergency = pass.askHome({ question: 'mis on avariinumber', facts: homeFacts, documents: docs });
  assert.match(emergency.fact.value, /600 0000/);
  const trash = pass.askHome({ question: 'prügikood', facts: homeFacts, documents: docs });
  assert.match(trash.fact.value, /2580/);
  const linked = pass.askHome({
    question: 'mis filter on',
    facts,
    documents: { building: [{ id: 'doc-1', title: 'Ventilatsiooni juhend', url: 'https://sukoda.ee/juhend.pdf', file: { path: 'secret/path' }, page: 14 }], home: [] },
  });
  assert.equal(linked.document.url, 'https://sukoda.ee/juhend.pdf');
  assert.equal(linked.document.hasFile, true);
  assert.equal(JSON.stringify(linked.document).includes('secret'), false);
  const inherited = pass.documentsForHome(documents.building, [{ id: 'h1', title: 'Akt' }]);
  assert.equal(inherited.length, 2);
  assert.equal(inherited[0].scope, 'building');
});

test('export zip contains the home, approved facts and history, and leaves secrets out', () => {
  const zip = pass.exportZip({
    id: 'home-1',
    customer: { name: 'Mari', address: 'Iili 8', email: 'mari@kodu.ee' },
    homeProfile: { pets: 'kass', access: 'door-1234', homeType: 'apartment' },
    stripeCustomerId: 'cus_secret',
    facts: [{ key: 'filter', value: 'F7', status: 'approved', page: 14 }, { key: 'draft', value: 'secret-draft', status: 'draft' }],
    buildingDocuments: [{ id: 'd1', title: 'Juhend', source: 'upload' }],
    documents: [],
    history: {
      visits: [{ id: 'b1', status: 'completed', at: '2026-03-12', serviceId: 'extra-clean', note: 'ok', access: 'visit-9999' }],
      wishes: [{ id: 'r1', status: 'requested', serviceId: 'home-manual', at: '2026-03-01', note: 'filter', access: 'wish-door' }],
    },
  });
  const text = zip.toString('utf8');
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.ok(text.includes('kodu.json'));
  assert.ok(text.includes('ajalugu.json'));
  assert.ok(text.includes('F7'));
  assert.ok(text.includes('Mari'));
  assert.ok(text.includes('kass'));
  assert.ok(text.includes('extra-clean'));
  assert.equal(text.includes('door-1234'), false);
  assert.equal(text.includes('cus_secret'), false);
  assert.equal(text.includes('visit-9999'), false);
  assert.equal(text.includes('wish-door'), false);
  assert.equal(text.includes('secret-draft'), false);
});
