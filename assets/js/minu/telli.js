import { add } from './dict.js';

add({
  tabServices: { et: 'Telli', en: 'Book', ru: 'Услуги' },
  yoursTitle: { et: 'Sinu teenused', en: 'Your services', ru: 'Ваши услуги' },
  yoursEmpty: { et: 'Kinnitatud aega veel ei ole. Vali allpool teenus.', en: 'No time is confirmed yet. Choose a service below.', ru: 'Подтверждённого времени пока нет. Выберите услугу ниже.' },
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
  otherServicesLead: { et: 'Vali vaba spetsialist või kutsu oma inimene.', en: 'Pick an open specialist or invite your own person.', ru: 'Выберите специалиста или пригласите своего.' },
  trustHomesBadge: { et: 'Püsivalt {homes} kodus · {visits} tehtud visiiti', en: 'Active in {homes} homes · {visits} completed visits', ru: 'Работает в домах: {homes} · визитов: {visits}' },
  trustNewBadge: { et: 'Uus platvormil', en: 'New on SUKODA', ru: 'Новый специалист' },
  directDealNote: { et: 'Lepid aja ja arvelduse kokku otse valitud spetsialistiga.', en: 'You agree times and billing directly with your chosen specialist.', ru: 'Время и расчёт вы согласуете напрямую с выбранным специалистом.' },
  pickSpecialistBtn: { et: 'Vali ja saada soov', en: 'Select and send a note', ru: 'Выбрать и написать' },
  connectNoteLabel: { et: 'Kirjuta lühidalt, mida ja millal vajad', en: 'Write briefly what you need and when', ru: 'Коротко напишите, что и когда нужно' },
  connectSendBtn: { et: 'Ühenda koduga ja saada', en: 'Connect to home and send', ru: 'Подключить к дому и отправить' },
  connectDoneMsg: { et: '{name} on sinu koduga ühendatud ja sai sinu sõnumi.', en: '{name} is connected to your home and received your note.', ru: '{name} подключён(а) к вашему дому и получил(а) ваше сообщение.' },
  inviteOwnHeading: { et: 'Kutsu oma tuttav spetsialist', en: 'Invite your own trusted person', ru: 'Пригласить своего специалиста' },
  inviteOwnHint: { et: 'Saadame kutse — sisselogimisel ilmub ta sinu kodu juurde.', en: 'We send an invite — once signed in, they appear under your home.', ru: 'Отправим приглашение — после входа он появится у вашего дома.' },
  inviteSendBtn: { et: 'Saada kutse', en: 'Send invite', ru: 'Отправить приглашение' },
  inviteSentDone: { et: 'Kutse on saadetud. Kui spetsialist töölaua avab, ühendatakse ta sinu koduga.', en: 'Invite sent. Once they open their desk, they are connected to your home.', ru: 'Приглашение отправлено. Когда специалист откроет рабочий стол, он подключится к вашему дому.' },
  noOpenSpecialists: { et: 'Selles valdkonnas ei ole praegu vabu spetsialiste nimekirjas. Kutsu allpool oma tuttav inimene.', en: 'No open specialists are listed in this category right now. Invite your own trusted person below.', ru: 'В этой категории пока нет специалистов. Пригласите своего ниже.' },
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
  fixLead: { et: 'Kirjuta, mida remondimees tegema peaks.', en: 'Write what the handyman should do.', ru: 'Напишите, что должен сделать мастер.' },
  telliOn: { et: 'Lisatud', en: 'Added', ru: 'Добавлено' },
  telliOff: { et: 'Lisa', en: 'Add', ru: 'Добавить' },
  orderNote: { et: 'Kirjeldus', en: 'Description', ru: 'Описание' },
  orderNotePhFix: { et: 'nt köögi kraan tilgub ja esiku lamp ei põle', en: 'e.g. the kitchen tap drips and the hall light does not work', ru: 'напр. капает кран на кухне и не горит лампа в прихожей' },
  confirmPay: { et: 'Maksa {amount}', en: 'Pay {amount}', ru: 'Оплатить {amount}' },
  confirmOrder: { et: 'Telli', en: 'Order', ru: 'Заказать' },
  giftCovers: { et: 'Selle koristuse eest maksma ei pea.', en: 'You do not pay for this clean.', ru: 'За эту уборку платить не нужно.' },
  telliSent: { et: 'Soov on saadetud. Kui aeg on kinnitatud, näed aega Sinu teenuste all.', en: 'Your request is sent. Once the time is confirmed, you will see it under Your services.', ru: 'Заявка отправлена. Когда время подтвердят, вы увидите его в разделе «Ваши услуги».' },
  telliSentNamed: { et: '{name} kinnitab aja ja hinna. Arve tuleb temalt.', en: '{name} confirms the time and the price. The invoice comes from them.', ru: '{name} подтвердит время и цену. Счёт выставит специалист.' },
  telliSending: { et: 'Saadan…', en: 'Sending…', ru: 'Отправка…' },
  telliFailed: { et: 'Saatmine ei õnnestunud. Proovi uuesti.', en: 'Sending did not work. Try again.', ru: 'Отправить не удалось. Попробуйте снова.' },
  telliNoteOnce: { et: 'Üks koristus.', en: 'One clean.', ru: 'Одна уборка.' },
  telliNoteExtras: { et: 'Lisad: {list}.', en: 'Extras: {list}.', ru: 'Дополнительно: {list}.' },
  telliHome: { et: 'Olen sel ajal kodus.', en: 'I will be home.', ru: 'Я буду дома.' },
  orderPast: { et: 'Varasemad', en: 'Earlier', ru: 'Ранее' },
  photoAttached: { et: 'Foto on kaasas.', en: 'The photo is attached.', ru: 'Фото приложено.' },
  noted: { et: 'Huvi on kirjas. Seda teenust veel ei ole. Anname teada, kui see avaneb.', en: 'Your interest is noted. This service is not here yet. We will tell you when it opens.', ru: 'Интерес записан. Этой услуги пока нет. Мы сообщим, когда она появится.' },
  gatherLead: { et: 'Seda teenust veel ei ole. Kui soovid, paneme huvi kirja.', en: 'This service is not here yet. If you want it, we note your interest.', ru: 'Этой услуги пока нет. Если она вам нужна, мы запишем интерес.' },
  wantIt: { et: 'Soovin', en: 'I want this', ru: 'Хочу' },
  noPrice: { et: 'Sellel teenusel ei ole veel hinda, seepärast ei saa seda praegu tellida.', en: 'This service has no price yet, so it cannot be ordered right now.', ru: 'У этой услуги пока нет цены, поэтому заказать её сейчас нельзя.' },
  paidBack: { et: 'Makse õnnestus. Aeg on näha Kodu vaates.', en: 'Payment done. The time is shown on the Home tab.', ru: 'Оплата прошла. Время видно на вкладке «Главная».' },
  payCancelled: { et: 'Makse jäi pooleli. Koristust ei tellitud, proovi uuesti.', en: 'The payment was not completed. The clean was not ordered, try again.', ru: 'Оплата не завершена. Уборка не заказана, попробуйте снова.' },
  includedShort: {
    et: 'Voodipesu, rätikud ja masinate hooldus on sees.',
    en: 'Bed linen, towels and appliance care are included.',
    ru: 'Постельное бельё, полотенца и уход за техникой входят в стоимость.',
  },
  inProgress: { et: 'Töös', en: 'In progress', ru: 'В работе' },
  offersBy: { et: '{name} pakub', en: '{name} offers', ru: '{name} предлагает' },
  offersPlain: { et: 'Saad tellida', en: 'You can book', ru: 'Можно заказать' },
  blurbClean: { et: 'Üks kord või kindla rütmiga', en: 'Once, or on a set rhythm', ru: 'Один раз или по графику' },
  blurbWindows: { et: 'Koos koristusega või eraldi päeval', en: 'With a clean, or on its own day', ru: 'Вместе с уборкой или в другой день' },
  blurbFlowers: { et: 'Hooajaline kimp või oma valik', en: 'A seasonal bouquet, or your own choice', ru: 'Сезонный букет или свой выбор' },
  blurbOther: { et: 'Kirjuta {name}, mida vajad', en: 'Write to {name} what you need', ru: 'Напишите {name}, что вам нужно' },
  blurbOtherPlain: { et: 'Kirjuta, mida vajad', en: 'Write what you need', ru: 'Напишите, что вам нужно' },
  otherWish: { et: 'Muu soov', en: 'Another wish', ru: 'Другое пожелание' },
  otherDay: { et: 'Muu päev', en: 'Another day', ru: 'Другой день' },
  confirmTime: { et: 'Kinnita aeg', en: 'Confirm the time', ru: 'Подтвердить время' },
  confirmsTime: { et: '{name} kinnitab aja', en: '{name} confirms the time', ru: '{name} подтвердит время' },
  confirmsFlowers: { et: '{name} kinnitab ja toob kimbu kaasa.', en: '{name} confirms and brings the bouquet.', ru: '{name} подтвердит и принесёт букет.' },
  bouquet: { et: 'Kimp', en: 'Bouquet', ru: 'Букет' },
  amountWord: { et: 'Summa', en: 'Amount', ru: 'Сумма' },
  whenWord: { et: 'Millal', en: 'When', ru: 'Когда' },
  addonsLabel: { et: 'Lisad', en: 'Extras', ru: 'Дополнительно' },
  orderFlowersPriced: { et: 'Telli lilled · {amount}', en: 'Order flowers · {amount}', ru: 'Заказать цветы · {amount}' },
  amountLess: { et: 'Vähenda summat', en: 'Lower the amount', ru: 'Уменьшить сумму' },
  amountMore: { et: 'Suurenda summat', en: 'Raise the amount', ru: 'Увеличить сумму' },
});

const chev = `<svg class="p-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>`;
const backIcon = `<svg class="p-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/></svg>`;

const choiceButtons = `
<div class="grid grid-cols-2 gap-2 mt-2.5">
    <button type="button" @click="flowerMode = 'season'" :class="flowerMode === 'season' ? 'is-on' : ''" class="p-seg" x-text="t('addonSeason')"></button>
    <button type="button" @click="flowerMode = 'tone'" :class="flowerMode === 'tone' ? 'is-on' : ''" class="p-seg" x-text="t('addonTone')"></button>
</div>
<input x-show="flowerMode === 'tone'" x-cloak type="text" x-model="flowerTone" maxlength="200" :placeholder="t('flowerTonePh')" :aria-label="t('addonTone')" class="p-field">`;

function dayFields() {
  return `
<div class="mt-5">
    <div class="flex items-baseline justify-between gap-3">
        <p class="eyebrow" x-text="t('orderDay')"></p>
        <button type="button" class="text-sm" @click="telliCalOpen = !telliCalOpen" x-text="t('otherDay')"></button>
    </div>
    <div class="grid grid-cols-5 gap-2 mt-2.5">
        <template x-for="day in telliSoonDays" :key="day.key">
            <button type="button" class="p-day" :class="day.iso === telliDate ? 'is-on' : ''" :aria-pressed="day.iso === telliDate" @click="pickTelliDay(day)">
                <small x-text="day.letter"></small>
                <b x-text="day.label"></b>
            </button>
        </template>
    </div>
    <p class="text-sm mt-2" x-show="telliDate && telliSoonDays.every(day => day.iso !== telliDate)" x-cloak x-text="formatDateShort(telliDate)"></p>
    <div class="mt-4" x-show="telliCalOpen" x-cloak>
        <div class="flex items-center justify-between gap-3">
            <button type="button" class="text-sm" @click="shiftTelliMonth(-1)" x-text="t('monthPrev')"></button>
            <p class="text-sm capitalize" x-text="telliMonthLabel"></p>
            <button type="button" class="text-sm" @click="shiftTelliMonth(1)" x-text="t('monthNext')"></button>
        </div>
        <div class="grid grid-cols-7 gap-1 mt-3">
            <template x-for="name in telliWeekdays" :key="name">
                <span class="text-center eyebrow" x-text="name"></span>
            </template>
            <template x-for="cell in telliMonthCells" :key="cell.key">
                <button type="button" class="p-day p-day-sm" :disabled="cell.disabled" @click="pickTelliDay(cell)" :class="cell.pad ? 'is-pad' : (cell.iso === telliDate ? 'is-on' : '')"><b x-text="cell.label"></b></button>
            </template>
        </div>
    </div>
</div>
<div class="mt-5">
    <p class="eyebrow" x-text="t('orderTime')"></p>
    <div class="grid grid-cols-3 gap-2 mt-2.5">
        <button type="button" @click="telliWindow = 'morning'" :class="telliWindow === 'morning' ? 'is-on' : ''" class="p-seg" x-text="t('orderMorning')"></button>
        <button type="button" @click="telliWindow = 'afternoon'" :class="telliWindow === 'afternoon' ? 'is-on' : ''" class="p-seg" x-text="t('orderAfternoon')"></button>
        <button type="button" @click="telliWindow = 'any'" :class="telliWindow === 'any' ? 'is-on' : ''" class="p-seg" x-text="t('orderAny')"></button>
    </div>
</div>`;
}

const whenFields = `<div x-show="!telliGathering">${dayFields()}</div>`;
const extraWhenFields = `
<div x-show="!telliGathering">
    <div x-show="canAttachToNextClean" class="grid grid-cols-2 gap-2 mt-2.5">
        <button type="button" @click="selectTelliWithVisit()" :class="telliTiming === 'next' ? 'is-on' : ''" class="p-seg" x-text="t('withNextVisitBtn', { date: nextCleanShort })"></button>
        <button type="button" @click="selectTelliSeparateDay()" :class="telliTiming === 'pick' ? 'is-on' : ''" class="p-seg" x-text="t('pickSeparateDay')"></button>
    </div>
    <div x-show="!canAttachToNextClean || telliTiming === 'pick'">${dayFields()}</div>
</div>`;
const gatherLead = `<p x-show="telliGathering && !telliNoted" x-cloak class="text-sm text-muted mt-4" x-text="t('gatherLead')"></p>`;
const gatherDone = `<p x-show="telliNoted" x-cloak class="text-sm mt-4" x-text="t('noted')"></p>`;

function offerRows(listExpr) {
  return `
<template x-for="svc in ${listExpr}" :key="svc.id">
    <button type="button" class="p-row" @click="setTelliOpen(svc.id)">
        <span class="min-w-0">
            <span class="p-row-name" x-text="svc.name"></span>
            <span class="p-row-meta" x-text="offerBlurb(svc.id)"></span>
        </span>
        <span class="p-row-side"><span x-show="addonPrice(svc.id)" x-text="addonPrice(svc.id)"></span>${chev}</span>
    </button>
</template>`;
}

export const telliHtml = `<div x-show="activeTab === 'extras'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
    <div class="max-w-xl min-w-0">
        <div x-show="!telliOpen">
            <h1 class="p-home-title" x-text="t('tabServices')"></h1>
            <p x-show="extrasLoaded && !serviceRows.length" class="text-sm text-muted mt-4" x-text="t('yoursEmpty')"></p>

            <div x-show="serviceRows.length" class="mt-6">
                <p class="eyebrow" x-text="t('inProgress')"></p>
                <div class="p-rows mt-2.5">
                    <template x-for="row in serviceRows" :key="row.id">
                        <button type="button" class="p-row" @click="row.open === 'thread' && openServiceRow(row)">
                            <span class="min-w-0">
                                <span class="p-row-name" x-text="row.name"></span>
                                <span class="p-row-meta" x-show="row.meta" x-text="row.meta"></span>
                            </span>
                            <span class="p-pill" x-text="row.status"></span>
                        </button>
                    </template>
                </div>
            </div>

            <p class="eyebrow mt-6" x-text="providerFirstName ? t('offersBy', { name: providerFirstName }) : t('offersPlain')"></p>
            <p x-show="extras.provider && extras.provider.priceNote" x-cloak class="text-sm text-muted mt-2" x-text="extras.provider && extras.provider.priceNote"></p>
            <div class="p-rows mt-2.5">
                <template x-if="canOrderCleanRow">
                    <button type="button" class="p-row" @click="openPaidClean()">
                        <span class="min-w-0">
                            <span class="p-row-name" x-text="nextCleanVisit ? t('extraCleanRow') : t('cleanOnce')"></span>
                            <span class="p-row-meta" x-text="offerBlurb('extra-clean')"></span>
                        </span>
                        <span class="p-row-side"><span x-show="cleanRowPrice" x-text="cleanRowPrice"></span>${chev}</span>
                    </button>
                </template>
                ${offerRows('telliPrimaryExtras')}
                ${offerRows('telliConnectedPartnerServices')}
                <template x-if="!showProvider || isOrderable(serviceById('small-repairs'))">
                    <button type="button" class="p-row" @click="setTelliOpen('fix')">
                        <span class="min-w-0">
                            <span class="p-row-name" x-text="t('orderFix')"></span>
                            <span class="p-row-meta" x-text="offerBlurb('small-repairs')"></span>
                        </span>
                        <span class="p-row-side"><span x-show="addonPrice('small-repairs')" x-text="addonPrice('small-repairs')"></span>${chev}</span>
                    </button>
                </template>
                <template x-if="hasCleaner">
                    <button type="button" class="p-row" @click="setTelliOpen('note')">
                        <span class="min-w-0">
                            <span class="p-row-name" x-text="t('otherWish')"></span>
                            <span class="p-row-meta" x-text="offerBlurb('note')"></span>
                        </span>
                        <span class="p-row-side">${chev}</span>
                    </button>
                </template>
            </div>
            <button type="button" x-show="telliMoreExtras.length" class="text-sm mt-4 underline underline-offset-4" @click="showMoreExtras = !showMoreExtras" x-text="showMoreExtras ? t('moreExtrasHide') : t('moreExtrasShow')"></button>
            <div x-show="showMoreExtras && telliMoreExtras.length" x-cloak class="p-rows mt-3">
                ${offerRows('telliMoreExtras')}
            </div>

            <div x-show="expandableCategories.length" x-cloak class="mt-10">
                <button type="button" @click="showExpandServices = !showExpandServices; expandCategory = ''" class="text-sm underline underline-offset-4" x-text="showExpandServices ? t('collapseHomeServices') : t('expandHomeServices')"></button>
                <div x-show="showExpandServices" x-cloak class="mt-4 space-y-4">
                    <p class="text-sm text-muted" x-text="t('otherServicesLead')"></p>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="cat in expandableCategories" :key="cat.id">
                            <button type="button" @click="selectExpandCategory(cat.id)" :class="expandCategory === cat.id ? 'is-on' : ''" class="p-seg px-4" x-text="cat.label"></button>
                        </template>
                    </div>
                    <div x-show="expandCategory" x-cloak class="space-y-4">
                        <div x-show="directoryForCategory(expandCategory).length" class="space-y-3">
                            <p class="text-sm text-muted" x-text="t('directDealNote')"></p>
                            <template x-for="sp in directoryForCategory(expandCategory)" :key="sp.id">
                                <div class="p-sheet p-5">
                                    <p class="font-serif text-xl" x-text="sp.name + (sp.businessName ? ' · ' + sp.businessName : '')"></p>
                                    <p class="eyebrow text-accent mt-1" x-text="sp.activeHomes > 0 || sp.completedVisits > 0 ? t('trustHomesBadge', { homes: sp.activeHomes, visits: sp.completedVisits }) : t('trustNewBadge')"></p>
                                    <p x-show="sp.area" class="text-sm text-muted mt-1" x-text="sp.area"></p>
                                    <p x-show="sp.bio" class="text-sm mt-2" x-text="sp.bio"></p>
                                    <p x-show="sp.priceNote" class="text-sm text-muted mt-2" x-text="sp.priceNote"></p>
                                    <button type="button" x-show="connectTargetId !== sp.id" @click="connectTargetId = sp.id; connectNote = ''; connectError = ''" class="p-sheet-btn" x-text="t('pickSpecialistBtn')"></button>
                                    <form x-show="connectTargetId === sp.id" x-cloak class="mt-4 space-y-3" @submit.prevent="connectSpecialist(sp)">
                                        <label class="eyebrow" x-text="t('connectNoteLabel')"></label>
                                        <textarea x-model="connectNote" rows="3" maxlength="500" required class="p-area"></textarea>
                                        <p x-show="connectError" x-cloak class="text-sm text-accent" x-text="connectError"></p>
                                        <div class="flex gap-3">
                                            <button type="button" @click="connectTargetId = ''" class="p-sheet-btn" x-text="t('docCancel')"></button>
                                            <button type="submit" :disabled="connectBusy || connectNote.trim().length < 3" class="p-go" x-text="connectBusy ? t('telliSending') : t('connectSendBtn')"></button>
                                        </div>
                                    </form>
                                </div>
                            </template>
                        </div>
                        <p x-show="!directoryForCategory(expandCategory).length" class="text-sm text-muted" x-text="t('noOpenSpecialists')"></p>
                        <form x-show="!viewer || viewer.primary" class="p-sheet p-5 space-y-4" @submit.prevent="inviteOwnSpecialist()">
                            <p class="eyebrow" x-text="t('inviteOwnHeading')"></p>
                            <p class="text-sm text-muted" x-text="t('inviteOwnHint')"></p>
                            <label class="block"><span class="eyebrow" x-text="t('nameLabel')"></span><input type="text" x-model="partnerInvite.name" maxlength="120" class="p-field"></label>
                            <label class="block"><span class="eyebrow" x-text="t('emailLabel')"></span><input type="email" x-model="partnerInvite.email" required class="p-field"></label>
                            <button type="submit" :disabled="partnerInvite.busy || !partnerInvite.email" class="p-go" x-text="partnerInvite.busy ? t('telliSending') : t('inviteSendBtn')"></button>
                            <p x-show="partnerInvite.done" x-cloak class="text-sm" x-text="t('inviteSentDone')"></p>
                            <p x-show="partnerInvite.error" x-cloak class="text-sm text-accent" x-text="partnerInvite.error"></p>
                        </form>
                    </div>
                </div>
            </div>
            <p x-show="connectSuccess" x-cloak class="text-sm mt-4" x-text="connectSuccess"></p>

            <div x-show="pastRequests.length" x-cloak class="mt-8">
                <button type="button" @click="showPastOrders = !showPastOrders" class="eyebrow" x-text="showPastOrders ? t('hideIt') : t('orderPast')"></button>
                <div x-show="showPastOrders" x-cloak class="p-rows mt-2.5">
                    <template x-for="r in pastRequests" :key="r.id">
                        <button type="button" class="p-row" @click="openThread(r)">
                            <span class="p-row-name" x-text="r.serviceName"></span>
                            <span class="p-pill" x-text="requestStatusLabel(r.status, r)"></span>
                        </button>
                    </template>
                </div>
            </div>
            <p x-show="telliDone && !telliGathering" x-cloak class="text-sm mt-4" x-text="telliDone"></p>
            <p x-show="telliError" x-cloak class="text-sm text-accent mt-3" x-text="telliError"></p>
        </div>

        <div x-show="telliOpen" x-cloak class="p-sub">
            <button type="button" class="p-back" @click="setTelliOpen(telliOpen)">
                ${backIcon}
                <span x-text="t('tabServices')"></span>
            </button>
            <h1 class="p-sub-title" x-text="telliScreenTitle"></h1>
            <p x-show="telliError" x-cloak class="text-sm text-accent mt-3" x-text="telliError"></p>
            <p x-show="telliDone && !telliGathering" x-cloak class="text-sm mt-3" x-text="telliDone"></p>
            <p x-show="telliQuote && telliQuote.unpriced && !showProvider && !telliGathering && telliOpen !== 'note'" x-cloak class="text-sm text-muted mt-3" x-text="t('noPrice')"></p>

            <form x-show="telliOpen === 'clean'" x-cloak @submit.prevent="submitTelli()">
                ${gatherLead}
                <div x-show="!telliNoted">
                    <div class="mt-5" x-show="!telliGathering && telliPay && !includedCleanLine">
                        <p class="eyebrow" x-text="t('rhythmLabel')"></p>
                        <div class="grid grid-cols-2 gap-2 mt-2.5">
                            <p class="p-seg is-on" x-text="t('rhythmOnce')"></p>
                        </div>
                    </div>
                    <p class="eyebrow mt-5" x-show="!telliGathering && !includedCleanLine && !telliPay" x-text="t('rhythmLabel')"></p>
                    <div class="grid grid-cols-2 gap-2 mt-2.5" x-show="!telliGathering && !includedCleanLine && !telliPay">
                        <button type="button" @click="telliRhythm = 'once'" :class="telliRhythm === 'once' ? 'is-on' : ''" class="p-seg" x-text="t('rhythmOnce')"></button>
                        <button type="button" @click="telliRhythm = 'weekly'" :class="telliRhythm === 'weekly' ? 'is-on' : ''" class="p-seg" x-text="t('rhythmWeek')"></button>
                        <button type="button" @click="telliRhythm = 'biweekly'" :class="telliRhythm === 'biweekly' ? 'is-on' : ''" class="p-seg" x-text="t('rhythmTwo')"></button>
                        <button type="button" @click="telliRhythm = 'monthly'" :class="telliRhythm === 'monthly' ? 'is-on' : ''" class="p-seg" x-text="t('rhythmMonth')"></button>
                    </div>
                    <p x-show="!telliGathering && telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired && telliRhythm === 'once'" class="text-sm text-muted mt-3" x-text="t('giftCovers')"></p>
                    <p x-show="!telliGathering && telliRhythm !== 'once' && !telliPay && !includedCleanLine" x-cloak class="text-sm text-muted mt-3" x-text="t('rhythmHint')"></p>
                    ${whenFields}
                    <div class="mt-5" x-show="!telliGathering && visibleTelliAddonRows.length">
                        <p class="eyebrow" x-text="t('addonsLabel')"></p>
                        <template x-for="row in visibleTelliAddonRows" :key="row.id">
                            <button type="button" class="p-line" @click="toggleTelliAddon(row.id)" :aria-pressed="!!telliAddons[row.id]">
                                <span x-text="addonName(row.serviceId)"></span>
                                <span class="p-switch" :class="telliAddons[row.id] ? 'is-on' : ''" aria-hidden="true"><i></i></span>
                            </button>
                        </template>
                    </div>
                    <div x-show="telliAddons.flowers" x-cloak class="mt-4">
                        <p class="eyebrow" x-text="t('bouquet')"></p>
                        ${choiceButtons}
                    </div>
                    <p x-show="!telliGathering && telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired" x-cloak class="text-sm text-muted mt-3" x-text="t('giftCovers')"></p>
                    <div class="p-order-bar">
                        <div class="min-w-0">
                            <p class="p-order-price" x-show="cleanShownPrice" x-text="cleanShownPrice"></p>
                            <p class="text-sm text-muted mt-1" x-show="showProvider && providerFirstName" x-text="t('confirmsTime', { name: providerFirstName })"></p>
                        </div>
                        <button type="submit" class="p-go shrink-0" :disabled="telliBusy || (!telliGathering && (!telliDate || (telliQuote && telliQuote.unpriced && !showProvider) || (telliAddons.flowers && flowerMode === 'tone' && (flowerTone || '').trim().length < 2)))" x-text="cleanButtonText"></button>
                    </div>
                </div>
                ${gatherDone}
            </form>

            <form x-show="telliOpen === 'fix'" x-cloak @submit.prevent="submitTelli()">
                ${gatherLead}
                <div x-show="!telliNoted">
                    <label class="eyebrow mt-5" for="telli-note-fix" x-text="t('orderNote')"></label>
                    <textarea id="telli-note-fix" x-model="telliNote" rows="4" maxlength="500" :placeholder="t('orderNotePhFix')" class="p-area"></textarea>
                    ${whenFields}
                    <div class="p-order-bar is-stack">
                        <button type="submit" class="p-go is-wide" :disabled="telliBusy || (telliNote || '').trim().length < 5 || (!telliGathering && (!telliDate || (telliQuote && telliQuote.unpriced && !showProvider)))" x-text="telliBusy ? t('telliSending') : (telliGathering ? t('wantIt') : telliButtonLabel)"></button>
                    </div>
                </div>
                ${gatherDone}
            </form>

            <form x-show="telliOpen === 'note'" x-cloak @submit.prevent="submitTelli()">
                <label class="eyebrow mt-5" for="telli-note-cleaner" x-text="t('noteMessage')"></label>
                <textarea id="telli-note-cleaner" x-model="telliNote" rows="4" maxlength="500" :placeholder="t('phCleaningNote')" class="p-area"></textarea>
                <div class="p-order-bar is-stack">
                    <button type="submit" class="p-go is-wide" :disabled="telliBusy || (telliNote || '').trim().length < 5" x-text="telliBusy ? t('telliSending') : t('sendWord')"></button>
                </div>
            </form>

            <form x-show="telliOpen && telliOpen !== 'clean' && telliOpen !== 'fix' && telliOpen !== 'note'" x-cloak @submit.prevent="submitTelli()">
                ${gatherLead}
                <div x-show="!telliNoted">
                    <div x-show="telliOpen === 'flowers'">
                        <p class="eyebrow mt-5" x-text="t('bouquet')"></p>
                        ${choiceButtons}
                        <p class="eyebrow mt-5" x-text="t('amountWord')"></p>
                        <div class="p-stepper mt-2.5">
                            <button type="button" class="p-stepper-btn" @click="flowerStep(-5)" :disabled="flowerSum <= 5" :aria-label="t('amountLess')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" d="M6 12h12"/></svg></button>
                            <p class="p-stepper-value" aria-live="polite" x-text="flowerSumText"></p>
                            <button type="button" class="p-stepper-btn" @click="flowerStep(5)" :disabled="flowerSum >= 500" :aria-label="t('amountMore')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" d="M6 12h12M12 6v12"/></svg></button>
                        </div>
                        <p class="eyebrow mt-5" x-text="t('whenWord')"></p>
                        ${extraWhenFields}
                    </div>
                    <div x-show="telliOpen !== 'flowers'">
                        <p class="text-sm text-muted mt-4" x-show="serviceById(telliOpen) && serviceById(telliOpen).description" x-text="serviceById(telliOpen) && serviceById(telliOpen).description"></p>
                        <label class="eyebrow mt-5" for="telli-note-extra" x-text="t(telliOpen === 'other' ? 'noteWhatNeed' : 'detailsLabel')"></label>
                        <textarea id="telli-note-extra" x-model="telliNote" :rows="telliOpen === 'other' ? 4 : 3" maxlength="500" :placeholder="telliExtraPlaceholder(telliOpen)" class="p-area"></textarea>
                        ${extraWhenFields}
                    </div>
                    <div class="p-order-bar is-stack">
                        <button type="submit" class="p-go is-wide" :disabled="telliBusy || (!telliGathering && (!telliEffectiveDate || (telliOpen === 'other' && (telliNote || '').trim().length < 5) || (telliOpen === 'flowers' && flowerMode === 'tone' && (flowerTone || '').trim().length < 2) || (telliQuote && telliQuote.unpriced && !showProvider)))" x-text="telliOpen === 'flowers' ? flowerButtonText : (telliBusy ? t('telliSending') : (telliGathering ? t('wantIt') : telliButtonLabel))"></button>
                        <p class="text-sm text-muted text-center mt-2.5" x-show="telliOpen === 'flowers' && showProvider && providerFirstName" x-text="t('confirmsFlowers', { name: providerFirstName })"></p>
                    </div>
                </div>
                ${gatherDone}
            </form>
        </div>
    </div>
</div>`;
