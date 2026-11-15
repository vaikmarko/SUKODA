import { add } from './dict.js';

add({
  tabServices: { et: 'Teenused', en: 'Services', ru: 'Услуги' },
  yoursTitle: { et: 'Sinu teenused', en: 'Your services', ru: 'Ваши услуги' },
  yoursEmpty: { et: 'Kinnitatud aega veel ei ole. Vali allpool teenus.', en: 'No time is confirmed yet. Choose a service below.', ru: 'Подтверждённого времени пока нет. Выберите услугу ниже.' },
  giftRow: { et: 'Esimene koristus', en: 'The first clean', ru: 'Первая уборка' },
  giftStatus: { et: 'Kingitus', en: 'Gift', ru: 'Подарок' },
  giftCleanMeta: { et: 'Arco kingib esimese koristuse. Vali sobiv päev, maksta ei ole vaja.', en: 'Arco gives the first clean. Pick a day that suits you, there is nothing to pay.', ru: 'Arco дарит первую уборку. Выберите удобный день, платить не нужно.' },
  giftPickClean: { et: 'Vali aeg', en: 'Pick a time', ru: 'Выбрать время' },
  addTitle: { et: 'Lisa juurde', en: 'Add more', ru: 'Добавить ещё' },
  orderClean: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
  extraCleanRow: { et: 'Lisakoristus', en: 'Extra clean', ru: 'Дополнительная уборка' },
  orderFix: { et: 'Remondimees', en: 'Handyman', ru: 'Мастер' },
  orderWarranty: { et: 'Garantii', en: 'Warranty', ru: 'Гарантия' },
  orderDay: { et: 'Päev', en: 'Day', ru: 'День' },
  orderTime: { et: 'Kellaaeg', en: 'Time of day', ru: 'Время дня' },
  orderMorning: { et: 'Hommik', en: 'Morning', ru: 'Утро' },
  orderAfternoon: { et: 'Pärastlõuna', en: 'Afternoon', ru: 'После обеда' },
  orderAny: { et: 'Kogu päev', en: 'All day', ru: 'Весь день' },
  withNextVisitBtn: { et: 'Järgmise koristusega · {date}', en: 'With next clean · {date}', ru: 'Со следующей уборкой · {date}' },
  pickSeparateDay: { et: 'Eraldi päeval', en: 'Separate day', ru: 'В другой день' },
  moreExtrasShow: { et: '+ Rohkem lisateenuseid', en: '+ More extra services', ru: '+ Ещё допуслуги' },
  moreExtrasHide: { et: 'Peida muud lisateenused', en: 'Hide extra services', ru: 'Скрыть допуслуги' },
  expandHomeServices: { et: '+ Lisa teine teenus sinu kodule', en: '+ Add another service to your home', ru: '+ Добавить другую услугу к дому' },
  collapseHomeServices: { et: 'Peida teised teenused', en: 'Hide other services', ru: 'Скрыть другие услуги' },
  otherServicesLead: { et: 'Too oma kodu juurde ka lapsehoidja, koerajalutaja, remondimees või aednik. Valid spetsialisti, kes juba SUKODA kodudes käib, või kutsud oma usaldatud inimese.', en: 'Add childcare, pet care, a handyman or garden care to your home. Pick a specialist who already serves SUKODA homes, or invite your own trusted person.', ru: 'Подключите к своему дому няню, выгул собаки, мастера или уход за садом. Выберите специалиста, который уже работает в домах SUKODA, или пригласите своего человека.' },
  trustHomesBadge: { et: 'Püsivalt {homes} kodus · {visits} tehtud visiiti', en: 'Active in {homes} homes · {visits} completed visits', ru: 'Постоянно в домах: {homes} · визитов: {visits}' },
  trustNewBadge: { et: 'Uus platvormil', en: 'New on SUKODA', ru: 'Новый специалист' },
  directDealNote: { et: 'Lepid aja ja arvelduse kokku otse valitud spetsialistiga.', en: 'You agree times and billing directly with your chosen specialist.', ru: 'Время и расчёт вы согласуете напрямую с выбранным специалистом.' },
  pickSpecialistBtn: { et: 'Vali ja saada soov', en: 'Select and send a note', ru: 'Выбрать и написать' },
  connectNoteLabel: { et: 'Kirjuta lühidalt, mida ja millal vajad', en: 'Write briefly what you need and when', ru: 'Коротко напишите, что и когда нужно' },
  connectSendBtn: { et: 'Ühenda koduga ja saada', en: 'Connect to home and send', ru: 'Подключить к дому и отправить' },
  connectDoneMsg: { et: '{name} on sinu koduga ühendatud ja sai sinu sõnumi.', en: '{name} is connected to your home and received your note.', ru: '{name} подключён(а) к вашему дому и получил(а) ваше сообщение.' },
  inviteOwnHeading: { et: 'Kutsu oma tuttav spetsialist', en: 'Invite your own trusted person', ru: 'Пригласить своего специалиста' },
  inviteOwnHint: { et: 'Saadame talle e-kirjaga tasuta töölaua kutse. Kui ta sisse logib, ilmub ta automaatselt sinu kodu juurde.', en: 'We send them a free desk invite by e-mail. Once they sign in, they appear under your home automatically.', ru: 'Мы отправим приглашение на бесплатный рабочий стол. После входа специалист автоматически появится у вашего дома.' },
  inviteSendBtn: { et: 'Saada kutse', en: 'Send invite', ru: 'Отправить приглашение' },
  inviteSentDone: { et: 'Kutse on saadetud. Kui spetsialist töölaua avab, ühendatakse ta sinu koduga.', en: 'Invite sent. Once they open their desk, they are connected to your home.', ru: 'Приглашение отправлено. Когда специалист откроет рабочий стол, он подключится к вашему дому.' },
  noOpenSpecialists: { et: 'Selles valdkonnas ei ole praegu vabu spetsialiste nimekirjas. Kutsu allpool oma tuttav inimene.', en: 'No open specialists are listed in this category right now. Invite your own trusted person below.', ru: 'Сейчас в этой категории нет свободных специалистов в списке. Пригласите своего человека ниже.' },
  feedbackShortLead: { et: 'Tagasiside eelmise korra kohta või märkus järgmiseks visiidiks.', en: 'Feedback on the last visit or a note for the next one.', ru: 'Отзыв о прошлом визите или заметка к следующему.' },
  noteSentCleaner: { et: 'Sõnum on saadetud. Vastus tuleb siia, Sinu teenuste alla.', en: 'Your message is sent. The reply comes here, under Your services.', ru: 'Сообщение отправлено. Ответ придёт сюда, в раздел «Ваши услуги».' },
  addonFlowers: { et: 'Lilled', en: 'Flowers', ru: 'Цветы' },
  addonWindows: { et: 'Aknapesu', en: 'Window washing', ru: 'Мытьё окон' },
  addonLinens: { et: 'Voodipesu vahetus', en: 'Linen change', ru: 'Смена постельного белья' },
  addonAppliance: { et: 'Kodumasinate hooldus', en: 'Appliance care', ru: 'Уход за бытовой техникой' },
  addonSeason: { et: 'Hooajaline kimp', en: 'Seasonal bouquet', ru: 'Сезонный букет' },
  addonTone: { et: 'Oma valik', en: 'Your choice', ru: 'Свой выбор' },
  flowerTonePh: { et: 'nt valged tulbid, mitte liiliaid', en: 'e.g. white tulips, no lilies', ru: 'напр. белые тюльпаны, без лилий' },
  flowerLine: { et: 'Lilled: {choice}.', en: 'Flowers: {choice}.', ru: 'Цветы: {choice}.' },
  rhythmLabel: { et: 'Kui tihti', en: 'How often', ru: 'Как часто' },
  rhythmOnce: { et: 'Üks kord', en: 'Once', ru: 'Один раз' },
  rhythmWeek: { et: 'Igal nädalal', en: 'Every week', ru: 'Каждую неделю' },
  rhythmTwo: { et: 'Üle nädala', en: 'Every other week', ru: 'Раз в две недели' },
  rhythmMonth: { et: 'Kord kuus', en: 'Once a month', ru: 'Раз в месяц' },
  rhythmHint: { et: 'Esimene koristus on valitud päeval. Edasi käib koristus sama rütmiga.', en: 'The first clean is on the day you pick. After that the cleans follow the same rhythm.', ru: 'Первая уборка — в выбранный день. Дальше уборки идут в том же ритме.' },
  rhythmNote: { et: 'Edaspidi {rhythm}.', en: 'After that, {rhythm}.', ru: 'Дальше — {rhythm}.' },
  monthPrev: { et: 'Eelmine', en: 'Previous', ru: 'Назад' },
  monthNext: { et: 'Järgmine', en: 'Next', ru: 'Вперёд' },
  weekDays: { et: 'E T K N R L P', en: 'Mo Tu We Th Fr Sa Su', ru: 'Пн Вт Ср Чт Пт Сб Вс' },
  cleanOnce: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
  warrantyLead: { et: 'Kui kodus on midagi katki, kirjelda probleemi. Garantii ajal on ülevaatus tasuta.', en: 'If something at home is broken, describe the problem. During the warranty the inspection is free.', ru: 'Если дома что-то сломалось, опишите проблему. В гарантийный срок осмотр бесплатный.' },
  fixLead: { et: 'Kirjuta, mida remondimees tegema peaks.', en: 'Write what the handyman should do.', ru: 'Напишите, что должен сделать мастер.' },
  telliOn: { et: 'Lisatud', en: 'Added', ru: 'Добавлено' },
  telliOff: { et: 'Lisa', en: 'Add', ru: 'Добавить' },
  orderNote: { et: 'Kirjeldus', en: 'Description', ru: 'Описание' },
  orderNotePhFix: { et: 'nt köögi kraan tilgub ja esiku lamp ei põle', en: 'e.g. the kitchen tap drips and the hall light does not work', ru: 'напр. капает кран на кухне и не горит лампа в прихожей' },
  orderNotePhWarranty: { et: 'nt vannitoa uks ei sulgu, hing on vajunud', en: 'e.g. the bathroom door does not close, the hinge has dropped', ru: 'напр. дверь в ванную не закрывается, петля просела' },
  confirmPay: { et: 'Maksa {amount}', en: 'Pay {amount}', ru: 'Оплатить {amount}' },
  confirmOrder: { et: 'Telli', en: 'Order', ru: 'Заказать' },
  sendWarranty: { et: 'Saada', en: 'Send', ru: 'Отправить' },
  giftCovers: { et: 'Selle koristuse eest maksma ei pea.', en: 'You do not pay for this clean.', ru: 'За эту уборку платить не нужно.' },
  giftNote: { et: 'Arco kingib esimese koristuse.', en: 'Arco gives the first clean.', ru: 'Arco дарит первую уборку.' },
  telliSent: { et: 'Soov on saadetud. Kui aeg on kinnitatud, näed aega Sinu teenuste all.', en: 'Your request is sent. Once the time is confirmed, you will see it under Your services.', ru: 'Заявка отправлена. Когда время подтвердят, вы увидите его в разделе «Ваши услуги».' },
  telliSentNamed: { et: '{name} kinnitab aja ja hinna. Arve tuleb temalt.', en: '{name} confirms the time and the price. The invoice comes from them.', ru: '{name} подтвердит время и цену. Счёт придёт от них.' },
  orderWarrantySent: { et: 'Probleem on saadetud. Vastus tuleb siia, Sinu teenuste alla.', en: 'The problem is sent. The reply comes here, under Your services.', ru: 'Проблема отправлена. Ответ придёт сюда, в раздел «Ваши услуги».' },
  telliSending: { et: 'Saadan…', en: 'Sending…', ru: 'Отправляю…' },
  telliFailed: { et: 'Saatmine ei õnnestunud. Proovi uuesti.', en: 'Sending did not work. Try again.', ru: 'Отправить не удалось. Попробуйте снова.' },
  telliNoteOnce: { et: 'Üks koristus.', en: 'One clean.', ru: 'Одна уборка.' },
  telliNoteExtras: { et: 'Lisad: {list}.', en: 'Extras: {list}.', ru: 'Дополнительно: {list}.' },
  telliHome: { et: 'Olen sel ajal kodus.', en: 'I will be home.', ru: 'Я буду дома.' },
  orderPast: { et: 'Varasemad', en: 'Earlier', ru: 'Ранее' },
  warrantyFree: { et: 'Tasuta', en: 'Free', ru: 'Бесплатно' },
  photoAdd: { et: 'Lisa foto', en: 'Add a photo', ru: 'Добавить фото' },
  photoAttached: { et: 'Foto on kaasas.', en: 'The photo is attached.', ru: 'Фото приложено.' },
  noted: { et: 'Huvi on kirjas. Seda teenust veel ei ole. Anname teada, kui see avaneb.', en: 'Your interest is noted. This service is not here yet. We will tell you when it opens.', ru: 'Интерес записан. Этой услуги пока нет. Мы сообщим, когда она появится.' },
  gatherLead: { et: 'Seda teenust veel ei ole. Kui soovid, paneme huvi kirja.', en: 'This service is not here yet. If you want it, we note your interest.', ru: 'Этой услуги пока нет. Если она вам нужна, мы запишем интерес.' },
  wantIt: { et: 'Soovin', en: 'I want this', ru: 'Хочу' },
  noPrice: { et: 'Sellel teenusel ei ole veel hinda, seepärast ei saa seda praegu tellida.', en: 'This service has no price yet, so it cannot be ordered right now.', ru: 'У этой услуги пока нет цены, поэтому заказать её сейчас нельзя.' },
  paidBack: { et: 'Makse õnnestus. Aeg on näha Kodu vaates.', en: 'Payment done. The time is shown on the Home tab.', ru: 'Оплата прошла. Время видно на вкладке Дом.' },
  payCancelled: { et: 'Makse jäi pooleli. Koristust ei tellitud, proovi uuesti.', en: 'The payment was not completed. The clean was not ordered, try again.', ru: 'Оплата не завершена. Уборка не заказана, попробуйте снова.' },
  includedShort: {
    et: 'Voodipesu, rätikud ja masinate hooldus on sees.',
    en: 'Bed linen, towels and appliance care are included.',
    ru: 'Постельное бельё, полотенца и уход за техникой входят.',
  },
});

const choiceButtons = `
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" @click="flowerMode = 'season'" :class="flowerMode === 'season' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('addonSeason')"></button>
                    <button type="button" @click="flowerMode = 'tone'" :class="flowerMode === 'tone' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('addonTone')"></button>
                </div>
                <input x-show="flowerMode === 'tone'" x-cloak type="text" x-model="flowerTone" maxlength="200" :placeholder="t('flowerTonePh')" class="w-full mt-3 bg-white border border-line focus:border-accent outline-none px-4 py-3 font-sans font-light text-base">`;

function dayFields() {
  return `
                <div class="mt-4">
                    <div class="flex items-center justify-between gap-3">
                        <button type="button" class="p-btn-2 p-btn-sm" @click="shiftTelliMonth(-1)" x-text="t('monthPrev')"></button>
                        <p class="font-sans text-sm capitalize" x-text="telliMonthLabel"></p>
                        <button type="button" class="p-btn-2 p-btn-sm" @click="shiftTelliMonth(1)" x-text="t('monthNext')"></button>
                    </div>
                    <div class="grid grid-cols-7 gap-1 mt-3">
                        <template x-for="name in telliWeekdays" :key="name">
                            <span class="text-center eyebrow" x-text="name"></span>
                        </template>
                        <template x-for="cell in telliMonthCells" :key="cell.key">
                            <button type="button" :disabled="cell.disabled" @click="pickTelliDay(cell)" class="py-2 text-sm font-sans border disabled:opacity-20" :class="cell.pad ? 'border-transparent' : (cell.iso === telliDate ? 'bg-black text-paper border-black' : 'border-line bg-white')" x-text="cell.label"></button>
                        </template>
                    </div>
                </div>
                <div class="mt-4">
                    <p class="eyebrow" x-text="t('orderTime')"></p>
                    <div class="grid grid-cols-3 gap-2 mt-2">
                        <button type="button" @click="telliWindow = 'morning'" :class="telliWindow === 'morning' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('orderMorning')"></button>
                        <button type="button" @click="telliWindow = 'afternoon'" :class="telliWindow === 'afternoon' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('orderAfternoon')"></button>
                        <button type="button" @click="telliWindow = 'any'" :class="telliWindow === 'any' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('orderAny')"></button>
                    </div>
                </div>`;
}

const whenFields = `<div x-show="!telliGathering">${dayFields()}</div>`;
const extraWhenFields = `
                <div x-show="!telliGathering">
                    <div x-show="canAttachToNextClean" class="grid sm:grid-cols-2 gap-2 mt-3">
                        <button type="button" @click="selectTelliWithVisit()" :class="telliTiming === 'next' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 px-3 border text-sm font-sans" x-text="t('withNextVisitBtn', { date: nextCleanShort })"></button>
                        <button type="button" @click="selectTelliSeparateDay()" :class="telliTiming === 'pick' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 px-3 border text-sm font-sans" x-text="t('pickSeparateDay')"></button>
                    </div>
                    <div x-show="!canAttachToNextClean || telliTiming === 'pick'">${dayFields()}</div>
                </div>`;
const gatherLead = `<p x-show="telliGathering && !telliNoted" x-cloak class="text-sm text-muted font-sans font-light mb-4" x-text="t('gatherLead')"></p>`;
const gatherDone = `<p x-show="telliNoted" x-cloak class="text-sm font-sans font-light" x-text="t('noted')"></p>`;

function extraServiceBlock(listExpr) {
  return `
            <template x-for="svc in ${listExpr}" :key="svc.id">
                <div class="border-b border-line">
                    <button type="button" class="w-full py-4 text-left" @click="setTelliOpen(svc.id)">
                        <span class="flex items-baseline justify-between gap-4">
                            <span class="font-sans text-base" x-text="svc.name"></span>
                            <span class="text-sm text-muted font-sans font-light shrink-0" x-text="addonPrice(svc.id)"></span>
                        </span>
                        <span class="block text-sm text-muted font-sans font-light mt-1" x-text="svc.description"></span>
                    </button>
                    <form x-show="telliOpen === svc.id" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                        ${gatherLead}
                        <div x-show="!telliNoted">
                            <div x-show="svc.id === 'flowers'" class="mb-3">
                                ${choiceButtons}
                            </div>
                            <div x-show="svc.id !== 'flowers'" class="mb-2">
                                <label class="eyebrow" :for="'telli-note-' + svc.id" x-text="t(svc.id === 'other' ? 'noteWhatNeed' : 'detailsLabel')"></label>
                                <textarea :id="'telli-note-' + svc.id" x-model="telliNote" :rows="svc.id === 'other' ? 3 : 2" maxlength="500" :placeholder="telliExtraPlaceholder(svc.id)" class="w-full mt-2 bg-white border border-line focus:border-accent outline-none p-3 font-sans font-light text-base placeholder:text-line-strong resize-none"></textarea>
                            </div>
                            ${extraWhenFields}
                            <button type="submit" :disabled="telliBusy || (!telliGathering && (!telliEffectiveDate || (svc.id === 'other' && (telliNote || '').trim().length < 5) || (svc.id === 'flowers' && flowerMode === 'tone' && (flowerTone || '').trim().length < 2) || (telliQuote && telliQuote.unpriced && !showProvider)))" class="p-btn p-btn-wrap w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : (telliGathering ? t('wantIt') : telliButtonLabel)"></button>
                        </div>
                        ${gatherDone}
                    </form>
                </div>
            </template>`;
}

export const telliHtml = `<div x-show="activeTab === 'extras'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
    <div class="max-w-xl min-w-0">
        <p class="eyebrow" x-text="t('yoursTitle')"></p>
        <div class="mt-4 border-t border-line">
            <template x-for="row in serviceRows" :key="row.id">
                <div class="py-4 border-b border-line">
                    <div class="flex items-baseline justify-between gap-4">
                        <p class="font-sans text-base" x-text="row.name"></p>
                        <p class="text-sm text-muted font-sans font-light shrink-0" x-text="row.status"></p>
                    </div>
                    <p class="text-sm text-muted font-sans font-light mt-1" x-show="row.meta" x-text="row.meta"></p>
                    <button type="button" x-show="row.pick" class="text-sm font-sans mt-3 underline underline-offset-4" @click="openTelli(row.open)" x-text="t(row.pick)"></button>
                    <button type="button" x-show="row.open === 'thread'" class="text-sm font-sans mt-3 underline underline-offset-4" @click="openServiceRow(row)" x-text="row.hasReply ? t('openReply') : t('openIt')"></button>
                </div>
            </template>
            <p x-show="extrasLoaded && !serviceRows.length" class="py-4 text-sm text-muted font-sans font-light" x-text="t('yoursEmpty')"></p>
        </div>

        <p class="eyebrow mt-12" x-text="t('addTitle')"></p>
        <p x-show="extras.provider && extras.provider.priceNote" x-cloak class="text-sm text-muted font-sans font-light mt-2" x-text="extras.provider && extras.provider.priceNote"></p>
        <div class="mt-2 border-t border-line">
            ${extraServiceBlock('telliPrimaryExtras')}

            <div class="border-b border-line" x-show="canOrderCleanRow">
                <button type="button" class="w-full py-4 text-left" @click="openPaidClean()">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="nextCleanVisit ? t('extraCleanRow') : t('cleanOnce')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="cleanRowPrice"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="addonText('extra-clean')"></span>
                </button>
                <form x-show="telliOpen === 'clean'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    ${gatherLead}
                    <div x-show="!telliNoted">
                    <p class="eyebrow" x-show="!telliGathering && !arcoCleanLine && !telliPay" x-text="t('rhythmLabel')"></p>
                    <div class="grid grid-cols-2 gap-2 mt-2" x-show="!telliGathering && !arcoCleanLine && !telliPay">
                        <button type="button" @click="telliRhythm = 'once'" :class="telliRhythm === 'once' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmOnce')"></button>
                        <button type="button" @click="telliRhythm = 'weekly'" :class="telliRhythm === 'weekly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmWeek')"></button>
                        <button type="button" @click="telliRhythm = 'biweekly'" :class="telliRhythm === 'biweekly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmTwo')"></button>
                        <button type="button" @click="telliRhythm = 'monthly'" :class="telliRhythm === 'monthly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmMonth')"></button>
                    </div>
                    <p x-show="!telliGathering && telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired && telliRhythm === 'once'" class="text-sm text-muted font-sans font-light mt-3" x-text="t('giftCovers')"></p>
                    <p x-show="!telliGathering && telliRhythm !== 'once'" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="t('rhythmHint')"></p>
                    ${whenFields}
                    <div class="mt-6 border-t border-line" x-show="!telliGathering && visibleTelliAddonRows.length">
                        <template x-for="row in visibleTelliAddonRows" :key="row.id">
                            <button type="button" @click="toggleTelliAddon(row.id)" class="w-full py-3 border-b border-line text-left">
                                <span class="flex items-baseline justify-between gap-4">
                                    <span class="font-sans text-base" x-text="addonName(row.serviceId)"></span>
                                    <span class="text-sm font-sans shrink-0" :class="telliAddons[row.id] ? 'text-black' : 'text-muted'" x-text="telliAddons[row.id] ? t('telliOn') : (addonPrice(row.serviceId) || t('telliOff'))"></span>
                                </span>
                                <span class="block text-sm text-muted font-sans font-light mt-1" x-text="addonText(row.serviceId)"></span>
                            </button>
                        </template>
                    </div>
                    <div x-show="telliAddons.flowers" x-cloak class="mt-4">
                        ${choiceButtons}
                    </div>
                    <p x-show="!telliGathering && telliSumAmount && !quoteHasFloor && !showProvider" class="font-serif text-3xl font-light mt-6" x-text="telliSumAmount"></p>
                    <p x-show="!telliGathering && telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired" x-cloak class="text-sm text-muted font-sans font-light mt-2" x-text="t('giftCovers')"></p>
                    <button type="submit" :disabled="telliBusy || (!telliGathering && (!telliDate || (telliQuote && telliQuote.unpriced && !showProvider) || (telliAddons.flowers && flowerMode === 'tone' && (flowerTone || '').trim().length < 2)))" class="p-btn p-btn-wrap w-full mt-6 disabled:opacity-40">
                        <span x-show="!telliBusy" x-text="telliGathering ? t('wantIt') : telliButtonLabel"></span>
                        <span x-show="telliBusy" x-cloak x-text="t('telliSending')"></span>
                    </button>
                    </div>
                    ${gatherDone}
                </form>
            </div>

            <div x-show="telliMoreExtras.length" class="border-b border-line">
                <button type="button" class="w-full py-3.5 text-left text-sm font-sans text-muted hover:text-black transition-colors" @click="showMoreExtras = !showMoreExtras" x-text="showMoreExtras ? t('moreExtrasHide') : t('moreExtrasShow')"></button>
            </div>
            <div x-show="showMoreExtras" x-cloak>
                ${extraServiceBlock('telliMoreExtras')}
            </div>

            <div class="border-b border-line" x-show="!showProvider || isOrderable(serviceById('small-repairs'))">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('fix')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('orderFix')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="addonPrice('small-repairs')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="t('fixLead')"></span>
                </button>
                <form x-show="telliOpen === 'fix'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    ${gatherLead}
                    <div x-show="!telliNoted">
                    <label class="eyebrow" for="telli-note-fix" x-text="t('orderNote')"></label>
                    <textarea id="telli-note-fix" x-model="telliNote" rows="4" maxlength="500" :placeholder="t('orderNotePhFix')" class="w-full mt-2 bg-white border border-line focus:border-accent outline-none p-4 font-sans font-light text-base placeholder:text-line-strong resize-none"></textarea>
                    ${whenFields}
                    <button type="submit" :disabled="telliBusy || (telliNote || '').trim().length < 5 || (!telliGathering && (!telliDate || (telliQuote && telliQuote.unpriced && !showProvider)))" class="p-btn p-btn-wrap w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : (telliGathering ? t('wantIt') : telliButtonLabel)"></button>
                    </div>
                    ${gatherDone}
                </form>
            </div>

            <!-- Connected childcare, pet care & garden services -->
            ${extraServiceBlock('telliConnectedPartnerServices')}

            <div class="border-b border-line" x-show="!showProvider">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('warranty')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('reportProblem')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="t('warrantyFree')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="t('warrantyLead')"></span>
                </button>
                <form x-show="telliOpen === 'warranty'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    <label class="eyebrow" for="telli-note-warranty" x-text="t('orderNote')"></label>
                    <textarea id="telli-note-warranty" x-model="telliNote" rows="4" maxlength="500" :placeholder="t('orderNotePhWarranty')" class="w-full mt-2 bg-white border border-line focus:border-accent outline-none p-4 font-sans font-light text-base placeholder:text-line-strong resize-none"></textarea>
                    <label class="mt-4 flex items-center gap-3 text-sm font-sans cursor-pointer">
                        <input type="file" accept="image/*" class="sr-only" @change="onTelliPhoto($event)">
                        <span class="p-btn-2 p-btn-sm" x-text="t('photoAdd')"></span>
                        <span x-show="telliPhotoName" class="text-muted font-light truncate" x-text="telliPhotoName"></span>
                    </label>
                    ${whenFields}
                    <button type="submit" :disabled="telliBusy || !telliDate || ((telliNote || '').trim().length < 5 && !telliPhotoName)" class="p-btn w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : t('sendWarranty')"></button>
                </form>
            </div>

            <div class="border-b border-line" x-show="hasCleaner">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('note')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('writeCleaner')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="t('feedbackShortLead')"></span>
                </button>
                <form x-show="telliOpen === 'note'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    <label class="eyebrow" for="telli-note-cleaner" x-text="t('noteMessage')"></label>
                    <textarea id="telli-note-cleaner" x-model="telliNote" rows="3" maxlength="500" :placeholder="t('phCleaningNote')" class="w-full mt-2 bg-white border border-line focus:border-accent outline-none p-4 font-sans font-light text-base placeholder:text-line-strong resize-none"></textarea>
                    <button type="submit" :disabled="telliBusy || (telliNote || '').trim().length < 5" class="p-btn w-full mt-4 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : t('sendWord')"></button>
                </form>
            </div>
        </div>
        <p x-show="telliQuote && telliQuote.unpriced && !showProvider && !telliGathering && telliOpen && telliOpen !== 'warranty' && telliOpen !== 'note'" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="t('noPrice')"></p>
        <p x-show="telliError" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="telliError"></p>
        <p x-show="telliDone && !telliGathering" x-cloak class="text-sm font-sans font-light mt-3" x-text="telliDone"></p>

        <!-- Quiet expansion: add another home/family service (childcare, pet care, handyman, garden, cleaning) -->
        <div x-show="expandableCategories.length" x-cloak class="mt-10 pt-6 border-t border-line">
            <button type="button" @click="showExpandServices = !showExpandServices; expandCategory = ''" class="text-sm font-sans underline underline-offset-4 hover:text-accent transition-colors" x-text="showExpandServices ? t('collapseHomeServices') : t('expandHomeServices')"></button>
            <div x-show="showExpandServices" x-cloak class="mt-4 space-y-4">
                <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="t('otherServicesLead')"></p>
                <div class="flex flex-wrap gap-2">
                    <template x-for="cat in expandableCategories" :key="cat.id">
                        <button type="button" @click="selectExpandCategory(cat.id)" :class="expandCategory === cat.id ? 'bg-black text-paper border-black' : 'border-line bg-white text-black hover:border-accent'" class="px-4 py-2.5 border text-sm font-sans transition-colors" x-text="cat.label"></button>
                    </template>
                </div>

                <div x-show="expandCategory" x-cloak class="space-y-6 pt-2">
                    <!-- Open specialists in this category -->
                    <div x-show="directoryForCategory(expandCategory).length" class="space-y-3">
                        <p class="text-xs text-muted font-sans font-light" x-text="t('directDealNote')"></p>
                        <template x-for="sp in directoryForCategory(expandCategory)" :key="sp.id">
                            <div class="bg-white border border-line p-5">
                                <div class="flex flex-wrap items-baseline justify-between gap-2">
                                    <p class="font-serif text-xl font-light" x-text="sp.name + (sp.businessName ? ' · ' + sp.businessName : '')"></p>
                                    <span class="eyebrow text-accent" x-text="sp.activeHomes > 0 || sp.completedVisits > 0 ? t('trustHomesBadge', { homes: sp.activeHomes, visits: sp.completedVisits }) : t('trustNewBadge')"></span>
                                </div>
                                <p x-show="sp.area" class="text-xs text-muted font-sans font-light mt-1" x-text="sp.area"></p>
                                <p x-show="sp.bio" class="text-sm font-sans font-light mt-2 leading-relaxed" x-text="sp.bio"></p>
                                <p x-show="sp.priceNote" class="text-xs text-muted font-sans mt-2" x-text="sp.priceNote"></p>
                                <button type="button" x-show="connectTargetId !== sp.id" @click="connectTargetId = sp.id; connectNote = ''; connectError = ''" class="p-btn-2 p-btn-sm mt-4" x-text="t('pickSpecialistBtn')"></button>
                                <form x-show="connectTargetId === sp.id" x-cloak class="mt-4 pt-4 border-t border-line space-y-3" @submit.prevent="connectSpecialist(sp)">
                                    <label class="eyebrow" x-text="t('connectNoteLabel')"></label>
                                    <textarea x-model="connectNote" rows="3" maxlength="500" required class="w-full bg-paper border border-line focus:border-accent outline-none p-3 font-sans font-light text-base resize-none"></textarea>
                                    <p x-show="connectError" x-cloak class="text-xs text-accent font-sans" x-text="connectError"></p>
                                    <div class="flex gap-3">
                                        <button type="button" @click="connectTargetId = ''" class="p-btn-2 p-btn-sm" x-text="t('docCancel')"></button>
                                        <button type="submit" :disabled="connectBusy || connectNote.trim().length < 3" class="p-btn p-btn-sm" x-text="connectBusy ? t('telliSending') : t('connectSendBtn')"></button>
                                    </div>
                                </form>
                            </div>
                        </template>
                    </div>
                    <p x-show="!directoryForCategory(expandCategory).length" class="text-sm text-muted font-sans font-light" x-text="t('noOpenSpecialists')"></p>

                    <!-- Invite own trusted specialist -->
                    <form x-show="!viewer || viewer.primary" class="bg-white border border-line p-5 space-y-4" @submit.prevent="inviteOwnSpecialist()">
                        <p class="eyebrow" x-text="t('inviteOwnHeading')"></p>
                        <p class="text-xs text-muted font-sans font-light leading-relaxed" x-text="t('inviteOwnHint')"></p>
                        <div class="grid sm:grid-cols-2 gap-4">
                            <label class="block">
                                <span class="eyebrow mb-1" x-text="t('nameLabel')"></span>
                                <input type="text" x-model="partnerInvite.name" maxlength="120" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                            </label>
                            <label class="block">
                                <span class="eyebrow mb-1" x-text="t('emailLabel')"></span>
                                <input type="email" x-model="partnerInvite.email" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                            </label>
                        </div>
                        <button type="submit" :disabled="partnerInvite.busy || !partnerInvite.email" class="p-btn p-btn-sm" x-text="partnerInvite.busy ? t('telliSending') : t('inviteSendBtn')"></button>
                        <p x-show="partnerInvite.done" x-cloak class="text-sm font-sans font-light" x-text="t('inviteSentDone')"></p>
                        <p x-show="partnerInvite.error" x-cloak class="text-sm text-accent font-sans font-light" x-text="partnerInvite.error"></p>
                    </form>
                </div>
            </div>
        </div>
        <p x-show="connectSuccess" x-cloak class="text-sm font-sans font-light mt-4" x-text="connectSuccess"></p>

        <div x-show="pastRequests.length" x-cloak class="mt-8">
            <button type="button" @click="showPastOrders = !showPastOrders" class="eyebrow" x-text="showPastOrders ? t('hideIt') : t('orderPast')"></button>
            <div x-show="showPastOrders" x-cloak class="mt-2 border-t border-line">
                <template x-for="r in pastRequests" :key="r.id">
                    <button type="button" @click="openThread(r)" class="w-full py-3 border-b border-line flex items-baseline justify-between gap-4 text-left">
                        <span class="font-sans text-sm" x-text="r.serviceName"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="requestStatusLabel(r.status, r)"></span>
                    </button>
                </template>
            </div>
        </div>
    </div>
</div>`;
