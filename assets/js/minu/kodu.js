/* Kodu view. Classic script (script src), not a Vite module. */
(function (root) {
  var bucket = root.SUKODA_MINU = root.SUKODA_MINU || {};
  var dict = bucket.dict = bucket.dict || {};
Object.assign(dict, {
  tabKodu: { et: 'Kodu', en: 'Home', ru: 'Дом' },
  tabServices: { et: 'Teenused', en: 'Services', ru: 'Услуги' },
  tabFolder: { et: 'Kaust', en: 'Folder', ru: 'Папка' },
  tabMine: { et: 'Minu', en: 'Profile', ru: 'Профиль' },
  tabHome: { et: 'Kaust', en: 'Folder', ru: 'Папка' },
  tabCalendar: { et: 'Ajad', en: 'Times', ru: 'Время' },
  hello: { et: 'Tere, ', en: 'Hello, ', ru: 'Здравствуйте, ' },
  logOut: { et: 'Logi välja', en: 'Log out', ru: 'Выйти' },
  warrantyUntil: { et: 'Garantii kuni {date}', en: 'Warranty until {date}', ru: 'Гарантия до {date}' },
  nextEyebrow: { et: 'Järgmine', en: 'Next', ru: 'Дальше' },
  unpaidPendingTitle: { et: 'Makse on veel tegemata', en: 'The payment is not done yet', ru: 'Оплата ещё не сделана' },
  unpaidPendingBody: { et: 'Koristuse aeg kinnitub pärast makset. Kui oled juba maksnud, kontrolli uuesti.', en: 'The cleaning time is confirmed after payment. If you have already paid, check again.', ru: 'Время уборки подтвердится после оплаты. Если вы уже оплатили, проверьте снова.' },
  unpaidFailedTitle: { et: 'Makse ei läinud läbi', en: 'The payment did not go through', ru: 'Оплата не прошла' },
  unpaidFailedBody: { et: 'Pank ei kinnitanud makset. Kui oled makse uuesti teinud, kontrolli siin.', en: 'The bank did not confirm the payment. If you have paid again, check here.', ru: 'Банк не подтвердил оплату. Если вы оплатили снова, проверьте здесь.' },
  checkAgain: { et: 'Kontrolli uuesti', en: 'Check again', ru: 'Проверить снова' },
  notCoveredBody: { et: 'Probleem ei kuulu garantiisse. Ava vastus ja otsusta, mida edasi teha.', en: 'The problem is not under warranty. Open the reply and decide what to do next.', ru: 'Проблема не входит в гарантию. Откройте ответ и решите, что делать дальше.' },
  needsNewTime: { et: 'Pakutud aeg ei sobinud. Paku uus päev.', en: 'The suggested time did not work. Suggest a new day.', ru: 'Предложенное время не подошло. Предложите другой день.' },
  openReply: { et: 'Ava vastus', en: 'Open the reply', ru: 'Открыть ответ' },
  openIt: { et: 'Ava', en: 'Open', ru: 'Открыть' },
  suggestDay: { et: 'Paku uus päev', en: 'Suggest a new day', ru: 'Предложить другой день' },
  waitingReply: { et: 'Vastus on veel tulemata. Kui tahad midagi lisada, ava ja kirjuta juurde.', en: 'The reply has not come yet. To add something, open it and write below.', ru: 'Ответ ещё не пришёл. Чтобы что-то добавить, откройте и напишите ниже.' },
  replyReadyBody: { et: 'Vastus on kirjas. Ava ja loe.', en: 'The reply is here. Open it and read.', ru: 'Ответ здесь. Откройте и прочитайте.' },
  alsoWaiting: { et: 'Vastus on veel tulemata: {name}.', en: 'Still waiting for a reply: {name}.', ru: 'Ответ ещё не пришёл: {name}.' },
  pendingTitle: { et: 'Uus aeg on kinnitamisel', en: 'A new time is waiting for confirmation', ru: 'Новое время ждёт подтверждения' },
  pendingBody: { et: 'Praegu kehtib aeg {when}. Kinnitus uue aja kohta tuleb siia.', en: 'For now the time is {when}. The confirmation of the new time comes here.', ru: 'Пока действует время {when}. Подтверждение нового времени придёт сюда.' },
  seeCalendar: { et: 'Ava kalender', en: 'Open the calendar', ru: 'Открыть календарь' },
  reschedule: { et: 'Muuda aega', en: 'Change the time', ru: 'Изменить время' },
  visitDo: { et: 'Kui aeg ei sobi, muuda aega.', en: 'If the time does not suit, change the time.', ru: 'Если время не подходит, измените время.' },
  visitAway: { et: 'Visiidi päeval oled eemal.', en: 'You are away on the visit day.', ru: 'В день визита вас нет дома.' },
  thenVisit: { et: 'Järgmine visiit on {when} kell {time}.', en: 'The next visit is {when} at {time}.', ru: 'Следующий визит {when} в {time}.' },
  awayTitle: { et: 'Oled eemal', en: 'You are away', ru: 'Вы в отъезде' },
  awayBody: { et: '{range}. Kui plaan muutub, muuda kuupäevi.', en: '{range}. If the plan changes, change the dates.', ru: '{range}. Если планы изменились, измените даты.' },
  editAway: { et: 'Muuda eemalolekut', en: 'Change the away dates', ru: 'Изменить даты отъезда' },
  firstOpenTitle: { et: 'Kolm asja enne esimest visiiti', en: 'Three things before the first visit', ru: 'Три вещи до первого визита' },
  firstOpenBody: { et: 'Kirjuta, kus on voodipesu, milliseid lilli eelistad ja kuidas koristaja sisse saab. Koristaja näeb vastuseid igal visiidil.', en: 'Write where the linens are, which flowers you prefer and how the cleaner gets in. The cleaner sees these answers on every visit.', ru: 'Напишите, где лежит постельное бельё, какие цветы вы предпочитаете и как уборщик попадёт внутрь. Уборщик видит эти ответы на каждом визите.' },
  firstOpenAction: { et: 'Täida', en: 'Fill in', ru: 'Заполнить' },
  welcomeEyebrow: { et: 'Uus kodu', en: 'New home', ru: 'Новый дом' },
  welcomeTitle: { et: 'Vali esimene koristus', en: 'Pick the first clean', ru: 'Выберите первую уборку' },
  welcomeBody: { et: 'Arco kingib esimese koristuse. Vali sobiv päev, maksta ei ole vaja.', en: 'Arco gives the first clean. Pick a day that suits you, there is nothing to pay.', ru: 'Arco дарит первую уборку. Выберите удобный день, платить не нужно.' },
  welcomeAction: { et: 'Vali aeg', en: 'Pick a time', ru: 'Выбрать время' },
  upcomingTitle: { et: 'Järgmised visiidid', en: 'Upcoming visits', ru: 'Ближайшие визиты' },
  upcomingEmpty: { et: 'Kinnitatud aega veel ei ole. Telli koristus, kui soovid.', en: 'No time is confirmed yet. Order a clean if you wish.', ru: 'Подтверждённого времени пока нет. Закажите уборку, если хотите.' },
  orderCleanBtn: { et: 'Telli koristus', en: 'Order a clean', ru: 'Заказать уборку' },
  pastTitle: { et: 'Tehtud visiidid', en: 'Past visits', ru: 'Прошедшие визиты' },
  lastVisitLabel: { et: 'Viimane visiit', en: 'Last visit', ru: 'Последний визит' },
  doneOn: { et: 'Tehtud {date}', en: 'Done {date}', ru: 'Сделано {date}' },
  standingTitle: { et: 'Püsikoristus', en: 'Standing clean', ru: 'Постоянная уборка' },
  allClearTitle: { et: 'Järgmist visiiti ei ole plaanis', en: 'No visit is planned', ru: 'Визитов пока не запланировано' },
  allClearBody: { et: 'Kui kodus on midagi katki, teata probleemist. Garantii ajal on ülevaatus tasuta.', en: 'If something at home is broken, report the problem. During the warranty the inspection is free.', ru: 'Если дома что-то сломалось, сообщите о проблеме. В гарантийный срок осмотр бесплатный.' },
  allClearOrderBody: { et: 'Kui vajad koristust või remondimeest, telli Teenuste alt.', en: 'If you need a clean or a handyman, order it under Services.', ru: 'Если нужна уборка или мастер, закажите в разделе «Услуги».' },
  orderService: { et: 'Telli teenus', en: 'Order a service', ru: 'Заказать услугу' },
  reportProblem: { et: 'Teata probleemist', en: 'Report a problem', ru: 'Сообщить о проблеме' },
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
  notedOpen: { et: 'Panime soovi kirja. Kui see teenus sinu kodule avaneb, anname ise teada.', en: 'We noted your wish. If this service opens for your home, we will let you know.', ru: 'Мы записали ваше пожелание. Если эта услуга откроется для вашего дома, мы сообщим.' },
  questionIn: { et: 'Küsimus on kirjas. Vastus tuleb siia.', en: 'The question is noted. The reply comes here.', ru: 'Вопрос записан. Ответ придёт сюда.' },
  issueIn: { et: 'Probleem on kirjas. Vastus tuleb siia.', en: 'The problem is noted. The reply comes here.', ru: 'Проблема записана. Ответ придёт сюда.' },
  visitIn: { et: 'Soov on kirjas. Kui aeg on kinnitatud, näed aega Kodu vaates.', en: 'The request is noted. Once the time is confirmed, you will see it on the Home tab.', ru: 'Заявка записана. Когда время подтвердят, вы увидите его на вкладке Дом.' },
  questionNamed: { et: '{name} vastab kirjalikult. Vastus tuleb siia.', en: '{name} answers in writing. The reply comes here.', ru: '{name} ответит письменно. Ответ придёт сюда.' },
  issueNamed: { et: '{name} vaatab probleemi üle. Vastus tuleb siia.', en: '{name} reviews the problem. The reply comes here.', ru: '{name} рассмотрит проблему. Ответ придёт сюда.' },
  visitNamed: { et: '{name} kinnitab aja. Kinnitus tuleb siia.', en: '{name} confirms the time. The confirmation comes here.', ru: '{name} подтвердит время. Подтверждение придёт сюда.' },
  proposeQuiet: { et: 'Uus aeg kinnitatakse siin ja kõik pere kontaktid saavad uue kalendrikutse.', en: 'The new time is confirmed here and every household contact gets an updated invite.', ru: 'Новое время подтверждается здесь, и все контакты семьи получат приглашение.' },
  proposeNamed: { et: '{name} kinnitab uue aja ja kõik pere kontaktid saavad uue kalendrikutse.', en: '{name} confirms the new time and every household contact gets an updated invite.', ru: '{name} подтвердит новое время, и все контакты семьи получат приглашение.' },
  proposeHint: { et: 'Paku sobiv päev.', en: 'Suggest a day.', ru: 'Предложите день.' },
  proposeHintNamed: { et: 'Paku sobiv päev. {name} kinnitab täpse kellaaja.', en: 'Suggest a day. {name} confirms the exact time.', ru: 'Предложите день. {name} подтвердит точное время.' },
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

function openClean(requests) {
  return (requests || []).some((r) => ['requested', 'confirmed'].includes(r.status) && (r.serviceId === 'extra-clean' || r.category === 'cleaning'));
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
      action2: '',
      thenLine: thenVisit(vm),
    };
  }

  if (vm.extrasLoaded && !upcoming.length && vm.arcoCleanLine && !openClean(requests)) {
    return {
      kind: 'welcome',
      refId: '',
      pending: false,
      eyebrow: t('welcomeEyebrow'),
      title: t('welcomeTitle'),
      body: t('welcomeBody'),
      action: t('welcomeAction'),
      action2: '',
      thenLine: '',
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
    const who = vm.showProvider ? (visit.providerName || (vm.order && vm.order.provider && vm.order.provider.name) || '') : '';
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

  const answer = vm.extrasLoaded && requests.find((r) => r.status === 'answered');
  if (answer) {
    return {
      kind: 'request',
      refId: answer.id,
      pending: false,
      eyebrow: t('nextEyebrow'),
      title: reqTitle(vm, answer),
      body: t('replyReadyBody'),
      action: t('openReply'),
      thenLine: '',
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
      action: t('openIt'),
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

  // A home without a warranty service (no developer behind it) is pointed to Services instead
  const canReport = ((vm.extras && vm.extras.catalogue) || []).some((s) => s && s.id === 'warranty-claim');
  return {
    kind: 'calm',
    refId: '',
    pending: false,
    eyebrow: t('nextEyebrow'),
    title: t('allClearTitle'),
    body: t(canReport ? 'allClearBody' : 'allClearOrderBody'),
    action: t(canReport ? 'reportProblem' : 'orderService'),
    thenLine: '',
  };
}
  bucket.pickNextThing = pickNextThing;
})(typeof globalThis !== 'undefined' ? globalThis : this);
