/* Kodu view. Classic script (script src), not a Vite module. */
(function (root) {
  var bucket = root.SUKODA_MINU = root.SUKODA_MINU || {};
  var dict = bucket.dict = bucket.dict || {};
Object.assign(dict, {
  tabKodu: { et: 'Kodu', en: 'Home', ru: 'Дом' },
  tabCalendar: { et: 'Kalender', en: 'Calendar', ru: 'Календарь' },
  hello: { et: 'Tere, ', en: 'Hello, ', ru: 'Здравствуйте, ' },
  logOut: { et: 'Logi välja', en: 'Log out', ru: 'Выйти' },
  warrantyUntil: { et: 'Garantii kuni {date}', en: 'Warranty until {date}', ru: 'Гарантия до {date}' },
  nextEyebrow: { et: 'Järgmine', en: 'Next', ru: 'Дальше' },
  unpaidPendingTitle: { et: 'Tellimus on maksmata', en: 'The order is unpaid', ru: 'Заказ не оплачен' },
  unpaidPendingBody: { et: 'Visiidid ilmuvad siia pärast makset. Kui oled juba maksnud, kontrolli uuesti.', en: 'Visits show up here after payment. If you have already paid, check again.', ru: 'Визиты появятся здесь после оплаты. Если вы уже оплатили, проверьте снова.' },
  unpaidFailedTitle: { et: 'Makse ei läinud läbi', en: 'The payment did not go through', ru: 'Оплата не прошла' },
  unpaidFailedBody: { et: 'Pank ei kinnitanud makset. Kui oled selle uuesti teinud, kontrolli siin.', en: 'The bank did not confirm the payment. If you have paid again, check here.', ru: 'Банк не подтвердил оплату. Если вы оплатили снова, проверьте здесь.' },
  checkAgain: { et: 'Kontrolli uuesti', en: 'Check again', ru: 'Проверьте снова' },
  notCoveredBody: { et: 'See ei kuulu garantiisse. Ava vastus ja otsusta, mida teha.', en: 'This is not under warranty. Open the reply and decide what to do.', ru: 'Это не входит в гарантию. Откройте ответ и решите, что делать.' },
  needsNewTime: { et: 'See aeg ei sobinud. Paku uus päev.', en: 'That time did not work. Suggest a new day.', ru: 'Это время не подошло. Предложите другой день.' },
  openReply: { et: 'Ava vastus', en: 'Open the reply', ru: 'Откройте ответ' },
  suggestDay: { et: 'Paku uus päev', en: 'Suggest a new day', ru: 'Предложите другой день' },
  waitingReply: { et: 'Vastust pole veel. Ava vestlus, kui tahad midagi lisada.', en: 'There is no reply yet. Open the thread if you want to add something.', ru: 'Ответа ещё нет. Откройте переписку, если хотите что-то добавить.' },
  alsoWaiting: { et: 'Vastust pole veel: {name}.', en: 'Still no reply: {name}.', ru: 'Ответа ещё нет: {name}.' },
  pendingTitle: { et: 'Uus aeg on kinnitamisel', en: 'A new time is waiting', ru: 'Новое время ждёт подтверждения' },
  pendingBody: { et: 'Praegune aeg on {when}. Oota kinnitust.', en: 'The current time is {when}. Wait for confirmation.', ru: 'Сейчас назначено {when}. Дождитесь подтверждения.' },
  seeCalendar: { et: 'Ava kalender', en: 'Open the calendar', ru: 'Откройте календарь' },
  reschedule: { et: 'Muuda aega', en: 'Change the time', ru: 'Измените время' },
  visitDo: { et: 'Kui aeg ei sobi, muuda seda.', en: 'Change the time if it does not suit.', ru: 'Если время не подходит, измените его.' },
  visitAway: { et: 'Sel päeval oled eemal.', en: 'You are away that day.', ru: 'В этот день вас нет дома.' },
  thenVisit: { et: 'Järgmine visiit on {when} kell {time}.', en: 'The next visit is {when} at {time}.', ru: 'Следующий визит {when} в {time}.' },
  awayTitle: { et: 'Oled eemal', en: 'You are away', ru: 'Вы в отъезде' },
  awayBody: { et: '{range}. Kui plaan muutub, muuda kuupäevi.', en: '{range}. If the plan changes, change the dates.', ru: '{range}. Если планы изменились, измените даты.' },
  editAway: { et: 'Muuda eemalolekut', en: 'Change the away dates', ru: 'Измените даты отъезда' },
  firstOpenTitle: { et: 'Kolm asja enne esimest visiiti', en: 'Three things before the first visit', ru: 'Три вещи до первого визита' },
  firstOpenBody: { et: 'Voodipesu, lilled ja kuidas sisse saada. Koduhooldaja näeb neid igal visiidil.', en: 'Linens, flowers and how to get in. The housekeeper sees them on every visit.', ru: 'Постельное бельё, цветы и как войти. Специалист по дому видит это на каждом визите.' },
  firstOpenAction: { et: 'Täida', en: 'Fill in', ru: 'Заполните' },
  allClearTitle: { et: 'Praegu ei oota sind miski', en: 'Nothing is waiting on you', ru: 'Сейчас от вас ничего не требуется' },
  allClearBody: { et: 'Kui kodus on midagi katki, teata sellest ühe lausega.', en: 'If something at home is broken, report it in one sentence.', ru: 'Если дома что-то сломалось, сообщите об этом одним предложением.' },
  reportProblem: { et: 'Teata probleemist', en: 'Report a problem', ru: 'Сообщите о проблеме' },
  loadingTitle: { et: 'Vaatan, mis sind ootab', en: 'Checking what is waiting', ru: 'Смотрю, что вас ждёт' },
  loadingBody: { et: 'Üks hetk.', en: 'One moment.', ru: 'Одну секунду.' },
  emergency: { et: 'Avarii 24h', en: 'Emergency 24h', ru: 'Авария 24 ч' },
  cleaning: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
  flowers: { et: 'Lilled', en: 'Flowers', ru: 'Цветы' },
  replyTitle: { et: 'Vastus', en: 'Reply', ru: 'Ответ' },
  sentOn: { et: 'Saadetud {date}', en: 'Sent {date}', ru: 'Отправлено {date}' },
  newTimePending: { et: 'Uus aeg ootel: {what}', en: 'New time pending: {what}', ru: 'Новое время ждёт: {what}' },
  pending: { et: 'Ootel', en: 'Pending', ru: 'Ждёт' },
  overdue: { et: 'Üle aja', en: 'Overdue', ru: 'Срок прошёл' },
  dueSoon: { et: 'Peagi', en: 'Due', ru: 'Скоро' },
  overdueOn: { et: 'Aeg möödas · {date}', en: 'Overdue · {date}', ru: 'Срок прошёл · {date}' },
  dueOn: { et: 'Peagi · {date}', en: 'Soon · {date}', ru: 'Скоро · {date}' },
  orderDoer: { et: 'telli: {name}', en: 'order: {name}', ru: 'закажите: {name}' },
  statusRequested: { et: 'Ootab vastust', en: 'Awaiting reply', ru: 'Ждёт ответа' },
  statusConfirmed: { et: 'Kinnitatud', en: 'Confirmed', ru: 'Подтверждено' },
  statusCompleted: { et: 'Tehtud', en: 'Done', ru: 'Сделано' },
  statusAnswered: { et: 'Vastatud', en: 'Answered', ru: 'Ответ дан' },
  statusDeclined: { et: 'Vajab uut aega', en: 'Needs a new time', ru: 'Нужно новое время' },
  statusCancelled: { et: 'Tühistatud', en: 'Cancelled', ru: 'Отменено' },
  statusReviewed: { et: 'Vaadatud üle', en: 'Reviewed', ru: 'Просмотрено' },
});

const FAILED_SUB = new Set(['past_due', 'unpaid', 'incomplete', 'incomplete_expired']);

function unpaidKind(order) {
  if (!order) return '';
  if (FAILED_SUB.has(order.subscriptionStatus)) return 'failed';
  if (order.status === 'pending') return 'pending';
  return '';
}

function dayOf(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

function awayCovers(away, day) {
  if (!day) return false;
  return (away || []).some((p) => p && p.from && p.from <= day && day <= (p.to || p.from));
}

function awayRange(vm) {
  const list = (vm.extras && vm.extras.away) || [];
  return list.map((p) => vm.formatDateShort(p.from) + (p.to && p.to !== p.from ? ' – ' + vm.formatDateShort(p.to) : '')).join(' · ');
}

function reqTitle(vm, r) {
  if (!r) return vm.t('replyTitle');
  if (vm.lang === 'et') return r.serviceName || vm.t('replyTitle');
  return r.serviceNameEn || r.serviceName || vm.t('replyTitle');
}

function thenVisit(vm) {
  const visit = (vm.upcomingBookings || [])[0];
  if (!visit) return '';
  return vm.t('thenVisit', { when: vm.formatDate(visit.scheduledAt), time: vm.formatTime(visit.scheduledAt) });
}

function waitingQuestion(requests) {
  return (requests || []).find((r) => r.status === 'requested' && (r.kind === 'question' || r.kind === 'issue'));
}

/**
 * One card. Money first, then a reply the resident must act on,
 * then the next visit, then a question still waiting, then away, then calm.
 */
function pickNextThing(vm) {
  const t = (key, vars) => vm.t(key, vars);
  const requests = (vm.extras && vm.extras.requests) || [];
  const upcoming = vm.upcomingBookings || [];
  const pendingIds = vm.pendingRescheduleIds || [];
  const pay = unpaidKind(vm.order);

  if (pay) {
    const failed = pay === 'failed';
    return {
      kind: 'unpaid',
      refId: '',
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: t(failed ? 'unpaidFailedTitle' : 'unpaidPendingTitle'),
      body: t(failed ? 'unpaidFailedBody' : 'unpaidPendingBody'),
      action: t('checkAgain'),
      thenLine: thenVisit(vm),
    };
  }

  const declined = vm.extrasLoaded && requests.find((r) => r.status === 'declined');
  if (declined) {
    const notCovered = typeof vm.isNotCovered === 'function' && vm.isNotCovered(declined);
    return {
      kind: 'request',
      refId: declined.id,
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: reqTitle(vm, declined),
      body: notCovered ? t('notCoveredBody') : t('needsNewTime'),
      action: notCovered ? t('openReply') : t('suggestDay'),
      thenLine: thenVisit(vm),
    };
  }

  const visit = upcoming[0];
  if (visit) {
    const pendingTime = pendingIds.includes(visit.id);
    const when = vm.formatDate(visit.scheduledAt) + (vm.formatTime(visit.scheduledAt) ? ' ' + vm.formatTime(visit.scheduledAt) : '');
    const who = visit.providerName || (vm.order && vm.order.provider && vm.order.provider.name) || '';
    const bits = [vm.formatTime(visit.scheduledAt), vm.visitLabel(visit), who].filter(Boolean).join(' · ');
    let body = pendingTime ? t('pendingBody', { when }) : (bits ? bits + '. ' + t('visitDo') : t('visitDo'));
    if (!pendingTime && awayCovers(vm.extras && vm.extras.away, dayOf(visit.scheduledAt))) body += ' ' + t('visitAway');
    const waiting = vm.extrasLoaded && waitingQuestion(requests);
    return {
      kind: 'visit',
      refId: visit.id,
      pending: pendingTime,
      eyebrow: t('nextEyebrow'),
      title: pendingTime ? t('pendingTitle') : vm.formatDate(visit.scheduledAt),
      body,
      action: pendingTime ? t('seeCalendar') : t('reschedule'),
      thenLine: waiting ? t('alsoWaiting', { name: reqTitle(vm, waiting) }) : '',
    };
  }

  const waiting = vm.extrasLoaded && waitingQuestion(requests);
  if (waiting) {
    return {
      kind: 'request',
      refId: waiting.id,
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: reqTitle(vm, waiting),
      body: t('waitingReply'),
      action: t('openReply'),
      thenLine: '',
    };
  }

  if (vm.extrasLoaded && (vm.extras.away || []).length) {
    return {
      kind: 'away',
      refId: '',
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: t('awayTitle'),
      body: t('awayBody', { range: awayRange(vm) }),
      action: t('editAway'),
      thenLine: '',
    };
  }

  if (!vm.extrasLoaded) {
    return {
      kind: 'loading',
      refId: '',
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: t('loadingTitle'),
      body: t('loadingBody'),
      action: '',
      thenLine: '',
    };
  }

  const hp = vm.homeProfile;
  if (hp && typeof hp === 'object') {
    const missing = ['linens', 'flowerPreference', 'access'].filter((k) => !String(hp[k] || '').trim());
    if (missing.length) {
      return {
        kind: 'profile',
        refId: '',
        pending: false,
        eyebrow: t('nextEyebrow'),
        title: t('firstOpenTitle'),
        body: t('firstOpenBody'),
        action: t('firstOpenAction'),
        thenLine: '',
      };
    }
  }

  return {
    kind: 'calm',
    refId: '',
    pending: false,
    eyebrow: t('nextEyebrow'),
    title: t('allClearTitle'),
    body: t('allClearBody'),
    action: t('reportProblem'),
    thenLine: '',
  };
}
  bucket.pickNextThing = pickNextThing;
})(typeof globalThis !== 'undefined' ? globalThis : this);
