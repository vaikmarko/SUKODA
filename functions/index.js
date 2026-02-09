/**
 * SUKODA Firebase Cloud Functions
 * 
 * SEADISTAMINE:
 * 1. Paigalda dependencies: cd functions && npm install
 * 2. Seadista võtmed:
 *    firebase functions:config:set stripe.secret_key="sk_test_..." stripe.webhook_secret="whsec_..."
 *    firebase functions:config:set resend.api_key="re_..."
 *    firebase functions:config:set notification.email="sinu@email.ee"
 * 3. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const { Resend } = require('resend');
const calService = require('./cal-service');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Stripe initialization
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key);

// Resend initialization for emails
const resendApiKey = process.env.RESEND_API_KEY || functions.config().resend?.api_key;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Notification email
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || functions.config().notification?.email || 'tere@sukoda.ee';

// ============================================================
// I18N — Email translations (ET / EN)
// ============================================================

const EMAIL_TEXTS = {
  et: {
    // Subject lines
    subjectGiftOnWay: 'SUKODA | Sinu kingitus on teel',
    subjectOrderReceived: 'SUKODA | Tellimus vastu võetud',
    subjectGiftFrom: (name) => `SUKODA | ${name} saatis sulle kingituse`,
    subjectNextVisit: 'SUKODA | Sinu järgmine külastus on kinnitatud',
    subjectReminder: 'SUKODA | Homme ootab sind puhas kodu',

    // Customer confirmation email
    customerTitle: (isGift) => isGift ? 'Sinu kingitus on teel' : 'Tellimus vastu võetud',
    customerIntro: (isGift, recipientName) => isGift
      ? `Täname sind. ${recipientName || 'Kingisaaja'} saab peagi teada, et keegi temast hoolib.`
      : 'Täname sind. Sinu tellimus on kinnitatud ja esimese külastuse aja valisid tellimuse kinnitamise lehelt.',
    orderLabel: 'Tellimus',
    recipientLabel: 'Kingisaaja',
    addressLabel: 'Aadress',
    questionsAt: 'Küsimuste korral',

    // Gift buyer email (extended)
    giftBuyerPreviewTitle: 'Kingisaaja saab sellise kirja',
    giftBuyerCodeLabel: 'KINGITUSE KOOD',
    giftBuyerCodeNote: 'Hoia koodi alles — saad selle kaudu kingituse staatust jälgida.',
    giftBuyerYourMessage: 'Sinu sõnum kaardil',
    giftBuyerWhatHappens: 'Mis nüüd juhtub?',
    giftBuyerStep1: (recipientName) => `${recipientName || 'Kingisaaja'} saab ilusa kingituskaardi e-postile`,
    giftBuyerStep2: 'Kingisaaja valib ise sobiva aja meie kalendrist',
    giftBuyerStep3: 'Meie hoolitseme kogu ülejäänu eest — lilled, kaart, üllatus',
    giftBuyerForwardNote: 'Soovid kingituse ise üle anda? Edasta see kiri kingisaajale või prindi välja.',

    // Gift card email
    giftCardLabel: 'KINGIKAART',
    giftRecipientLabel: 'KINGISAAJA',
    giftIncludesLabel: 'KINGITUS SISALDAB',
    giftCodeLabel: 'KINGITUSE KOOD',
    giftChooseTime: 'Vali endale sobiv aeg:',
    giftBookBtn: 'BRONEERI AEG',

    // Cancel email
    subjectCancelled: 'SUKODA | Sinu visiit on tühistatud',
    cancelledTitle: 'Visiit tühistatud',
    cancelledIntro: 'Kahjuks peame sinu planeeritud visiidi tühistama.',
    cancelledReasonLabel: 'Põhjus',
    cancelledRebookNote: 'Soovi korral broneeri uus aeg meie lehel või kirjuta meile.',

    // Reschedule email
    subjectRescheduled: 'SUKODA | Sinu visiidi aeg on muudetud',
    rescheduledTitle: 'Visiidi aeg on muudetud',
    rescheduledIntro: (name) => name ? `Tere, ${name}. Sinu visiidi aeg on muudetud.` : 'Sinu visiidi aeg on muudetud.',
    rescheduledOldTime: 'Eelmine aeg',
    rescheduledNewTime: 'Uus aeg',
    rescheduledContactNote: 'Kui uus aeg ei sobi, palun kirjuta meile ja leiame parema.',

    // Reminder email
    reminderTitle: 'Homme ootab sind puhas kodu',
    reminderSubtitle: 'Meeldetuletus sinu koduhoolitsusest.',
    reminderVisitLabel: 'Sinu külastus',
    reminderAt: 'kell',
    reminderExpectLabel: 'Mida oodata',
    reminderItems: ['Põhjalik koristus', 'Värsked lilled vaasi', 'Käsitsi kirjutatud tervitus', 'Väike magus üllatus'],
    reminderAccessNote: 'Palun jäta meile ligipääs kodule. Kui vajad aega muuta, kirjuta meile.',

    // Next visit email
    nextVisitTitle: 'Järgmine külastus on paigas',
    nextVisitIntro: (name) => name
      ? `Tere, ${name}. Oleme sinu järgmise koduhoolitsuse aja paika pannud.`
      : 'Oleme sinu järgmise koduhoolitsuse aja paika pannud.',
    nextVisitTimeLabel: 'Kinnitatud aeg',
    nextVisitPackageLabel: 'Pakett',
    nextVisitReschedule: 'Kui see aeg ei sobi, kirjuta meile ja leiame parema. Saadame meeldetuletuse päev enne külastust.',

    // Email footer
    footerQuestions: 'Küsimuste korral',

    // Date formatting
    days: ['Pühapäev', 'Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev'],
    months: ['jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni', 'juuli', 'august', 'september', 'oktoober', 'november', 'detsember'],

    // Package names (for emails)
    packages: {
      moment: { name: 'Üks Hetk', description: 'Üks täiuslik koduhoolitsus', includes: ['Põhjalik koristus', 'Värsked lilled', 'Käsitsi kirjutatud kaart', 'Väike magus üllatus'] },
      month: { name: 'Kuu Aega', description: 'Kaks koduhoolitsust ühe kuu jooksul', includes: ['2× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Hooajalised puuviljad', 'Lõõgastav aroomiküünal'] },
      quarter: { name: 'Kvartal Vabadust', description: 'Kuus koduhoolitsust kolme kuu jooksul', includes: ['6× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Puuviljad + taimede kastmine', 'Premium koduhooldusvahenid'] },
      once: { name: 'Kord kuus', description: 'Üks külastus kuus' },
      twice: { name: 'Üle nädala', description: 'Kaks külastust kuus' },
      weekly: { name: 'Iga nädal', description: 'Neli külastust kuus' },
      test: { name: 'Test €1', description: 'Testtellimus' },
    },
    sizes: { small: 'Kuni 50m²', medium: '51-90m²', large: '91-120m²', xlarge: '121-150m²' },
  },

  en: {
    subjectGiftOnWay: 'SUKODA | Your gift is on its way',
    subjectOrderReceived: 'SUKODA | Order confirmed',
    subjectGiftFrom: (name) => `SUKODA | ${name} sent you a gift`,
    subjectNextVisit: 'SUKODA | Your next visit is confirmed',
    subjectReminder: 'SUKODA | Tomorrow a clean home awaits you',

    customerTitle: (isGift) => isGift ? 'Your gift is on its way' : 'Order confirmed',
    customerIntro: (isGift, recipientName) => isGift
      ? `Thank you. ${recipientName || 'The recipient'} will soon know that someone cares.`
      : 'Thank you. Your order is confirmed and you can choose your first visit time on the confirmation page.',
    orderLabel: 'Order',
    recipientLabel: 'Recipient',
    addressLabel: 'Address',
    questionsAt: 'Questions?',

    // Gift buyer email (extended)
    giftBuyerPreviewTitle: 'What the recipient will receive',
    giftBuyerCodeLabel: 'GIFT CODE',
    giftBuyerCodeNote: 'Keep this code — you can use it to track the gift status.',
    giftBuyerYourMessage: 'Your message on the card',
    giftBuyerWhatHappens: 'What happens next?',
    giftBuyerStep1: (recipientName) => `${recipientName || 'The recipient'} receives a beautiful gift card by email`,
    giftBuyerStep2: 'They choose their preferred time from our calendar',
    giftBuyerStep3: 'We take care of the rest — flowers, card, surprise',
    giftBuyerForwardNote: 'Want to hand over the gift yourself? Forward this email to the recipient or print it out.',

    giftCardLabel: 'GIFT CARD',
    giftRecipientLabel: 'RECIPIENT',
    giftIncludesLabel: 'YOUR GIFT INCLUDES',
    giftCodeLabel: 'GIFT CODE',
    giftChooseTime: 'Choose a time that suits you:',
    giftBookBtn: 'BOOK A TIME',

    // Cancel email
    subjectCancelled: 'SUKODA | Your visit has been cancelled',
    cancelledTitle: 'Visit cancelled',
    cancelledIntro: 'Unfortunately we need to cancel your scheduled visit.',
    cancelledReasonLabel: 'Reason',
    cancelledRebookNote: 'Please book a new time on our website or contact us.',

    // Reschedule email
    subjectRescheduled: 'SUKODA | Your visit time has been changed',
    rescheduledTitle: 'Visit time has been changed',
    rescheduledIntro: (name) => name ? `Hello, ${name}. Your visit time has been changed.` : 'Your visit time has been changed.',
    rescheduledOldTime: 'Previous time',
    rescheduledNewTime: 'New time',
    rescheduledContactNote: 'If the new time doesn\'t work, please contact us and we\'ll find a better one.',

    reminderTitle: 'Tomorrow a clean home awaits you',
    reminderSubtitle: 'A reminder about your home care visit.',
    reminderVisitLabel: 'Your visit',
    reminderAt: 'at',
    reminderExpectLabel: 'What to expect',
    reminderItems: ['Thorough cleaning', 'Fresh flowers in a vase', 'Handwritten greeting', 'A sweet surprise'],
    reminderAccessNote: 'Please ensure we have access to your home. If you need to change the time, contact us.',

    nextVisitTitle: 'Your next visit is scheduled',
    nextVisitIntro: (name) => name
      ? `Hello, ${name}. We have scheduled your next home care visit.`
      : 'We have scheduled your next home care visit.',
    nextVisitTimeLabel: 'Confirmed time',
    nextVisitPackageLabel: 'Package',
    nextVisitReschedule: 'If this time doesn\'t work, contact us and we\'ll find a better one. We\'ll send a reminder the day before your visit.',

    footerQuestions: 'Questions?',

    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

    packages: {
      moment: { name: 'One Moment', description: 'One perfect home care experience', includes: ['Deep cleaning', 'Fresh flowers', 'Handwritten card', 'A sweet surprise'] },
      month: { name: 'One Month', description: 'Two home care visits in one month', includes: ['2× deep cleaning', 'Fresh flowers each time', 'Handwritten cards', 'Seasonal fruits', 'Relaxing scented candle'] },
      quarter: { name: 'Quarter of Freedom', description: 'Six home care visits over three months', includes: ['6× deep cleaning', 'Fresh flowers each time', 'Handwritten cards', 'Fruits + plant watering', 'Premium home care products'] },
      once: { name: 'Once a month', description: 'One visit per month' },
      twice: { name: 'Every other week', description: 'Two visits per month' },
      weekly: { name: 'Every week', description: 'Four visits per month' },
      test: { name: 'Test €1', description: 'Test order' },
    },
    sizes: { small: 'Up to 50m²', medium: '51-90m²', large: '91-120m²', xlarge: '121-150m²' },
  },
};

/** Get translation texts for a language */
function tx(lang) {
  return EMAIL_TEXTS[lang] || EMAIL_TEXTS['et'];
}

/** Format date in the correct language */
function formatDate(date, lang) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const t = tx(lang);
  if (lang === 'en') {
    return `${t.days[d.getDay()]}, ${t.months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return `${t.days[d.getDay()]}, ${d.getDate()}. ${t.months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format time (same for both languages) */
function formatTime(date) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** Get localized package info */
function getPackageInfo(packageType, lang) {
  const t = tx(lang);
  return t.packages[packageType] || { name: packageType, description: '' };
}

/** Get localized size name */
function getSizeName(size, lang) {
  const t = tx(lang);
  return t.sizes[size] || size;
}

// Price ID mappings - Stripe Live Products
const PRICE_IDS = {
  // €1 TEST PRODUCT (for testing real payments)
  test: {
    small: 'price_1SuWlqEoH1b07UGQlu6Vcbhy',
    medium: 'price_1SuWlqEoH1b07UGQlu6Vcbhy',
    large: 'price_1SuWlqEoH1b07UGQlu6Vcbhy',
    xlarge: 'price_1SuWlqEoH1b07UGQlu6Vcbhy',
  },
  gifts: {
    moment: {
      small: 'price_1SmxJsEoH1b07UGQJE66La74',   // €149
      medium: 'price_1SmxJsEoH1b07UGQX36mA618',  // €179
      large: 'price_1SmxJtEoH1b07UGQ4SwWWs6q',   // €229
      xlarge: 'price_1SmxJtEoH1b07UGQKv6RLkE3',  // €279
    },
    month: {
      small: 'price_1SmxJuEoH1b07UGQkrO8y84Y',   // €299
      medium: 'price_1SmxJuEoH1b07UGQ9Cq3DWux',  // €349
      large: 'price_1SmxJuEoH1b07UGQdb3Le0c5',   // €449
      xlarge: 'price_1SmxJvEoH1b07UGQsxzCQpMP',  // €549
    },
    quarter: {
      small: 'price_1SmxJvEoH1b07UGQWd8XUfi1',   // €749
      medium: 'price_1SmxJwEoH1b07UGQoLqfIqgx',  // €899
      large: 'price_1SmxJwEoH1b07UGQfIXfWm9T',   // €1099
      xlarge: 'price_1SmxJwEoH1b07UGQMrEwjIws',  // €1299
    },
  },
  subscriptions: {
    once: {
      small: 'price_1SmxJxEoH1b07UGQtWOEqgwf',   // €119/kuu
      medium: 'price_1SmxJyEoH1b07UGQM4uN6a4k',  // €149/kuu
      large: 'price_1SmxJyEoH1b07UGQuFshtsVs',   // €189/kuu
      xlarge: 'price_1SmxJyEoH1b07UGQkA0j3qKC',  // €229/kuu
    },
    twice: {
      small: 'price_1SmxJzEoH1b07UGQD35r5QM6',   // €199/kuu
      medium: 'price_1SmxJzEoH1b07UGQGDceTaA6',  // €249/kuu
      large: 'price_1SmxK0EoH1b07UGQAv74hHRA',   // €319/kuu
      xlarge: 'price_1SmxK0EoH1b07UGQDlRbDQit',  // €389/kuu
    },
    weekly: {
      small: 'price_1SmxK1EoH1b07UGQrYGCPcgo',   // €379/kuu
      medium: 'price_1SmxK1EoH1b07UGQfziHkUr4',  // €449/kuu
      large: 'price_1SmxK1EoH1b07UGQry098S09',   // €579/kuu
      xlarge: 'price_1SmxK2EoH1b07UGQlUPVbHEh',  // €699/kuu
    },
  },
};

// Package info
const PACKAGES = {
  moment: {
    name: 'Üks Hetk',
    description: 'Üks täiuslik koduhoolitsus',
    includes: ['Põhjalik koristus', 'Värsked lilled', 'Käsitsi kirjutatud kaart', 'Väike magus üllatus'],
  },
  month: {
    name: 'Kuu Aega',
    description: 'Kaks koduhoolitsust ühe kuu jooksul',
    includes: ['2× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Hooajalised puuviljad', 'Lõõgastav aroomiküünal'],
  },
  quarter: {
    name: 'Kvartal Vabadust',
    description: 'Kuus koduhoolitsust kolme kuu jooksul',
    includes: ['6× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Puuviljad + taimede kastmine', 'Premium koduhooldusvahenid'],
  },
  once: { name: 'Kord kuus', description: 'Üks külastus kuus' },
  twice: { name: 'Üle nädala', description: 'Kaks külastust kuus' },
  weekly: { name: 'Iga nädal', description: 'Neli külastust kuus' },
  test: { name: 'Test €1', description: 'Testtellimus' },
};

const SIZE_NAMES = {
  small: 'Kuni 50m²',
  medium: '51-90m²',
  large: '91-120m²',
  xlarge: '121-150m²',
};

// Size to Cal.eu calendar mapping
const SIZE_CALENDAR_CODES = {
  small: '50',
  medium: '90',
  large: '120',
  xlarge: '150',
};

/**
 * Generate unique gift code
 */
function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SUKO-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create Stripe Checkout Session
 */
exports.createCheckoutSession = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      try {
        const {
          type,
          packageType,
          size,
          customer,
          recipient,
          deliveryMethod,
          lang,
          tracking,
        } = req.body;

        if (!type || !packageType || !size || !customer) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Handle test package specially
        let priceId;
        if (packageType === 'test') {
          priceId = PRICE_IDS.test[size];
        } else {
          const priceCategory = type === 'gift' ? 'gifts' : 'subscriptions';
          priceId = PRICE_IDS[priceCategory]?.[packageType]?.[size];
        }

        if (!priceId || priceId === 'price_TÄIDA') {
          console.error('Price ID not configured:', { priceCategory, packageType, size });
          return res.status(500).json({ 
            error: 'Price not configured. Please set up Stripe products first.',
            details: { priceCategory, packageType, size }
          });
        }

        // Generate gift code for gifts
        const giftCode = type === 'gift' ? generateGiftCode() : null;

        const orderRef = await db.collection('orders').add({
          type,
          package: packageType,
          size,
          customer,
          recipient: recipient || null,
          deliveryMethod: deliveryMethod || null,
          giftCode,
          lang: lang || 'et',
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          // UTM / campaign tracking data
          ...(tracking && {
            tracking: {
              utm_source: tracking.utm_source || null,
              utm_medium: tracking.utm_medium || null,
              utm_campaign: tracking.utm_campaign || null,
              utm_content: tracking.utm_content || null,
              utm_term: tracking.utm_term || null,
              fbclid: tracking.fbclid || null,
              landing_page: tracking.landing_page || null,
            },
          }),
        });

        // Get calendar size code for success page
        const sizeCode = SIZE_CALENDAR_CODES[size] || '90';

        const sessionParams = {
          // Only card payments (includes Apple Pay & Google Pay wallets)
          // Note: To disable Link, go to Stripe Dashboard → Settings → Payment methods → Link → Turn off
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: type === 'gift' ? 'payment' : 'subscription',
          success_url: `${req.headers.origin || 'https://sukoda.ee'}/success.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}&size=${sizeCode}`,
          cancel_url: `${req.headers.origin || 'https://sukoda.ee'}/${type === 'gift' ? 'kingitus' : 'index'}.html?cancelled=true`,
          customer_email: customer.email,
          // Enable automatic tax calculation (if needed later)
          // automatic_tax: { enabled: true },
          // Collect billing address for invoices
          billing_address_collection: 'auto',
          // Enable phone number collection
          phone_number_collection: { enabled: true },
          // For subscriptions, allow customer to manage later
          ...(type === 'subscription' && {
            subscription_data: {
              metadata: {
                order_id: orderRef.id,
                customer_name: customer.name,
              },
            },
          }),
          // For one-time payments, enable receipt
          ...(type === 'gift' && {
            invoice_creation: {
              enabled: true,
              invoice_data: {
                description: `SUKODA Kingitus: ${PACKAGES[packageType]?.name || packageType}`,
                metadata: {
                  order_id: orderRef.id,
                },
              },
            },
          }),
          metadata: {
            order_id: orderRef.id,
            type,
            package: packageType,
            size,
            customer_name: customer.name,
            customer_phone: customer.phone || '',
            customer_address: customer.address || '',
            // Campaign tracking for Stripe reports
            ...(tracking?.utm_source && { utm_source: tracking.utm_source }),
            ...(tracking?.utm_medium && { utm_medium: tracking.utm_medium }),
            ...(tracking?.utm_campaign && { utm_campaign: tracking.utm_campaign }),
            ...(tracking?.fbclid && { fbclid: tracking.fbclid }),
          },
          locale: lang === 'en' ? 'en' : 'et',
          // Allow promo codes (can set up later)
          allow_promotion_codes: true,
        };

        if (type === 'gift' && recipient) {
          sessionParams.metadata.recipient_name = recipient.name || '';
          sessionParams.metadata.recipient_address = recipient.address || '';
          sessionParams.metadata.gift_message = recipient.message || '';
          sessionParams.metadata.delivery_method = deliveryMethod || 'email';
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        await orderRef.update({ stripeSessionId: session.id });

        res.status(200).json({ 
          sessionId: session.id,
          url: session.url,
          orderId: orderRef.id,
        });

      } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Stripe Webhook Handler
 */
exports.stripeWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  });

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    console.error('No order_id in session metadata');
    return;
  }

  try {
    const updateData = {
      status: 'paid',
      stripeCustomerId: session.customer,
      stripePaymentIntentId: session.payment_intent,
      stripeSubscriptionId: session.subscription || null,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // For subscriptions, initialize visit tracking fields
    if (session.subscription) {
      updateData.subscriptionStatus = 'active';
      updateData.totalVisits = 0;
      updateData.nextVisitDue = null; // Will be set after first Cal.com booking
      updateData.lastVisitAt = null;
      updateData.preferredDay = null;
      updateData.preferredTime = null;
    }

    await db.collection('orders').doc(orderId).update(updateData);

    const orderDoc = await db.collection('orders').doc(orderId).get();
    const order = orderDoc.data();

    // Send all emails
    await sendAllEmails(order, orderId);

    console.log('Order completed:', orderId);

  } catch (error) {
    console.error('Error handling checkout complete:', error);
  }
}

async function handleInvoicePaid(invoice) {
  const customerId = invoice.customer;
  
  try {
    const ordersSnapshot = await db.collection('orders')
      .where('stripeCustomerId', '==', customerId)
      .where('type', '==', 'subscription')
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      const orderDoc = ordersSnapshot.docs[0];
      await orderDoc.ref.collection('payments').add({
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error handling invoice paid:', error);
  }
}

async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;

  try {
    const ordersSnapshot = await db.collection('orders')
      .where('stripeCustomerId', '==', customerId)
      .where('type', '==', 'subscription')
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      await ordersSnapshot.docs[0].ref.update({
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  const customerId = subscription.customer;

  try {
    const ordersSnapshot = await db.collection('orders')
      .where('stripeCustomerId', '==', customerId)
      .where('type', '==', 'subscription')
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      await ordersSnapshot.docs[0].ref.update({
        status: 'cancelled',
        subscriptionStatus: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

/**
 * Send all emails for an order
 */
async function sendAllEmails(order, orderId) {
  const lang = order.lang || 'et';
  const t = tx(lang);
  const isGift = order.type === 'gift';

  // Admin emails always use Estonian package names
  const pkgET = PACKAGES[order.package] || {};
  const packageNameET = pkgET.name || order.package;
  const sizeNameET = SIZE_NAMES[order.size] || order.size;

  // Customer-facing emails use the customer's language
  const packageName = getPackageInfo(order.package, lang).name || order.package;
  const sizeName = getSizeName(order.size, lang);

  // 1. Admin notification (always Estonian)
  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `SUKODA | Uus ${isGift ? 'kingitus' : 'tellimus'}: ${packageNameET}`,
    html: generateAdminEmail(order, orderId, packageNameET, sizeNameET, isGift),
  });

  // 2. Customer confirmation (in customer's language)
  await sendEmail({
    to: order.customer?.email,
    subject: isGift ? t.subjectGiftOnWay : t.subjectOrderReceived,
    html: generateCustomerEmail(order, orderId, packageName, sizeName, isGift, lang),
  });

  // 3. Gift card to recipient (if gift + email delivery, in customer's language)
  if (isGift && order.deliveryMethod === 'email' && order.recipient?.email) {
    const pkg = getPackageInfo(order.package, lang);
    await sendEmail({
      to: order.recipient.email,
      subject: t.subjectGiftFrom(order.customer?.name || (lang === 'en' ? 'Someone special' : 'Keegi eriline')),
      html: generateGiftCardEmail(order, pkg, lang),
    });
  }
}

/**
 * Send email via Resend
 */
async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log('Resend not configured, saving to Firestore instead');
    await db.collection('mail').add({
      to,
      message: { subject, html },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  try {
    // Domain sukoda.ee is verified in Resend - DNS records configured in Zone.ee
    const { data, error } = await resend.emails.send({
      from: 'SUKODA <tere@sukoda.ee>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      await db.collection('mail').add({
        to,
        message: { subject, html },
        error: error.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log('Email sent:', data?.id);
    }
  } catch (error) {
    console.error('Email send error:', error);
    // Save to Firestore as backup
    await db.collection('mail').add({
      to,
      message: { subject, html },
      error: error.message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Generate admin notification email
 */
function generateAdminEmail(order, orderId, packageName, sizeName, isGift) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2C2824; border-bottom: 2px solid #B8976A; padding-bottom: 10px; font-weight: 300; font-family: Georgia, 'Times New Roman', serif;">
        Uus ${isGift ? 'kingitus' : 'tellimus'}
      </h1>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>ID</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${orderId}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Tüüp</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${isGift ? 'Kingitus' : 'Püsitellimus'}</td>
        </tr>
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Pakett</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${packageName} (${sizeName})</td>
        </tr>
        ${order.giftCode ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Kingituse kood</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD; font-family: monospace; font-size: 16px; color: #B8976A;">${order.giftCode}</td>
        </tr>
        ` : ''}
      </table>

      <h2 style="color: #2C2824; margin-top: 30px; font-weight: 300; font-family: Georgia, 'Times New Roman', serif;">Tellija</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0;"><strong>Nimi:</strong> ${order.customer?.name || '-'}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>E-post:</strong> ${order.customer?.email || '-'}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Telefon:</strong> ${order.customer?.phone || '-'}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Aadress:</strong> ${order.customer?.address || '-'}</td></tr>
      </table>

      ${isGift ? `
      <h2 style="color: #2C2824; margin-top: 30px; font-weight: 300; font-family: Georgia, 'Times New Roman', serif;">Kingisaaja</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0;"><strong>Nimi:</strong> ${order.recipient?.name || '-'}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>E-post:</strong> ${order.recipient?.email || '-'}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Sõnum:</strong> ${order.recipient?.message || '-'}</td></tr>
      </table>
      ` : ''}

      <p style="margin-top: 30px; padding: 15px; background: #FAF8F5; border-left: 2px solid #B8976A;">
        <a href="https://console.firebase.google.com/project/sukoda-77b52/firestore/data/~2Forders~2F${orderId}" 
           style="color: #2C2824;">Vaata Firebase Console'is</a>
      </p>
    </div>
  `;
}

/**
 * Generate customer confirmation email (i18n)
 * For gift orders: rich preview with gift code, message preview, and what-happens-next
 * For subscriptions: simple confirmation
 */
function generateCustomerEmail(order, orderId, packageName, sizeName, isGift, lang) {
  const t = tx(lang);

  // For subscription orders, use a simple confirmation
  if (!isGift) {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
          ${emailHeader()}
          <div style="padding: 44px 40px;">
            <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 20px 0;">
              ${t.customerTitle(false)}
            </h2>
            <p style="color: #8A8578; line-height: 1.7; margin: 0 0 32px 0; font-size: 15px;">
              ${t.customerIntro(false)}
            </p>
            <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #B8976A;">
              <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.orderLabel}</p>
              <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 18px; font-family: Georgia, 'Times New Roman', serif;">${packageName}</p>
              <p style="margin: 0; color: #8A8578; font-size: 14px;">${sizeName}</p>
              ${order.customer?.address ? `
                <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
                  ${t.addressLabel}: <strong style="color: #2C2824; font-weight: 400;">${order.customer.address}</strong>
                </p>
              ` : ''}
            </div>
            <p style="color: #8A8578; font-size: 14px;">
              ${t.questionsAt}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
            </p>
          </div>
          ${emailFooter(lang)}
        </div>
      </body>
      </html>
    `;
  }

  // =====================================================
  // GIFT ORDER — Luxury confirmation for the gift buyer
  // =====================================================
  const pkg = getPackageInfo(order.package, lang);
  const includesList = (pkg.includes || []).map(item =>
    `<li style="padding: 8px 0; color: #8A8578; font-size: 13px; border-bottom: 1px solid #E8E3DD;">${item}</li>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        
        ${emailHeader()}

        <!-- Title & intro -->
        <div style="padding: 44px 40px 0;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 20px 0;">
            ${t.customerTitle(true)}
          </h2>
          <p style="color: #8A8578; line-height: 1.7; margin: 0 0 32px 0; font-size: 15px;">
            ${t.customerIntro(true, order.recipient?.name)}
          </p>
        </div>

        <!-- Gift Code (prominent) -->
        <div style="margin: 0 40px 32px; background: #111111; padding: 32px; text-align: center;">
          <p style="margin: 0 0 12px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 500;">${t.giftBuyerCodeLabel}</p>
          <p style="margin: 0 0 16px 0; color: #FFFFFF; font-size: 24px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 5px;">
            ${order.giftCode || 'SUKO-XXXX-XXXX'}
          </p>
          <p style="margin: 0; color: #8A8578; font-size: 12px;">${t.giftBuyerCodeNote}</p>
        </div>

        <!-- Order summary -->
        <div style="margin: 0 40px 32px; background: #FFFFFF; padding: 28px; border-left: 2px solid #B8976A;">
          <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.orderLabel}</p>
          <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 18px; font-family: Georgia, 'Times New Roman', serif;">${packageName}</p>
          <p style="margin: 0; color: #8A8578; font-size: 14px;">${sizeName}</p>
          ${order.recipient ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${t.recipientLabel}: <strong style="color: #2C2824; font-weight: 400;">${order.recipient.name}</strong>
            </p>
          ` : ''}
        </div>

        <!-- Message preview (if they wrote one) -->
        ${order.recipient?.message ? `
        <div style="margin: 0 40px 32px;">
          <p style="margin: 0 0 12px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.giftBuyerYourMessage}</p>
          <div style="background: #FAF8F5; padding: 24px; border-left: 2px solid #B8976A;">
            <p style="font-style: italic; color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; margin: 0; line-height: 1.7;">
              "${order.recipient.message}"
            </p>
          </div>
        </div>
        ` : ''}

        <!-- Mini preview of gift card -->
        <div style="margin: 0 40px 32px;">
          <p style="margin: 0 0 16px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.giftBuyerPreviewTitle}</p>
          <div style="background: #FFFFFF; border: 1px solid #E8E3DD; padding: 32px; text-align: center;">
            <p style="color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 2px; margin: 0 0 8px 0;">SUKODA</p>
            <div style="width: 30px; height: 1px; background: #B8976A; margin: 0 auto 20px;"></div>
            <p style="color: #B8976A; font-size: 9px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 12px 0;">${t.giftCardLabel}</p>
            <p style="color: #2C2824; font-size: 24px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; margin: 0 0 8px 0;">${pkg.name || packageName}</p>
            <p style="color: #8A8578; font-size: 13px; margin: 0 0 16px 0;">${pkg.description || ''}</p>
            <div style="width: 30px; height: 1px; background: #B8976A; margin: 0 auto 16px;"></div>
            <p style="color: #8A8578; font-size: 12px; margin: 0;">${order.recipient?.name || ''}</p>
          </div>
        </div>

        <!-- What's included -->
        ${includesList ? `
        <div style="margin: 0 40px 32px; background: #FAF8F5; padding: 24px;">
          <p style="font-size: 10px; letter-spacing: 3px; color: #B8976A; margin: 0 0 12px 0; text-align: center; text-transform: uppercase; font-weight: 500;">${t.giftIncludesLabel}</p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${includesList}
          </ul>
        </div>
        ` : ''}

        <!-- What happens next -->
        <div style="margin: 0 40px 32px; padding: 28px; background: #FFFFFF; border: 1px solid #E8E3DD;">
          <p style="margin: 0 0 20px 0; color: #2C2824; font-size: 14px; font-weight: 500;">${t.giftBuyerWhatHappens}</p>
          <div style="margin: 0 0 12px 0; display: flex;">
            <span style="color: #B8976A; font-weight: 500; margin-right: 12px; font-size: 14px;">1.</span>
            <span style="color: #8A8578; font-size: 14px; line-height: 1.5;">${t.giftBuyerStep1(order.recipient?.name)}</span>
          </div>
          <div style="margin: 0 0 12px 0; display: flex;">
            <span style="color: #B8976A; font-weight: 500; margin-right: 12px; font-size: 14px;">2.</span>
            <span style="color: #8A8578; font-size: 14px; line-height: 1.5;">${t.giftBuyerStep2}</span>
          </div>
          <div style="margin: 0; display: flex;">
            <span style="color: #B8976A; font-weight: 500; margin-right: 12px; font-size: 14px;">3.</span>
            <span style="color: #8A8578; font-size: 14px; line-height: 1.5;">${t.giftBuyerStep3}</span>
          </div>
        </div>

        <!-- Forward note -->
        <div style="padding: 0 40px 44px;">
          <p style="color: #8A8578; font-size: 13px; line-height: 1.6; font-style: italic; border-top: 1px solid #E8E3DD; padding-top: 20px;">
            ${t.giftBuyerForwardNote}
          </p>
          <p style="color: #8A8578; font-size: 14px; margin-top: 20px;">
            ${t.questionsAt}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate beautiful gift card email (i18n)
 */
function generateGiftCardEmail(order, pkg, lang) {
  const t = tx(lang);
  const includesList = (pkg.includes || []).map(item => 
    `<li style="padding: 10px 0; color: #8A8578; border-bottom: 1px solid #E8E3DD; font-size: 14px;">${item}</li>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background: #F5F0EB; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="padding: 48px 40px 40px; text-align: center; border-bottom: 1px solid #E8E3DD;">
          <h1 style="color: #2C2824; font-size: 28px; margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 4px;">SUKODA</h1>
          <div style="width: 40px; height: 1px; background: #B8976A; margin: 0 auto;"></div>
        </div>

        <!-- Content -->
        <div style="background: #FFFFFF; margin: 28px; padding: 44px 36px; text-align: center;">
          <p style="font-size: 10px; letter-spacing: 4px; color: #B8976A; margin: 0 0 20px 0; font-weight: 500;">${t.giftCardLabel}</p>
          
          <h2 style="font-size: 34px; color: #2C2824; margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">${pkg.name}</h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">${pkg.description}</p>
          
          <div style="width: 40px; height: 1px; background: #B8976A; margin: 0 auto 32px;"></div>
          
          <p style="font-size: 10px; letter-spacing: 3px; color: #B8976A; margin: 0 0 12px 0; font-weight: 500;">${t.giftRecipientLabel}</p>
          <h3 style="font-size: 26px; color: #2C2824; margin: 0 0 32px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">${order.recipient?.name || ''}</h3>
          
          ${order.recipient?.message ? `
          <div style="background: #FAF8F5; padding: 28px; margin: 0 0 32px 0; border-left: 2px solid #B8976A;">
            <p style="font-style: italic; color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; margin: 0 0 12px 0; line-height: 1.7;">
              "${order.recipient.message}"
            </p>
            <p style="color: #8A8578; font-size: 12px; margin: 0; letter-spacing: 1px;">– ${order.customer?.name || ''}</p>
          </div>
          ` : ''}
          
          ${includesList ? `
          <div style="background: #FAF8F5; padding: 28px; margin: 0 0 32px 0; text-align: left;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #B8976A; margin: 0 0 16px 0; text-align: center; font-weight: 500;">${t.giftIncludesLabel}</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${includesList}
            </ul>
          </div>
          ` : ''}
          
          <div style="margin-top: 32px; padding-top: 32px; border-top: 1px solid #E8E3DD;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #B8976A; margin: 0 0 14px 0; font-weight: 500;">${t.giftCodeLabel}</p>
            <p style="font-size: 20px; font-weight: 300; letter-spacing: 5px; color: #2C2824; background: #FAF8F5; padding: 18px 28px; display: inline-block; margin: 0; font-family: Georgia, 'Times New Roman', serif;">
              ${order.giftCode || 'SUKO-XXXX-XXXX'}
            </p>
          </div>
        </div>

        <!-- Book Now Button -->
        <div style="background: #FFFFFF; margin: 0 28px; padding: 32px; text-align: center; border-top: 1px solid #E8E3DD;">
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 20px 0;">${t.giftChooseTime}</p>
          <a href="https://cal.eu/sukoda/koristus-${SIZE_CALENDAR_CODES[order.size] || '90'}?${new URLSearchParams({ name: order.recipient?.name || '', notes: `Kingituse kood: ${order.giftCode || ''}` }).toString()}" 
             style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 16px 44px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: 500;">
            ${t.giftBookBtn}
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 32px 28px; text-align: center; border-top: 1px solid #E8E3DD;">
          <p style="color: #8A8578; font-size: 12px; margin: 0 0 10px 0;">${t.questionsAt}:</p>
          <a href="mailto:tere@sukoda.ee" style="color: #2C2824; font-size: 14px; text-decoration: none; font-weight: 400;">tere@sukoda.ee</a>
          <p style="color: #B8976A; font-size: 11px; margin: 16px 0 0 0; letter-spacing: 2px;">sukoda.ee</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get order details
 */
exports.getOrder = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const orderId = req.query.orderId;

      if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
      }

      try {
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();

        res.status(200).json({
          id: orderId,
          type: order.type,
          package: order.package,
          size: order.size,
          status: order.status,
          customer: {
            name: order.customer?.name,
            email: order.customer?.email,
          },
          recipient: order.recipient ? { name: order.recipient.name } : null,
        });
      } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ============================================================
// CAL.COM WEBHOOK HANDLER
// ============================================================

/**
 * Cal.com Webhook Handler
 * Receives booking events from Cal.com and syncs to Firestore
 * 
 * Setup: Register webhook at Cal.com Settings > Webhooks
 * URL: https://europe-west1-sukoda-77b52.cloudfunctions.net/calWebhook
 * Triggers: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
 */
exports.calWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const payload = req.body;
      const triggerEvent = payload.triggerEvent;

      console.log('Cal.com webhook received:', triggerEvent);

      switch (triggerEvent) {
        case 'BOOKING_CREATED':
          await handleCalBookingCreated(payload.payload);
          break;
        case 'BOOKING_CANCELLED':
          await handleCalBookingCancelled(payload.payload);
          break;
        case 'BOOKING_RESCHEDULED':
          await handleCalBookingRescheduled(payload.payload);
          break;
        default:
          console.log('Unhandled Cal.com event:', triggerEvent);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Cal.com webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  });

/**
 * Handle new booking from Cal.com
 */
async function handleCalBookingCreated(booking) {
  const attendeeEmail = booking.attendees?.[0]?.email;
  const attendeeName = booking.attendees?.[0]?.name;

  if (!attendeeEmail) {
    console.error('No attendee email in Cal.com booking');
    return;
  }

  // Check for duplicate — booking already created by admin reschedule
  if (booking.uid) {
    const existingBookings = await db.collection('bookings')
      .where('calBookingUid', '==', booking.uid)
      .limit(1)
      .get();
    if (!existingBookings.empty) {
      console.log('Booking already exists in Firestore (admin-created), skipping:', booking.uid);
      return;
    }
  }

  // Find the matching order by customer email
  const ordersSnapshot = await db.collection('orders')
    .where('customer.email', '==', attendeeEmail)
    .where('status', '==', 'paid')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  let orderId = null;
  let orderData = null;

  if (!ordersSnapshot.empty) {
    orderId = ordersSnapshot.docs[0].id;
    orderData = ordersSnapshot.docs[0].data();
  }

  // Determine size from event type slug
  const eventTypeSlug = booking.eventType?.slug || '';
  let size = 'medium';
  if (eventTypeSlug.includes('50')) size = 'small';
  else if (eventTypeSlug.includes('90')) size = 'medium';
  else if (eventTypeSlug.includes('120')) size = 'large';
  else if (eventTypeSlug.includes('150')) size = 'xlarge';

  // Create booking record in Firestore
  const bookingRef = await db.collection('bookings').add({
    orderId: orderId,
    calBookingId: booking.id || null,
    calBookingUid: booking.uid || null,
    customerEmail: attendeeEmail,
    customerName: attendeeName || orderData?.customer?.name || '',
    customerPhone: booking.responses?.phone || orderData?.customer?.phone || '',
    address: booking.responses?.address || orderData?.customer?.address || '',
    scheduledAt: admin.firestore.Timestamp.fromDate(new Date(booking.startTime)),
    endTime: admin.firestore.Timestamp.fromDate(new Date(booking.endTime)),
    eventTypeSlug: eventTypeSlug,
    size: size,
    status: 'scheduled',
    isAutoScheduled: booking.metadata?.source === 'sukoda-auto-scheduler',
    reminderSent: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Booking saved to Firestore:', bookingRef.id);

  // Update the order with visit tracking and learn preferences
  if (orderId && orderData) {
    const scheduledDate = new Date(booking.startTime);
    const rhythm = orderData.package;
    const intervalDays = calService.RHYTHM_INTERVALS[rhythm] || 14;

    const nextVisitDue = new Date(scheduledDate);
    nextVisitDue.setDate(nextVisitDue.getDate() + intervalDays);

    const updateData = {
      lastVisitAt: admin.firestore.Timestamp.fromDate(scheduledDate),
      nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
      totalVisits: admin.firestore.FieldValue.increment(1),
      preferredDay: scheduledDate.getDay(),
      preferredTime: `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('orders').doc(orderId).update(updateData);
    console.log('Order updated with visit tracking:', orderId);
  }
}

/**
 * Handle cancelled booking from Cal.com
 */
async function handleCalBookingCancelled(booking) {
  const bookingUid = booking.uid;

  if (!bookingUid) return;

  // Find and update the booking in Firestore
  const bookingsSnapshot = await db.collection('bookings')
    .where('calBookingUid', '==', bookingUid)
    .limit(1)
    .get();

  if (!bookingsSnapshot.empty) {
    const existingBooking = bookingsSnapshot.docs[0].data();
    // Skip if already processed (cancelled by admin, or rescheduled)
    if (existingBooking.status !== 'scheduled') {
      console.log('Booking already processed (status:', existingBooking.status, '), skipping:', bookingUid);
      return;
    }
    await bookingsSnapshot.docs[0].ref.update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Booking cancelled in Firestore:', bookingUid);
  }
}

/**
 * Handle rescheduled booking from Cal.com
 */
async function handleCalBookingRescheduled(booking) {
  const bookingUid = booking.uid;

  if (!bookingUid) return;

  // Find and update the booking in Firestore
  const bookingsSnapshot = await db.collection('bookings')
    .where('calBookingUid', '==', bookingUid)
    .limit(1)
    .get();

  if (!bookingsSnapshot.empty) {
    const bookingDoc = bookingsSnapshot.docs[0];

    await bookingDoc.ref.update({
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date(booking.startTime)),
      endTime: admin.firestore.Timestamp.fromDate(new Date(booking.endTime)),
      status: 'scheduled',
      reminderSent: false, // Reset reminder for new time
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update order preferences with new time
    const bookingData = bookingDoc.data();
    if (bookingData.orderId) {
      const scheduledDate = new Date(booking.startTime);
      const orderDoc = await db.collection('orders').doc(bookingData.orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        const rhythm = orderData.package;
        const intervalDays = calService.RHYTHM_INTERVALS[rhythm] || 14;
        const nextVisitDue = new Date(scheduledDate);
        nextVisitDue.setDate(nextVisitDue.getDate() + intervalDays);

        await db.collection('orders').doc(bookingData.orderId).update({
          lastVisitAt: admin.firestore.Timestamp.fromDate(scheduledDate),
          nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
          preferredDay: scheduledDate.getDay(),
          preferredTime: `${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    console.log('Booking rescheduled in Firestore:', bookingUid);
  }
}

// ============================================================
// AUTO-SCHEDULING FUNCTION (runs daily at 09:00 EET)
// ============================================================

/**
 * Automatically schedule next visits for active subscriptions
 * Runs daily at 09:00 Europe/Tallinn time
 */
exports.autoScheduleVisits = functions
  .region('europe-west1')
  .pubsub.schedule('0 9 * * *')
  .timeZone('Europe/Tallinn')
  .onRun(async (context) => {
    console.log('Auto-scheduler started');

    try {
      // Find active subscriptions that need next visit scheduled
      const now = new Date();
      const lookAhead = new Date(now);
      lookAhead.setDate(lookAhead.getDate() + 7); // Schedule up to 7 days ahead

      const ordersSnapshot = await db.collection('orders')
        .where('status', '==', 'paid')
        .where('subscriptionStatus', '==', 'active')
        .where('nextVisitDue', '<=', admin.firestore.Timestamp.fromDate(lookAhead))
        .get();

      if (ordersSnapshot.empty) {
        console.log('No subscriptions need scheduling');
        return null;
      }

      console.log(`Found ${ordersSnapshot.size} subscriptions to schedule`);

      for (const orderDoc of ordersSnapshot.docs) {
        const order = orderDoc.data();
        const orderId = orderDoc.id;

        try {
          await scheduleNextVisit(orderId, order);
        } catch (error) {
          console.error(`Failed to schedule visit for order ${orderId}:`, error);
          // Send admin notification about failure
          await sendEmail({
            to: NOTIFICATION_EMAIL,
            subject: `SUKODA | Automaatne broneering ebaõnnestus: ${orderId}`,
            html: `<p>Tellimus ${orderId} (${order.customer?.name}) automaatne broneering ebaõnnestus:</p><p>${error.message}</p>`,
          });
        }
      }

      console.log('Auto-scheduler completed');
      return null;
    } catch (error) {
      console.error('Auto-scheduler error:', error);
      return null;
    }
  });

/**
 * Schedule the next visit for a subscription order
 */
async function scheduleNextVisit(orderId, order) {
  const size = order.size || 'medium';
  const eventTypeSlug = calService.EVENT_TYPE_SLUGS[size];
  const rhythm = order.package;
  const intervalDays = calService.RHYTHM_INTERVALS[rhythm];

  if (!intervalDays) {
    console.log(`Skipping order ${orderId}: package ${rhythm} has no interval`);
    return;
  }

  // Calculate target date
  const targetDate = order.nextVisitDue?.toDate ? order.nextVisitDue.toDate() : new Date();
  const preferredDay = order.preferredDay;
  const preferredTime = order.preferredTime || '10:00';

  console.log(`Scheduling visit for ${orderId}: target ${targetDate.toISOString()}, preferred day ${preferredDay}, time ${preferredTime}`);

  // Find best available slot
  const bestSlot = await calService.findBestSlot(
    eventTypeSlug,
    targetDate,
    preferredDay,
    preferredTime
  );

  if (!bestSlot) {
    throw new Error(`No available slots found for ${eventTypeSlug} near ${targetDate.toISOString()}`);
  }

  console.log(`Best slot found: ${bestSlot}`);

  // Create booking via Cal.com API
  const calBooking = await calService.createBooking(
    eventTypeSlug,
    bestSlot,
    {
      name: order.customer?.name,
      email: order.customer?.email,
      phone: order.customer?.phone,
      address: order.customer?.address,
    },
    {
      orderId,
      autoScheduled: true,
    }
  );

  // The booking will be saved via the Cal.com webhook (BOOKING_CREATED)
  // But we also send a confirmation email directly
  const bookingDate = new Date(bestSlot);
  const lang = order.lang || 'et';
  const t = tx(lang);

  await sendEmail({
    to: order.customer?.email,
    subject: t.subjectNextVisit,
    html: generateNextVisitEmail({
      customerName: order.customer?.name,
      scheduledAt: bookingDate,
      address: order.customer?.address,
      size: getSizeName(size, lang),
    }, order, lang),
  });

  console.log(`Visit scheduled for order ${orderId}: ${bestSlot}`);
}

// ============================================================
// REMINDER FUNCTION (runs daily at 08:00 EET)
// ============================================================

/**
 * Send reminder emails 24-48h before scheduled visits
 * Runs daily at 08:00 Europe/Tallinn time
 */
exports.sendVisitReminders = functions
  .region('europe-west1')
  .pubsub.schedule('0 8 * * *')
  .timeZone('Europe/Tallinn')
  .onRun(async (context) => {
    console.log('Reminder function started');

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(now);
      dayAfter.setDate(dayAfter.getDate() + 2);

      // Find bookings in the next 24-48h that haven't been reminded
      const bookingsSnapshot = await db.collection('bookings')
        .where('status', '==', 'scheduled')
        .where('reminderSent', '==', false)
        .where('scheduledAt', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
        .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(dayAfter))
        .get();

      if (bookingsSnapshot.empty) {
        console.log('No reminders to send');
        return null;
      }

      console.log(`Sending ${bookingsSnapshot.size} reminders`);

      for (const bookingDoc of bookingsSnapshot.docs) {
        const booking = bookingDoc.data();

        try {
          // Read lang from the linked order (default to 'et')
          let lang = 'et';
          if (booking.orderId) {
            try {
              const orderDoc = await db.collection('orders').doc(booking.orderId).get();
              if (orderDoc.exists) {
                lang = orderDoc.data().lang || 'et';
              }
            } catch (e) {
              console.error('Could not fetch order lang for reminder:', e);
            }
          }
          const t = tx(lang);

          await sendEmail({
            to: booking.customerEmail,
            subject: t.subjectReminder,
            html: generateReminderEmail(booking, lang),
          });

          await bookingDoc.ref.update({
            reminderSent: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log('Reminder sent to:', booking.customerEmail);
        } catch (error) {
          console.error('Failed to send reminder:', error);
        }
      }

      console.log('Reminder function completed');
      return null;
    } catch (error) {
      console.error('Reminder function error:', error);
      return null;
    }
  });

// ============================================================
// LUXURY EMAIL TEMPLATES
// ============================================================

/**
 * Email header component (reusable)
 */
function emailHeader() {
  return `
    <div style="padding: 44px 40px; text-align: center; border-bottom: 1px solid #E8E3DD;">
      <h1 style="color: #2C2824; font-size: 26px; margin: 0 0 10px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 4px;">SUKODA</h1>
      <div style="width: 40px; height: 1px; background: #B8976A; margin: 0 auto;"></div>
    </div>`;
}

/**
 * Email footer component (reusable, i18n)
 */
function emailFooter(lang) {
  const t = tx(lang);
  return `
    <div style="padding: 28px 40px; text-align: center; border-top: 1px solid #E8E3DD;">
      <p style="color: #8A8578; font-size: 12px; margin: 0 0 8px 0;">${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a></p>
      <p style="color: #B8976A; font-size: 11px; margin: 0; letter-spacing: 2px;">sukoda.ee</p>
    </div>`;
}

/* formatDate() and formatTime() are defined above, near the EMAIL_TEXTS block */

/**
 * Reminder email -- sent ~24h before visit (i18n)
 * ET: "Homme ootab sind puhas kodu"
 * EN: "Tomorrow a clean home awaits you"
 */
function generateReminderEmail(booking, lang) {
  const t = tx(lang);
  const scheduledAt = booking.scheduledAt?.toDate ? booking.scheduledAt.toDate() : new Date(booking.scheduledAt);

  const itemsHtml = t.reminderItems.map((item, i) => {
    const border = i < t.reminderItems.length - 1 ? 'border-bottom: 1px solid #E8E3DD;' : '';
    return `<li style="padding: 8px 0; color: #8A8578; font-size: 14px; ${border}">${item}</li>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.reminderTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0;">
            ${t.reminderSubtitle}
          </p>

          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #B8976A;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.reminderVisitLabel}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif;">
              ${formatDate(scheduledAt, lang)}
            </p>
            <p style="margin: 0 0 16px 0; color: #8A8578; font-size: 16px;">
              ${t.reminderAt} ${formatTime(scheduledAt)}
            </p>
            ${booking.address ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${t.addressLabel}: <strong style="color: #2C2824; font-weight: 400;">${booking.address}</strong>
            </p>
            ` : ''}
          </div>

          <div style="background: #FAF8F5; padding: 24px; margin-bottom: 32px;">
            <p style="color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500; margin: 0 0 16px 0;">${t.reminderExpectLabel}</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${itemsHtml}
            </ul>
          </div>

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6;">
            ${t.reminderAccessNote}
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Next visit confirmation email -- sent when auto-scheduler creates next visit (i18n)
 * ET: "Sinu järgmine külastus on kinnitatud"
 * EN: "Your next visit is confirmed"
 */
function generateNextVisitEmail(booking, order, lang) {
  const t = tx(lang);
  const scheduledAt = booking.scheduledAt instanceof Date ? booking.scheduledAt : new Date(booking.scheduledAt);
  const packageName = getPackageInfo(order?.package, lang).name || order?.package || '';
  const sizeName = getSizeName(order?.size, lang);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.nextVisitTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
            ${t.nextVisitIntro(booking.customerName)}
          </p>

          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #B8976A;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.nextVisitTimeLabel}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif;">
              ${formatDate(scheduledAt, lang)}
            </p>
            <p style="margin: 0 0 0 0; color: #8A8578; font-size: 16px;">
              ${t.reminderAt} ${formatTime(scheduledAt)}
            </p>
            ${booking.address ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${booking.address}
            </p>
            ` : ''}
            ${packageName ? `
            <p style="margin: 12px 0 0 0; color: #8A8578; font-size: 13px;">
              ${t.nextVisitPackageLabel}: <strong style="color: #2C2824; font-weight: 400;">${packageName}</strong> (${sizeName || ''})
            </p>
            ` : ''}
          </div>

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6;">
            ${t.nextVisitReschedule}
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

// ============================================================
// CANCELLATION & RESCHEDULE EMAIL TEMPLATES
// ============================================================

/**
 * Cancellation email -- sent when admin cancels a visit
 */
function generateCancelEmail(booking, reason, lang) {
  const t = tx(lang);
  const scheduledAt = booking.scheduledAt?.toDate ? booking.scheduledAt.toDate() : new Date(booking.scheduledAt);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.cancelledTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
            ${t.cancelledIntro}
          </p>

          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #c9302c;">
            <p style="margin: 0 0 8px 0; color: #c9302c; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.cancelledTitle}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif; text-decoration: line-through;">
              ${formatDate(scheduledAt, lang)}
            </p>
            <p style="margin: 0 0 0 0; color: #8A8578; font-size: 16px; text-decoration: line-through;">
              ${t.reminderAt} ${formatTime(scheduledAt)}
            </p>
            ${booking.address ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${booking.address}
            </p>
            ` : ''}
            ${reason ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${t.cancelledReasonLabel}: <strong style="color: #2C2824; font-weight: 400;">${reason}</strong>
            </p>
            ` : ''}
          </div>

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6;">
            ${t.cancelledRebookNote}
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Order cancellation email -- sent when admin cancels the entire order
 */
function generateOrderCancelEmail(order, packageName, sizeName, reason, lang) {
  const t = tx(lang);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.cancelledTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
            ${t.cancelledIntro}
          </p>

          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #c9302c;">
            <p style="margin: 0 0 8px 0; color: #c9302c; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.cancelledTitle}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 18px; font-family: Georgia, 'Times New Roman', serif;">
              ${packageName}
            </p>
            <p style="margin: 0; color: #8A8578; font-size: 14px;">${sizeName}</p>
            ${reason ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${t.cancelledReasonLabel}: <strong style="color: #2C2824; font-weight: 400;">${reason}</strong>
            </p>
            ` : ''}
          </div>

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6;">
            ${t.cancelledRebookNote}
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Reschedule email -- sent when admin changes visit time
 */
function generateRescheduleEmail(booking, oldScheduledAt, newScheduledAt, lang) {
  const t = tx(lang);
  const oldDate = oldScheduledAt instanceof Date ? oldScheduledAt : oldScheduledAt?.toDate ? oldScheduledAt.toDate() : new Date(oldScheduledAt);
  const newDate = newScheduledAt instanceof Date ? newScheduledAt : new Date(newScheduledAt);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.rescheduledTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
            ${t.rescheduledIntro(booking.customerName)}
          </p>

          <!-- Old time (crossed out) -->
          <div style="background: #FFFFFF; padding: 20px 28px; margin-bottom: 4px; border-left: 2px solid #ccc; opacity: 0.6;">
            <p style="margin: 0 0 6px 0; color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.rescheduledOldTime}</p>
            <p style="margin: 0; font-weight: 300; color: #999; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; text-decoration: line-through;">
              ${formatDate(oldDate, lang)}, ${t.reminderAt} ${formatTime(oldDate)}
            </p>
          </div>

          <!-- New time (highlighted) -->
          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #B8976A;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.rescheduledNewTime}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif;">
              ${formatDate(newDate, lang)}
            </p>
            <p style="margin: 0; color: #8A8578; font-size: 16px;">
              ${t.reminderAt} ${formatTime(newDate)}
            </p>
            ${booking.address ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${booking.address}
            </p>
            ` : ''}
          </div>

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6;">
            ${t.rescheduledContactNote}
          </p>
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

// ============================================================
// ADMIN API FUNCTIONS
// ============================================================

/**
 * Admin: Get bookings for a date range
 * Query params: ?start=2026-02-09&end=2026-02-16&password=ADMIN_PASSWORD
 */
exports.getAdminBookings = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.query.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const start = req.query.start ? new Date(req.query.start) : new Date();
        const end = req.query.end ? new Date(req.query.end) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const bookingsSnapshot = await db.collection('bookings')
          .where('scheduledAt', '>=', admin.firestore.Timestamp.fromDate(start))
          .where('scheduledAt', '<=', admin.firestore.Timestamp.fromDate(end))
          .orderBy('scheduledAt', 'asc')
          .get();

        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString(),
          endTime: doc.data().endTime?.toDate?.()?.toISOString(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));

        res.status(200).json({ bookings });
      } catch (error) {
        console.error('Error getting admin bookings:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Get orders with optional filters
 * Query params: ?type=subscription&status=paid&limit=20&password=ADMIN_PASSWORD
 */
exports.getAdminOrders = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.query.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        let query = db.collection('orders').orderBy('createdAt', 'desc');

        if (req.query.type) {
          query = query.where('type', '==', req.query.type);
        }
        if (req.query.status) {
          query = query.where('status', '==', req.query.status);
        }

        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        query = query.limit(limit);

        const ordersSnapshot = await query.get();

        const orders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          paidAt: doc.data().paidAt?.toDate?.()?.toISOString(),
          nextVisitDue: doc.data().nextVisitDue?.toDate?.()?.toISOString(),
          lastVisitAt: doc.data().lastVisitAt?.toDate?.()?.toISOString(),
        }));

        res.status(200).json({ orders });
      } catch (error) {
        console.error('Error getting admin orders:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Mark a visit as complete
 * Body: { bookingId, password }
 */
exports.markVisitComplete = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.body.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { bookingId } = req.body;

        if (!bookingId) {
          return res.status(400).json({ error: 'Missing bookingId' });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        await bookingRef.update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, bookingId });
      } catch (error) {
        console.error('Error marking visit complete:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Cancel a booking (also cancels in Cal.com)
 * Body: { bookingId, password, reason }
 */
exports.cancelVisit = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.body.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { bookingId, reason } = req.body;

        if (!bookingId) {
          return res.status(400).json({ error: 'Missing bookingId' });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingDoc.data();

        // Cancel in Cal.com if we have the UID
        if (booking.calBookingUid) {
          try {
            await calService.cancelBooking(booking.calBookingUid, reason || 'Cancelled by admin');
          } catch (calError) {
            console.error('Cal.com cancel failed (continuing):', calError);
          }
        }

        await bookingRef.update({
          status: 'cancelled',
          cancelReason: reason || null,
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send cancellation email to client
        if (booking.customerEmail) {
          let lang = 'et';
          if (booking.orderId) {
            try {
              const orderDoc = await db.collection('orders').doc(booking.orderId).get();
              if (orderDoc.exists) lang = orderDoc.data().lang || 'et';
            } catch (e) { /* use default lang */ }
          }
          const t = tx(lang);
          try {
            await sendEmail({
              to: booking.customerEmail,
              subject: t.subjectCancelled,
              html: generateCancelEmail(booking, reason, lang),
            });
          } catch (emailErr) {
            console.error('Failed to send cancel email:', emailErr);
          }
        }

        res.status(200).json({ success: true, bookingId });
      } catch (error) {
        console.error('Error cancelling visit:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Get available Cal.com time slots
 * Query params: ?eventTypeSlug=koristus-90&startDate=2026-02-10&endDate=2026-02-24&password=ADMIN_PASSWORD
 */
exports.getAdminSlots = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.query.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { eventTypeSlug, startDate, endDate } = req.query;

        if (!eventTypeSlug || !startDate || !endDate) {
          return res.status(400).json({ error: 'Missing eventTypeSlug, startDate, or endDate' });
        }

        const slots = await calService.getAvailableSlots(eventTypeSlug, startDate, endDate);

        // Group by date for easier frontend display
        const grouped = {};
        for (const slot of slots) {
          const date = slot.date || slot.time.split('T')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(slot.time);
        }

        res.status(200).json({ slots: grouped });
      } catch (error) {
        console.error('Error getting admin slots:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Reschedule a booking (cancel old Cal.com + create new + update Firestore + email)
 * Body: { bookingId, newStartTime, password }
 */
exports.rescheduleVisit = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.body.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { bookingId, newStartTime } = req.body;

        if (!bookingId || !newStartTime) {
          return res.status(400).json({ error: 'Missing bookingId or newStartTime' });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingDoc.data();
        const oldScheduledAt = booking.scheduledAt;

        // 1. Cancel old Cal.com booking
        if (booking.calBookingUid) {
          try {
            await calService.cancelBooking(booking.calBookingUid, 'Rescheduled by admin');
          } catch (calError) {
            console.error('Cal.com cancel failed (continuing):', calError);
          }
        }

        // 2. Create new Cal.com booking
        const eventTypeSlug = booking.eventTypeSlug || calService.EVENT_TYPE_SLUGS[booking.size] || 'koristus-90';
        let newCalBooking = null;

        try {
          newCalBooking = await calService.createBooking(
            eventTypeSlug,
            newStartTime,
            {
              name: booking.customerName,
              email: booking.customerEmail,
              phone: booking.customerPhone || '',
              address: booking.address || '',
            },
            {
              orderId: booking.orderId,
              rescheduledFrom: bookingId,
              source: 'sukoda-admin-reschedule',
            }
          );
        } catch (calError) {
          console.error('Cal.com create booking failed:', calError);
          return res.status(500).json({ error: 'Failed to create new Cal.com booking: ' + calError.message });
        }

        // 3. Update Firestore booking with new time and Cal.com data
        const newStartDate = new Date(newStartTime);
        // Estimate end time from event type slug (50min, 90min, 120min, 150min)
        const durationMatch = eventTypeSlug.match(/(\d+)/);
        const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 90;
        const newEndDate = new Date(newStartDate.getTime() + durationMinutes * 60 * 1000);

        await bookingRef.update({
          scheduledAt: admin.firestore.Timestamp.fromDate(newStartDate),
          endTime: admin.firestore.Timestamp.fromDate(newEndDate),
          calBookingId: newCalBooking?.id || booking.calBookingId,
          calBookingUid: newCalBooking?.uid || booking.calBookingUid,
          rescheduledFrom: oldScheduledAt,
          rescheduledAt: admin.firestore.FieldValue.serverTimestamp(),
          reminderSent: false, // Reset reminder for new time
          status: 'scheduled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Update linked order's visit tracking
        if (booking.orderId) {
          try {
            const orderDoc = await db.collection('orders').doc(booking.orderId).get();
            if (orderDoc.exists) {
              const orderData = orderDoc.data();
              const rhythm = orderData.package;
              const intervalDays = calService.RHYTHM_INTERVALS[rhythm] || 14;
              const nextVisitDue = new Date(newStartDate);
              nextVisitDue.setDate(nextVisitDue.getDate() + intervalDays);

              await db.collection('orders').doc(booking.orderId).update({
                lastVisitAt: admin.firestore.Timestamp.fromDate(newStartDate),
                nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
                preferredDay: newStartDate.getDay(),
                preferredTime: `${newStartDate.getHours().toString().padStart(2, '0')}:${newStartDate.getMinutes().toString().padStart(2, '0')}`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          } catch (e) {
            console.error('Failed to update order visit tracking:', e);
          }
        }

        // 5. Send reschedule email to client
        if (booking.customerEmail) {
          let lang = 'et';
          if (booking.orderId) {
            try {
              const orderDoc = await db.collection('orders').doc(booking.orderId).get();
              if (orderDoc.exists) lang = orderDoc.data().lang || 'et';
            } catch (e) { /* use default lang */ }
          }
          const t = tx(lang);
          try {
            await sendEmail({
              to: booking.customerEmail,
              subject: t.subjectRescheduled,
              html: generateRescheduleEmail(booking, oldScheduledAt, newStartTime, lang),
            });
          } catch (emailErr) {
            console.error('Failed to send reschedule email:', emailErr);
          }
        }

        res.status(200).json({
          success: true,
          bookingId,
          newStartTime,
          calBookingUid: newCalBooking?.uid,
        });
      } catch (error) {
        console.error('Error rescheduling visit:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Cancel an order (also cancels linked bookings in Cal.com + Stripe subscription)
 * Body: { orderId, password, reason }
 */
exports.cancelOrder = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.body.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { orderId, reason } = req.body;

        if (!orderId) {
          return res.status(400).json({ error: 'Missing orderId' });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();

        // 1. Cancel any linked scheduled bookings (in Cal.com + Firestore)
        let cancelledBookings = 0;
        const bookingsSnapshot = await db.collection('bookings')
          .where('orderId', '==', orderId)
          .where('status', '==', 'scheduled')
          .get();

        for (const bookingDoc of bookingsSnapshot.docs) {
          const booking = bookingDoc.data();
          // Cancel in Cal.com
          if (booking.calBookingUid) {
            try {
              await calService.cancelBooking(booking.calBookingUid, reason || 'Order cancelled by admin');
            } catch (calError) {
              console.error('Cal.com cancel failed (continuing):', calError);
            }
          }
          // Update Firestore booking
          await bookingDoc.ref.update({
            status: 'cancelled',
            cancelReason: reason || 'Tellimus tühistatud',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          cancelledBookings++;
        }

        // 2. Cancel Stripe subscription (if applicable)
        if (order.stripeSubscriptionId && order.subscriptionStatus === 'active') {
          try {
            await stripe.subscriptions.cancel(order.stripeSubscriptionId);
            console.log('Stripe subscription cancelled:', order.stripeSubscriptionId);
          } catch (stripeError) {
            console.error('Stripe cancel failed (continuing):', stripeError);
          }
        }

        // 3. Update order status
        await orderRef.update({
          status: 'cancelled',
          subscriptionStatus: order.type === 'subscription' ? 'cancelled' : (order.subscriptionStatus || null),
          cancelReason: reason || null,
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Send cancellation email to client
        if (order.customer?.email) {
          const lang = order.lang || 'et';
          const t = tx(lang);
          const packageName = getPackageInfo(order.package, lang).name || order.package;
          const sizeName = getSizeName(order.size, lang);

          try {
            await sendEmail({
              to: order.customer.email,
              subject: t.subjectCancelled,
              html: generateOrderCancelEmail(order, packageName, sizeName, reason, lang),
            });
          } catch (emailErr) {
            console.error('Failed to send order cancel email:', emailErr);
          }
        }

        res.status(200).json({ success: true, orderId, cancelledBookings });
      } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Get bookings linked to an order
 * Query params: ?orderId=xxx&password=ADMIN_PASSWORD
 */
exports.getOrderBookings = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.query.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { orderId } = req.query;

        if (!orderId) {
          return res.status(400).json({ error: 'Missing orderId' });
        }

        const bookingsSnapshot = await db.collection('bookings')
          .where('orderId', '==', orderId)
          .orderBy('scheduledAt', 'desc')
          .get();

        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString(),
          endTime: doc.data().endTime?.toDate?.()?.toISOString(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));

        res.status(200).json({ bookings });
      } catch (error) {
        console.error('Error getting order bookings:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ============================================================
// WAITLIST — Capture interest from non-Tallinn areas
// ============================================================

/**
 * Save waitlist entry for expansion planning
 * Body: { email, name, city, address, lang }
 */
exports.waitlist = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      try {
        const { email, name, city, address, lang } = req.body;

        if (!email || !city) {
          return res.status(400).json({ error: 'Missing email or city' });
        }

        // Save to Firestore
        await db.collection('waitlist').add({
          email,
          name: name || null,
          city: city.trim(),
          address: address || null,
          lang: lang || 'et',
          source: 'website',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify admin
        await sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `SUKODA | Ootejärjekord: ${city}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="color: #2C2824; font-family: Georgia, serif; font-weight: 300; border-bottom: 1px solid #B8976A; padding-bottom: 10px;">Uus huviline väljastpoolt Tallinna</h2>
              <table style="width: 100%; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #8A8578;">Nimi:</td><td style="padding: 6px 0;"><strong>${name || '-'}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">E-post:</td><td style="padding: 6px 0;"><strong>${email}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">Linn:</td><td style="padding: 6px 0;"><strong style="color: #B8976A;">${city}</strong></td></tr>
                ${address ? `<tr><td style="padding: 6px 0; color: #8A8578;">Aadress:</td><td style="padding: 6px 0;">${address}</td></tr>` : ''}
              </table>
              <p style="color: #8A8578; font-size: 13px; margin-top: 20px;">
                <a href="https://console.firebase.google.com/project/sukoda-77b52/firestore/data/~2Fwaitlist" style="color: #2C2824;">Vaata kõiki ootejärjekorras →</a>
              </p>
            </div>
          `,
        });

        console.log('Waitlist entry saved:', city, email);
        res.status(200).json({ success: true });

      } catch (error) {
        console.error('Waitlist error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });
