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

    // Calendar buttons
    calendarAddLabel: 'Lisa kalendrisse',
    calendarGoogle: 'Google Calendar',
    calendarApple: 'Apple / Outlook',
    calendarEventTitle: 'SUKODA koduhoolitsus',
    calendarEventDesc: 'SUKODA koduhoolitsuse visiit',

    // Email footer
    footerQuestions: 'Küsimuste korral',

    // Follow-up emails (gift recipient → subscriber conversion)
    subjectFollowup24h: 'SUKODA | See tunne.',
    subjectFollowup7d: 'SUKODA | Kas mäletad?',
    subjectFollowup30d: 'SUKODA | Mõtlesime sinu peale',

    // Subscriber post-visit email (after first visit)
    subjectSubscriberFirstVisit: 'SUKODA | Tere tulemast koju',
    subscriberFirstVisitTitle: 'Tere tulemast koju.',
    subscriberFirstVisitIntro: (name) => name
      ? `${name}, loodame, et astusid eile uksest sisse ja tundsid — keegi on sinu eest hoolitsenud.`
      : 'Loodame, et astusid eile uksest sisse ja tundsid — keegi on sinu eest hoolitsenud.',
    subscriberFirstVisitBody: 'See ongi SUKODA mõte. Mitte lihtsalt koristus, vaid tunne. Et kodu ootab sind. Et keegi hoolib.\n\nMe anname alati parima. Ja kui midagi polnud päris nii, nagu ootasid — kirjuta meile. Soovime, et iga külastus oleks just selline, nagu väärid.',
    subscriberFirstVisitNextLabel: 'Sinu järgmine külastus',
    subscriberFirstVisitNextNote: 'Me hoolitseme selle eest, et see tunne kordub. Saadame meeldetuletuse päev enne järgmist külastust.',
    subscriberFirstVisitFeedback: 'Tahaksid midagi öelda? Vasta sellele kirjale — sinu sõnum jõuab otse meie meeskonnale. Iga mõte loeb.',

    // Gift recipient → subscriber follow-up: 24h after visit
    followup24hTitle: 'See tunne.',
    followup24hIntro: (name) => name
      ? `${name} — mäletad eilset? Astusid uksest sisse ja kõik oli lihtsalt... paigas.`
      : 'Mäletad eilset? Astusid uksest sisse ja kõik oli lihtsalt... paigas.',
    followup24hBody: 'Lilled vaasis. Puhas kodu. See vaikne rahu, mis tuleb teadmisest, et keegi on sinu eest hoolitsenud.',
    followup24hBody2: 'Kujuta ette, et see tunne ootab sind iga kord, kui koju jõuad.',
    followup24hOfferTitle: 'Ainult sulle',
    followup24hOfferText: 'Esimesed 3 kuud SUKODA püsiteenust -20%. Sest see tunne ei pea olema ühekordne.',
    followup24hOfferCode: 'KINGITUS20',
    followup24hOfferNote: 'Pakkumine kehtib 30 päeva.',
    followup24hCta: 'ALUSTA SIIT',

    // Gift recipient → subscriber follow-up: 7 days after visit
    followup7dTitle: 'Kas mäletad seda tunnet?',
    followup7dIntro: (name) => name
      ? `${name}, nädal tagasi oli sinu kodu teistsugune.`
      : 'Nädal tagasi oli sinu kodu teistsugune.',
    followup7dBody: 'Puhas. Lilled vaasis. Väike üllatus laual. See pole lihtsalt koristus — see on hoolitsus. Ja sa väärid seda rohkem kui korra.',
    followup7dOfferReminder: 'Sinu isiklik -20% pakkumine ootab endiselt:',
    followup7dCta: 'JAH, MA TAHAN SEDA',

    // Gift recipient → subscriber follow-up: 30 days after visit
    followup30dTitle: 'Mõtlesime sinu peale.',
    followup30dIntro: (name) => name
      ? `${name}, kuu on möödas sellest päevast, mil tulid koju ja kõik oli paigas.`
      : 'Kuu on möödas sellest päevast, mil tulid koju ja kõik oli paigas.',
    followup30dBody: 'Lilled on ammu närtsinud. Aga see tunne — seda mäletad sa veel. Puhas kodu, mis sind ootas. Keegi, kes hoolib.',
    followup30dUrgency: 'Sinu isiklik -20% pakkumine lõppeb peagi. Seejärel kehtib tavahind.',
    followup30dCta: 'VALI OMA PAKETT',
    followup30dFinalNote: 'Kirjuta meile — aitame leida paketi, mis sobib just sinu elurütmiga.',

    // Referral program — "Jaga seda tunnet"
    referralTitle: 'Jaga seda tunnet.',
    referralIntro: 'Tead kedagi, kes väärib sama kogemust? Jaga oma isiklikku koodi — sinu sõber saab -20% esimesed 3 kuud ja sina -20% järgmiselt kuult.',
    referralYourCode: 'Sinu isiklik kood',
    referralShareLink: 'Kopeeri jagamislink',
    referralFriendGets: 'Sõber saab: -20% esimesed 3 kuud',
    referralYouGet: 'Sina saad: -20% järgmiselt kuult',

    // Referral notification email — "Sinu sõber liitus!"
    subjectReferralSuccess: 'SUKODA | Keegi liitus sinu soovitusel',
    referralSuccessTitle: 'Keegi liitus sinu soovitusel.',
    referralSuccessIntro: (friendName) => friendName
      ? `Hea uudis — ${friendName} liitus just SUKODA-ga sinu soovitusel.`
      : 'Hea uudis — keegi liitus just SUKODA-ga sinu soovitusel.',
    referralSuccessBody: 'See tähendab, et jagasid head. Ja selle eest oleme sulle tänulikud.',
    referralSuccessReward: 'Sinu järgmine kuu on -20% soodsam.',
    referralSuccessRewardNote: 'Allahindlus rakendub automaatselt sinu järgmisele arvele.',
    referralSuccessOutro: 'Jätka jagamist — iga sõber, kes liitub, toob sulle uue allahindluse.',

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

    // Calendar buttons
    calendarAddLabel: 'Add to calendar',
    calendarGoogle: 'Google Calendar',
    calendarApple: 'Apple / Outlook',
    calendarEventTitle: 'SUKODA home care',
    calendarEventDesc: 'SUKODA home care visit',

    footerQuestions: 'Questions?',

    // Follow-up emails (gift recipient → subscriber conversion)
    subjectFollowup24h: 'SUKODA | That feeling.',
    subjectFollowup7d: 'SUKODA | Do you remember?',
    subjectFollowup30d: 'SUKODA | We were thinking of you',

    // Subscriber post-visit email (after first visit)
    subjectSubscriberFirstVisit: 'SUKODA | Welcome home',
    subscriberFirstVisitTitle: 'Welcome home.',
    subscriberFirstVisitIntro: (name) => name
      ? `${name}, we hope you walked through the door yesterday and felt it — someone had taken care of you.`
      : 'We hope you walked through the door yesterday and felt it — someone had taken care of you.',
    subscriberFirstVisitBody: 'That\'s what SUKODA is about. Not just cleaning, but a feeling. That your home is waiting for you. That someone cares.\n\nWe always give our best. And if something wasn\'t quite right — write to us. We want every visit to be exactly what you deserve.',
    subscriberFirstVisitNextLabel: 'Your next visit',
    subscriberFirstVisitNextNote: 'We\'ll make sure that feeling returns. We\'ll send a reminder the day before your next visit.',
    subscriberFirstVisitFeedback: 'Want to share something? Reply to this email — your message goes straight to our team. Every thought matters.',

    // Gift recipient → subscriber follow-up: 24h after visit
    followup24hTitle: 'That feeling.',
    followup24hIntro: (name) => name
      ? `${name} — remember yesterday? You walked through the door and everything was simply... right.`
      : 'Remember yesterday? You walked through the door and everything was simply... right.',
    followup24hBody: 'Flowers in a vase. A clean home. That quiet peace of knowing someone took care of you.',
    followup24hBody2: 'Imagine that feeling waiting for you every time you come home.',
    followup24hOfferTitle: 'Just for you',
    followup24hOfferText: 'Your first 3 months of SUKODA at 20% off. Because that feeling doesn\'t have to be a one-time thing.',
    followup24hOfferCode: 'KINGITUS20',
    followup24hOfferNote: 'Offer valid for 30 days.',
    followup24hCta: 'START HERE',

    // Gift recipient → subscriber follow-up: 7 days after visit
    followup7dTitle: 'Do you remember that feeling?',
    followup7dIntro: (name) => name
      ? `${name}, a week ago your home was different.`
      : 'A week ago, your home was different.',
    followup7dBody: 'Clean. Flowers in a vase. A little surprise on the table. It\'s not just cleaning — it\'s care. And you deserve it more than once.',
    followup7dOfferReminder: 'Your personal 20% offer is still waiting:',
    followup7dCta: 'YES, I WANT THIS',

    // Gift recipient → subscriber follow-up: 30 days after visit
    followup30dTitle: 'We were thinking of you.',
    followup30dIntro: (name) => name
      ? `${name}, a month has passed since the day you came home and everything was in place.`
      : 'A month has passed since the day you came home and everything was in place.',
    followup30dBody: 'The flowers have long faded. But you still remember that feeling. A clean home waiting for you. Someone who cares.',
    followup30dUrgency: 'Your personal 20% offer ends soon. After that, regular pricing applies.',
    followup30dCta: 'CHOOSE YOUR PLAN',
    followup30dFinalNote: 'Write to us — we\'ll help you find a plan that fits your rhythm.',

    // Referral program — "Share this feeling"
    referralTitle: 'Share this feeling.',
    referralIntro: 'Know someone who deserves the same experience? Share your personal code — your friend gets -20% for the first 3 months, and you get -20% off your next month.',
    referralYourCode: 'Your personal code',
    referralShareLink: 'Copy sharing link',
    referralFriendGets: 'Friend gets: -20% first 3 months',
    referralYouGet: 'You get: -20% off next month',

    // Referral notification email — "Someone joined through you!"
    subjectReferralSuccess: 'SUKODA | Someone joined through you',
    referralSuccessTitle: 'Someone joined through you.',
    referralSuccessIntro: (friendName) => friendName
      ? `Good news — ${friendName} just joined SUKODA through your recommendation.`
      : 'Good news — someone just joined SUKODA through your recommendation.',
    referralSuccessBody: 'It means you shared something good. And we\'re grateful for that.',
    referralSuccessReward: 'Your next month is 20% off.',
    referralSuccessRewardNote: 'The discount will be applied automatically to your next invoice.',
    referralSuccessOutro: 'Keep sharing — every friend who joins brings you a new discount.',

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

/** Format date for Google Calendar URL (YYYYMMDDTHHmmssZ) */
function formatDateForCal(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Generate Google Calendar event URL */
function generateGoogleCalUrl({ title, start, end, description, location }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDateForCal(start)}/${formatDateForCal(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate calendar links HTML block for emails
 * Includes Google Calendar link + .ics download link (Apple/Outlook)
 */
function generateCalendarLinksHtml({ scheduledAt, endTime, address, lang }) {
  const t = tx(lang);
  const start = scheduledAt instanceof Date ? scheduledAt : scheduledAt?.toDate ? scheduledAt.toDate() : new Date(scheduledAt);
  // Default to 2 hours if no endTime
  const end = endTime
    ? (endTime instanceof Date ? endTime : endTime?.toDate ? endTime.toDate() : new Date(endTime))
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const title = t.calendarEventTitle;
  const description = t.calendarEventDesc;

  const googleUrl = generateGoogleCalUrl({ title, start, end, description, location: address || '' });

  const icsParams = new URLSearchParams({
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    description,
    location: address || '',
  });
  const icsUrl = `https://sukoda.ee/api/calendar?${icsParams.toString()}`;

  return `
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #E8E3DD;">
      <p style="color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500; margin: 0 0 14px 0;">${t.calendarAddLabel}</p>
      <div>
        <a href="${googleUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 10px 20px; background: #FFFFFF; border: 1px solid #E8E3DD; color: #2C2824; text-decoration: none; font-size: 13px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-right: 8px; margin-bottom: 8px;">
          ${t.calendarGoogle} &rarr;
        </a>
        <a href="${icsUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 10px 20px; background: #FFFFFF; border: 1px solid #E8E3DD; color: #2C2824; text-decoration: none; font-size: 13px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-bottom: 8px;">
          ${t.calendarApple} &rarr;
        </a>
      </div>
    </div>
  `;
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
      small: 'price_1SzHrDEoH1b07UGQYLVwCTbj',   // €169
      medium: 'price_1SzHrDEoH1b07UGQFPUr3Nrl',  // €199
      large: 'price_1SzHrDEoH1b07UGQ7zyKVds3',   // €259
      xlarge: 'price_1SzHrEEoH1b07UGQ7xMOPZR2',  // €319
    },
    month: {
      small: 'price_1SzHrEEoH1b07UGQH22LSIF1',   // €339
      medium: 'price_1SzHrFEoH1b07UGQMynqX4lz',  // €389
      large: 'price_1SzHrFEoH1b07UGQXxj9kh6v',   // €499
      xlarge: 'price_1SzHrFEoH1b07UGQWTkE1u8Z',  // €619
    },
    quarter: {
      small: 'price_1SzHrGEoH1b07UGQrHx6yk7G',   // €849
      medium: 'price_1SzHrGEoH1b07UGQXIKyu61j',  // €999
      large: 'price_1SzHrHEoH1b07UGQaIZyV5Ry',   // €1249
      xlarge: 'price_1SzHrHEoH1b07UGQuIKAYkvf',  // €1449
    },
  },
  subscriptions: {
    once: {
      small: 'price_1SzHrIEoH1b07UGQFnwdDBCE',   // €135/kuu
      medium: 'price_1SzHrIEoH1b07UGQuyc7y9Ap',  // €169/kuu
      large: 'price_1SzHrIEoH1b07UGQdilTxd1D',   // €215/kuu
      xlarge: 'price_1SzHrJEoH1b07UGQmoehZXBP',  // €259/kuu
    },
    twice: {
      small: 'price_1SzHrKEoH1b07UGQdpPxm7D2',   // €225/kuu
      medium: 'price_1SzHrKEoH1b07UGQV1TWjYqj',  // €279/kuu
      large: 'price_1SzHrKEoH1b07UGQg4jBEvpg',   // €359/kuu
      xlarge: 'price_1SzHrLEoH1b07UGQhTBbxKha',  // €439/kuu
    },
    weekly: {
      small: 'price_1SzHrLEoH1b07UGQiww4FasC',   // €429/kuu
      medium: 'price_1SzHrMEoH1b07UGQJ8lm21hK',  // €499/kuu
      large: 'price_1SzHrMEoH1b07UGQK3I9SwA9',   // €649/kuu
      xlarge: 'price_1SzHrNEoH1b07UGQBXlmbysX',  // €789/kuu
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
 * Generate unique referral code for subscriber
 * Format: SOOVITA-XXXXX (5 alphanumeric chars)
 */
function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SOOVITA-';
  for (let i = 0; i < 5; i++) {
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
          promoCode,
          referralCode,
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
          referredBy: referralCode || null,  // Track which referral code brought this order
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
          mode: packageType === 'test' ? 'subscription' : (type === 'gift' ? 'payment' : 'subscription'),
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
          ...(type === 'gift' && packageType !== 'test' && {
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
            // Referral tracking
            ...(referralCode && { referral_code: referralCode }),
            // Campaign tracking for Stripe reports
            ...(tracking?.utm_source && { utm_source: tracking.utm_source }),
            ...(tracking?.utm_medium && { utm_medium: tracking.utm_medium }),
            ...(tracking?.utm_campaign && { utm_campaign: tracking.utm_campaign }),
            ...(tracking?.fbclid && { fbclid: tracking.fbclid }),
          },
          locale: lang === 'en' ? 'en' : 'et',
        };

        // Handle referral code: friend gets -20% for 3 months via SOOVITA20 promo
        // Referral discount takes priority over other promo codes
        if (referralCode && type === 'subscription') {
          try {
            const promoCodes = await stripe.promotionCodes.list({
              code: 'SOOVITA20',
              active: true,
              limit: 1,
            });
            if (promoCodes.data.length > 0) {
              sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
            } else {
              // Fallback: try KINGITUS20 (same discount)
              const fallbackCodes = await stripe.promotionCodes.list({
                code: 'KINGITUS20',
                active: true,
                limit: 1,
              });
              if (fallbackCodes.data.length > 0) {
                sessionParams.discounts = [{ promotion_code: fallbackCodes.data[0].id }];
              } else {
                sessionParams.allow_promotion_codes = true;
              }
            }
          } catch (refPromoError) {
            console.error('Referral promo lookup failed:', refPromoError.message);
            sessionParams.allow_promotion_codes = true;
          }
        }
        // Handle promo codes: if a promo code is provided, try to auto-apply it via Stripe
        // Otherwise, allow manual promo code entry on the checkout page
        else if (promoCode) {
          try {
            // Look up the promotion code in Stripe to get its ID
            const promoCodes = await stripe.promotionCodes.list({
              code: promoCode,
              active: true,
              limit: 1,
            });
            if (promoCodes.data.length > 0) {
              // Auto-apply the discount — no manual entry needed
              sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
            } else {
              // Promo code not found in Stripe, fall back to manual entry
              sessionParams.allow_promotion_codes = true;
            }
          } catch (promoError) {
            console.error('Promo code lookup failed:', promoError.message);
            sessionParams.allow_promotion_codes = true;
          }
        } else {
          // No promo code provided — allow manual entry
          sessionParams.allow_promotion_codes = true;
        }

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
    // Handle gift card size upgrades separately
    if (session.metadata?.type === 'gift_upgrade') {
      const newSize = session.metadata.new_size;
      const oldSize = session.metadata.old_size;
      const giftCode = session.metadata.gift_code;

      await db.collection('orders').doc(orderId).update({
        size: newSize,
        sizeUpgraded: true,
        sizeUpgradedFrom: oldSize,
        sizeUpgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        upgradePaymentIntent: session.payment_intent,
      });

      console.log(`Gift card ${giftCode} upgraded: ${oldSize} → ${newSize} (order: ${orderId})`);
      return;  // Done — no emails needed for upgrades
    }

    const updateData = {
      status: 'paid',
      stripeCustomerId: session.customer,
      stripePaymentIntentId: session.payment_intent,
      stripeSubscriptionId: session.subscription || null,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // For subscriptions, initialize visit tracking fields + generate referral code
    if (session.subscription) {
      updateData.subscriptionStatus = 'active';
      updateData.totalVisits = 0;
      updateData.nextVisitDue = null; // Will be set after first Cal.com booking
      updateData.lastVisitAt = null;
      updateData.preferredDay = null;
      updateData.preferredTime = null;
      updateData.referralCode = generateReferralCode();
    }

    await db.collection('orders').doc(orderId).update(updateData);

    const orderDoc = await db.collection('orders').doc(orderId).get();
    const order = orderDoc.data();

    // Process referral reward if this subscription was referred by someone
    const referralCode = session.metadata?.referral_code;
    if (referralCode && session.subscription) {
      try {
        await processReferralReward(referralCode, orderId, order, session.subscription);
      } catch (refError) {
        console.error('Referral reward processing failed (non-fatal):', refError);
      }
    }

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
      const updateData = {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };

      // Track cancel_at_period_end status
      if (subscription.cancel_at_period_end) {
        updateData.status = 'cancelling';
        updateData.cancelAtPeriodEnd = true;
      } else if (ordersSnapshot.docs[0].data().status === 'cancelling') {
        // If cancel was reversed (re-activated), restore to paid
        updateData.status = 'paid';
        updateData.cancelAtPeriodEnd = false;
      }

      await ordersSnapshot.docs[0].ref.update(updateData);
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

  // Small delay helper to avoid Resend rate limit (2 req/sec)
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. Admin notification (always Estonian)
  await sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: `SUKODA | Uus ${isGift ? 'kingitus' : 'tellimus'}: ${packageNameET}`,
    html: generateAdminEmail(order, orderId, packageNameET, sizeNameET, isGift),
  });

  await wait(600);

  // 2. Customer confirmation (in customer's language)
  await sendEmail({
    to: order.customer?.email,
    subject: isGift ? t.subjectGiftOnWay : t.subjectOrderReceived,
    html: generateCustomerEmail(order, orderId, packageName, sizeName, isGift, lang),
  });

  // 3. Gift card to recipient (if gift + email delivery, in customer's language)
  if (isGift && order.deliveryMethod === 'email' && order.recipient?.email) {
    await wait(600);
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
          <a href="https://sukoda.ee/lunasta.html?code=${encodeURIComponent(order.giftCode || '')}" 
             style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 16px 44px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: 500;">
            ${t.giftBookBtn}
          </a>
        </div>

        <!-- Footer -->
        <div style="padding: 36px 28px 28px; text-align: center; border-top: 1px solid #E8E3DD;">
          <p style="color: #2C2824; font-size: 18px; margin: 0 0 6px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 3px;">SUKODA</p>
          <div style="width: 24px; height: 1px; background: #B8976A; margin: 0 auto 18px;"></div>
          <p style="color: #8A8578; font-size: 12px; margin: 0 0 6px 0;">${t.questionsAt}:</p>
          <a href="mailto:tere@sukoda.ee" style="color: #2C2824; font-size: 13px; text-decoration: none; font-weight: 400; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          <p style="color: #B8976A; font-size: 10px; margin: 14px 0 0 0; letter-spacing: 2px;">
            <a href="https://sukoda.ee" style="color: #B8976A; text-decoration: none;">sukoda.ee</a>
          </p>
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
            phone: order.customer?.phone,
            address: order.customer?.address,
            additionalInfo: order.customer?.additionalInfo,
          },
          recipient: order.recipient ? { name: order.recipient.name } : null,
          giftCode: order.giftCode || null,
          referralCode: order.referralCode || null,
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
    <div style="padding: 36px 40px 28px; text-align: center; border-top: 1px solid #E8E3DD;">
      <p style="color: #2C2824; font-size: 18px; margin: 0 0 6px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: 3px;">SUKODA</p>
      <div style="width: 24px; height: 1px; background: #B8976A; margin: 0 auto 18px;"></div>
      <p style="color: #8A8578; font-size: 12px; margin: 0 0 6px 0;">${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a></p>
      <p style="color: #B8976A; font-size: 10px; margin: 14px 0 0 0; letter-spacing: 2px;">
        <a href="https://sukoda.ee" style="color: #B8976A; text-decoration: none;">sukoda.ee</a>
      </p>
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

          ${generateCalendarLinksHtml({ scheduledAt, endTime: booking.endTime, address: booking.address, lang })}

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 24px;">
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

          ${generateCalendarLinksHtml({ scheduledAt, endTime: booking.endTime, address: booking.address, lang })}

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 24px;">
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

          ${generateCalendarLinksHtml({ scheduledAt: newDate, endTime: booking.endTime, address: booking.address, lang })}

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 24px;">
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
// FOLLOW-UP EMAIL SYSTEM (Gift Recipient → Subscriber Conversion)
// ============================================================

/**
 * Follow-up promo URL builder
 * Adds coupon code as URL parameter so landing page can auto-apply it
 */
function getFollowupOrderUrl(lang, promoCode) {
  const base = 'https://sukoda.ee/index.html';
  return `${base}?promo=${encodeURIComponent(promoCode)}&utm_source=followup&utm_medium=email&utm_campaign=gift_conversion`;
}

/**
 * Generate follow-up email: 24h after visit — "Kuidas meeldis?" + -20% offer
 */
function generateFollowup24hEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.followup24hTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 20px 0; font-size: 15px;">
            ${t.followup24hIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 20px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.followup24hBody}
          </p>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 44px 0; font-size: 15px;">
            ${t.followup24hBody2}
          </p>

          <!-- Elegant divider -->
          <div style="text-align: center; margin-bottom: 44px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <!-- Special offer card — soft reveal, not a hard sell -->
          <div style="background: #111111; padding: 44px 36px; text-align: center; margin-bottom: 32px;">
            <p style="margin: 0 0 20px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 500;">
              ${t.followup24hOfferTitle}
            </p>
            <p style="margin: 0 0 12px 0; color: #FFFFFF; font-size: 48px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; letter-spacing: -1px;">
              -20%
            </p>
            <p style="margin: 0 0 28px 0; color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">
              ${lang === 'et' ? 'esimesed 3 kuud' : 'first 3 months'}
            </p>
            <p style="margin: 0 0 28px 0; color: #CCCCCC; font-size: 14px; line-height: 1.7; max-width: 380px; display: inline-block;">
              ${t.followup24hOfferText}
            </p>
            <div style="background: #222222; padding: 14px 28px; display: inline-block; margin-bottom: 28px;">
              <p style="margin: 0; color: #B8976A; font-size: 18px; letter-spacing: 5px; font-family: Georgia, 'Times New Roman', serif;">
                ${t.followup24hOfferCode}
              </p>
            </div>
            <br>
            <a href="${orderUrl}" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 16px 48px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: 500; margin-top: 4px;">
              ${t.followup24hCta}
            </a>
            <p style="margin: 24px 0 0 0; color: #555555; font-size: 12px;">
              ${t.followup24hOfferNote}
            </p>
          </div>

          <p style="color: #8A8578; font-size: 14px;">
            ${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>
        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate follow-up email: 7 days after visit — "Sinu järgmine koristus ootab"
 */
function generateFollowup7dEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.followup7dTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.followup7dIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.followup7dBody}
          </p>

          <!-- Offer — warm, inviting, not pushy -->
          <div style="background: #FFFFFF; padding: 32px; border-left: 3px solid #B8976A; margin-bottom: 36px;">
            <p style="margin: 0 0 16px 0; color: #8A8578; font-size: 14px; line-height: 1.7;">
              ${t.followup7dOfferReminder}
            </p>
            <div style="background: #FAF8F5; padding: 14px 24px; display: inline-block; margin-bottom: 20px;">
              <p style="margin: 0; color: #B8976A; font-size: 22px; letter-spacing: 5px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">
                ${t.followup24hOfferCode}
              </p>
            </div>
            <br>
            <a href="${orderUrl}" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 16px 44px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: 500;">
              ${t.followup7dCta}
            </a>
          </div>

          <p style="color: #8A8578; font-size: 14px;">
            ${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>
        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate follow-up email: 30 days after visit — Final reminder / urgency
 */
function generateFollowup30dEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.followup30dTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.followup30dIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 44px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.followup30dBody}
          </p>

          <!-- Elegant divider -->
          <div style="text-align: center; margin-bottom: 44px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <!-- Final offer — elegant urgency, not pressure -->
          <div style="background: #111111; padding: 44px 36px; text-align: center; margin-bottom: 28px;">
            <p style="margin: 0 0 24px 0; color: #CCCCCC; font-size: 15px; line-height: 1.7; max-width: 380px; display: inline-block;">
              ${t.followup30dUrgency}
            </p>
            <div style="background: #222222; padding: 14px 28px; display: inline-block; margin-bottom: 28px;">
              <p style="margin: 0; color: #B8976A; font-size: 18px; letter-spacing: 5px; font-family: Georgia, 'Times New Roman', serif;">
                ${t.followup24hOfferCode}
              </p>
            </div>
            <br>
            <a href="${orderUrl}" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 16px 48px; text-decoration: none; font-size: 12px; letter-spacing: 3px; font-weight: 500;">
              ${t.followup30dCta}
            </a>
          </div>

          <p style="color: #8A8578; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
            ${t.followup30dFinalNote}
          </p>

          <p style="color: #8A8578; font-size: 14px;">
            ${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>
        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate subscriber first-visit follow-up email — "Kuidas meeldis esimene külastus?"
 * Warm, personal, no upsell — just relationship building
 */
function generateSubscriberFirstVisitEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const packageName = getPackageInfo(followup.packageType || 'twice', lang).name || '';

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.subscriberFirstVisitTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.subscriberFirstVisitIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.subscriberFirstVisitBody}
          </p>

          <!-- Elegant divider -->
          <div style="text-align: center; margin-bottom: 40px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <!-- Package info — reinforcing their good decision -->
          <div style="background: #FFFFFF; padding: 32px; border-left: 3px solid #B8976A; margin-bottom: 32px;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
              ${t.subscriberFirstVisitNextLabel}
            </p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 18px; font-family: Georgia, 'Times New Roman', serif;">
              ${packageName}
            </p>
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 13px; line-height: 1.7;">
              ${t.subscriberFirstVisitNextNote}
            </p>
          </div>

          <!-- Feedback prompt — inviting, warm -->
          <div style="background: #FAF8F5; padding: 28px; margin-bottom: 32px; border-left: 2px solid #E8E3DD;">
            <p style="color: #8A8578; font-size: 14px; line-height: 1.7; font-style: italic; margin: 0;">
              ${t.subscriberFirstVisitFeedback}
            </p>
          </div>

          ${followup.referralCode ? `
          <!-- Elegant divider -->
          <div style="text-align: center; margin-bottom: 40px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <!-- Referral block — share the feeling -->
          <div style="background: #111111; padding: 40px 32px; text-align: center; margin-bottom: 32px;">
            <p style="margin: 0 0 16px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 500;">
              ${t.referralTitle}
            </p>
            <p style="margin: 0 0 28px 0; color: #CCCCCC; font-size: 14px; line-height: 1.7; max-width: 380px; display: inline-block;">
              ${t.referralIntro}
            </p>
            <p style="margin: 0 0 8px 0; color: #666666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">
              ${t.referralYourCode}
            </p>
            <div style="background: #222222; padding: 16px 32px; display: inline-block; margin-bottom: 24px;">
              <p style="margin: 0; color: #B8976A; font-size: 22px; letter-spacing: 5px; font-family: Georgia, 'Times New Roman', serif;">
                ${followup.referralCode}
              </p>
            </div>
            <br>
            <a href="https://sukoda.ee/index.html?ref=${encodeURIComponent(followup.referralCode)}" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 14px 40px; text-decoration: none; font-size: 11px; letter-spacing: 3px; font-weight: 500;">
              ${t.referralShareLink}
            </a>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #333333;">
              <p style="margin: 0 0 4px 0; color: #888888; font-size: 12px;">${t.referralFriendGets}</p>
              <p style="margin: 0; color: #888888; font-size: 12px;">${t.referralYouGet}</p>
            </div>
          </div>
          ` : ''}

          <p style="color: #8A8578; font-size: 14px;">
            ${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>
        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Create follow-up sequence for a gift recipient after booking
 * Called when a gift recipient books their visit (bookGiftVisit)
 * Creates 3 follow-up entries in Firestore that will be processed by the scheduler
 * 
 * @param {Object} params
 * @param {string} params.orderId - The gift order ID
 * @param {string} params.recipientEmail - Gift recipient's email
 * @param {string} params.recipientName - Gift recipient's name
 * @param {string} params.bookingStartTime - ISO string of the booked visit time
 * @param {string} params.lang - Language (et/en)
 * @param {string} params.size - Home size
 */
async function createFollowupSequence({ orderId, recipientEmail, recipientName, bookingStartTime, lang, size }) {
  const visitDate = new Date(bookingStartTime);

  // Schedule: 24h, 7 days, 30 days after the VISIT (not after booking)
  const stages = [
    { stage: '24h', delayDays: 1 },
    { stage: '7d', delayDays: 7 },
    { stage: '30d', delayDays: 30 },
  ];

  const batch = db.batch();

  for (const { stage, delayDays } of stages) {
    const sendAt = new Date(visitDate);
    sendAt.setDate(sendAt.getDate() + delayDays);
    // Send at 10:00 Tallinn time (UTC+2/+3 depending on DST)
    sendAt.setHours(10, 0, 0, 0);

    const ref = db.collection('followups').doc();
    batch.set(ref, {
      orderId,
      recipientEmail,
      recipientName: recipientName || '',
      visitDate: admin.firestore.Timestamp.fromDate(visitDate),
      sendAt: admin.firestore.Timestamp.fromDate(sendAt),
      stage,
      status: 'pending',  // pending → sent → converted / expired
      lang: lang || 'et',
      size: size || 'medium',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`Follow-up sequence created for order ${orderId}: ${recipientEmail}`);
}

/**
 * Process follow-up emails — runs daily at 10:00 Europe/Tallinn
 * Checks for pending follow-ups whose sendAt has passed and sends them
 */
exports.processFollowups = functions
  .region('europe-west1')
  .pubsub.schedule('0 10 * * *')
  .timeZone('Europe/Tallinn')
  .onRun(async (context) => {
    console.log('Follow-up processor started');

    try {
      const now = new Date();

      // Find pending follow-ups whose sendAt is in the past
      const followupsSnapshot = await db.collection('followups')
        .where('status', '==', 'pending')
        .where('sendAt', '<=', admin.firestore.Timestamp.fromDate(now))
        .limit(50) // Process in batches
        .get();

      if (followupsSnapshot.empty) {
        console.log('No pending follow-ups to process');
        return null;
      }

      console.log(`Processing ${followupsSnapshot.size} follow-ups`);

      // Small delay helper to avoid Resend rate limit (2 req/sec)
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      for (const doc of followupsSnapshot.docs) {
        const followup = doc.data();

        try {
          // For gift conversion follow-ups (24h/7d/30d), check if recipient already subscribed
          // Skip this check for subscriber_first_visit — they're already subscribers
          if (followup.stage !== 'subscriber_first_visit') {
            const existingOrderSnapshot = await db.collection('orders')
              .where('customer.email', '==', followup.recipientEmail)
              .where('type', '==', 'subscription')
              .where('status', '==', 'paid')
              .limit(1)
              .get();

            if (!existingOrderSnapshot.empty) {
              // Recipient already converted! Mark all their gift conversion follow-ups as converted
              console.log(`Recipient ${followup.recipientEmail} already converted, skipping follow-up`);
              const allFollowups = await db.collection('followups')
                .where('recipientEmail', '==', followup.recipientEmail)
                .where('status', '==', 'pending')
                .where('stage', 'in', ['24h', '7d', '30d'])
                .get();

              const batch = db.batch();
              allFollowups.docs.forEach(d => {
                batch.update(d.ref, {
                  status: 'converted',
                  convertedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              });
              await batch.commit();
              continue;
            }
          }

          // Generate and send the appropriate email
          const lang = followup.lang || 'et';
          const t = tx(lang);
          let subject, html;

          switch (followup.stage) {
            case '24h':
              subject = t.subjectFollowup24h;
              html = generateFollowup24hEmail(followup, lang);
              break;
            case '7d':
              subject = t.subjectFollowup7d;
              html = generateFollowup7dEmail(followup, lang);
              break;
            case '30d':
              subject = t.subjectFollowup30d;
              html = generateFollowup30dEmail(followup, lang);
              break;
            case 'subscriber_first_visit':
              subject = t.subjectSubscriberFirstVisit;
              html = generateSubscriberFirstVisitEmail(followup, lang);
              break;
            default:
              console.error('Unknown follow-up stage:', followup.stage);
              continue;
          }

          await sendEmail({
            to: followup.recipientEmail,
            subject,
            html,
          });

          // Mark as sent
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Follow-up ${followup.stage} sent to ${followup.recipientEmail}`);
          await wait(600); // Rate limit: Resend 2 req/sec

        } catch (error) {
          console.error(`Error processing follow-up ${doc.id}:`, error);
          // Mark as failed but don't retry endlessly
          await doc.ref.update({
            status: 'failed',
            error: error.message,
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      console.log('Follow-up processor completed');
      return null;
    } catch (error) {
      console.error('Follow-up processor error:', error);
      return null;
    }
  });

// ============================================================
// REFERRAL SYSTEM
// ============================================================

/**
 * Validate a referral code — used by the frontend to show referrer's name on the banner
 * GET /api/validate-referral?code=SOOVITA-XXXXX
 */
exports.validateReferral = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const code = req.query.code;

      if (!code) {
        return res.status(400).json({ error: 'Missing code' });
      }

      try {
        const ordersSnapshot = await db.collection('orders')
          .where('referralCode', '==', code.toUpperCase())
          .where('type', '==', 'subscription')
          .where('status', 'in', ['paid', 'cancelling'])
          .limit(1)
          .get();

        if (ordersSnapshot.empty) {
          return res.status(404).json({ error: 'Referral code not found' });
        }

        const referrerOrder = ordersSnapshot.docs[0].data();
        const firstName = (referrerOrder.customer?.name || '').split(' ')[0] || '';

        res.status(200).json({
          valid: true,
          referrerName: firstName,
        });
      } catch (error) {
        console.error('Error validating referral:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Process referral reward when a friend subscribes with a referral code
 * - Creates a referral record in Firestore
 * - Applies -20% to referrer's next billing cycle (Stripe coupon)
 * - Sends notification email to referrer
 */
async function processReferralReward(referralCode, friendOrderId, friendOrder, friendSubscriptionId) {
  console.log(`Processing referral reward for code: ${referralCode}`);

  // Find the referrer's order
  const referrerSnapshot = await db.collection('orders')
    .where('referralCode', '==', referralCode)
    .where('type', '==', 'subscription')
    .where('status', 'in', ['paid', 'cancelling'])
    .limit(1)
    .get();

  if (referrerSnapshot.empty) {
    console.log(`Referral code ${referralCode} not found or referrer no longer active`);
    return;
  }

  const referrerDoc = referrerSnapshot.docs[0];
  const referrerOrder = referrerDoc.data();

  // Don't reward self-referrals
  if (referrerOrder.customer?.email === friendOrder.customer?.email) {
    console.log('Self-referral detected, skipping reward');
    return;
  }

  // Create referral record in Firestore
  await db.collection('referrals').add({
    referrerOrderId: referrerDoc.id,
    referrerEmail: referrerOrder.customer?.email,
    referrerName: referrerOrder.customer?.name || '',
    friendOrderId: friendOrderId,
    friendEmail: friendOrder.customer?.email,
    friendName: friendOrder.customer?.name || '',
    referralCode: referralCode,
    referrerRewardApplied: false,
    status: 'completed',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Apply -20% coupon to referrer's Stripe subscription (one month)
  if (referrerOrder.stripeSubscriptionId) {
    try {
      // Look up or use the SOOVITAJA20 coupon ID
      // The coupon must exist in Stripe (created manually: 20% off, duration "once")
      const coupons = await stripe.coupons.list({ limit: 100 });
      const referrerCoupon = coupons.data.find(c => c.name === 'SOOVITAJA20' || c.id === 'SOOVITAJA20');

      if (referrerCoupon) {
        await stripe.subscriptions.update(referrerOrder.stripeSubscriptionId, {
          coupon: referrerCoupon.id,
        });

        // Update referral record
        const referralSnap = await db.collection('referrals')
          .where('friendOrderId', '==', friendOrderId)
          .limit(1)
          .get();
        if (!referralSnap.empty) {
          await referralSnap.docs[0].ref.update({
            referrerRewardApplied: true,
            status: 'rewarded',
            rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        console.log(`Referrer reward applied: -20% to subscription ${referrerOrder.stripeSubscriptionId}`);
      } else {
        console.error('SOOVITAJA20 coupon not found in Stripe. Please create it in the Stripe dashboard.');
      }
    } catch (stripeError) {
      console.error('Failed to apply referrer coupon:', stripeError.message);
    }
  }

  // Send notification email to referrer
  const lang = referrerOrder.lang || 'et';
  const t = tx(lang);

  try {
    await sendEmail({
      to: referrerOrder.customer?.email,
      subject: t.subjectReferralSuccess,
      html: generateReferralSuccessEmail(referrerOrder, friendOrder, lang),
    });
    console.log(`Referral notification sent to ${referrerOrder.customer?.email}`);
  } catch (emailError) {
    console.error('Failed to send referral notification email:', emailError);
  }
}

/**
 * Generate referral success email — "Keegi liitus sinu soovitusel"
 */
function generateReferralSuccessEmail(referrerOrder, friendOrder, lang) {
  const t = tx(lang);
  const friendFirstName = (friendOrder.customer?.name || '').split(' ')[0] || '';

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.referralSuccessTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.referralSuccessIntro(friendFirstName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.referralSuccessBody}
          </p>

          <!-- Elegant divider -->
          <div style="text-align: center; margin-bottom: 40px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <!-- Reward card -->
          <div style="background: #111111; padding: 36px 32px; text-align: center; margin-bottom: 32px;">
            <p style="margin: 0 0 12px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 4px; font-weight: 500;">
              ${lang === 'et' ? 'Sinu tasu' : 'Your reward'}
            </p>
            <p style="margin: 0 0 16px 0; color: #FFFFFF; font-size: 40px; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">
              -20%
            </p>
            <p style="margin: 0 0 8px 0; color: #CCCCCC; font-size: 14px; line-height: 1.6;">
              ${t.referralSuccessReward}
            </p>
            <p style="margin: 0; color: #666666; font-size: 12px;">
              ${t.referralSuccessRewardNote}
            </p>
          </div>

          <p style="color: #8A8578; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
            ${t.referralSuccessOutro}
          </p>

          <p style="color: #8A8578; font-size: 14px;">
            ${t.footerQuestions}: <a href="mailto:tere@sukoda.ee" style="color: #2C2824; text-decoration: none; border-bottom: 1px solid #B8976A;">tere@sukoda.ee</a>
          </p>
        </div>
        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Admin: Get follow-up stats and list
 * GET /api/admin/followups?password=ADMIN_PASSWORD
 */
exports.getAdminFollowups = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      if (req.query.password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        // Get stats
        const pendingSnapshot = await db.collection('followups').where('status', '==', 'pending').get();
        const sentSnapshot = await db.collection('followups').where('status', '==', 'sent').get();
        const convertedSnapshot = await db.collection('followups').where('status', '==', 'converted').get();

        // Get recent follow-ups
        const recentSnapshot = await db.collection('followups')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const followups = recentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          sendAt: doc.data().sendAt?.toDate?.()?.toISOString(),
          visitDate: doc.data().visitDate?.toDate?.()?.toISOString(),
          sentAt: doc.data().sentAt?.toDate?.()?.toISOString(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
        }));

        res.status(200).json({
          stats: {
            pending: pendingSnapshot.size,
            sent: sentSnapshot.size,
            converted: convertedSnapshot.size,
            total: pendingSnapshot.size + sentSnapshot.size + convertedSnapshot.size,
          },
          followups,
        });
      } catch (error) {
        console.error('Get admin followups error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

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

        const orders = ordersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            paidAt: data.paidAt?.toDate?.()?.toISOString(),
            nextVisitDue: data.nextVisitDue?.toDate?.()?.toISOString(),
            lastVisitAt: data.lastVisitAt?.toDate?.()?.toISOString(),
            giftRedeemedAt: data.giftRedeemedAt?.toDate?.()?.toISOString() || null,
            cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
            currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || null,
          };
        });

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

        const bookingData = bookingDoc.data();

        await bookingRef.update({
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send subscriber post-first-visit follow-up email (24h after first visit)
        try {
          if (bookingData.orderId) {
            const orderDoc = await db.collection('orders').doc(bookingData.orderId).get();
            if (orderDoc.exists) {
              const order = orderDoc.data();
              const isSubscription = order.type === 'subscription' || order.type === 'test';
              const isFirstVisit = (order.totalVisits || 0) <= 1;
              const isGiftRedeemed = order.type === 'gift';

              if (isSubscription && isFirstVisit) {
                // Schedule subscriber first-visit email for ~24h later
                const sendAt = new Date();
                sendAt.setDate(sendAt.getDate() + 1);
                sendAt.setHours(10, 0, 0, 0);

                await db.collection('followups').add({
                  orderId: bookingData.orderId,
                  recipientEmail: bookingData.customerEmail || order.customer?.email,
                  recipientName: bookingData.customerName || order.customer?.name || '',
                  visitDate: bookingData.scheduledAt || admin.firestore.Timestamp.now(),
                  sendAt: admin.firestore.Timestamp.fromDate(sendAt),
                  stage: 'subscriber_first_visit',
                  status: 'pending',
                  lang: order.lang || 'et',
                  size: order.size || 'medium',
                  packageType: order.package,
                  referralCode: order.referralCode || null,  // Include referral code for email
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`Subscriber first-visit follow-up created for ${bookingData.customerEmail}`);
              } else if (isGiftRedeemed) {
                // Gift recipients already have their follow-up sequence from bookGiftVisit
                console.log('Gift booking completed — follow-up sequence already exists');
              }
            }
          }
        } catch (followupErr) {
          console.error('Post-visit follow-up creation failed (non-fatal):', followupErr);
        }

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
        const isSubscription = order.type === 'subscription';

        // 1. Handle bookings
        let cancelledBookings = 0;
        let keptBookings = 0;
        const bookingsSnapshot = await db.collection('bookings')
          .where('orderId', '==', orderId)
          .where('status', '==', 'scheduled')
          .get();

        // For subscriptions: get current period end to decide which bookings to keep
        let periodEnd = null;
        if (isSubscription && order.stripeSubscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(order.stripeSubscriptionId);
            periodEnd = new Date(sub.current_period_end * 1000);
          } catch (e) {
            console.error('Could not retrieve subscription period:', e);
          }
        }

        for (const bookingDoc of bookingsSnapshot.docs) {
          const booking = bookingDoc.data();
          const bookingDate = booking.scheduledAt?.toDate?.() || null;

          // For subscriptions with cancel_at_period_end:
          // Keep bookings that are WITHIN the paid period, cancel the rest
          if (isSubscription && periodEnd && bookingDate && bookingDate <= periodEnd) {
            keptBookings++;
            console.log(`Keeping booking ${bookingDoc.id} (within paid period, scheduled ${bookingDate.toISOString()})`);
            continue; // Don't cancel - customer paid for this period
          }

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
        if (isSubscription && order.stripeSubscriptionId && order.subscriptionStatus === 'active') {
          // Subscriptions: cancel at period end (customer gets current paid period service)
          try {
            await stripe.subscriptions.update(order.stripeSubscriptionId, {
              cancel_at_period_end: true,
            });
            console.log('Stripe subscription set to cancel at period end:', order.stripeSubscriptionId);
          } catch (stripeError) {
            console.error('Stripe cancel failed (continuing):', stripeError);
          }
        }
        // Note: gifts are one-time payments - no Stripe action needed (refund must be done manually)

        // 3. Update order status
        await orderRef.update({
          status: isSubscription ? 'cancelling' : 'cancelled',
          subscriptionStatus: isSubscription ? 'cancelling' : (order.subscriptionStatus || null),
          cancelReason: reason || null,
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(periodEnd && { currentPeriodEnd: periodEnd }),
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

        res.status(200).json({
          success: true,
          orderId,
          cancelledBookings,
          keptBookings,
          type: order.type,
          periodEnd: periodEnd ? periodEnd.toISOString() : null,
        });
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
 * Calendar event download (.ics)
 * Serves an iCalendar file for Apple Calendar, Outlook etc.
 * GET /api/calendar?title=...&start=...&end=...&description=...&location=...
 */
exports.calendarEvent = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, () => {
      const { title, start, end, description, location } = req.query;

      if (!start || !end) {
        return res.status(400).send('Missing start or end parameter');
      }

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).send('Invalid date format');
      }

      const fmtICS = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const uid = `sukoda-${startDate.getTime()}@sukoda.ee`;
      const now = fmtICS(new Date());

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SUKODA//Calendar//ET',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${fmtICS(startDate)}`,
        `DTEND:${fmtICS(endDate)}`,
        `SUMMARY:${(title || 'SUKODA koduhoolitsus').replace(/[,;]/g, '\\$&')}`,
        `DESCRIPTION:${(description || '').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')}`,
        `LOCATION:${(location || '').replace(/[,;]/g, '\\$&')}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        'DESCRIPTION:SUKODA koduhoolitsus 1h pärast',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      res.set('Content-Type', 'text/calendar; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="sukoda-visit.ics"');
      return res.status(200).send(icsContent);
    });
  });

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

// ============================================================
// GIFT REDEMPTION & PUBLIC BOOKING
// ============================================================

/**
 * Redeem a gift code - returns order details for the gift recipient
 * GET /api/redeem?code=SUKO-XXXX-XXXX
 */
exports.redeemGift = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      // Normalize confused characters: 0→O, 1→I (gift codes never use 0, 1, I, O in random part, but prefix is SUKO-)
      const code = (req.query.code || '').trim().toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I');

      if (!code) {
        return res.status(400).json({ error: 'Missing gift code' });
      }

      try {
        // Search for order with this gift code
        const snapshot = await db.collection('orders')
          .where('giftCode', '==', code)
          .where('type', '==', 'gift')
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(404).json({ error: 'Gift code not found' });
        }

        const doc = snapshot.docs[0];
        const order = doc.data();

        // Check if already redeemed (has a booking)
        if (order.giftRedeemed) {
          return res.status(400).json({ error: 'Gift already redeemed', alreadyRedeemed: true });
        }

        // Check if paid
        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Gift not yet paid' });
        }

        const lang = order.lang || 'et';
        const sizeNames = {
          et: { small: 'kuni 50m²', medium: '51–90m²', large: '91–120m²', xlarge: '121–150m²' },
          en: { small: 'up to 50m²', medium: '51–90m²', large: '91–120m²', xlarge: '121–150m²' },
        };
        const packageNames = {
          et: { moment: 'Üks Hetk', month: 'Kuu Aega', quarter: 'Kvartal Vabadust', harmony: 'Harmoonia', serenity: 'Täielik Rahulolu' },
          en: { moment: 'One Moment', month: 'A Month of Care', quarter: 'Quarter of Freedom', harmony: 'Harmony', serenity: 'Complete Serenity' },
        };
        const packageDescriptions = {
          et: {
            moment: 'Üks täiuslik koduhoolitsus — koristus, värsked lilled, tervituskaart ja magus üllatus.',
            month: 'Kaks koduhoolitsust ühe kuu jooksul — koristus, lilled, puuviljad ja tervituskaart.',
            quarter: 'Kuus koduhoolitsust kolme kuu jooksul — koristus, lilled, puuviljad ja taimede kastmine.',
          },
          en: {
            moment: 'One perfect home care — cleaning, fresh flowers, greeting card and a sweet surprise.',
            month: 'Two home care visits over one month — cleaning, flowers, fruit and a greeting card.',
            quarter: 'Six home care visits over three months — cleaning, flowers, fruit and plant watering.',
          },
        };

        res.status(200).json({
          orderId: doc.id,
          package: order.package,
          size: order.size,
          physicalCard: order.physicalCard || false,
          recipientName: order.recipient?.name || '',
          giftCode: order.giftCode,
          lang,
          packageName: packageNames[lang]?.[order.package] || order.package,
          packageDescription: packageDescriptions[lang]?.[order.package] || '',
          sizeName: sizeNames[lang]?.[order.size] || order.size,
          senderName: order.customer?.name || '',
          message: order.recipient?.message || '',
        });

      } catch (error) {
        console.error('Redeem gift error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Get available time slots for public booking
 * GET /api/slots?size=medium&month=2026-02
 */
exports.getPublicSlots = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      const size = req.query.size || 'medium';
      const month = req.query.month; // e.g. '2026-02'

      const slug = calService.EVENT_TYPE_SLUGS[size];
      if (!slug) {
        return res.status(400).json({ error: 'Invalid size' });
      }

      try {
        // Calculate date range: current month or specified month, up to 4 weeks ahead
        let startDate, endDate;
        if (month) {
          startDate = `${month}-01`;
          // End of month + some buffer
          const d = new Date(startDate);
          d.setMonth(d.getMonth() + 1);
          d.setDate(d.getDate() + 7); // 1 week into next month
          endDate = d.toISOString().split('T')[0];
        } else {
          const now = new Date();
          startDate = now.toISOString().split('T')[0];
          const end = new Date(now);
          end.setDate(end.getDate() + 28);
          endDate = end.toISOString().split('T')[0];
        }

        const allSlots = await calService.getAvailableSlots(slug, startDate, endDate);

        // Group slots by date and extract just the time
        const grouped = {};
        for (const slot of allSlots) {
          const date = slot.date || slot.time.split('T')[0];
          if (!grouped[date]) grouped[date] = [];
          // Convert to HH:MM in Tallinn timezone
          const dt = new Date(slot.time);
          const timeStr = dt.toLocaleTimeString('et-EE', { 
            timeZone: 'Europe/Tallinn', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false,
          });
          grouped[date].push(timeStr);
        }

        // Sort times within each date
        for (const date of Object.keys(grouped)) {
          grouped[date].sort();
        }

        res.status(200).json({ slots: grouped });

      } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Book a visit for a gift recipient
 * POST /api/book-gift
 * Body: { code, startTime, email, phone, address, additionalInfo }
 */
exports.bookGiftVisit = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { code, startTime, email, phone, address, additionalInfo } = req.body;

      if (!code || !startTime || !email || !address) {
        return res.status(400).json({ error: 'Missing required fields: code, startTime, email, address' });
      }

      try {
        // Find and validate gift order (normalize 0→O, 1→I to handle common typos)
        const normalizedCode = code.trim().toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I');
        const snapshot = await db.collection('orders')
          .where('giftCode', '==', normalizedCode)
          .where('type', '==', 'gift')
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(404).json({ error: 'Gift code not found' });
        }

        const doc = snapshot.docs[0];
        const order = doc.data();

        if (order.giftRedeemed) {
          return res.status(400).json({ error: 'Gift already redeemed' });
        }

        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Gift not yet paid' });
        }

        // Size is always locked at purchase (both regular gifts and physical cards)
        const effectiveSize = order.size || 'medium';
        const slug = calService.EVENT_TYPE_SLUGS[effectiveSize] || 'koristus-90';
        const recipientName = order.recipient?.name || 'Kingisaaja';

        // Create booking via Cal.com
        const booking = await calService.createBooking(slug, startTime, {
          name: recipientName,
          email: email,
          phone: phone || '',
          address: address,
        }, {
          source: 'sukoda-gift-redeem',
          giftCode: code,
          orderId: doc.id,
          additionalInfo: additionalInfo || '',
        });

        // Update Firestore order
        await doc.ref.update({
          giftRedeemed: true,
          giftRedeemedAt: admin.firestore.FieldValue.serverTimestamp(),
          'recipient.email': email,
          'recipient.phone': phone || '',
          'recipient.address': address,
          'recipient.additionalInfo': additionalInfo || '',
          'booking': {
            uid: booking.uid || booking.id,
            startTime: startTime,
            createdAt: new Date().toISOString(),
          },
        });

        // Create follow-up email sequence for conversion (24h, 7d, 30d after visit)
        try {
          await createFollowupSequence({
            orderId: doc.id,
            recipientEmail: email,
            recipientName: order.recipient?.name || '',
            bookingStartTime: startTime,
            lang: order.lang || 'et',
            size: order.size || 'medium',
          });
        } catch (followupError) {
          // Don't fail the booking if follow-up creation fails
          console.error('Follow-up sequence creation failed (non-fatal):', followupError);
        }

        // Format date for response
        const bookingDate = new Date(startTime);
        const dateStr = bookingDate.toLocaleDateString('et-EE', {
          timeZone: 'Europe/Tallinn',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = bookingDate.toLocaleTimeString('et-EE', {
          timeZone: 'Europe/Tallinn',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        res.status(200).json({
          success: true,
          bookingDate: dateStr,
          bookingTime: timeStr,
        });

      } catch (error) {
        console.error('Book gift visit error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Book a visit for a subscription customer
 * POST /api/book-subscription
 * Body: { orderId, startTime }
 */
exports.bookSubscriptionVisit = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { orderId, startTime } = req.body;

      if (!orderId || !startTime) {
        return res.status(400).json({ error: 'Missing required fields: orderId, startTime' });
      }

      try {
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();

        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Order not paid' });
        }

        if (order.type !== 'subscription' && order.type !== 'test') {
          return res.status(400).json({ error: 'Not a subscription order' });
        }

        // Check if already booked
        if (order.booking?.uid) {
          return res.status(400).json({ error: 'Already booked', alreadyBooked: true });
        }

        const slug = calService.EVENT_TYPE_SLUGS[order.size] || 'koristus-90';
        const customer = order.customer || {};

        // Create booking via Cal.com
        const booking = await calService.createBooking(slug, startTime, {
          name: customer.name || 'Klient',
          email: customer.email || '',
          phone: customer.phone || '',
          address: customer.address || '',
        }, {
          source: 'sukoda-subscription-booking',
          orderId: orderId,
          additionalInfo: customer.additionalInfo || '',
        });

        // Update Firestore order
        await orderDoc.ref.update({
          'booking': {
            uid: booking.uid || booking.id,
            startTime: startTime,
            createdAt: new Date().toISOString(),
          },
        });

        // Format date for response
        const bookingDate = new Date(startTime);
        const dateStr = bookingDate.toLocaleDateString('et-EE', {
          timeZone: 'Europe/Tallinn',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = bookingDate.toLocaleTimeString('et-EE', {
          timeZone: 'Europe/Tallinn',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

        res.status(200).json({
          success: true,
          bookingDate: dateStr,
          bookingTime: timeStr,
        });

      } catch (error) {
        console.error('Book subscription visit error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ============================================================
// PHYSICAL GIFT CARD CODE GENERATION
// ============================================================

/**
 * Admin: Generate physical gift card codes in bulk
 * These create pre-paid order documents in Firestore that work
 * with the existing /api/redeem and lunasta.html flow.
 *
 * Size is NOT locked at generation — the recipient chooses their
 * home size when redeeming at sukoda.ee/lunasta. This makes cards
 * universal: one "Üks Hetk" card works for any apartment size.
 *
 * POST /api/admin/generate-gift-cards
 * Body: { password, count, package, batchName }
 *
 * - count: number of codes to generate (1-200)
 * - package: 'moment' (default), 'month', 'quarter'
 * - size: 'small', 'medium' (default), 'large', 'xlarge' — locked at purchase
 * - batchName: optional label, e.g. 'Printon Feb 2026'
 */
exports.generatePhysicalGiftCards = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const adminPassword = process.env.ADMIN_PASSWORD || functions.config().admin?.password;
      const { password, count = 10, package: pkg = 'moment', size = 'medium', batchName = '', buyer = {} } = req.body;
      // buyer: { name, email, company } — who purchased these cards (agent/office)

      if (password !== adminPassword) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const numCards = Math.min(Math.max(parseInt(count) || 10, 1), 200);
      const validPackages = ['moment', 'month', 'quarter'];
      const validSizes = ['small', 'medium', 'large', 'xlarge'];

      if (!validPackages.includes(pkg)) {
        return res.status(400).json({ error: `Invalid package. Must be one of: ${validPackages.join(', ')}` });
      }
      if (!validSizes.includes(size)) {
        return res.status(400).json({ error: `Invalid size. Must be one of: ${validSizes.join(', ')}` });
      }

      try {
        const batchId = `PRINT-${Date.now()}`;
        const codes = [];
        const batch = db.batch();

        for (let i = 0; i < numCards; i++) {
          // Generate unique code
          let code;
          let attempts = 0;
          do {
            code = generateGiftCode();
            attempts++;
            if (attempts > 50) throw new Error('Could not generate unique code');
            const existing = await db.collection('orders')
              .where('giftCode', '==', code)
              .limit(1)
              .get();
            if (existing.empty) break;
          } while (true);

          const orderRef = db.collection('orders').doc();
          batch.set(orderRef, {
            type: 'gift',
            package: pkg,
            size: size,              // Size locked at purchase — determines service price
            customer: {
              name: 'SUKODA (Physical Card)',
              email: 'tere@sukoda.ee',
            },
            recipient: {
              name: '',
              email: '',
              message: '',
            },
            deliveryMethod: 'physical',
            giftCode: code,
            lang: 'et',
            status: 'paid',
            physicalCard: true,
            batchId: batchId,
            batchName: batchName || `Physical cards ${new Date().toISOString().slice(0, 10)}`,
            buyer: {
              name: buyer.name || '',
              email: buyer.email || '',
              company: buyer.company || '',
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          codes.push({
            code: code,
            orderId: orderRef.id,
          });
        }

        await batch.commit();

        console.log(`Generated ${codes.length} physical gift card codes (${pkg}, ${size}). Batch: ${batchId}`);

        res.status(200).json({
          success: true,
          batchId,
          package: pkg,
          size: size,
          buyer: buyer.name || buyer.company || 'N/A',
          count: codes.length,
          codes: codes,
          redeemUrl: 'https://sukoda.ee/lunasta.html',
        });

      } catch (error) {
        console.error('Generate physical gift cards error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });


/**
 * Gift Card Size Upgrade — creates a Stripe Checkout session for the price difference
 * when a gift recipient's home is bigger than what was originally paid for.
 *
 * POST /api/gift-upgrade
 * Body: { code, newSize }
 *
 * Returns: { url } — Stripe Checkout URL to pay the difference
 */

// Gift prices in cents for upgrade calculation
const GIFT_PRICES_CENTS = {
  moment: { small: 16900, medium: 19900, large: 25900, xlarge: 31900 },
  month:  { small: 33900, medium: 38900, large: 49900, xlarge: 61900 },
  quarter:{ small: 84900, medium: 99900, large: 124900, xlarge: 144900 },
};

// Size ordering for validation (can only upgrade UP)
const SIZE_ORDER = { small: 0, medium: 1, large: 2, xlarge: 3 };
const SIZE_LABELS = { small: 'kuni 50m²', medium: '51–90m²', large: '91–120m²', xlarge: '121–150m²' };

exports.createGiftUpgrade = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { code, newSize } = req.body;

      if (!code || !newSize) {
        return res.status(400).json({ error: 'Missing required fields: code, newSize' });
      }

      const validSizes = ['small', 'medium', 'large', 'xlarge'];
      if (!validSizes.includes(newSize)) {
        return res.status(400).json({ error: 'Invalid size' });
      }

      try {
        // Find the gift order
        const normalizedCode = code.trim().toUpperCase().replace(/0/g, 'O').replace(/1/g, 'I');
        const snapshot = await db.collection('orders')
          .where('giftCode', '==', normalizedCode)
          .where('type', '==', 'gift')
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(404).json({ error: 'Gift code not found' });
        }

        const doc = snapshot.docs[0];
        const order = doc.data();

        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Gift not active' });
        }

        if (order.giftRedeemed) {
          return res.status(400).json({ error: 'Gift already redeemed — contact tere@sukoda.ee for help' });
        }

        const currentSize = order.size;
        const pkg = order.package;

        // Validate upgrade direction
        if (SIZE_ORDER[newSize] <= SIZE_ORDER[currentSize]) {
          return res.status(400).json({ error: 'New size must be larger than current size' });
        }

        // Calculate price difference
        const currentPrice = GIFT_PRICES_CENTS[pkg]?.[currentSize];
        const newPrice = GIFT_PRICES_CENTS[pkg]?.[newSize];

        if (!currentPrice || !newPrice) {
          return res.status(400).json({ error: 'Price not found for this package/size combination' });
        }

        const diffCents = newPrice - currentPrice;

        if (diffCents <= 0) {
          return res.status(400).json({ error: 'No upgrade needed' });
        }

        const pkgNames = { moment: 'Üks Hetk', month: 'Kuu Aega', quarter: 'Kvartal Vabadust' };

        // Create Stripe Checkout session for the difference
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'eur',
              unit_amount: diffCents,
              product_data: {
                name: `SUKODA kinkekaardi suuruse täiendus`,
                description: `${pkgNames[pkg] || pkg}: ${SIZE_LABELS[currentSize]} → ${SIZE_LABELS[newSize]}`,
              },
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${req.headers.origin || 'https://sukoda.ee'}/lunasta.html?code=${encodeURIComponent(normalizedCode)}&upgraded=true`,
          cancel_url: `${req.headers.origin || 'https://sukoda.ee'}/lunasta.html?code=${encodeURIComponent(normalizedCode)}&upgrade_cancelled=true`,
          metadata: {
            type: 'gift_upgrade',
            order_id: doc.id,
            gift_code: normalizedCode,
            old_size: currentSize,
            new_size: newSize,
          },
          locale: 'et',
        });

        res.status(200).json({
          url: session.url,
          diffEur: (diffCents / 100).toFixed(2),
          oldSize: SIZE_LABELS[currentSize],
          newSize: SIZE_LABELS[newSize],
        });

      } catch (error) {
        console.error('Gift upgrade error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });
