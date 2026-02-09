/**
 * Cal.com Event Types Setup Script
 * Creates event types for SUKODA cleaning service
 */

const CAL_API_KEY = process.env.CAL_API_KEY;
if (!CAL_API_KEY) { console.error('Puudu: CAL_API_KEY env variable. Käivita: CAL_API_KEY=cal_live_xxx node scripts/setup-cal-events.js'); process.exit(1); }
const CAL_API_BASE = 'https://api.cal.eu/v2';

const eventTypes = [
  {
    title: 'Koristus kuni 50m²',
    slug: 'koristus-50',
    lengthInMinutes: 120, // 2 hours
    description: 'Koduhoolitsus kuni 50m² korterile. Sisaldab põhjalikku koristust, värskeid lilli, käsitsi kirjutatud kaarti ja väikest magust üllatust.',
  },
  {
    title: 'Koristus 51-90m²',
    slug: 'koristus-90',
    lengthInMinutes: 180, // 3 hours
    description: 'Koduhoolitsus 51-90m² korterile. Sisaldab põhjalikku koristust, värskeid lilli, käsitsi kirjutatud kaarti ja väikest magust üllatust.',
  },
  {
    title: 'Koristus 91-120m²',
    slug: 'koristus-120',
    lengthInMinutes: 240, // 4 hours
    description: 'Koduhoolitsus 91-120m² korterile. Sisaldab põhjalikku koristust, värskeid lilli, käsitsi kirjutatud kaarti ja väikest magust üllatust.',
  },
  {
    title: 'Koristus 121-150m²',
    slug: 'koristus-150',
    lengthInMinutes: 300, // 5 hours
    description: 'Koduhoolitsus 121-150m² korterile. Sisaldab põhjalikku koristust, värskeid lilli, käsitsi kirjutatud kaarti ja väikest magust üllatust.',
  },
];

async function getMe() {
  const response = await fetch(`${CAL_API_BASE}/me`, {
    headers: {
      'Authorization': `Bearer ${CAL_API_KEY}`,
      'cal-api-version': '2024-08-13',
    },
  });
  return response.json();
}

async function createEventType(eventData) {
  try {
    const response = await fetch(`${CAL_API_BASE}/event-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CAL_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify({
        title: eventData.title,
        slug: eventData.slug,
        lengthInMinutes: eventData.lengthInMinutes,
        description: eventData.description,
        locations: [
          {
            type: 'address',
            address: 'Kliendi aadressil',
            public: true,
          }
        ],
        bookingFields: [
          {
            type: 'phone',
            slug: 'phone',
            label: 'Telefon',
            required: true,
          },
          {
            type: 'address',
            slug: 'address', 
            label: 'Kodu aadress',
            required: true,
          }
        ],
        beforeEventBuffer: 30,
        afterEventBuffer: 30,
        minimumBookingNotice: 1440, // 24h
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success') {
      console.log(`✅ Created: ${eventData.title} (${eventData.lengthInMinutes} min)`);
      return data;
    } else {
      console.error(`❌ Failed to create ${eventData.title}:`, JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating ${eventData.title}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Setting up Cal.eu event types for SUKODA...\n');
  
  // Check current user
  const meData = await getMe();
  
  if (meData.status !== 'success') {
    console.error('❌ Failed to authenticate:', JSON.stringify(meData, null, 2));
    return;
  }
  
  const user = meData.data;
  console.log(`👤 Logged in as: ${user.username || user.email}`);
  console.log(`📅 Calendar URL: https://app.cal.eu/${user.username}\n`);
  
  // Create event types
  for (const eventType of eventTypes) {
    await createEventType(eventType);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✨ Setup complete!');
  console.log(`\n📋 Your booking links:`);
  console.log(`   - https://app.cal.eu/${user.username}/koristus-50`);
  console.log(`   - https://app.cal.eu/${user.username}/koristus-90`);
  console.log(`   - https://app.cal.eu/${user.username}/koristus-120`);
  console.log(`   - https://app.cal.eu/${user.username}/koristus-150`);
}

main();
