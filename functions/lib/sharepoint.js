/**
 * SharePoint B-phase seam. Without a Graph client or site permission this returns
 * a calm miss and does not throw. It does not call Microsoft.
 */

async function deltaSync({ building, graph }) {
  const siteId = building?.sharepoint?.siteId;
  if (!siteId || typeof graph?.delta !== 'function') {
    return { ok: false, reason: 'no-permission', documents: [] };
  }
  try {
    const documents = await graph.delta({ siteId, token: building.sharepoint.lastDeltaToken || null });
    return { ok: true, reason: null, documents: Array.isArray(documents) ? documents : [] };
  } catch (err) {
    const status = Number(err?.status) || 0;
    if (status === 401 || status === 403) return { ok: false, reason: 'no-permission', documents: [] };
    return { ok: false, reason: 'sync-failed', documents: [] };
  }
}

module.exports = { deltaSync };
