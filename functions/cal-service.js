/**
 * Cal.com API v2 Service Module
 * 
 * Handles all communication with Cal.com/Cal.eu API for:
 * - Getting available time slots
 * - Creating bookings programmatically
 * - Cancelling bookings
 * - Getting booking details
 * 
 * SETUP:
 *   firebase functions:config:set cal.api_key="cal_live_..."
 */

const functions = require('firebase-functions');

const CAL_API_BASE = 'https://api.cal.eu/v2';
const CAL_API_VERSION = '2024-08-13';

// Event type slugs mapped to sizes
const EVENT_TYPE_SLUGS = {
  small: 'koristus-50',
  medium: 'koristus-90',
  large: 'koristus-120',
  xlarge: 'koristus-150',
};

// Rhythm intervals in days
const RHYTHM_INTERVALS = {
  once: 28,    // ~4 weeks
  twice: 14,   // ~2 weeks
  weekly: 7,   // 1 week
};

function getApiKey() {
  return process.env.CAL_API_KEY || functions.config().cal?.api_key;
}

/**
 * Make authenticated request to Cal.com API v2
 */
async function calApiRequest(method, path, body = null) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Cal.com API key not configured. Run: firebase functions:config:set cal.api_key="..."');
  }

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'cal-api-version': CAL_API_VERSION,
    },
  };

  if (body && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const url = `${CAL_API_BASE}${path}`;
  console.log(`Cal.com API ${method} ${url}`);

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error('Cal.com API error:', JSON.stringify(data, null, 2));
    throw new Error(`Cal.com API error (${response.status}): ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Get all event types to find event type IDs
 * Returns map of slug -> eventTypeId
 */
async function getEventTypes() {
  const data = await calApiRequest('GET', '/event-types');
  const eventTypes = {};

  if (data.status === 'success' && Array.isArray(data.data)) {
    for (const et of data.data) {
      eventTypes[et.slug] = {
        id: et.id,
        slug: et.slug,
        title: et.title,
        lengthInMinutes: et.lengthInMinutes,
      };
    }
  }

  return eventTypes;
}

/**
 * Get available time slots for a given event type and date range
 * 
 * @param {string} eventTypeSlug - e.g. 'koristus-90'
 * @param {string} startDate - ISO date string e.g. '2026-02-10'
 * @param {string} endDate - ISO date string e.g. '2026-02-17'
 * @returns {Array} Array of available slot objects { time: '2026-02-10T09:00:00Z' }
 */
async function getAvailableSlots(eventTypeSlug, startDate, endDate) {
  // First get the event type ID from the slug
  const eventTypes = await getEventTypes();
  const eventType = eventTypes[eventTypeSlug];

  if (!eventType) {
    throw new Error(`Event type not found: ${eventTypeSlug}`);
  }

  const params = new URLSearchParams({
    startTime: startDate,
    endTime: endDate,
    eventTypeId: eventType.id.toString(),
  });

  const data = await calApiRequest('GET', `/slots?${params.toString()}`);

  // Cal.com returns slots grouped by date
  const allSlots = [];
  if (data.status === 'success' && data.data?.slots) {
    for (const [date, slots] of Object.entries(data.data.slots)) {
      for (const slot of slots) {
        allSlots.push({
          time: slot.time,
          date,
        });
      }
    }
  }

  return allSlots;
}

/**
 * Create a booking in Cal.com
 * 
 * @param {string} eventTypeSlug - e.g. 'koristus-90'
 * @param {string} startTime - ISO datetime string
 * @param {Object} attendee - { name, email, phone, address }
 * @param {Object} metadata - Additional metadata to store
 * @returns {Object} Cal.com booking object
 */
async function createBooking(eventTypeSlug, startTime, attendee, metadata = {}) {
  const eventTypes = await getEventTypes();
  const eventType = eventTypes[eventTypeSlug];

  if (!eventType) {
    throw new Error(`Event type not found: ${eventTypeSlug}`);
  }

  const bookingData = {
    eventTypeId: eventType.id,
    start: startTime,
    attendee: {
      name: attendee.name,
      email: attendee.email,
      timeZone: 'Europe/Tallinn',
    },
    metadata: {
      ...metadata,
      source: 'sukoda-auto-scheduler',
    },
  };

  // Add booking field responses (phone, address)
  if (attendee.phone || attendee.address) {
    bookingData.responses = {};
    if (attendee.phone) {
      bookingData.responses.phone = attendee.phone;
    }
    if (attendee.address) {
      bookingData.responses.address = attendee.address;
    }
  }

  const data = await calApiRequest('POST', '/bookings', bookingData);

  if (data.status === 'success') {
    console.log('Booking created:', data.data?.uid);
    return data.data;
  }

  throw new Error('Failed to create booking: ' + JSON.stringify(data));
}

/**
 * Cancel a booking in Cal.com
 * 
 * @param {string} bookingUid - The booking UID from Cal.com
 * @param {string} reason - Cancellation reason
 */
async function cancelBooking(bookingUid, reason = 'Cancelled by system') {
  const data = await calApiRequest('POST', `/bookings/${bookingUid}/cancel`, {
    cancellationReason: reason,
  });

  console.log('Booking cancelled:', bookingUid);
  return data;
}

/**
 * Get a booking by UID
 * 
 * @param {string} bookingUid - The booking UID from Cal.com
 * @returns {Object} Booking details
 */
async function getBooking(bookingUid) {
  const data = await calApiRequest('GET', `/bookings/${bookingUid}`);
  return data.data;
}

/**
 * Find the best available slot near a target date/time
 * Tries to match the customer's preferred day and time
 * 
 * @param {string} eventTypeSlug - e.g. 'koristus-90'
 * @param {Date} targetDate - The ideal date for the visit
 * @param {number} preferredDay - Preferred day of week (0=Sun, 1=Mon, ..., 6=Sat)
 * @param {string} preferredTime - Preferred time like '10:00'
 * @returns {string|null} Best matching slot time (ISO string) or null
 */
async function findBestSlot(eventTypeSlug, targetDate, preferredDay, preferredTime) {
  // Search a 7-day window around the target date
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 2);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 5);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const slots = await getAvailableSlots(eventTypeSlug, startStr, endStr);

  if (slots.length === 0) {
    console.log('No available slots found near', targetDate.toISOString());
    return null;
  }

  // Score each slot: prefer same day of week and similar time
  const preferredHour = preferredTime ? parseInt(preferredTime.split(':')[0], 10) : 10;

  let bestSlot = null;
  let bestScore = Infinity;

  for (const slot of slots) {
    const slotDate = new Date(slot.time);
    const slotDay = slotDate.getDay();
    const slotHour = slotDate.getHours();

    // Day-of-week match (0 = perfect match, max 3 days off)
    const dayDiff = preferredDay !== undefined
      ? Math.min(Math.abs(slotDay - preferredDay), 7 - Math.abs(slotDay - preferredDay))
      : 0;

    // Time match (hours difference)
    const timeDiff = Math.abs(slotHour - preferredHour);

    // Date proximity to target (prefer closer)
    const dateDiff = Math.abs(slotDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);

    // Weighted score: day of week is most important, then time, then proximity
    const score = (dayDiff * 100) + (timeDiff * 10) + dateDiff;

    if (score < bestScore) {
      bestScore = score;
      bestSlot = slot.time;
    }
  }

  return bestSlot;
}

module.exports = {
  getEventTypes,
  getAvailableSlots,
  createBooking,
  cancelBooking,
  getBooking,
  findBestSlot,
  EVENT_TYPE_SLUGS,
  RHYTHM_INTERVALS,
};
