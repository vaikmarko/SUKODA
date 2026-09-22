/**
 * Hausing relay seam. Production does not call Hausing until a client is passed in.
 * Without keys the ticket stays on the desk (or e-mail) route.
 */

function routeOf(building, kind) {
  const route = building?.routes?.[kind];
  if (route === 'hausing' || route === 'email' || route === 'desk') return route;
  return 'desk';
}

function keysReady(building) {
  const h = building?.hausing || {};
  return !!(h.clientId && h.clientSecret && h.companyId && h.buildingId);
}

/**
 * @param {{ building, text, email, client }} input
 * client, when present, is `{ createTicket(body) }` — tests inject it. Live code passes null.
 */
async function relayTicket({ building, text, email, client }) {
  const route = routeOf(building, 'warranty');
  if (route !== 'hausing' || !keysReady(building) || typeof client?.createTicket !== 'function') {
    return { sent: false, channel: route === 'hausing' ? 'desk' : route, ticket: null };
  }
  const apartment = String(building?.apartment || '');
  const body = {
    text: String(text || '').slice(0, 2000),
    watcherEmail: String(email || ''),
    buildingId: building.hausing.buildingId,
    companyId: building.hausing.companyId,
    roomId: building?.roomMap?.[apartment] || building.hausing.roomId || null,
    clientRequestId: building?.clientRequestId || null,
  };
  const ticket = await client.createTicket(body);
  return { sent: true, channel: 'hausing', ticket: ticket || null };
}

/** Attachment upload is three named steps. Without a client it does not leave the desk. */
function attachmentStep(step) {
  if (step === 'start') return 'upload-url';
  if (step === 'upload-url') return 'complete';
  if (step === 'complete') return 'done';
  return 'start';
}

async function relayAttachment({ building, step, client }) {
  const next = attachmentStep(step);
  if (!keysReady(building) || typeof client?.upload !== 'function') {
    return { uploaded: false, channel: 'desk', step: next, reason: 'no-hausing-key' };
  }
  return { uploaded: false, channel: 'desk', step: next, reason: 'no-live-call' };
}

/** Status poll. Without an injected client this does not call Hausing. */
async function pollTickets(tickets, client) {
  const list = Array.isArray(tickets) ? tickets : [];
  if (typeof client?.status !== 'function') return { polled: false, reason: 'no-hausing-key', tickets: list };
  const next = [];
  for (const ticket of list) {
    try {
      const status = await client.status(ticket);
      next.push({ ...ticket, status: status?.status || ticket.status || null, number: status?.number || ticket.number || null });
    } catch (err) {
      next.push({ ...ticket, status: ticket?.status || null });
    }
  }
  return { polled: true, reason: null, tickets: next };
}

module.exports = { routeOf, keysReady, relayTicket, attachmentStep, relayAttachment, pollTickets };
