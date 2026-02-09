/**
 * Cal.com Webhook Setup Script
 * Registers webhooks in Cal.com to send booking events to Firebase
 * 
 * Run with: node scripts/setup-cal-webhooks.js
 * 
 * PREREQUISITES:
 * - Cal.com API key (from setup-cal-events.js)
 * - Firebase functions deployed (need the webhook URL)
 */

const CAL_API_KEY = process.env.CAL_API_KEY;
if (!CAL_API_KEY) { console.error('Puudu: CAL_API_KEY env variable. Käivita: CAL_API_KEY=cal_live_xxx node scripts/setup-cal-webhooks.js'); process.exit(1); }
const CAL_API_BASE = 'https://api.cal.eu/v2';
const CAL_API_VERSION = '2024-08-13';

// Webhook configuration
const WEBHOOK_URL = 'https://sukoda.ee/api/cal-webhook';
const WEBHOOK_SECRET = 'sukoda_cal_webhook_' + Date.now(); // Generate a secret

const TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
];

async function calApiRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CAL_API_KEY}`,
      'Content-Type': 'application/json',
      'cal-api-version': CAL_API_VERSION,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${CAL_API_BASE}${path}`, options);
  return response.json();
}

async function listWebhooks() {
  console.log('Current webhooks:\n');
  const data = await calApiRequest('GET', '/webhooks');
  
  if (data.status === 'success' && Array.isArray(data.data)) {
    if (data.data.length === 0) {
      console.log('  No webhooks configured.\n');
    } else {
      for (const wh of data.data) {
        console.log(`  ID: ${wh.id}`);
        console.log(`  URL: ${wh.subscriberUrl}`);
        console.log(`  Triggers: ${wh.triggers?.join(', ')}`);
        console.log(`  Active: ${wh.active}`);
        console.log('');
      }
    }
  }
  return data;
}

async function createWebhook() {
  console.log('Creating webhook...\n');
  console.log(`  URL: ${WEBHOOK_URL}`);
  console.log(`  Triggers: ${TRIGGERS.join(', ')}`);
  console.log(`  Secret: ${WEBHOOK_SECRET}\n`);

  const data = await calApiRequest('POST', '/webhooks', {
    subscriberUrl: WEBHOOK_URL,
    triggers: TRIGGERS,
    active: true,
    secret: WEBHOOK_SECRET,
  });

  if (data.status === 'success') {
    console.log('Webhook created successfully!');
    console.log(`  Webhook ID: ${data.data?.id}`);
    console.log(`\n  IMPORTANT: Save this webhook secret for verification:`);
    console.log(`  ${WEBHOOK_SECRET}`);
    console.log(`\n  To store it in Firebase config:`);
    console.log(`  firebase functions:config:set cal.webhook_secret="${WEBHOOK_SECRET}"`);
  } else {
    console.error('Failed to create webhook:', JSON.stringify(data, null, 2));
  }

  return data;
}

async function main() {
  console.log('=== Cal.com Webhook Setup for SUKODA ===\n');

  // List existing webhooks
  await listWebhooks();

  // Create new webhook
  await createWebhook();

  console.log('\n=== Firebase Config Commands ===\n');
  console.log('Run these commands to complete setup:\n');
  console.log(`  firebase functions:config:set cal.api_key="${CAL_API_KEY}"`);
  console.log(`  firebase functions:config:set cal.webhook_secret="${WEBHOOK_SECRET}"`);
  console.log(`  firebase functions:config:set admin.password="YOUR_ADMIN_PASSWORD"`);
  console.log('\n  Then deploy:');
  console.log('  firebase deploy --only functions');
  console.log('  firebase deploy --only firestore');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
