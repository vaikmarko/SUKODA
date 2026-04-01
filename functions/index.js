/**
 * SUKODA Firebase Cloud Functions
 *
 * Setup: see SETUP.md
 * Shared config extracted to ./lib/config.js
 */

const {
  functions, admin, cors, db, SECRETS,
  getStripe, getResend, NOTIFICATION_EMAIL,
  MIN_BOOKING_LEAD_HOURS, LAUNCH_DATE,
  authenticateAdmin, checkRateLimit,
} = require('./lib/config');
const calService = require('./cal-service');
const { checkoutSchema, waitlistSchema, bookGiftSchema, bookSubscriptionSchema, giftUpgradeSchema, estateInquirySchema, salesInquirySchema, validate } = require('./lib/schemas');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    reminderAccessNote: 'Palun jäta meile ligipääs kodule. Kui vajad aega muuta, kirjuta meile aadressil tere@sukoda.ee või halda oma broneeringut aadressil sukoda.ee/minu.',
    homeProfileNote: 'Täida oma koduprofiil — sissepääsu info, lemmikloomad, allergeenid, lillede eelistus ja erisoovid. Nii saame pakkuda just sulle sobivat teenust:',
    homeProfileBtn: 'TÄIDA KODUPROFIIL',

    // Next visit email
    nextVisitTitle: 'Järgmine külastus on paigas',
    nextVisitIntro: (name) => name
      ? `Tere, ${name}. Oleme sinu järgmise koduhoolitsuse aja paika pannud.`
      : 'Oleme sinu järgmise koduhoolitsuse aja paika pannud.',
    nextVisitTimeLabel: 'Kinnitatud aeg',
    nextVisitPackageLabel: 'Pakett',
    nextVisitReschedule: 'Kui see aeg ei sobi, kirjuta meile ja leiame parema. Saadame meeldetuletuse päev enne külastust.',

    // Booking confirmation email
    subjectBookingConfirmed: 'SUKODA | Sinu aeg on kinnitatud',
    bookingConfirmedTitle: 'Sinu aeg on kinnitatud',
    bookingConfirmedIntro: (name) => name
      ? `Tere, ${name}. Sinu koduhoolitsuse aeg on broneeritud.`
      : 'Sinu koduhoolitsuse aeg on broneeritud.',
    bookingConfirmedTimeLabel: 'Sinu külastus',
    bookingConfirmedNote: 'Saadame meeldetuletuse päev enne külastust. Palun jäta meile ligipääs kodule.',
    bookingConfirmedChangeNote: 'Kui vajad aega muuta, kirjuta meile aadressil tere@sukoda.ee.',
    bookingConfirmedPortalNote: 'Sinu isiklikus portaalis saad hallata broneeringuid, muuta aega ja täita koduprofiili — sissepääsu info, lemmikloomad, allergeenid, lillede eelistus ja erisoovid. Nii saame pakkuda just sulle sobivat teenust.',
    bookingConfirmedPortalBtn: 'MINU SUKODA',

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
    subscriberFirstVisitIntro: (name, visitDateStr) => {
      const when = visitDateStr || 'eile';
      return name
        ? `${name}, loodame, et astusid ${when} uksest sisse ja tundsid — keegi on sinu eest hoolitsenud.`
        : `Loodame, et astusid ${when} uksest sisse ja tundsid — keegi on sinu eest hoolitsenud.`;
    },
    subscriberFirstVisitBody: 'See ongi SUKODA mõte. Mitte lihtsalt koristus, vaid tunne. Et kodu ootab sind. Et keegi hoolib.\n\nMe anname alati parima. Ja kui midagi polnud päris nii, nagu ootasid — kirjuta meile. Soovime, et iga külastus oleks just selline, nagu väärid.',
    subscriberFirstVisitNextLabel: 'Sinu järgmine külastus',
    subscriberFirstVisitNextNote: 'Me hoolitseme selle eest, et see tunne kordub. Saadame meeldetuletuse päev enne järgmist külastust.',
    subscriberFirstVisitFeedback: 'Tahaksid midagi öelda? Vasta sellele kirjale — sinu sõnum jõuab otse meie meeskonnale. Iga mõte loeb.',

    // Gift recipient → subscriber follow-up: 24h after visit
    followup24hTitle: 'See tunne.',
    followup24hIntro: (name, visitDateStr) => {
      const when = visitDateStr ? `seda päeva (${visitDateStr})` : 'eilset';
      return name
        ? `${name} — mäletad ${when}? Astusid uksest sisse ja kõik oli lihtsalt... paigas.`
        : `Mäletad ${when}? Astusid uksest sisse ja kõik oli lihtsalt... paigas.`;
    },
    followup24hBody: 'Lilled vaasis. Puhas kodu. See vaikne rahu, mis tuleb teadmisest, et keegi on sinu eest hoolitsenud.',
    followup24hBody2: 'Kujuta ette, et see tunne ootab sind iga kord, kui koju jõuad.',
    followup24hOfferTitle: 'Ainult sulle',
    followup24hOfferText: 'Esimesed 3 kuud SUKODA püsiteenust -20%. Sest see tunne ei pea olema ühekordne.',
    followup24hOfferCode: 'KINGITUS20',
    followup24hOfferNote: 'Pakkumine kehtib 30 päeva.',
    followup24hCta: 'ALUSTA SIIT',

    // Multi-visit gift: 24h/7d/30d — no conversion, just warmth + next visit info
    giftMulti24hIntro: (name, visitDateStr) => {
      const when = visitDateStr ? `seda päeva (${visitDateStr})` : 'eilset';
      return name
        ? `${name} — mäletad ${when}? Astusid uksest sisse ja kõik oli lihtsalt... paigas.`
        : `Mäletad ${when}? Astusid uksest sisse ja kõik oli lihtsalt... paigas.`;
    },
    giftMulti24hBody: 'Lilled vaasis. Puhas kodu. See vaikne rahu, mis tuleb teadmisest, et keegi on sinu eest hoolitsenud.',
    giftMulti24hNextTitle: 'Sinu kingitus jätkub',
    giftMulti24hNextNote: (remaining) => `Sul on veel ${remaining} külastus${remaining > 1 ? 't' : ''} ees. Järgmine kord on sama eriline.`,
    giftMulti24hProfileNote: 'Kui soovid järgmisel korral midagi teisiti, lisa oma soovid ja eelistused siia:',
    giftMulti24hProfileBtn: 'MINU KODU',
    giftMulti7dTitle: 'Kas mäletad seda tunnet?',
    giftMulti7dIntro: (name) => name
      ? `${name}, nädal tagasi oli sinu kodu teistsugune.`
      : 'Nädal tagasi oli sinu kodu teistsugune.',
    giftMulti7dBody: 'Puhas. Lilled vaasis. Väike üllatus laual. Ja see tunne kordub — sinu kingitus jätkub.',
    giftMulti7dProfileNote: 'Soovid järgmisel korral midagi teisiti? Lisa oma eelistused:',
    giftMulti30dTitle: 'Sinu järgmine külastus ootab.',
    giftMulti30dIntro: (name) => name
      ? `${name}, sinu kingitus pole veel läbi.`
      : 'Sinu kingitus pole veel läbi.',
    giftMulti30dBody: 'Sul on veel külastusi ees. Iga kord sama hoolega — lilled, puhtus, üllatus. Sest sa väärid seda.',

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
      quarter: { name: 'Kvartal Vabadust', description: 'Kuus koduhoolitsust kolme kuu jooksul', includes: ['6× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Hooajalised puuviljad', 'Premium koduhooldus'] },
      once: { name: '1× kuus', description: 'Üks külastus kuus' },
      twice: { name: '2× kuus', description: 'Kaks külastust kuus' },
      weekly: { name: '4× kuus', description: 'Neli külastust kuus' },
      test: { name: 'Test €1', description: 'Testtellimus' },
    },
    sizes: { small: '1-2 tuba', medium: '3 tuba', large: '4 tuba' },
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
    reminderAccessNote: 'Please ensure we have access to your home. If you need to change the time, contact us at tere@sukoda.ee or manage your booking at sukoda.ee/minu.',
    homeProfileNote: 'Fill in your home profile — access info, pets, allergies, flower preferences and special requests. This helps us provide the best service for you:',
    homeProfileBtn: 'FILL HOME PROFILE',

    nextVisitTitle: 'Your next visit is scheduled',
    nextVisitIntro: (name) => name
      ? `Hello, ${name}. We have scheduled your next home care visit.`
      : 'We have scheduled your next home care visit.',
    nextVisitTimeLabel: 'Confirmed time',
    nextVisitPackageLabel: 'Package',
    nextVisitReschedule: 'If this time doesn\'t work, contact us and we\'ll find a better one. We\'ll send a reminder the day before your visit.',

    // Booking confirmation email
    subjectBookingConfirmed: 'SUKODA | Your time is confirmed',
    bookingConfirmedTitle: 'Your time is confirmed',
    bookingConfirmedIntro: (name) => name
      ? `Hello, ${name}. Your home care visit has been booked.`
      : 'Your home care visit has been booked.',
    bookingConfirmedTimeLabel: 'Your visit',
    bookingConfirmedNote: 'We\'ll send a reminder the day before your visit. Please ensure we have access to your home.',
    bookingConfirmedChangeNote: 'If you need to change the time, contact us at tere@sukoda.ee.',
    bookingConfirmedPortalNote: 'In your personal portal you can manage bookings, reschedule visits and fill in your home profile — access info, pets, allergies, flower preferences and special requests. This helps us provide the best service for you.',
    bookingConfirmedPortalBtn: 'MY SUKODA',

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
    subscriberFirstVisitIntro: (name, visitDateStr) => {
      const when = visitDateStr || 'yesterday';
      return name
        ? `${name}, we hope you walked through the door ${when} and felt it — someone had taken care of you.`
        : `We hope you walked through the door ${when} and felt it — someone had taken care of you.`;
    },
    subscriberFirstVisitBody: 'That\'s what SUKODA is about. Not just cleaning, but a feeling. That your home is waiting for you. That someone cares.\n\nWe always give our best. And if something wasn\'t quite right — write to us. We want every visit to be exactly what you deserve.',
    subscriberFirstVisitNextLabel: 'Your next visit',
    subscriberFirstVisitNextNote: 'We\'ll make sure that feeling returns. We\'ll send a reminder the day before your next visit.',
    subscriberFirstVisitFeedback: 'Want to share something? Reply to this email — your message goes straight to our team. Every thought matters.',

    // Gift recipient → subscriber follow-up: 24h after visit
    followup24hTitle: 'That feeling.',
    followup24hIntro: (name, visitDateStr) => {
      const when = visitDateStr ? `that day (${visitDateStr})` : 'yesterday';
      return name
        ? `${name} — remember ${when}? You walked through the door and everything was simply... right.`
        : `Remember ${when}? You walked through the door and everything was simply... right.`;
    },
    followup24hBody: 'Flowers in a vase. A clean home. That quiet peace of knowing someone took care of you.',
    followup24hBody2: 'Imagine that feeling waiting for you every time you come home.',
    followup24hOfferTitle: 'Just for you',
    followup24hOfferText: 'Your first 3 months of SUKODA at 20% off. Because that feeling doesn\'t have to be a one-time thing.',
    followup24hOfferCode: 'KINGITUS20',
    followup24hOfferNote: 'Offer valid for 30 days.',
    followup24hCta: 'START HERE',

    // Multi-visit gift: 24h/7d/30d — no conversion, just warmth + next visit info
    giftMulti24hIntro: (name, visitDateStr) => {
      const when = visitDateStr ? `that day (${visitDateStr})` : 'yesterday';
      return name
        ? `${name} — remember ${when}? You walked through the door and everything was simply... right.`
        : `Remember ${when}? You walked through the door and everything was simply... right.`;
    },
    giftMulti24hBody: 'Flowers in a vase. A clean home. That quiet peace of knowing someone took care of you.',
    giftMulti24hNextTitle: 'Your gift continues',
    giftMulti24hNextNote: (remaining) => `You still have ${remaining} visit${remaining > 1 ? 's' : ''} ahead. The next one will be just as special.`,
    giftMulti24hProfileNote: 'If you\'d like something different next time, add your preferences here:',
    giftMulti24hProfileBtn: 'MY HOME',
    giftMulti7dTitle: 'Do you remember that feeling?',
    giftMulti7dIntro: (name) => name
      ? `${name}, a week ago your home was different.`
      : 'A week ago, your home was different.',
    giftMulti7dBody: 'Clean. Flowers in a vase. A little surprise on the table. And that feeling will return — your gift continues.',
    giftMulti7dProfileNote: 'Want something different next time? Add your preferences:',
    giftMulti30dTitle: 'Your next visit awaits.',
    giftMulti30dIntro: (name) => name
      ? `${name}, your gift isn't over yet.`
      : 'Your gift isn\'t over yet.',
    giftMulti30dBody: 'You still have visits ahead. Each one with the same care — flowers, cleanliness, a surprise. Because you deserve it.',

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
      quarter: { name: 'Quarter of Freedom', description: 'Six home care visits over three months', includes: ['6× deep cleaning', 'Fresh flowers each time', 'Handwritten cards', 'Seasonal fruits', 'Premium home care'] },
      once: { name: '1× month', description: 'One visit per month' },
      twice: { name: '2× month', description: 'Two visits per month' },
      weekly: { name: '4× month', description: 'Four visits per month' },
      test: { name: 'Test €1', description: 'Test order' },
    },
    sizes: { small: '1-2 rooms', medium: '3 rooms', large: '4 rooms' },
  },
};

/** Get translation texts for a language */
function tx(lang) {
  return EMAIL_TEXTS[lang] || EMAIL_TEXTS['et'];
}

const TALLINN_TIME_ZONE = 'Europe/Tallinn';

function parseOffsetMinutes(offsetLabel) {
  const match = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(offsetLabel || '');
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || '0');
  return sign * ((hours * 60) + minutes);
}

function getTimeZoneOffsetMinutes(date, timeZone = TALLINN_TIME_ZONE) {
  const d = date instanceof Date ? date : new Date(date);
  const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const offsetLabel = offsetFormatter.formatToParts(d).find((part) => part.type === 'timeZoneName')?.value;
  const parsedOffset = parseOffsetMinutes(offsetLabel);
  if (parsedOffset !== null) return parsedOffset;

  const parts = tallinnParts(d);
  const asUtcMs = Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0);
  return Math.round((asUtcMs - d.getTime()) / 60000);
}

function tallinnLocalDateTimeToISOString(dateStr, timeStr) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr || '');
  if (!dateMatch || !timeMatch) {
    throw new Error('Invalid Tallinn date/time');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const wallClockUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  let resolvedMs = wallClockUtcMs;
  for (let i = 0; i < 4; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(resolvedMs), TALLINN_TIME_ZONE);
    const nextMs = wallClockUtcMs - (offsetMinutes * 60 * 1000);
    if (nextMs === resolvedMs) break;
    resolvedMs = nextMs;
  }

  const candidates = Array.from(new Set([
    resolvedMs,
    resolvedMs - (60 * 60 * 1000),
    resolvedMs + (60 * 60 * 1000),
  ])).filter((candidateMs) => {
    const p = tallinnParts(new Date(candidateMs));
    return (
      p.year === year &&
      p.month === month - 1 &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    );
  }).sort((a, b) => a - b);

  if (candidates.length === 0) {
    throw new Error('Invalid Tallinn local time');
  }

  return new Date(candidates[0]).toISOString();
}

/** Parse a date into its Europe/Tallinn components */
function tallinnParts(date) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Tallinn',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short',
    hour12: false,
  });
  const parts = {};
  for (const { type, value } of fmt.formatToParts(d)) {
    parts[type] = value;
  }
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month) - 1,
    day: parseInt(parts.day),
    weekday: wdMap[parts.weekday] ?? d.getDay(),
    hour: parseInt(parts.hour === '24' ? '0' : parts.hour),
    minute: parseInt(parts.minute),
  };
}

/** Format date in the correct language (Europe/Tallinn timezone) */
function formatDate(date, lang) {
  const p = tallinnParts(date);
  const t = tx(lang);
  if (lang === 'en') {
    return `${t.days[p.weekday]}, ${t.months[p.month]} ${p.day}, ${p.year}`;
  }
  return `${t.days[p.weekday]}, ${p.day}. ${t.months[p.month]} ${p.year}`;
}

/** Format time in Europe/Tallinn timezone */
function formatTime(date) {
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('et-EE', {
    timeZone: 'Europe/Tallinn',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Returns null if the visit was "yesterday" (email sent next day), or a formatted
 * date string if more time has passed — so email copy can say "eile" vs the actual date.
 */
function getVisitDateLabel(visitDate, lang) {
  if (!visitDate) return null;
  const vd = visitDate instanceof Date ? visitDate : visitDate.toDate ? visitDate.toDate() : new Date(visitDate);
  const now = new Date();
  const diffMs = now.getTime() - vd.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 2) return null; // "yesterday" is fine
  return formatDate(vd, lang);
}

/** Total visits included in a gift package (multi-visit gifts skip conversion emails) */
const GIFT_VISIT_COUNTS = { moment: 1, month: 2, quarter: 6 };

function isMultiVisitGift(giftPackage) {
  return giftPackage && (GIFT_VISIT_COUNTS[giftPackage] || 0) > 1;
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
        <a href="${icsUrl}" style="display: inline-block; padding: 10px 20px; background: #FFFFFF; border: 1px solid #E8E3DD; color: #2C2824; text-decoration: none; font-size: 13px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin-bottom: 8px;">
          ${t.calendarApple} / Outlook &rarr;
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
  },
  gifts: {
    moment: {
      small: 'price_1T51LQEoH1b07UGQXIx58Ipf',   // €219
      medium: 'price_1T51LQEoH1b07UGQs6SVNha0',  // €279
      large: 'price_1T51LQEoH1b07UGQrRB2dK4y',   // €349
    },
    month: {
      small: 'price_1T51LREoH1b07UGQmq2lmlqR',   // €419
      medium: 'price_1T51LREoH1b07UGQZqOx9ixS',  // €519
      large: 'price_1T51LSEoH1b07UGQUhpp0B8u',   // €649
    },
    quarter: {
      small: 'price_1T51LSEoH1b07UGQJNJkNsH5',   // €1099
      medium: 'price_1T51LTEoH1b07UGQmBbzkp04',  // €1349
      large: 'price_1T51LTEoH1b07UGQWt1dkflE',   // €1699
    },
  },
  subscriptions: {
    once: {
      small: 'price_1T5AJyEoH1b07UGQeSWsu5I0',   // €199/kuu
      medium: 'price_1T51LUEoH1b07UGQPsUzybQS',  // €229/kuu
      large: 'price_1T51LUEoH1b07UGQs0BYqLx2',   // €289/kuu
    },
    twice: {
      small: 'price_1T51LVEoH1b07UGQp5MscEFb',   // €319/kuu
      medium: 'price_1T51LVEoH1b07UGQg8c4tW5t',  // €399/kuu
      large: 'price_1T51LVEoH1b07UGQrFg16Y7y',   // €499/kuu
    },
    weekly: {
      small: 'price_1T51LWEoH1b07UGQ4Bh1ig1o',   // €579/kuu
      medium: 'price_1T51LWEoH1b07UGQ9NLtoAgb',  // €719/kuu
      large: 'price_1T51LXEoH1b07UGQmVNjYRf6',   // €899/kuu
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
    includes: ['6× põhjalik koristus', 'Värsked lilled igal korral', 'Käsitsi kirjutatud kaardid', 'Hooajalised puuviljad', 'Premium koduhooldus'],
  },
  once: { name: '1× kuus', description: 'Üks külastus kuus' },
  twice: { name: '2× kuus', description: 'Kaks külastust kuus' },
  weekly: { name: '4× kuus', description: 'Neli külastust kuus' },
  test: { name: 'Test €1', description: 'Testtellimus' },
};

const SIZE_NAMES = {
  small: '1-2 tuba',
  medium: '3 tuba',
  large: '4 tuba',
};

// Size to Cal.eu calendar mapping
const SIZE_CALENDAR_CODES = {
  small: '50',
  medium: '90',
  large: '120',
};

/**
 * Generate unique gift code
 */
async function generateGiftCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = 'SUKO-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await db.collection('orders').where('giftCode', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error('Failed to generate unique gift code after 5 attempts');
}

/**
 * Normalize user-typed gift code input.
 * Old format: SUKO-XXXX-XXXX (0→O, 1→I everywhere is safe)
 * New format: SK169-XXXX-XXXX (digits in prefix must stay, only normalize random part)
 */
function normalizeGiftInput(raw) {
  const code = (raw || '').trim().toUpperCase();
  const skPriceMatch = code.match(/^(SK\d+-)([\S]+)$/);
  if (skPriceMatch) {
    return skPriceMatch[1] + skPriceMatch[2].replace(/0/g, 'O').replace(/1/g, 'I');
  }
  return code.replace(/0/g, 'O').replace(/1/g, 'I');
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'checkout', 10, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const validation = validate(checkoutSchema, req.body);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
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
        const giftCode = type === 'gift' ? await generateGiftCode() : null;

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
          success_url: `${req.headers.origin || 'https://sukoda.ee'}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderRef.id}&size=${sizeCode}`,
          cancel_url: `${req.headers.origin || 'https://sukoda.ee'}/${type === 'gift' ? 'kingitus' : 'index'}?cancelled=true`,
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
            const promoCodes = await getStripe().promotionCodes.list({
              code: 'SOOVITA20',
              active: true,
              limit: 1,
            });
            if (promoCodes.data.length > 0) {
              sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
            } else {
              // Fallback: try KINGITUS20 (same discount)
              const fallbackCodes = await getStripe().promotionCodes.list({
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
            const promoCodes = await getStripe().promotionCodes.list({
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

        const session = await getStripe().checkout.sessions.create(sessionParams);

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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET in function environment');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    let event;

    try {
      event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const eventRef = db.collection('stripeWebhookEvents').doc(event.id);
    try {
      await eventRef.create({
        type: event.type,
        dataObject: event.data.object,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeCreated: event.created || null,
        livemode: !!event.livemode,
        status: 'pending',
      });
    } catch (error) {
      if (isFirestoreAlreadyExistsError(error)) {
        console.log('Duplicate webhook event received, already queued:', event.id);
        return res.status(200).json({ received: true, duplicate: true });
      }
      console.error('Failed to queue Stripe webhook event:', event.id, error);
      return res.status(500).json({ error: 'Failed to queue webhook event' });
    }

    return res.status(200).json({ received: true });
  });

exports.processStripeWebhookEvent = functions
  .runWith({ secrets: SECRETS, failurePolicy: true }).region('europe-west1')
  .firestore.document('stripeWebhookEvents/{eventId}')
  .onCreate(async (snap, context) => {
    const eventId = context.params.eventId;
    const data = snap.data() || {};
    const eventType = data.type;
    const payload = data.dataObject;

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(payload);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(payload);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(payload);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(payload);
          break;
        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      await snap.ref.update({
        status: 'processed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: admin.firestore.FieldValue.delete(),
      });
    } catch (error) {
      console.error('Failed processing Stripe webhook event:', eventId, error);
      await snap.ref.update({
        status: 'failed',
        lastError: String(error && error.message ? error.message : error),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw error;
    }

    return null;
  });

function isFirestoreAlreadyExistsError(error) {
  const msg = String((error && error.message) || '').toLowerCase();
  return error && (error.code === 6 || error.code === 'already-exists' || msg.includes('already exists'));
}

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
    // Idempotency check — skip if order is already paid (webhook retry)
    const existingOrder = await db.collection('orders').doc(orderId).get();
    if (existingOrder.exists && existingOrder.data().status === 'paid') {
      console.log('Order already paid (webhook retry), skipping:', orderId);
      return;
    }

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

    // Generate portal session token for subscriptions
    let portalToken = null;
    if (session.subscription) {
      const crypto = require('crypto');
      portalToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(portalToken).digest('hex');
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 30);
      await db.collection('orders').doc(orderId).update({
        sessionTokenHash: tokenHash,
        sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
      });
    }

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
    await sendAllEmails(order, orderId, portalToken);

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
async function sendAllEmails(order, orderId, portalToken) {
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
  try {
    await sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `SUKODA | Uus ${isGift ? 'kingitus' : 'tellimus'}: ${packageNameET}`,
      html: generateAdminEmail(order, orderId, packageNameET, sizeNameET, isGift),
    });
  } catch (err) {
    console.error('sendAllEmails: admin notification failed:', err);
  }

  await wait(600);

  // 2. Customer confirmation (in customer's language)
  try {
    await sendEmail({
      to: order.customer?.email,
      subject: isGift ? t.subjectGiftOnWay : t.subjectOrderReceived,
      html: generateCustomerEmail(order, orderId, packageName, sizeName, isGift, lang, portalToken),
    });
  } catch (err) {
    console.error('sendAllEmails: customer confirmation failed:', err);
  }

  // 3. Gift card to recipient (if gift + email delivery, in customer's language)
  if (isGift && order.deliveryMethod === 'email' && order.recipient?.email) {
    await wait(600);
    try {
      const pkg = getPackageInfo(order.package, lang);
      await sendEmail({
        to: order.recipient.email,
        subject: t.subjectGiftFrom(order.customer?.name || (lang === 'en' ? 'Someone special' : 'Keegi eriline')),
        html: generateGiftCardEmail(order, pkg, lang),
      });
    } catch (err) {
      console.error('sendAllEmails: gift card email failed:', err);
    }
  }
}

/**
 * Send email via Resend
 */
const EMAIL_FROM = 'SUKODA <tere@sukoda.ee>';

async function sendEmail({ to, subject, html }) {
  // Validate recipient email
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.error('sendEmail: invalid or missing recipient:', to);
    return;
  }

  if (!getResend()) {
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
    const { data, error } = await getResend().emails.send({
      from: EMAIL_FROM,
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
        <tr><td style="padding: 8px 0;"><strong>Nimi:</strong> ${escapeHtml(order.customer?.name || '-')}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>E-post:</strong> ${escapeHtml(order.customer?.email || '-')}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Telefon:</strong> ${escapeHtml(order.customer?.phone || '-')}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Aadress:</strong> ${escapeHtml(order.customer?.address || '-')}</td></tr>
      </table>

      ${isGift ? `
      <h2 style="color: #2C2824; margin-top: 30px; font-weight: 300; font-family: Georgia, 'Times New Roman', serif;">Kingisaaja</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0;"><strong>Nimi:</strong> ${escapeHtml(order.recipient?.name || '-')}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>E-post:</strong> ${escapeHtml(order.recipient?.email || '-')}</td></tr>
        <tr><td style="padding: 8px 0;"><strong>Sõnum:</strong> ${escapeHtml(order.recipient?.message || '-')}</td></tr>
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
 * Generate admin notification email for new BOOKING (not order — this is when someone actually picks a time)
 * Always in Estonian since admin is Estonian-speaking.
 */
function generateAdminBookingEmail({ customerName, customerEmail, customerPhone, address, scheduledAt, size, type, orderId, giftCode, additionalInfo }) {
  const dt = new Date(scheduledAt);
  const dateStr = dt.toLocaleDateString('et-EE', {
    timeZone: 'Europe/Tallinn',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = dt.toLocaleTimeString('et-EE', {
    timeZone: 'Europe/Tallinn',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const sizeName = SIZE_NAMES[size] || size;
  const typeLabel = type === 'gift' ? 'Kinkekaart' : 'Püsitellimus';

  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #2C2824; border-bottom: 2px solid #B8976A; padding-bottom: 10px; font-weight: 300; font-family: Georgia, 'Times New Roman', serif;">
        🗓️ Uus broneering
      </h1>

      <div style="background: #FAF8F5; padding: 20px; margin: 20px 0; border-left: 3px solid #B8976A;">
        <p style="margin: 0 0 8px; font-size: 22px; color: #2C2824; font-family: Georgia, serif;">
          ${dateStr}
        </p>
        <p style="margin: 0; font-size: 28px; color: #B8976A; font-weight: bold;">
          kell ${timeStr}
        </p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Klient</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${escapeHtml(customerName || '-')}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>E-post</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${escapeHtml(customerEmail || '-')}</td>
        </tr>
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Telefon</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${escapeHtml(customerPhone || '-')}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Aadress</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${escapeHtml(address || '-')}</td>
        </tr>
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Suurus</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${sizeName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Tüüp</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${typeLabel}</td>
        </tr>
        ${giftCode ? `
        <tr style="background: #FAF8F5;">
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Kinkekaardi kood</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD; font-family: monospace; color: #B8976A;">${giftCode}</td>
        </tr>
        ` : ''}
        ${additionalInfo ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #E8E3DD;"><strong>Lisainfo</strong></td>
          <td style="padding: 12px; border: 1px solid #E8E3DD;">${escapeHtml(additionalInfo)}</td>
        </tr>
        ` : ''}
      </table>

      ${orderId ? `
      <p style="margin-top: 20px; padding: 15px; background: #FAF8F5; border-left: 2px solid #B8976A;">
        <a href="https://console.firebase.google.com/project/sukoda-77b52/firestore/data/~2Forders~2F${orderId}" 
           style="color: #2C2824;">Vaata tellimust Firebase'is →</a>
      </p>
      ` : ''}

      <p style="color: #8A8578; font-size: 12px; margin-top: 30px;">
        ⚡ Korraldage koristaja: ${dateStr} kell ${timeStr} · ${escapeHtml(address || 'aadress puudub')} · ${sizeName}
      </p>
    </div>
  `;
}

/**
 * Send admin notification about a new booking (reusable helper)
 */
async function sendAdminBookingNotification({ customerName, customerEmail, customerPhone, address, scheduledAt, size, type, orderId, giftCode, additionalInfo }) {
  try {
    const dt = new Date(scheduledAt);
    const dateStr = dt.toLocaleDateString('et-EE', {
      timeZone: 'Europe/Tallinn',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = dt.toLocaleTimeString('et-EE', {
      timeZone: 'Europe/Tallinn',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const typeLabel = type === 'gift' ? 'kinkekaart' : 'tellimus';

    await sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `SUKODA | 🗓️ Uus broneering: ${customerName || 'Klient'} · ${dateStr} kell ${timeStr} (${typeLabel})`,
      html: generateAdminBookingEmail({ customerName, customerEmail, customerPhone, address, scheduledAt, size, type, orderId, giftCode, additionalInfo }),
    });
    console.log('Admin booking notification sent for:', scheduledAt);
  } catch (err) {
    // Non-fatal — don't break the booking flow
    console.error('Failed to send admin booking notification (non-fatal):', err);
  }
}

/**
 * Generate customer confirmation email (i18n)
 * For gift orders: rich preview with gift code, message preview, and what-happens-next
 * For subscriptions: simple confirmation
 */
function generateCustomerEmail(order, orderId, packageName, sizeName, isGift, lang, portalToken) {
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
                  ${t.addressLabel}: <strong style="color: #2C2824; font-weight: 400;">${escapeHtml(order.customer.address)}</strong>
                </p>
              ` : ''}
            </div>
            ${portalToken ? `
            <div style="background: #111111; padding: 28px; margin-bottom: 32px; text-align: center;">
              <p style="margin: 0 0 12px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
                ${lang === 'et' ? 'SINU ISIKLIK PORTAAL' : 'YOUR PERSONAL PORTAL'}
              </p>
              <p style="margin: 0 0 20px 0; color: #8A8578; font-size: 13px; line-height: 1.6;">
                ${lang === 'et' ? 'Halda oma tellimust, täida koduprofiil ja vaata visiite.' : 'Manage your order, fill in your home profile and view visits.'}
              </p>
              <a href="https://sukoda.ee/minu?token=${portalToken}" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 14px 32px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
                ${lang === 'et' ? 'MINU SUKODA' : 'MY SUKODA'}
              </a>
            </div>
            ` : ''}
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
            ${t.customerIntro(true, escapeHtml(order.recipient?.name))}
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
              ${t.recipientLabel}: <strong style="color: #2C2824; font-weight: 400;">${escapeHtml(order.recipient.name)}</strong>
            </p>
          ` : ''}
        </div>

        <!-- Message preview (if they wrote one) -->
        ${order.recipient?.message ? `
        <div style="margin: 0 40px 32px;">
          <p style="margin: 0 0 12px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.giftBuyerYourMessage}</p>
          <div style="background: #FAF8F5; padding: 24px; border-left: 2px solid #B8976A;">
            <p style="font-style: italic; color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; margin: 0; line-height: 1.7;">
              "${escapeHtml(order.recipient.message)}"
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
            <p style="color: #8A8578; font-size: 12px; margin: 0;">${escapeHtml(order.recipient?.name || '')}</p>
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
            <span style="color: #8A8578; font-size: 14px; line-height: 1.5;">${t.giftBuyerStep1(escapeHtml(order.recipient?.name))}</span>
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
          <h3 style="font-size: 26px; color: #2C2824; margin: 0 0 32px 0; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">${escapeHtml(order.recipient?.name || '')}</h3>
          
          ${order.recipient?.message ? `
          <div style="background: #FAF8F5; padding: 28px; margin: 0 0 32px 0; border-left: 2px solid #B8976A;">
            <p style="font-style: italic; color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; margin: 0 0 12px 0; line-height: 1.7;">
              "${escapeHtml(order.recipient.message)}"
            </p>
            <p style="color: #8A8578; font-size: 12px; margin: 0; letter-spacing: 1px;">– ${escapeHtml(order.customer?.name || '')}</p>
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
          <a href="https://sukoda.ee/lunasta?code=${encodeURIComponent(order.giftCode || '')}" 
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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

        const safeCustomer = {
          name: order.customer?.name,
        };
        if (order.customer?.email) {
          const [local, domain] = order.customer.email.split('@');
          safeCustomer.email = local.slice(0, 2) + '***@' + domain;
        }

        res.status(200).json({
          id: orderId,
          type: order.type,
          package: order.package,
          packageType: order.packageType || order.package,
          size: order.size,
          status: order.status,
          amount: order.amount || null,
          customer: safeCustomer,
          recipient: order.recipient ? { name: order.recipient.name } : null,
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const calWebhookSecret = (process.env.CAL_WEBHOOK_SECRET || '').trim();
    if (calWebhookSecret) {
      const crypto = require('crypto');
      const signature = req.headers['x-cal-signature-256'] || req.headers['cal-signature'] || '';
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expected = crypto.createHmac('sha256', calWebhookSecret).update(body).digest('hex');
      if (signature !== expected) {
        console.error('Cal.com webhook signature mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }
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
  // Real customer details are in metadata (Cal.eu attendee email is
  // rerouted to tere@sukoda.ee to suppress Cal.eu's built-in emails)
  const realEmail = booking.metadata?.realEmail || booking.attendees?.[0]?.email;
  const realName = booking.metadata?.realName || booking.attendees?.[0]?.name;
  const realPhone = booking.metadata?.realPhone || booking.responses?.phone || '';

  if (!realEmail) {
    console.error('No customer email in Cal.com booking (checked metadata + attendees)');
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
  let orderId = booking.metadata?.orderId || null;
  let orderData = null;

  if (orderId) {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (orderDoc.exists) {
      orderData = orderDoc.data();
    } else {
      orderId = null;
    }
  }

  if (!orderId) {
    const ordersSnapshot = await db.collection('orders')
      .where('customer.email', '==', realEmail)
      .where('status', '==', 'paid')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!ordersSnapshot.empty) {
      orderId = ordersSnapshot.docs[0].id;
      orderData = ordersSnapshot.docs[0].data();
    }
  }

  // If not found by customer email, check gift orders by recipient email
  if (!orderId) {
    const giftOrdersSnapshot = await db.collection('orders')
      .where('recipient.email', '==', realEmail)
      .where('type', '==', 'gift')
      .where('status', '==', 'paid')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!giftOrdersSnapshot.empty) {
      orderId = giftOrdersSnapshot.docs[0].id;
      orderData = giftOrdersSnapshot.docs[0].data();
    }
  }

  // Determine size from event type slug
  const eventTypeSlug = booking.eventType?.slug || '';
  let size = 'medium';
  if (eventTypeSlug.includes('50')) size = 'small';
  else if (eventTypeSlug.includes('90')) size = 'medium';
  else if (eventTypeSlug.includes('120')) size = 'large';

  // Create booking record in Firestore
  const bookingRef = await db.collection('bookings').add({
    orderId: orderId,
    calBookingId: booking.id || null,
    calBookingUid: booking.uid || null,
    customerEmail: realEmail,
    customerName: realName || orderData?.customer?.name || '',
    customerPhone: realPhone || orderData?.customer?.phone || '',
    address: booking.responses?.location?.optionValue || booking.responses?.address || orderData?.customer?.address || '',
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

  // Notify admin about the new booking (skip auto-scheduled — admin already knows about those)
  const isAutoScheduled = booking.metadata?.source === 'sukoda-auto-scheduler';
  if (!isAutoScheduled) {
    await sendAdminBookingNotification({
      customerName: realName || orderData?.customer?.name || '',
      customerEmail: realEmail,
      customerPhone: realPhone || orderData?.customer?.phone || '',
      address: booking.responses?.location?.optionValue || booking.responses?.address || orderData?.customer?.address || '',
      scheduledAt: booking.startTime,
      size: size,
      type: orderData?.type || 'unknown',
      orderId: orderId,
      giftCode: orderData?.giftCode || '',
    });
  }

  // Update the order with visit tracking and learn preferences
  if (orderId && orderData) {
    const scheduledDate = new Date(booking.startTime);
    const rhythm = orderData.package;
    const intervalDays = calService.RHYTHM_INTERVALS[rhythm] || 14;

    const nextVisitDue = new Date(scheduledDate);
    nextVisitDue.setDate(nextVisitDue.getDate() + intervalDays);

    const tp = tallinnParts(scheduledDate);
    const updateData = {
      lastVisitAt: admin.firestore.Timestamp.fromDate(scheduledDate),
      nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
      totalVisits: admin.firestore.FieldValue.increment(1),
      preferredDay: tp.weekday,
      preferredTime: `${tp.hour.toString().padStart(2, '0')}:${tp.minute.toString().padStart(2, '0')}`,
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

        const tpR = tallinnParts(scheduledDate);
        await db.collection('orders').doc(bookingData.orderId).update({
          lastVisitAt: admin.firestore.Timestamp.fromDate(scheduledDate),
          nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
          preferredDay: tpR.weekday,
          preferredTime: `${tpR.hour.toString().padStart(2, '0')}:${tpR.minute.toString().padStart(2, '0')}`,
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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

        // Skip paused subscriptions
        if (order.pausedAt) {
          console.log(`Skipping paused subscription: ${orderId}`);
          continue;
        }

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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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
 * Home profile CTA block for emails — encourages users to add preferences for the cleaner
 */
function homeProfileBlock(lang) {
  const t = tx(lang);
  return `
    <div style="background: #FAF8F5; padding: 28px; margin-bottom: 32px; margin-top: 32px; border-left: 2px solid #E8E3DD;">
      <p style="color: #8A8578; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
        ${t.homeProfileNote}
      </p>
      <a href="https://sukoda.ee/minu" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 12px 28px; text-decoration: none; font-size: 11px; letter-spacing: 3px; font-weight: 500;">
        ${t.homeProfileBtn}
      </a>
    </div>`;
}

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

          ${homeProfileBlock(lang)}
        </div>

        ${emailFooter(lang)}
      </div>
    </body>
    </html>
  `;
}

/**
 * Booking confirmation email -- sent immediately when a visit is booked (i18n)
 * ET: "Sinu aeg on kinnitatud"
 * EN: "Your time is confirmed"
 */
function generateBookingConfirmationEmail({ customerName, scheduledAt, endTime, address, lang, portalUrl }) {
  const t = tx(lang);
  const dt = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

  const itemsHtml = t.reminderItems.map((item, i) => {
    const border = i < t.reminderItems.length - 1 ? 'border-bottom: 1px solid #E8E3DD;' : '';
    return `<li style="padding: 8px 0; color: #8A8578; font-size: 14px; ${border}">${item}</li>`;
  }).join('');

  const changeHtml = portalUrl
    ? `<p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 8px;">
            ${t.bookingConfirmedPortalNote}
          </p>
          <div style="text-align: center; margin-top: 16px;">
            <a href="${portalUrl}" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 14px 32px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
              ${t.bookingConfirmedPortalBtn}
            </a>
          </div>`
    : `<p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 8px;">
            ${t.bookingConfirmedChangeNote}
          </p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}

        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 8px 0;">
            ${t.bookingConfirmedTitle}
          </h2>
          <p style="color: #8A8578; font-size: 14px; margin: 0 0 32px 0; line-height: 1.6;">
            ${t.bookingConfirmedIntro(customerName)}
          </p>

          <div style="background: #FFFFFF; padding: 28px; margin-bottom: 32px; border-left: 2px solid #B8976A;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">${t.bookingConfirmedTimeLabel}</p>
            <p style="margin: 0 0 4px 0; font-weight: 300; color: #2C2824; font-size: 20px; font-family: Georgia, 'Times New Roman', serif;">
              ${formatDate(dt, lang)}
            </p>
            <p style="margin: 0 0 16px 0; color: #8A8578; font-size: 16px;">
              ${t.reminderAt} ${formatTime(dt)}
            </p>
            ${address ? `
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 14px;">
              ${t.addressLabel}: <strong style="color: #2C2824; font-weight: 400;">${escapeHtml(address)}</strong>
            </p>
            ` : ''}
          </div>

          <div style="background: #FAF8F5; padding: 24px; margin-bottom: 32px;">
            <p style="color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500; margin: 0 0 16px 0;">${t.reminderExpectLabel}</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${itemsHtml}
            </ul>
          </div>

          ${generateCalendarLinksHtml({ scheduledAt: dt, endTime, address, lang })}

          <p style="color: #8A8578; font-size: 13px; line-height: 1.6; margin-top: 24px;">
            ${t.bookingConfirmedNote}
          </p>

          ${changeHtml}
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

          ${homeProfileBlock(lang)}

          <div style="background: #111111; padding: 24px; margin-top: 24px; text-align: center;">
            <p style="margin: 0 0 14px 0; color: #8A8578; font-size: 13px;">
              ${t.bookingConfirmedPortalNote}
            </p>
            <a href="https://sukoda.ee/minu" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 12px 28px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
              ${t.bookingConfirmedPortalBtn}
            </a>
          </div>
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
  const base = 'https://sukoda.ee';
  return `${base}?promo=${encodeURIComponent(promoCode)}&utm_source=followup&utm_medium=email&utm_campaign=gift_conversion`;
}

/**
 * Generate follow-up email: 24h after visit — "Kuidas meeldis?" + -20% offer
 * For multi-visit gifts: warm follow-up with remaining visits info instead of conversion offer
 */
function generateFollowup24hEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);
  const visitDateLabel = getVisitDateLabel(followup.visitDate, lang);
  const multiVisit = isMultiVisitGift(followup.giftPackage);
  const totalVisits = GIFT_VISIT_COUNTS[followup.giftPackage] || 1;
  const remaining = totalVisits - 1;

  if (multiVisit) {
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
            ${t.giftMulti24hIntro(recipientName, visitDateLabel)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.giftMulti24hBody}
          </p>

          <div style="text-align: center; margin-bottom: 40px;">
            <span style="display: inline-block; width: 40px; height: 1px; background: #B8976A;"></span>
          </div>

          <div style="background: #FFFFFF; padding: 32px; border-left: 3px solid #B8976A; margin-bottom: 32px;">
            <p style="margin: 0 0 8px 0; color: #B8976A; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
              ${t.giftMulti24hNextTitle}
            </p>
            <p style="margin: 0 0 16px 0; color: #2C2824; font-size: 16px; line-height: 1.7; font-family: Georgia, 'Times New Roman', serif; font-weight: 300;">
              ${t.giftMulti24hNextNote(remaining)}
            </p>
            <p style="margin: 16px 0 0 0; padding-top: 16px; border-top: 1px solid #E8E3DD; color: #8A8578; font-size: 13px; line-height: 1.7;">
              ${t.giftMulti24hProfileNote}
            </p>
            <div style="margin-top: 16px;">
              <a href="https://sukoda.ee/minu" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 12px 28px; text-decoration: none; font-size: 11px; letter-spacing: 3px; font-weight: 500;">
                ${t.giftMulti24hProfileBtn}
              </a>
            </div>
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
            ${t.followup24hIntro(recipientName, visitDateLabel)}
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
 * For multi-visit gifts: warm reminder with profile link instead of conversion offer
 */
function generateFollowup7dEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);
  const multiVisit = isMultiVisitGift(followup.giftPackage);

  if (multiVisit) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.giftMulti7dTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.giftMulti7dIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.giftMulti7dBody}
          </p>

          <div style="background: #FAF8F5; padding: 28px; margin-bottom: 32px; border-left: 2px solid #E8E3DD;">
            <p style="color: #8A8578; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
              ${t.giftMulti7dProfileNote}
            </p>
            <a href="https://sukoda.ee/minu" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 12px 28px; text-decoration: none; font-size: 11px; letter-spacing: 3px; font-weight: 500;">
              ${t.giftMulti24hProfileBtn}
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
 * For multi-visit gifts: gentle reminder that more visits are coming
 */
function generateFollowup30dEmail(followup, lang) {
  const t = tx(lang);
  const recipientName = followup.recipientName || '';
  const orderUrl = getFollowupOrderUrl(lang, t.followup24hOfferCode);
  const multiVisit = isMultiVisitGift(followup.giftPackage);

  if (multiVisit) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
        ${emailHeader()}
        <div style="padding: 44px 40px;">
          <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 24px 0;">
            ${t.giftMulti30dTitle}
          </h2>
          <p style="color: #8A8578; line-height: 1.8; margin: 0 0 24px 0; font-size: 15px;">
            ${t.giftMulti30dIntro(recipientName)}
          </p>
          <p style="color: #2C2824; line-height: 1.8; margin: 0 0 40px 0; font-size: 16px; font-family: Georgia, 'Times New Roman', serif; font-style: italic;">
            ${t.giftMulti30dBody}
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
  const visitDateLabel = getVisitDateLabel(followup.visitDate, lang);

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
            ${t.subscriberFirstVisitIntro(recipientName, visitDateLabel)}
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

          ${homeProfileBlock(lang)}

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
            <a href="https://sukoda.ee/?ref=${encodeURIComponent(followup.referralCode)}" style="display: inline-block; background: #B8976A; color: #FFFFFF; padding: 14px 40px; text-decoration: none; font-size: 11px; letter-spacing: 3px; font-weight: 500;">
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
 * @param {string} [params.giftPackage] - Gift package type (moment/month/quarter)
 */
async function createFollowupSequence({ orderId, recipientEmail, recipientName, bookingStartTime, lang, size, giftPackage }) {
  if (!giftPackage) {
    console.warn(`createFollowupSequence: giftPackage is ${giftPackage} for order ${orderId} — follow-ups will use single-visit template`);
  }
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
    // Send at 10:00 Tallinn time — Cloud Functions run in UTC, so compute offset
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Tallinn', hour: 'numeric', hour12: false });
    const tallinnNow = parseInt(formatter.format(sendAt), 10);
    const utcNow = sendAt.getUTCHours();
    const offset = tallinnNow - utcNow;
    sendAt.setUTCHours(10 - offset, 0, 0, 0);

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
      giftPackage: giftPackage || null,
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'validate-ref', 30, 60000)) return;
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
      let referrerCoupon;
      try {
        referrerCoupon = await getStripe().coupons.retrieve('SOOVITAJA20');
      } catch (e) {
        console.error('Coupon SOOVITAJA20 not found:', e.message);
        referrerCoupon = null;
      }

      if (referrerCoupon) {
        await getStripe().subscriptions.update(referrerOrder.stripeSubscriptionId, {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (!authenticateAdmin(req)) {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (!authenticateAdmin(req)) {
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

        const limit = Math.min(parseInt(req.query.limit) || 200, 500);
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
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
                // Schedule subscriber first-visit email for day after the visit at 10:00
                const visitTime = bookingData.scheduledAt?.toDate
                  ? bookingData.scheduledAt.toDate()
                  : new Date(bookingData.scheduledAt || Date.now());
                const sendAt = new Date(visitTime);
                sendAt.setDate(sendAt.getDate() + 1);
                sendAt.setHours(10, 0, 0, 0);
                // If that time already passed (e.g. visit was Saturday, marked Monday), send next day at 10:00
                if (sendAt <= new Date()) {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  tomorrow.setHours(10, 0, 0, 0);
                  sendAt.setTime(tomorrow.getTime());
                }

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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (!authenticateAdmin(req)) {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
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
        const slugDurations = { 'koristus-50': 120, 'koristus-90': 180, 'koristus-120': 240, 'koristus-150': 300 };
        const durationMinutes = slugDurations[eventTypeSlug] || 180;
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

              const tpN = tallinnParts(newStartDate);
              await db.collection('orders').doc(booking.orderId).update({
                lastVisitAt: admin.firestore.Timestamp.fromDate(newStartDate),
                nextVisitDue: admin.firestore.Timestamp.fromDate(nextVisitDue),
                preferredDay: tpN.weekday,
                preferredTime: `${tpN.hour.toString().padStart(2, '0')}:${tpN.minute.toString().padStart(2, '0')}`,
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
 * Admin: Book a new visit for an existing order (gift or subscription)
 * Body: { orderId, startTime }
 */
exports.adminBookVisit = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { orderId, date, time, startTime: legacyStartTime } = req.body;

        if (!orderId || (!date && !legacyStartTime)) {
          return res.status(400).json({ error: 'Missing orderId or date/time' });
        }

        let startTime;
        if (date && time) {
          startTime = tallinnLocalDateTimeToISOString(date, time);
        } else {
          startTime = legacyStartTime;
        }

        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();
        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Order not paid' });
        }

        const size = order.size || 'medium';
        const slug = calService.EVENT_TYPE_SLUGS[size] || 'koristus-90';

        const isPhysicalCard = order.physicalCard === true;
        const rawName = order.type === 'gift'
          ? (order.recipient?.name || order.customer?.name || '')
          : (order.customer?.name || '');
        const customerNameForEmail = (rawName && !rawName.includes('Physical Card')) ? rawName : '';
        const customerNameForCal = customerNameForEmail || 'Klient';
        const customerEmail = order.type === 'gift'
          ? (order.recipient?.email || order.customer?.email || '')
          : (order.customer?.email || '');
        const customerPhone = order.type === 'gift'
          ? (order.recipient?.phone || order.customer?.phone || '')
          : (order.customer?.phone || '');
        const customerAddress = order.type === 'gift'
          ? (order.recipient?.address || order.customer?.address || '')
          : (order.customer?.address || '');

        const booking = await calService.createBooking(slug, startTime, {
          name: customerNameForCal,
          email: customerEmail,
          phone: customerPhone,
          address: customerAddress,
        }, {
          source: 'sukoda-admin-book',
          orderId: orderId,
          additionalInfo: order.customer?.additionalInfo || order.recipient?.additionalInfo || '',
        });

        await orderDoc.ref.update({
          'booking': {
            uid: booking.uid || booking.id,
            startTime: startTime,
            createdAt: new Date().toISOString(),
          },
        });

        await sendAdminBookingNotification({
          customerName: customerNameForCal,
          customerEmail,
          customerPhone,
          address: customerAddress,
          scheduledAt: startTime,
          size,
          type: order.type || 'gift',
          orderId,
          giftCode: order.giftCode || '',
          additionalInfo: order.customer?.additionalInfo || order.recipient?.additionalInfo || '',
        });

        // Send booking confirmation email to client
        if (customerEmail) {
          try {
            const lang = order.lang || 'et';
            const t = tx(lang);
            const calSlugDurations = { 'koristus-50': 120, 'koristus-90': 180, 'koristus-120': 240, 'koristus-150': 300 };
            const durationMin = calSlugDurations[slug] || 180;
            const endTime = new Date(new Date(startTime).getTime() + durationMin * 60 * 1000);

            let portalUrl = null;
            try {
              const crypto = require('crypto');
              const rawToken = crypto.randomBytes(32).toString('hex');
              const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
              const tokenExpiry = new Date();
              tokenExpiry.setDate(tokenExpiry.getDate() + 30);
              await orderDoc.ref.update({
                sessionTokenHash: tokenHash,
                sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
              });
              portalUrl = `https://sukoda.ee/minu?token=${rawToken}`;
            } catch (tokenErr) {
              console.error('Portal token creation failed (non-fatal):', tokenErr);
              if (order.sessionTokenHash) {
                portalUrl = `https://sukoda.ee/minu`;
              }
            }

            await sendEmail({
              to: customerEmail,
              subject: t.subjectBookingConfirmed,
              html: generateBookingConfirmationEmail({
                customerName: customerNameForEmail,
                scheduledAt: startTime,
                endTime: endTime.toISOString(),
                address: customerAddress,
                lang,
                portalUrl,
              }),
            });
            console.log('Booking confirmation email sent to:', customerEmail);
          } catch (emailErr) {
            console.error('Booking confirmation email failed (non-fatal):', emailErr);
          }
        }

        res.status(200).json({ success: true, bookingUid: booking.uid || booking.id });
      } catch (error) {
        console.error('Error admin booking visit:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Cancel a single booking on an order (not the whole order)
 * Cancels Cal.com booking and clears order.booking field
 * Body: { orderId }
 */
exports.adminCancelBooking = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { orderId } = req.body;
        if (!orderId) {
          return res.status(400).json({ error: 'Missing orderId' });
        }

        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();
        const bookingUid = order.booking?.uid;

        if (bookingUid) {
          try {
            await calService.cancelBooking(bookingUid, 'Cancelled by admin');
            console.log('Cal.com booking cancelled:', bookingUid);
          } catch (calErr) {
            console.error('Cal.com cancel failed (continuing):', calErr);
          }
        }

        await orderDoc.ref.update({
          booking: admin.firestore.FieldValue.delete(),
        });

        // Cancel only the matching Firestore booking record (by calBookingUid)
        if (bookingUid) {
          const bookingsSnapshot = await db.collection('bookings')
            .where('calBookingUid', '==', bookingUid)
            .limit(1)
            .get();

          for (const doc of bookingsSnapshot.docs) {
            await doc.ref.update({
              status: 'cancelled',
              cancelReason: 'Tühistatud admini poolt',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Log a completed visit (creates booking record in Firestore)
 * For cases where Cal.com webhook didn't create the record
 * Body: { orderId, date, notes }
 */
exports.adminLogVisit = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const { orderId, date, notes } = req.body;
        if (!orderId || !date) {
          return res.status(400).json({ error: 'Missing orderId or date' });
        }

        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderDoc.data();
        const customerName = order.type === 'gift'
          ? (order.recipient?.name || order.customer?.name || 'Klient')
          : (order.customer?.name || 'Klient');
        const customerEmail = order.type === 'gift'
          ? (order.recipient?.email || order.customer?.email || '')
          : (order.customer?.email || '');
        const customerAddress = order.type === 'gift'
          ? (order.recipient?.address || order.customer?.address || '')
          : (order.customer?.address || '');

        const scheduledAt = new Date(date + 'T09:00:00Z');

        const bookingRef = await db.collection('bookings').add({
          orderId,
          customerName,
          customerEmail,
          customerPhone: order.recipient?.phone || order.customer?.phone || '',
          address: customerAddress,
          scheduledAt: admin.firestore.Timestamp.fromDate(scheduledAt),
          size: order.size || 'medium',
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          notes: notes || '',
          isManualEntry: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({ success: true, bookingId: bookingRef.id });
      } catch (error) {
        console.error('Error logging visit:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

/**
 * Admin: Cancel an order (also cancels linked bookings in Cal.com + Stripe subscription)
 * Body: { orderId, password, reason }
 */
exports.cancelOrder = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
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
            const sub = await getStripe().subscriptions.retrieve(order.stripeSubscriptionId);
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
            await getStripe().subscriptions.update(order.stripeSubscriptionId, {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (!authenticateAdmin(req)) {
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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
      const fmtLocalICS = (d) => {
        const p = tallinnParts(d);
        return `${String(p.year).padStart(4, '0')}${String(p.month + 1).padStart(2, '0')}${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}${String(p.minute).padStart(2, '0')}00`;
      };
      const escapeICS = (value) => String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
      const uid = `sukoda-${startDate.getTime()}@sukoda.ee`;
      const now = fmtICS(new Date());

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SUKODA//Calendar//ET',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:SUKODA',
        `X-WR-TIMEZONE:${TALLINN_TIME_ZONE}`,
        'BEGIN:VTIMEZONE',
        `TZID:${TALLINN_TIME_ZONE}`,
        'X-LIC-LOCATION:Europe/Tallinn',
        'BEGIN:DAYLIGHT',
        'TZOFFSETFROM:+0200',
        'TZOFFSETTO:+0300',
        'TZNAME:EEST',
        'DTSTART:19700329T030000',
        'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
        'END:DAYLIGHT',
        'BEGIN:STANDARD',
        'TZOFFSETFROM:+0300',
        'TZOFFSETTO:+0200',
        'TZNAME:EET',
        'DTSTART:19701025T040000',
        'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
        'END:STANDARD',
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=${TALLINN_TIME_ZONE}:${fmtLocalICS(startDate)}`,
        `DTEND;TZID=${TALLINN_TIME_ZONE}:${fmtLocalICS(endDate)}`,
        `SUMMARY:${escapeICS(title || 'SUKODA koduhoolitsus')}`,
        `DESCRIPTION:${escapeICS(description || '')}`,
        `LOCATION:${escapeICS(location || '')}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        'DESCRIPTION:SUKODA koduhoolitsus 1h parast',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      res.set('Content-Type', 'text/calendar; charset=utf-8; method=PUBLISH');
      res.set('Content-Disposition', 'attachment; filename="sukoda-visit.ics"');
      return res.status(200).send(icsContent);
    });
  });

// ============================================================

/**
 * Estate inquiry — bespoke 5+ room / house requests
 * Body: { name, email, phone?, additionalInfo?, selectedRhythm, lang }
 */
exports.estateInquiry = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'estateInquiry', 5, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const eiv = validate(estateInquirySchema, req.body);
      if (!eiv.ok) {
        return res.status(400).json({ error: eiv.error });
      }
      const { name, email, phone, additionalInfo, selectedRhythm, lang } = eiv.data;

      try {
        await db.collection('estate_inquiries').add({
          name,
          email,
          phone: phone || null,
          additionalInfo: additionalInfo || null,
          selectedRhythm: selectedRhythm || null,
          lang: lang || 'et',
          status: 'new',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `SUKODA | Rätseplahendus — ${name}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="color: #2C2824; font-family: Georgia, serif; font-weight: 300; border-bottom: 1px solid #B8976A; padding-bottom: 10px;">Uus rätseplahenduse päring</h2>
              <table style="width: 100%; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #8A8578;">Nimi:</td><td style="padding: 6px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">E-post:</td><td style="padding: 6px 0;"><strong>${escapeHtml(email)}</strong></td></tr>
                ${phone ? `<tr><td style="padding: 6px 0; color: #8A8578;">Telefon:</td><td style="padding: 6px 0;">${escapeHtml(phone)}</td></tr>` : ''}
                ${selectedRhythm ? `<tr><td style="padding: 6px 0; color: #8A8578;">Rütm:</td><td style="padding: 6px 0;">${escapeHtml(selectedRhythm)}</td></tr>` : ''}
                ${additionalInfo ? `<tr><td style="padding: 6px 0; color: #8A8578;">Lisainfo:</td><td style="padding: 6px 0;">${escapeHtml(additionalInfo)}</td></tr>` : ''}
              </table>
              <p style="color: #B8976A; font-size: 13px; font-style: italic;">Palun vasta 24 tunni jooksul.</p>
            </div>
          `,
        });

        await sendEmail({
          to: email,
          subject: lang === 'en' ? 'SUKODA | Your inquiry has been received' : 'SUKODA | Sinu päring on vastu võetud',
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="color: #2C2824; font-family: Georgia, serif; font-weight: 300; border-bottom: 1px solid #B8976A; padding-bottom: 10px;">
                ${lang === 'en' ? 'Thank you for your inquiry' : 'Täname päringu eest'}
              </h2>
              <p style="color: #6B6560; line-height: 1.6;">
                ${lang === 'en'
                  ? `Dear ${escapeHtml(name)}, we have received your bespoke home care inquiry. A member of our team will be in touch within 24 hours to discuss your needs.`
                  : `${escapeHtml(name)}, oleme sinu rätseplahenduse päringu kätte saanud. Võtame sinuga ühendust 24 tunni jooksul, et arutada sinu soove.`
                }
              </p>
              <p style="color: #8A8578; font-size: 13px; margin-top: 20px;">SUKODA — tere@sukoda.ee</p>
            </div>
          `,
        });

        console.log('Estate inquiry saved:', email);
        res.status(200).json({ success: true });

      } catch (error) {
        console.error('Estate inquiry error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ============================================================

/**
 * Save sales inquiry from physical gift card landing page
 * Body: { name, email, phone?, company?, message?, giftCode? }
 */
exports.salesInquiry = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'salesInquiry', 5, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const sv = validate(salesInquirySchema, req.body);
      if (!sv.ok) {
        return res.status(400).json({ error: sv.error });
      }
      const { name, email, phone, company, message, giftCode } = sv.data;

      try {
        await db.collection('salesInquiries').add({
          name,
          email,
          phone: phone || null,
          company: company || null,
          message: message || null,
          giftCode: giftCode || null,
          status: 'new',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `SUKODA | Müügikaardi päring — ${name}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="color: #2C2824; font-family: Georgia, serif; font-weight: 300; border-bottom: 1px solid #B8976A; padding-bottom: 10px;">Uus müügikaardi päring</h2>
              <table style="width: 100%; margin: 16px 0;">
                <tr><td style="padding: 6px 0; color: #8A8578;">Nimi:</td><td style="padding: 6px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">E-post:</td><td style="padding: 6px 0;"><strong>${escapeHtml(email)}</strong></td></tr>
                ${phone ? `<tr><td style="padding: 6px 0; color: #8A8578;">Telefon:</td><td style="padding: 6px 0;">${escapeHtml(phone)}</td></tr>` : ''}
                ${company ? `<tr><td style="padding: 6px 0; color: #8A8578;">Ettevõte:</td><td style="padding: 6px 0;">${escapeHtml(company)}</td></tr>` : ''}
                ${giftCode ? `<tr><td style="padding: 6px 0; color: #8A8578;">Kaardi kood:</td><td style="padding: 6px 0;">${escapeHtml(giftCode)}</td></tr>` : ''}
                ${message ? `<tr><td style="padding: 6px 0; color: #8A8578;">Sõnum:</td><td style="padding: 6px 0;">${escapeHtml(message)}</td></tr>` : ''}
              </table>
              <p style="color: #B8976A; font-size: 13px; font-style: italic;">Palun vasta 24 tunni jooksul.</p>
            </div>
          `,
        });

        await sendEmail({
          to: email,
          subject: 'SUKODA | Täname huvi eest',
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; padding: 20px;">
              <h2 style="color: #2C2824; font-family: Georgia, serif; font-weight: 300; border-bottom: 1px solid #B8976A; padding-bottom: 10px;">Täname huvi eest</h2>
              <p style="color: #6B6560; line-height: 1.6;">
                ${escapeHtml(name)}, oleme Teie päringu kätte saanud. Võtame Teiega ühendust 24 tunni jooksul, et arutada koostöövõimalusi.
              </p>
              <p style="color: #8A8578; font-size: 13px; margin-top: 20px;">SUKODA — partner@sukoda.ee</p>
            </div>
          `,
        });

        console.log('Sales inquiry saved:', email, giftCode);
        res.status(200).json({ success: true });

      } catch (error) {
        console.error('Sales inquiry error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ============================================================

/**
 * Save waitlist entry for expansion planning
 * Body: { email, name, city, address, lang }
 */
exports.waitlist = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'waitlist', 5, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const wv = validate(waitlistSchema, req.body);
      if (!wv.ok) {
        return res.status(400).json({ error: wv.error });
      }

      try {
        const { email, name, city, address, lang } = wv.data;

        if (!city) {
          return res.status(400).json({ error: 'Missing city' });
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
                <tr><td style="padding: 6px 0; color: #8A8578;">Nimi:</td><td style="padding: 6px 0;"><strong>${escapeHtml(name || '-')}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">E-post:</td><td style="padding: 6px 0;"><strong>${escapeHtml(email)}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #8A8578;">Linn:</td><td style="padding: 6px 0;"><strong style="color: #B8976A;">${escapeHtml(city)}</strong></td></tr>
                ${address ? `<tr><td style="padding: 6px 0; color: #8A8578;">Aadress:</td><td style="padding: 6px 0;">${escapeHtml(address)}</td></tr>` : ''}
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'redeem', 20, 60000)) return;
      const code = normalizeGiftInput((req.query.code || ''));

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

        // Check if already redeemed (has a booking) — sales cards are reusable
        if (order.giftRedeemed && !order.salesCard) {
          return res.status(400).json({ error: 'Gift already redeemed', alreadyRedeemed: true });
        }

        // Check if paid
        if (order.status !== 'paid') {
          return res.status(400).json({ error: 'Gift not yet paid' });
        }

        const lang = order.lang || 'et';
        const sizeNames = {
          et: { small: '1-2 tuba', medium: '3 tuba', large: '4 tuba' },
          en: { small: '1-2 rooms', medium: '3 rooms', large: '4 rooms' },
        };
        const packageNames = {
          et: { moment: 'Üks Hetk', month: 'Kuu Aega', quarter: 'Kvartal Vabadust', harmony: 'Harmoonia', serenity: 'Täielik Rahulolu' },
          en: { moment: 'One Moment', month: 'A Month of Care', quarter: 'Quarter of Freedom', harmony: 'Harmony', serenity: 'Complete Serenity' },
        };
        const packageDescriptions = {
          et: {
            moment: 'Üks täiuslik koduhoolitsus — koristus, värsked lilled, tervituskaart ja magus üllatus.',
            month: 'Kaks koduhoolitsust ühe kuu jooksul — koristus, lilled, puuviljad ja tervituskaart.',
            quarter: 'Kuus koduhoolitsust kolme kuu jooksul — koristus, lilled, puuviljad ja premium koduhooldus.',
          },
          en: {
            moment: 'One perfect home care — cleaning, fresh flowers, greeting card and a sweet surprise.',
            month: 'Two home care visits over one month — cleaning, flowers, fruit and a greeting card.',
            quarter: 'Six home care visits over three months — cleaning, flowers, fruits and premium home care.',
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
          senderName: order.physicalCard ? '' : (order.customer?.name || ''),
          message: order.recipient?.message || '',
          salesCard: order.salesCard || false,
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
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
        const launchStartDate = LAUNCH_DATE || null;

        if (month) {
          startDate = `${month}-01`;
          // If launch date is later than month start, use launch date
          if (launchStartDate && launchStartDate > startDate) {
            startDate = launchStartDate;
          }
          // End of month + some buffer
          const d = new Date(`${month}-01`);
          d.setMonth(d.getMonth() + 1);
          d.setDate(d.getDate() + 7); // 1 week into next month
          endDate = d.toISOString().split('T')[0];
        } else {
          const now = new Date();
          startDate = now.toISOString().split('T')[0];
          // If launch date is later, use it
          if (launchStartDate && launchStartDate > startDate) {
            startDate = launchStartDate;
          }
          const end = new Date(now);
          end.setDate(end.getDate() + 28);
          endDate = end.toISOString().split('T')[0];
        }

        const allSlots = await calService.getAvailableSlots(slug, startDate, endDate);

        // Minimum lead time: only show slots at least MIN_BOOKING_LEAD_HOURS ahead
        const minBookingTime = new Date(Date.now() + MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000);

        // Launch date: don't show slots before the launch date
        const launchMinTime = LAUNCH_DATE ? new Date(LAUNCH_DATE + 'T00:00:00+02:00') : null;
        const effectiveMinTime = launchMinTime && launchMinTime > minBookingTime ? launchMinTime : minBookingTime;

        // Group slots by date and extract just the time
        const grouped = {};
        for (const slot of allSlots) {
          const dt = new Date(slot.time);
          // Filter out slots that are too soon or before launch date
          if (dt < effectiveMinTime) continue;

          const date = slot.date || slot.time.split('T')[0];
          if (!grouped[date]) grouped[date] = [];
          // Convert to HH:MM in Tallinn timezone
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'book-gift', 10, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const bgv = validate(bookGiftSchema, req.body);
      if (!bgv.ok) {
        return res.status(400).json({ error: bgv.error });
      }
      const { code, startTime, date, time, email, phone, address, additionalInfo } = bgv.data;
      const bookingStartTime = (date && time) ? tallinnLocalDateTimeToISOString(date, time) : startTime;

      if (!code || !startTime || !email || !address) {
        return res.status(400).json({ error: 'Missing required fields: code, startTime, email, address' });
      }

      // Validate minimum lead time and launch date
      const minBookingTime = new Date(Date.now() + MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000);
      const launchMinTime = LAUNCH_DATE ? new Date(LAUNCH_DATE + 'T00:00:00+02:00') : null;
      const effectiveMin = launchMinTime && launchMinTime > minBookingTime ? launchMinTime : minBookingTime;
      if (new Date(bookingStartTime) < effectiveMin) {
        const lang = req.body?.lang || 'et';
        const leadTimeError = lang === 'en'
          ? `Bookings must be made at least ${MIN_BOOKING_LEAD_HOURS} hours in advance. Please choose a later time.`
          : `Broneerida saab vähemalt ${MIN_BOOKING_LEAD_HOURS} tundi ette. Palun valige hilisem aeg.`;
        return res.status(400).json({ error: leadTimeError });
      }

      try {
        const normalizedCode = normalizeGiftInput(code);
        console.log('bookGiftVisit: looking up code', JSON.stringify({ raw: code, normalized: normalizedCode }));

        // Try normalized code first, then raw code as fallback
        let snapshot = await db.collection('orders')
          .where('giftCode', '==', normalizedCode)
          .where('type', '==', 'gift')
          .limit(1)
          .get();

        if (snapshot.empty && normalizedCode !== code.trim().toUpperCase()) {
          snapshot = await db.collection('orders')
            .where('giftCode', '==', code.trim().toUpperCase())
            .where('type', '==', 'gift')
            .limit(1)
            .get();
        }

        if (snapshot.empty) {
          console.error('bookGiftVisit: code not found', JSON.stringify({ raw: code, normalized: normalizedCode }));
          return res.status(404).json({ error: 'Gift code not found' });
        }

        const doc = snapshot.docs[0];
        const order = doc.data();

        if (order.salesCard) {
          return res.status(400).json({ error: 'Sales cards cannot be booked' });
        }

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
        const booking = await calService.createBooking(slug, bookingStartTime, {
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
            startTime: bookingStartTime,
            createdAt: new Date().toISOString(),
          },
        });

        // Create follow-up email sequence for conversion (24h, 7d, 30d after visit)
        try {
          await createFollowupSequence({
            orderId: doc.id,
            recipientEmail: email,
            recipientName: order.recipient?.name || '',
            bookingStartTime: bookingStartTime,
            lang: order.lang || 'et',
            size: order.size || 'medium',
            giftPackage: order.package || order.packageType || null,
          });
        } catch (followupError) {
          // Don't fail the booking if follow-up creation fails
          console.error('Follow-up sequence creation failed (non-fatal):', followupError);
        }

        // Notify admin about the new booking so they can arrange cleaners
        await sendAdminBookingNotification({
          customerName: recipientName,
          customerEmail: email,
          customerPhone: phone || '',
          address: address,
          scheduledAt: bookingStartTime,
          size: effectiveSize,
          type: 'gift',
          orderId: doc.id,
          giftCode: order.giftCode,
          additionalInfo: additionalInfo || '',
        });

        // Create portal session token for gift recipient
        const lang = order.lang || 'et';
        const t = tx(lang);
        let portalUrl = null;
        try {
          const crypto = require('crypto');
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const tokenExpiry = new Date();
          tokenExpiry.setDate(tokenExpiry.getDate() + 30);
          await doc.ref.update({
            sessionTokenHash: tokenHash,
            sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
          });
          portalUrl = `https://sukoda.ee/minu?token=${rawToken}`;
        } catch (tokenErr) {
          console.error('Portal token creation failed (non-fatal):', tokenErr);
        }

        // Send booking confirmation email to recipient with calendar links + portal
        try {
          const calSlugDurations = { 'koristus-50': 120, 'koristus-90': 180, 'koristus-120': 240, 'koristus-150': 300 };
          const durationMin = calSlugDurations[slug] || 180;
          const endTime = new Date(new Date(bookingStartTime).getTime() + durationMin * 60 * 1000);
          await sendEmail({
            to: email,
            subject: t.subjectBookingConfirmed,
            html: generateBookingConfirmationEmail({
              customerName: recipientName,
              scheduledAt: bookingStartTime,
              endTime: endTime.toISOString(),
              address,
              lang,
              portalUrl,
            }),
          });
        } catch (emailErr) {
          console.error('Booking confirmation email failed (non-fatal):', emailErr);
        }

        // Format date for response
        const bookingDate = new Date(bookingStartTime);
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
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'book-sub', 10, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const bsv = validate(bookSubscriptionSchema, req.body);
      if (!bsv.ok) {
        return res.status(400).json({ error: bsv.error });
      }
      const { orderId, startTime, date, time } = bsv.data;
      const bookingStartTime = (date && time) ? tallinnLocalDateTimeToISOString(date, time) : startTime;

      // Validate minimum lead time (48h) and launch date
      const minBookingTimeSub = new Date(Date.now() + MIN_BOOKING_LEAD_HOURS * 60 * 60 * 1000);
      const launchMinTimeSub = LAUNCH_DATE ? new Date(LAUNCH_DATE + 'T00:00:00+02:00') : null;
      const effectiveMinSub = launchMinTimeSub && launchMinTimeSub > minBookingTimeSub ? launchMinTimeSub : minBookingTimeSub;
      if (new Date(bookingStartTime) < effectiveMinSub) {
        const lang = req.body?.lang || 'et';
        const leadTimeError = lang === 'en'
          ? `Bookings must be made at least ${MIN_BOOKING_LEAD_HOURS} hours in advance. Please choose a later time.`
          : `Broneerida saab vähemalt ${MIN_BOOKING_LEAD_HOURS} tundi ette. Palun valige hilisem aeg.`;
        return res.status(400).json({ error: leadTimeError });
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
        const booking = await calService.createBooking(slug, bookingStartTime, {
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
            startTime: bookingStartTime,
            createdAt: new Date().toISOString(),
          },
        });

        // Notify admin about the new booking so they can arrange cleaners
        await sendAdminBookingNotification({
          customerName: customer.name || 'Klient',
          customerEmail: customer.email || '',
          customerPhone: customer.phone || '',
          address: customer.address || '',
          scheduledAt: bookingStartTime,
          size: order.size || 'medium',
          type: 'subscription',
          orderId: orderId,
          additionalInfo: customer.additionalInfo || '',
        });

        // Send booking confirmation email to customer with calendar links + portal
        const lang = order.lang || 'et';
        const t = tx(lang);
        try {
          const calSlugDurations = { 'koristus-50': 120, 'koristus-90': 180, 'koristus-120': 240, 'koristus-150': 300 };
          const durationMin = calSlugDurations[slug] || 180;
          const endTime = new Date(new Date(bookingStartTime).getTime() + durationMin * 60 * 1000);

          let portalUrl = null;
          try {
            const crypto = require('crypto');
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const tokenExpiry = new Date();
            tokenExpiry.setDate(tokenExpiry.getDate() + 30);
            await orderDoc.ref.update({
              sessionTokenHash: tokenHash,
              sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
            });
            portalUrl = `https://sukoda.ee/minu?token=${rawToken}`;
          } catch (tokenErr) {
            console.error('Portal token creation failed (non-fatal):', tokenErr);
            portalUrl = 'https://sukoda.ee/minu';
          }

          await sendEmail({
            to: customer.email,
            subject: t.subjectBookingConfirmed,
            html: generateBookingConfirmationEmail({
              customerName: customer.name,
              scheduledAt: bookingStartTime,
              endTime: endTime.toISOString(),
              address: customer.address,
              lang,
              portalUrl,
            }),
          });
        } catch (emailErr) {
          console.error('Booking confirmation email failed (non-fatal):', emailErr);
        }

        // Format date for response
        const bookingDate = new Date(bookingStartTime);
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
// ADMIN: UPDATE ORDER FLAG
// ============================================================

/**
 * Toggle a boolean flag on an order (admin only)
 * POST /api/admin/update-order-flag
 * Body: { orderId, flag, value }
 * Allowed flags: salesCard
 */
exports.updateOrderFlag = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { orderId, flag, value } = req.body;
      const allowedFlags = ['salesCard'];

      if (!orderId || !flag || !allowedFlags.includes(flag)) {
        return res.status(400).json({ error: 'Invalid request' });
      }

      try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
          return res.status(404).json({ error: 'Order not found' });
        }

        await orderRef.update({ [flag]: !!value });
        console.log(`Order flag updated: ${orderId} ${flag}=${!!value}`);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Update order flag error:', error);
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
 * - size: 'small', 'medium' (default), 'large' — locked at purchase
 * - batchName: optional label, e.g. 'Printon Feb 2026'
 */
exports.generatePhysicalGiftCards = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'admin', 60, 60000)) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      if (!authenticateAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { count = 10, package: pkg = 'moment', size = 'medium', batchName = '', buyer = {}, cards: customCards } = req.body;

      const validPackages = ['moment', 'month', 'quarter'];
      const validSizes = ['small', 'medium', 'large'];

      try {
        const batchId = `PRINT-${Date.now()}`;
        const codes = [];
        const firestoreBatch = db.batch();

        if (customCards && Array.isArray(customCards)) {
          // Bulk import with pre-set codes (e.g. from generate-physical-cards.js)
          if (customCards.length > 200) {
            return res.status(400).json({ error: 'Max 200 cards per request' });
          }
          for (const card of customCards) {
            if (!validPackages.includes(card.package) || !validSizes.includes(card.size) || !card.code) {
              return res.status(400).json({ error: `Invalid card entry: ${JSON.stringify(card)}` });
            }
            const orderRef = db.collection('orders').doc();
            firestoreBatch.set(orderRef, {
              type: 'gift',
              package: card.package,
              size: card.size,
              customer: { name: 'SUKODA (Physical Card)', email: 'tere@sukoda.ee' },
              recipient: { name: '', email: '', message: '' },
              deliveryMethod: 'physical',
              giftCode: card.code,
              lang: 'et',
              status: 'paid',
              physicalCard: true,
              batchId,
              batchName: batchName || `Physical cards ${new Date().toISOString().slice(0, 10)}`,
              buyer: { name: buyer.name || '', email: buyer.email || '', company: buyer.company || '' },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            codes.push({ code: card.code, orderId: orderRef.id });
          }
        } else {
          // Original flow: generate random codes for one package+size
          if (!validPackages.includes(pkg)) {
            return res.status(400).json({ error: `Invalid package. Must be one of: ${validPackages.join(', ')}` });
          }
          if (!validSizes.includes(size)) {
            return res.status(400).json({ error: `Invalid size. Must be one of: ${validSizes.join(', ')}` });
          }

          const numCards = Math.min(Math.max(parseInt(count) || 10, 1), 200);
          for (let i = 0; i < numCards; i++) {
            let code;
            let attempts = 0;
            do {
              code = await generateGiftCode();
              attempts++;
              if (attempts > 50) throw new Error('Could not generate unique code');
              const existing = await db.collection('orders').where('giftCode', '==', code).limit(1).get();
              if (existing.empty) break;
            } while (true);

            const orderRef = db.collection('orders').doc();
            firestoreBatch.set(orderRef, {
              type: 'gift',
              package: pkg,
              size,
              customer: { name: 'SUKODA (Physical Card)', email: 'tere@sukoda.ee' },
              recipient: { name: '', email: '', message: '' },
              deliveryMethod: 'physical',
              giftCode: code,
              lang: 'et',
              status: 'paid',
              physicalCard: true,
              batchId,
              batchName: batchName || `Physical cards ${new Date().toISOString().slice(0, 10)}`,
              buyer: { name: buyer.name || '', email: buyer.email || '', company: buyer.company || '' },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            codes.push({ code, orderId: orderRef.id });
          }
        }

        await firestoreBatch.commit();

        console.log(`Generated ${codes.length} physical gift card codes. Batch: ${batchId}`);

        res.status(200).json({
          success: true,
          batchId,
          count: codes.length,
          codes,
          redeemUrl: 'https://sukoda.ee/lunasta',
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
  moment: { small: 21900, medium: 27900, large: 34900 },
  month:  { small: 41900, medium: 51900, large: 64900 },
  quarter:{ small: 109900, medium: 134900, large: 169900 },
};

// Size ordering for validation (can only upgrade UP)
const SIZE_ORDER = { small: 0, medium: 1, large: 2 };
const SIZE_LABELS = { small: '1-2 tuba', medium: '3 tuba', large: '4 tuba' };

exports.createGiftUpgrade = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const guv = validate(giftUpgradeSchema, req.body);
      if (!guv.ok) {
        return res.status(400).json({ error: guv.error });
      }
      const { code, newSize } = guv.data;

      const validSizes = ['small', 'medium', 'large'];
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
        const session = await getStripe().checkout.sessions.create({
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
          success_url: `${req.headers.origin || 'https://sukoda.ee'}/lunasta?code=${encodeURIComponent(normalizedCode)}&upgraded=true`,
          cancel_url: `${req.headers.origin || 'https://sukoda.ee'}/lunasta?code=${encodeURIComponent(normalizedCode)}&upgrade_cancelled=true`,
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


// ============================================================
// CLIENT PORTAL — Authentication & API
// ============================================================

/**
 * Authenticate client portal request via session token.
 * Returns { orderId, order } or null.
 */
async function authenticateClient(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token || token.length < 32) return null;

  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  let ordersSnapshot = await db.collection('orders')
    .where('sessionTokenHash', '==', tokenHash)
    .where('type', '==', 'subscription')
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    ordersSnapshot = await db.collection('orders')
      .where('sessionTokenHash', '==', tokenHash)
      .where('type', '==', 'gift')
      .limit(1)
      .get();
  }

  if (ordersSnapshot.empty) return null;

  const orderDoc = ordersSnapshot.docs[0];
  const order = orderDoc.data();

  const expiresAt = order.sessionTokenExpiresAt?.toDate?.();
  if (expiresAt && expiresAt < new Date()) return null;

  return { orderId: orderDoc.id, order };
}

// --- POST /api/auth/validate ---
exports.validatePortalToken = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal-auth', 20, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const { token } = req.body;
        if (!token || token.length < 32) {
          return res.status(400).json({ error: 'Invalid token' });
        }

        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        let ordersSnapshot = await db.collection('orders')
          .where('sessionTokenHash', '==', tokenHash)
          .where('type', '==', 'subscription')
          .limit(1)
          .get();

        if (ordersSnapshot.empty) {
          ordersSnapshot = await db.collection('orders')
            .where('sessionTokenHash', '==', tokenHash)
            .where('type', '==', 'gift')
            .limit(1)
            .get();
        }

        if (ordersSnapshot.empty) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const orderDoc = ordersSnapshot.docs[0];
        const order = orderDoc.data();

        const expiresAt = order.sessionTokenExpiresAt?.toDate?.();
        if (expiresAt && expiresAt < new Date()) {
          return res.status(401).json({ error: 'Token expired' });
        }

        // Refresh token expiry on use
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);
        await orderDoc.ref.update({
          sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(newExpiry),
        });

        res.status(200).json({
          token,
          orderId: orderDoc.id,
          name: order.customer?.name || '',
        });
      } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/magic-link ---
exports.sendMagicLink = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'magic-link', 3, 300000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
          return res.status(400).json({ error: 'Invalid email' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Per-email rate limit: max 1 per hour
        const crypto = require('crypto');
        const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');
        const rateLimitRef = db.collection('rateLimits').doc(`magic_${emailHash}`);
        const rateLimitDoc = await rateLimitRef.get();
        if (rateLimitDoc.exists) {
          const data = rateLimitDoc.data();
          const lastSent = data.lastSent?.toDate?.() || new Date(0);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (lastSent > hourAgo) {
            return res.status(200).json({ sent: true });
          }
        }

        // Search subscriptions first, then redeemed gift orders by recipient email
        let ordersSnapshot = await db.collection('orders')
          .where('customer.email', '==', normalizedEmail)
          .where('type', '==', 'subscription')
          .where('status', 'in', ['paid', 'cancelling'])
          .orderBy('paidAt', 'desc')
          .limit(1)
          .get();

        if (ordersSnapshot.empty) {
          ordersSnapshot = await db.collection('orders')
            .where('recipient.email', '==', normalizedEmail)
            .where('type', '==', 'gift')
            .where('giftRedeemed', '==', true)
            .limit(1)
            .get();
        }

        // Always return success (don't reveal if email exists)
        if (ordersSnapshot.empty) {
          return res.status(200).json({ sent: true });
        }

        const orderDoc = ordersSnapshot.docs[0];
        const order = orderDoc.data();
        const lang = order.lang || 'et';

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 30);

        await orderDoc.ref.update({
          sessionTokenHash: tokenHash,
          sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
        });

        const portalUrl = `https://sukoda.ee/minu?token=${rawToken}`;
        await sendEmail({
          to: normalizedEmail,
          subject: lang === 'et' ? 'SUKODA | Sinu portaali link' : 'SUKODA | Your portal link',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 40px 20px; background: #FAF8F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background: #F5F0EB;">
                ${emailHeader()}
                <div style="padding: 44px 40px; text-align: center;">
                  <h2 style="color: #2C2824; font-family: Georgia, 'Times New Roman', serif; font-weight: 300; font-size: 28px; margin: 0 0 20px 0;">
                    ${lang === 'et' ? 'Sinu portaali link' : 'Your portal link'}
                  </h2>
                  <p style="color: #8A8578; line-height: 1.7; margin: 0 0 32px 0; font-size: 15px;">
                    ${lang === 'et' ? 'Kliki allpool olevat nuppu, et siseneda oma SUKODA portaali.' : 'Click the button below to access your SUKODA portal.'}
                  </p>
                  <a href="${portalUrl}" style="display: inline-block; background: #111111; color: #FFFFFF; padding: 16px 40px; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; font-weight: 500;">
                    ${lang === 'et' ? 'SISENE PORTAALI' : 'ENTER PORTAL'}
                  </a>
                  <p style="color: #8A8578; font-size: 12px; margin: 24px 0 0 0;">
                    ${lang === 'et' ? 'Link kehtib 30 päeva.' : 'This link is valid for 30 days.'}
                  </p>
                </div>
                ${emailFooter(lang)}
              </div>
            </body>
            </html>
          `,
        });

        await rateLimitRef.set({
          lastSent: admin.firestore.FieldValue.serverTimestamp(),
          count: admin.firestore.FieldValue.increment(1),
        }, { merge: true });

        res.status(200).json({ sent: true });
      } catch (error) {
        console.error('Magic link error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- GET /api/me ---
exports.getClientProfile = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 60, 60000)) return;
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId, order } = auth;

        // Refresh token expiry on use (same as validatePortalToken)
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);
        await db.collection('orders').doc(orderId).update({
          sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(newExpiry),
        });

        const bookingsSnapshot = await db.collection('bookings')
          .where('orderId', '==', orderId)
          .orderBy('scheduledAt', 'desc')
          .limit(20)
          .get();

        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          status: doc.data().status,
          scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString(),
          endTime: doc.data().endTime?.toDate?.()?.toISOString(),
        }));

        res.status(200).json({
          order: {
            id: orderId,
            package: order.package,
            size: order.size,
            status: order.status,
            subscriptionStatus: order.subscriptionStatus,
            customerName: order.customer?.name,
            customerEmail: order.customer?.email,
            customerPhone: order.customer?.phone,
            customerAddress: order.customer?.address,
            homeProfile: order.homeProfile || null,
            pausedAt: order.pausedAt?.toDate?.()?.toISOString() || null,
            pauseExpiresAt: order.pauseExpiresAt?.toDate?.()?.toISOString() || null,
            pauseReason: order.pauseReason || null,
            paidAt: order.paidAt?.toDate?.()?.toISOString() || null,
            referralCode: order.referralCode || null,
          },
          bookings,
        });
      } catch (error) {
        console.error('Get client profile error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/me/home-profile ---
exports.updateHomeProfile = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 30, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId } = auth;
        const { homeProfile } = req.body;

        if (!homeProfile || typeof homeProfile !== 'object') {
          return res.status(400).json({ error: 'Invalid home profile data' });
        }

        const sanitized = {
          access: String(homeProfile.access || '').slice(0, 500),
          pets: String(homeProfile.pets || '').slice(0, 300),
          allergies: String(homeProfile.allergies || '').slice(0, 300),
          flowerPreference: String(homeProfile.flowerPreference || '').slice(0, 300),
          linens: String(homeProfile.linens || '').slice(0, 300),
          towels: String(homeProfile.towels || '').slice(0, 300),
          specialRequests: String(homeProfile.specialRequests || '').slice(0, 500),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('orders').doc(orderId).update({
          homeProfile: sanitized,
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Update home profile error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/me/pause ---
exports.pauseSubscription = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 10, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId, order } = auth;

        if (order.status !== 'paid' || order.subscriptionStatus !== 'active') {
          return res.status(400).json({ error: 'Subscription is not active' });
        }

        if (order.pausedAt) {
          return res.status(400).json({ error: 'Subscription is already paused' });
        }

        const reason = String(req.body.reason || '').slice(0, 300);
        const now = new Date();
        const pauseExpiry = new Date(now);
        pauseExpiry.setDate(pauseExpiry.getDate() + 30);

        await db.collection('orders').doc(orderId).update({
          pausedAt: admin.firestore.Timestamp.fromDate(now),
          pauseExpiresAt: admin.firestore.Timestamp.fromDate(pauseExpiry),
          pauseReason: reason || null,
        });

        if (order.stripeSubscriptionId) {
          try {
            await getStripe().subscriptions.update(order.stripeSubscriptionId, {
              pause_collection: {
                behavior: 'mark_uncollectible',
                resumes_at: Math.floor(pauseExpiry.getTime() / 1000),
              },
            });
          } catch (stripeErr) {
            console.error('Stripe pause failed (non-fatal):', stripeErr);
          }
        }

        // Cancel upcoming bookings
        const upcomingBookings = await db.collection('bookings')
          .where('orderId', '==', orderId)
          .where('status', '==', 'confirmed')
          .where('scheduledAt', '>', admin.firestore.Timestamp.fromDate(now))
          .get();

        for (const bookingDoc of upcomingBookings.docs) {
          const booking = bookingDoc.data();
          if (booking.calBookingUid) {
            try {
              await calService.cancelBooking(booking.calBookingUid, 'Subscription paused by client');
            } catch (calErr) {
              console.error('Cal.com cancel failed during pause:', calErr);
            }
          }
          await bookingDoc.ref.update({
            status: 'cancelled',
            cancelReason: 'Tellimus pausil',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        await sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `SUKODA | Tellimus pausil: ${order.customer?.name || orderId}`,
          html: `<p>${order.customer?.name} (${order.customer?.email}) pani oma tellimuse pausile.</p><p>Põhjus: ${reason || 'Pole märgitud'}</p><p>Paus lõpeb: ${pauseExpiry.toLocaleDateString('et-EE')}</p>`,
        });

        res.status(200).json({
          success: true,
          pauseExpiresAt: pauseExpiry.toISOString(),
        });
      } catch (error) {
        console.error('Pause subscription error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/me/resume ---
exports.resumeSubscription = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 10, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId, order } = auth;

        if (!order.pausedAt) {
          return res.status(400).json({ error: 'Subscription is not paused' });
        }

        await db.collection('orders').doc(orderId).update({
          pausedAt: admin.firestore.FieldValue.delete(),
          pauseExpiresAt: admin.firestore.FieldValue.delete(),
          pauseReason: admin.firestore.FieldValue.delete(),
        });

        if (order.stripeSubscriptionId) {
          try {
            await getStripe().subscriptions.update(order.stripeSubscriptionId, {
              pause_collection: '',
            });
          } catch (stripeErr) {
            console.error('Stripe resume failed (non-fatal):', stripeErr);
          }
        }

        await sendEmail({
          to: NOTIFICATION_EMAIL,
          subject: `SUKODA | Tellimus jätkub: ${order.customer?.name || orderId}`,
          html: `<p>${order.customer?.name} (${order.customer?.email}) jätkab oma tellimust.</p>`,
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Resume subscription error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/me/reschedule ---
exports.clientReschedule = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 10, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId, order } = auth;
        const { bookingId, newStartTime, newDate, newTime: newLocalTime } = req.body;
        const bookingStartTime = (newDate && newLocalTime) ? tallinnLocalDateTimeToISOString(newDate, newLocalTime) : newStartTime;

        if (!bookingId || !bookingStartTime) {
          return res.status(400).json({ error: 'Missing bookingId or newStartTime' });
        }

        const bookingRef = db.collection('bookings').doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists || bookingDoc.data().orderId !== orderId) {
          return res.status(404).json({ error: 'Booking not found' });
        }

        const booking = bookingDoc.data();

        const newTime = new Date(bookingStartTime);
        const minTime = new Date();
        minTime.setHours(minTime.getHours() + MIN_BOOKING_LEAD_HOURS);
        if (newTime < minTime) {
          return res.status(400).json({
            error: `Uut aega saab valida vähemalt ${MIN_BOOKING_LEAD_HOURS}h ette`,
          });
        }

        if (booking.calBookingUid) {
          try {
            await calService.cancelBooking(booking.calBookingUid, 'Rescheduled by client');
          } catch (calErr) {
            console.error('Cal.com cancel failed during reschedule:', calErr);
          }
        }

        const eventTypeSlug = booking.eventTypeSlug || calService.EVENT_TYPE_SLUGS[booking.size] || 'koristus-90';
        let newCalBooking = null;

        // Only create Cal.com booking if original had one (real Cal.com bookings). Demo/manual bookings skip Cal.com.
        if (booking.calBookingUid) {
          try {
            newCalBooking = await calService.createBooking(
              eventTypeSlug,
              bookingStartTime,
              {
                name: booking.customerName || order.customer?.name,
                email: booking.customerEmail || order.customer?.email,
              },
              { orderId, bookingId: bookingDoc.id }
            );
          } catch (calErr) {
            console.error('Cal.com booking creation failed:', calErr);
            return res.status(500).json({ error: 'Failed to create new booking' });
          }
        }

        const oldScheduledAt = booking.scheduledAt;
        await bookingRef.update({
          scheduledAt: admin.firestore.Timestamp.fromDate(newTime),
          calBookingUid: newCalBooking?.uid ?? null,
          calBookingId: newCalBooking?.id ?? null,
          rescheduledAt: admin.firestore.FieldValue.serverTimestamp(),
          rescheduledBy: 'client',
          previousScheduledAt: oldScheduledAt,
        });

        res.status(200).json({
          success: true,
          newTime: newTime.toISOString(),
        });
      } catch (error) {
        console.error('Client reschedule error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });

// --- POST /api/me/logout-all ---
exports.logoutAllDevices = functions
  .runWith({ secrets: SECRETS }).region('europe-west1')
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      if (!checkRateLimit(req, res, 'portal', 10, 60000)) return;
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

      try {
        const auth = await authenticateClient(req);
        if (!auth) return res.status(401).json({ error: 'Unauthorized' });

        const { orderId } = auth;
        const crypto = require('crypto');
        const newToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 30);

        await db.collection('orders').doc(orderId).update({
          sessionTokenHash: tokenHash,
          sessionTokenExpiresAt: admin.firestore.Timestamp.fromDate(tokenExpiry),
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Logout all devices error:', error);
        res.status(500).json({ error: 'Server error' });
      }
    });
  });
