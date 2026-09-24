import { add } from './dict.js';

add({
  tabServices: { et: 'Teenused', en: 'Services', ru: 'Услуги' },
  yoursTitle: { et: 'Sinu teenused', en: 'Your services', ru: 'Ваши услуги' },
  yoursEmpty: { et: 'Kinnitatud teenust veel ei ole.', en: 'Nothing is confirmed yet.', ru: 'Подтверждённых услуг пока нет.' },
  giftRow: { et: 'Esimene koristus', en: 'The first clean', ru: 'Первая уборка' },
  giftStatus: { et: 'Kingitus', en: 'Gift', ru: 'Подарок' },
  giftCleanMeta: { et: 'Arco kingib esimese koristuse.', en: 'Arco gives the first clean.', ru: 'Arco дарит первую уборку.' },
  giftPickClean: { et: 'Vali aeg', en: 'Pick a time', ru: 'Выберите время' },
  addTitle: { et: 'Lisa juurde', en: 'Add', ru: 'Добавьте' },
  orderClean: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
  orderFix: { et: 'Remondimees', en: 'Handyman', ru: 'Мастер' },
  orderWarranty: { et: 'Garantii', en: 'Warranty', ru: 'Гарантия' },
  orderDay: { et: 'Päev', en: 'Day', ru: 'День' },
  orderTime: { et: 'Kellaaeg', en: 'Time', ru: 'Время' },
  orderMorning: { et: 'Hommik', en: 'Morning', ru: 'Утро' },
  orderAfternoon: { et: 'Pärastlõuna', en: 'Afternoon', ru: 'День' },
  orderAny: { et: 'Kogu päev', en: 'All day', ru: 'Весь день' },
  addonFlowers: { et: 'Lilled', en: 'Flowers', ru: 'Цветы' },
  addonWindows: { et: 'Aknapesu', en: 'Window washing', ru: 'Мытьё окон' },
  addonSeason: { et: 'Hooajaline kimp', en: 'Seasonal bouquet', ru: 'Сезонный букет' },
  addonTone: { et: 'Oma toon', en: 'Your colours', ru: 'Свой цвет' },
  flowerTonePh: { et: 'nt valged tulbid, mitte liiliaid', en: 'e.g. white tulips, no lilies', ru: 'напр. белые тюльпаны, без лилий' },
  flowerLine: { et: 'Lilled: {choice}.', en: 'Flowers: {choice}.', ru: 'Цветы: {choice}.' },
  rhythmLabel: { et: 'Kui tihti', en: 'How often', ru: 'Как часто' },
  rhythmOnce: { et: 'Üks kord', en: 'Once', ru: 'Один раз' },
  rhythmWeek: { et: 'Igal nädalal', en: 'Every week', ru: 'Каждую неделю' },
  rhythmTwo: { et: 'Üle nädala', en: 'Every other week', ru: 'Через неделю' },
  rhythmMonth: { et: 'Kord kuus', en: 'Once a month', ru: 'Раз в месяц' },
  rhythmHint: { et: 'Esimene kord on see päev. Edasi käib samamoodi.', en: 'The first time is this day. After that it continues the same way.', ru: 'Первый раз в этот день. Дальше так же.' },
  rhythmNote: { et: 'Edaspidi {rhythm}.', en: 'After that, {rhythm}.', ru: 'Дальше — {rhythm}.' },
  monthPrev: { et: 'Eelmine', en: 'Previous', ru: 'Назад' },
  monthNext: { et: 'Järgmine', en: 'Next', ru: 'Дальше' },
  weekDays: { et: 'E T K N R L P', en: 'Mo Tu We Th Fr Sa Su', ru: 'Пн Вт Ср Чт Пт Сб Вс' },
  orderThis: { et: 'Telli see', en: 'Order this', ru: 'Закажите' },
  cleanOnce: { et: 'Üks koristus juurde', en: 'One extra clean', ru: 'Ещё одна уборка' },
  warrantyLead: { et: 'Kui see võib olla garantii, kirjelda. Tasuta.', en: 'If it may be under warranty, describe it. Free.', ru: 'Если это может быть гарантия, опишите. Бесплатно.' },
  fixLead: { et: 'Kirjuta, mis teha.', en: 'Write what needs doing.', ru: 'Напишите, что сделать.' },
  telliOn: { et: 'Lisatud', en: 'Added', ru: 'Добавлено' },
  telliOff: { et: 'Lisa', en: 'Add', ru: 'Добавить' },
  orderNote: { et: 'Kirjeldus', en: 'Description', ru: 'Описание' },
  orderNotePhFix: { et: 'Mis ja kus?', en: 'What and where?', ru: 'Что и где?' },
  orderNotePhWarranty: { et: 'Mis on katki?', en: 'What is broken?', ru: 'Что сломано?' },
  confirmPay: { et: 'Maksa {amount}', en: 'Pay {amount}', ru: 'Оплатить {amount}' },
  confirmOrder: { et: 'Kinnita tellimus', en: 'Confirm the order', ru: 'Подтвердите заказ' },
  sendWarranty: { et: 'Saada', en: 'Send', ru: 'Отправить' },
  giftCovers: { et: 'Selle koristuse eest ei maksa.', en: 'You do not pay for this clean.', ru: 'За эту уборку платить не нужно.' },
  giftNote: { et: 'Arco kingib esimese koristuse.', en: 'Arco gives the first clean.', ru: 'Arco дарит первую уборку.' },
  telliSent: { et: 'Kirjas. Aeg on Kodu kaardil.', en: 'Set. The time is on Home.', ru: 'Записано. Время на вкладке Дом.' },
  telliSentNamed: { et: '{name} kinnitab aja. Kinnitus tuleb siia.', en: '{name} confirms the time. The confirmation comes here.', ru: '{name} подтвердит время. Подтверждение придёт сюда.' },
  orderWarrantySent: { et: 'Saadetud. Vastus tuleb siia.', en: 'Sent. The reply comes here.', ru: 'Отправлено. Ответ придёт сюда.' },
  telliSending: { et: 'Saadan…', en: 'Sending…', ru: 'Отправляю…' },
  telliFailed: { et: 'Ei läinud läbi. Proovi uuesti.', en: 'That did not go through. Try again.', ru: 'Не отправилось. Попробуйте снова.' },
  telliNoteOnce: { et: 'Üks koristus.', en: 'One clean.', ru: 'Одна уборка.' },
  telliNoteExtras: { et: 'Lisad: {list}.', en: 'Extras: {list}.', ru: 'Дополнительно: {list}.' },
  telliHome: { et: 'Olen sel ajal kodus.', en: 'I will be home.', ru: 'Я буду дома.' },
  orderPast: { et: 'Varasemad', en: 'Earlier', ru: 'Ранее' },
  warrantyFree: { et: 'Garantii korras. Tasuta.', en: 'Under warranty. Free.', ru: 'По гарантии. Бесплатно.' },
  photoAdd: { et: 'Lisa pilt', en: 'Add a photo', ru: 'Добавьте фото' },
  photoAttached: { et: 'Pilt on kaasas.', en: 'The photo is attached.', ru: 'Фото приложено.' },
  noted: { et: 'Panime kirja.', en: 'Noted.', ru: 'Записали.' },
  noPrice: { et: 'Sellel teenusel ei ole veel hinda.', en: 'This service does not have a price yet.', ru: 'У этой услуги ещё нет цены.' },
  paidBack: { et: 'Makstud. Aeg on Kodu kaardil.', en: 'Paid. The time is on Home.', ru: 'Оплачено. Время на вкладке Дом.' },
  payCancelled: { et: 'Makse jäi pooleli.', en: 'The payment stopped.', ru: 'Оплата прервалась.' },
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

const whenFields = dayFields();

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
                    <button type="button" x-show="row.open === 'thread'" class="text-sm font-sans mt-3 underline underline-offset-4" @click="openServiceRow(row)" x-text="t('openReply')"></button>
                </div>
            </template>
            <p x-show="extrasLoaded && !serviceRows.length" class="py-4 text-sm text-muted font-sans font-light" x-text="t('yoursEmpty')"></p>
        </div>

        <p class="eyebrow mt-12" x-text="t('addTitle')"></p>
        <div class="mt-2 border-t border-line">
            <div class="border-b border-line">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('flowers')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="addonName('flowers')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="addonPrice('flowers')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="addonText('flowers')"></span>
                </button>
                <form x-show="telliOpen === 'flowers'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    ${choiceButtons}
                    ${whenFields}
                    <button type="submit" :disabled="telliBusy || !telliDate || (flowerMode === 'tone' && (flowerTone || '').trim().length < 2) || (telliQuote && telliQuote.unpriced)" class="p-btn w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : telliButtonLabel"></button>
                </form>
            </div>

            <div class="border-b border-line">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('windows')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="addonName('windows')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="addonPrice('windows')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="addonText('windows')"></span>
                </button>
                <form x-show="telliOpen === 'windows'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    ${whenFields}
                    <button type="submit" :disabled="telliBusy || !telliDate || (telliQuote && telliQuote.unpriced)" class="p-btn w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : telliButtonLabel"></button>
                </form>
            </div>

            <div class="border-b border-line">
                <button type="button" class="w-full py-4 text-left" @click="openPaidClean()">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('cleanOnce')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="cleanRowPrice"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="addonText('extra-clean')"></span>
                </button>
                <form x-show="telliOpen === 'clean'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    <p class="eyebrow" x-show="!arcoCleanLine && !telliPay" x-text="t('rhythmLabel')"></p>
                    <div class="grid grid-cols-2 gap-2 mt-2" x-show="!arcoCleanLine && !telliPay">
                        <button type="button" @click="telliRhythm = 'once'" :class="telliRhythm === 'once' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmOnce')"></button>
                        <button type="button" @click="telliRhythm = 'weekly'" :class="telliRhythm === 'weekly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmWeek')"></button>
                        <button type="button" @click="telliRhythm = 'biweekly'" :class="telliRhythm === 'biweekly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmTwo')"></button>
                        <button type="button" @click="telliRhythm = 'monthly'" :class="telliRhythm === 'monthly' ? 'bg-black text-paper border-black' : 'border-line bg-white'" class="py-3 border text-sm font-sans" x-text="t('rhythmMonth')"></button>
                    </div>
                    <p x-show="telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired && telliRhythm === 'once'" class="text-sm text-muted font-sans font-light mt-3" x-text="t('giftCovers')"></p>
                    <p x-show="telliRhythm !== 'once'" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="t('rhythmHint')"></p>
                    ${whenFields}
                    <div class="mt-6 border-t border-line">
                        <template x-for="row in telliAddonRows" :key="row.id">
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
                    <p x-show="telliSumAmount && !quoteHasFloor && !showProvider" class="font-serif text-4xl font-light mt-6" x-text="telliSumAmount"></p>
                    <p x-show="telliQuote && !telliQuote.unpriced && !telliQuote.cardRequired" x-cloak class="text-sm text-muted font-sans font-light mt-2" x-text="t('giftCovers')"></p>
                    <button type="submit" :disabled="telliBusy || !telliDate || (telliQuote && telliQuote.unpriced) || (telliAddons.flowers && flowerMode === 'tone' && (flowerTone || '').trim().length < 2)" class="p-btn w-full mt-6 disabled:opacity-40">
                        <span x-show="!telliBusy" x-text="telliButtonLabel"></span>
                        <span x-show="telliBusy" x-cloak x-text="t('telliSending')"></span>
                    </button>
                </form>
            </div>

            <div class="border-b border-line">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('fix')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('orderFix')"></span>
                        <span class="text-sm text-muted font-sans font-light shrink-0" x-text="addonPrice('small-repairs')"></span>
                    </span>
                    <span class="block text-sm text-muted font-sans font-light mt-1" x-text="t('fixLead')"></span>
                </button>
                <form x-show="telliOpen === 'fix'" x-cloak class="pb-6" @submit.prevent="submitTelli()">
                    <label class="eyebrow" for="telli-note-fix" x-text="t('orderNote')"></label>
                    <textarea id="telli-note-fix" x-model="telliNote" rows="4" maxlength="500" :placeholder="t('orderNotePhFix')" class="w-full mt-2 bg-white border border-line focus:border-accent outline-none p-4 font-sans font-light text-base placeholder:text-line-strong resize-none"></textarea>
                    ${whenFields}
                    <button type="submit" :disabled="telliBusy || !telliDate || (telliNote || '').trim().length < 5 || (telliQuote && telliQuote.unpriced)" class="p-btn w-full mt-6 disabled:opacity-40" x-text="telliBusy ? t('telliSending') : telliButtonLabel"></button>
                </form>
            </div>

            <div class="border-b border-line">
                <button type="button" class="w-full py-4 text-left" @click="setTelliOpen('warranty')">
                    <span class="flex items-baseline justify-between gap-4">
                        <span class="font-sans text-base" x-text="t('orderWarranty')"></span>
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
        </div>
        <p x-show="telliQuote && telliQuote.unpriced && telliOpen && telliOpen !== 'warranty'" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="t('noPrice')"></p>
        <p x-show="telliError" x-cloak class="text-sm text-red-500 font-sans font-light mt-3" x-text="telliError"></p>
        <p x-show="telliDone" x-cloak class="text-sm font-sans font-light mt-3" x-text="telliDone"></p>

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
