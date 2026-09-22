import { add } from './dict.js';

add({
  tabServices: { et: 'Telli', en: 'Order', ru: 'Заказ' },
  telliTitle: { et: 'Koristus', en: 'Cleaning', ru: 'Уборка' },
  telliOnce: { et: 'Üks kord', en: 'Once', ru: 'Один раз' },
  telliRhythm: { et: 'Rütm', en: 'Rhythm', ru: 'Ритм' },
  telliRhythmHint: { et: 'Iga kahe nädala tagant. Koduhooldaja kinnitab päevad.', en: 'Every two weeks. The housekeeper confirms the days.', ru: 'Каждые две недели. Специалист по дому подтвердит дни.' },
  addonFlowers: { et: 'Lilled', en: 'Flowers', ru: 'Цветы' },
  addonLinens: { et: 'Voodipesu', en: 'Bed linen', ru: 'Постельное бельё' },
  addonWindows: { et: 'Aknad', en: 'Windows', ru: 'Окна' },
  addonAppliances: { et: 'Kodumasinad', en: 'Appliances', ru: 'Бытовая техника' },
  telliOn: { et: 'Sees', en: 'On', ru: 'Да' },
  telliOff: { et: 'Ei', en: 'Off', ru: 'Нет' },
  telliDate: { et: 'Päev', en: 'Day', ru: 'День' },
  price: { et: 'Hind', en: 'Price', ru: 'Цена' },
  priceOnReply: { et: 'Koristuse hinna kinnitab koduhooldaja vastuses.', en: 'The housekeeper confirms the cleaning price in the reply.', ru: 'Цену уборки специалист по дому подтвердит в ответе.' },
  payWhenCard: { et: 'Tasumine tuleb, kui kaart on ühendatud.', en: 'Payment comes when a card is connected.', ru: 'Оплата будет, когда карта подключена.' },
  sendWish: { et: 'Saada soov', en: 'Send the wish', ru: 'Отправить желание' },
  sendWishCard: { et: 'Saada soov — tasumine, kui kaart on ühendatud', en: 'Send the wish — payment when a card is connected', ru: 'Отправить желание — оплата, когда карта подключена' },
  telliSent: { et: 'Soov on kirjas. Koduhooldaja kinnitab aja.', en: 'The wish is in. The housekeeper confirms the time.', ru: 'Желание записано. Специалист по дому подтвердит время.' },
  telliHandyman: { et: 'Remondimees', en: 'Handyman', ru: 'Мастер' },
  telliWarranty: { et: 'Garantii ja maja', en: 'Warranty and the building', ru: 'Гарантия и дом' },
  telliNoteOnce: { et: 'Üks koristus.', en: 'One clean.', ru: 'Одна уборка.' },
  telliNoteRhythm: { et: 'Koristuse rütm, iga kahe nädala tagant.', en: 'A cleaning rhythm, every two weeks.', ru: 'Ритм уборки, каждые две недели.' },
  telliNoteExtras: { et: 'Lisad: {list}.', en: 'Extras: {list}.', ru: 'Дополнительно: {list}.' },
  telliHome: { et: 'Olen sel ajal kodus.', en: 'I will be home.', ru: 'Я буду дома.' },
  telliSending: { et: 'Saadan…', en: 'Sending…', ru: 'Отправляю…' },
  telliFailed: { et: 'Soovi saatmine ei õnnestunud. Proovi uuesti.', en: 'The wish did not go through. Try again.', ru: 'Желание не отправилось. Попробуйте снова.' },
  yourRequests: { et: 'Sinu pöördumised', en: 'Your requests', ru: 'Ваши обращения' },
  earlier: { et: 'Varasemad →', en: 'Earlier →', ru: 'Раньше →' },
  agreed: { et: 'Kokkulepitud', en: 'Already agreed', ru: 'Уже согласовано' },
  agreedShort: { et: 'Kokkulepitud', en: 'Agreed', ru: 'По договорённости' },
  regularCleaning: { et: 'Regulaarne koristus', en: 'Regular cleaning', ru: 'Регулярная уборка' },
  times: { et: 'Ajad', en: 'Times', ru: 'Время' },
  freshFlowers: { et: 'Värsked lilled igal visiidil', en: 'Fresh flowers on every visit', ru: 'Свежие цветы на каждом визите' },
  handyman: { et: 'Remondimees', en: 'Handyman', ru: 'Мастер' },
  report: { et: 'Teata', en: 'Report', ru: 'Сообщите' },
  orderOrAsk: { et: 'Telli või küsi', en: 'Order or ask', ru: 'Закажите или спросите' },
  noted: { et: 'Soov kirjas', en: 'Noted', ru: 'Записано' },
  registerInterest: { et: 'Anna teada', en: 'Register interest', ru: 'Сообщите' },
  doneAnswered: { et: 'Tehtud ja vastatud', en: 'Done and answered', ru: 'Сделано и отвечено' },
  groupWarranty: { et: 'Garantii', en: 'Warranty', ru: 'Гарантия' },
  groupQuestion: { et: 'Küsimus', en: 'Question', ru: 'Вопрос' },
  groupTechnician: { et: 'Tehnik', en: 'Technician', ru: 'Техник' },
  groupGarden: { et: 'Aed', en: 'Garden', ru: 'Сад' },
  groupOther: { et: 'Muu', en: 'Other', ru: 'Другое' },
  visitLead: { et: 'Esimene vaba päev on {date}.', en: 'The first open day is {date}.', ru: 'Первый свободный день — {date}.' },
  giftCovers: { et: 'Kingitus katab. Kaarti ei küsita.', en: 'The gift covers this. No card is asked.', ru: 'Подарок покрывает. Карту не спрашиваем.' },
  payBefore: { et: 'Enne tööd maksta {amount}. Makset ei võeta enne kinnitust.', en: 'To pay before the work: {amount}. Nothing is charged before you confirm.', ru: 'Перед работой к оплате {amount}. До подтверждения ничего не списываем.' },
});

export const telliHtml = `<div x-show="activeTab === 'extras'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">

                    <!-- Open requests -->
                    <div x-show="openRequests.length" x-cloak class="mb-10 md:mb-12">
                        <div class="flex items-center justify-between gap-4 mb-3">
                            <h2 class="p-h"><span x-text="t('yourRequests')"></span><span class="p-num" x-text="openRequests.length"></span></h2>
                            <button type="button" x-show="pastRequests.length" @click="$nextTick(() => document.getElementById('ajalugu')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))" class="text-[11px] uppercase tracking-[0.16em] font-sans text-muted hover:text-black transition-colors" x-text="t('earlier')"></button>
                        </div>
                        <div class="bg-white border border-line divide-y divide-line">
                            <template x-for="r in openRequests" :key="r.id">
                                <button type="button" @click="openThread(r)" class="group w-full text-left px-5 py-3.5 flex items-baseline justify-between gap-4 hover:bg-cream/40 transition-colors">
                                    <span class="min-w-0">
                                        <span class="block font-sans text-sm font-light truncate" x-text="r.serviceName"></span>
                                        <span class="block text-xs text-muted font-sans font-light truncate" x-text="r.note || ''"></span>
                                    </span>
                                    <span class="shrink-0 text-[11px] uppercase tracking-[0.14em] font-sans text-muted" x-text="requestStatusLabel(r.status, r)"></span>
                                </button>
                            </template>
                        </div>
                    </div>

                    <!-- Standing services, above the catalogue, in one place -->
                    <div class="mb-12 md:mb-16">
                        <h2 class="p-h mb-4"><span x-text="t('agreed')"></span></h2>
                        <div class="bg-white border border-line divide-y divide-line">
                            <div class="px-5 py-3 flex items-center justify-between gap-4">
                                <span class="min-w-0">
                                    <span class="block font-sans text-sm" x-text="t('regularCleaning')"></span>
                                    <span class="block text-xs text-muted font-sans font-light" x-text="getPackageName(order?.package) + (nextCleaning ? ' · ' + formatDateShort(nextCleaning.scheduledAt) : '')"></span>
                                </span>
                                <button type="button" @click="activeTab = 'visits'" class="text-[11px] uppercase tracking-[0.14em] font-sans text-muted hover:text-black shrink-0" x-text="t('times')"></button>
                            </div>
                            <div x-show="extras.flowers?.auto" x-cloak class="px-5 py-3">
                                <span class="block font-sans text-sm" x-text="t('freshFlowers')"></span>
                                <span class="block text-xs text-muted font-sans font-light" x-text="extras.flowers?.floristBusiness || extras.flowers?.floristName || ''"></span>
                            </div>
                            <div x-show="handymanStanding" x-cloak class="px-5 py-3">
                                <span class="block font-sans text-sm" x-text="t('handyman')"></span>
                                <span class="block text-xs text-muted font-sans font-light" x-text="handymanQuota"></span>
                            </div>
                            <button type="button" x-show="warrantyUntilLabel()" x-cloak @click="openWarrantyClaim()" class="w-full px-5 py-3 flex items-center justify-between gap-4 text-left hover:bg-cream/40">
                                <span class="min-w-0">
                                    <span class="block font-sans text-sm" x-text="t('warrantyUntil', { date: warrantyUntilLabel() })"></span>
                                </span>
                                <span class="text-[11px] uppercase tracking-[0.14em] font-sans text-muted shrink-0" x-text="t('report')"></span>
                            </button>
                        </div>
                    </div>

                    <section class="bg-white border border-line p-6 md:p-8 mb-12">
                        <h2 class="p-h mb-6" x-text="t('telliTitle')"></h2>
                        <div class="grid grid-cols-2 gap-2 mb-3" role="group" :aria-label="t('telliTitle')">
                            <button type="button" @click="telliRhythm = 'once'" :aria-pressed="telliRhythm === 'once'" :class="telliRhythm === 'once' ? 'bg-black text-paper border-black' : 'bg-paper border-line text-black'" class="py-3 border font-sans text-sm" x-text="t('telliOnce')"></button>
                            <button type="button" @click="telliRhythm = 'rhythm'" :aria-pressed="telliRhythm === 'rhythm'" :class="telliRhythm === 'rhythm' ? 'bg-black text-paper border-black' : 'bg-paper border-line text-black'" class="py-3 border font-sans text-sm" x-text="t('telliRhythm')"></button>
                        </div>
                        <p x-show="telliRhythm === 'rhythm'" class="text-sm text-muted font-sans font-light mb-6" x-text="t('telliRhythmHint')"></p>
                        <div class="border-t border-line">
                            <template x-for="row in telliAddonRows" :key="row.id">
                                <button type="button" @click="toggleTelliAddon(row.id)" :aria-pressed="!!telliAddons[row.id]" class="w-full flex items-center justify-between gap-4 py-3 border-b border-line text-left">
                                    <span class="font-sans text-sm font-light" x-text="t(row.label)"></span>
                                    <span class="eyebrow" x-text="telliAddons[row.id] ? t('telliOn') : t('telliOff')"></span>
                                </button>
                            </template>
                        </div>
                        <label class="block mt-6">
                            <span class="eyebrow" x-text="t('telliDate')"></span>
                            <input type="date" x-model="telliDate" :min="telliDateMin" class="w-full mt-2 bg-paper border border-line focus:border-accent outline-none px-4 py-3 font-sans font-light text-sm">
                        </label>
                        <p class="text-xs text-muted font-sans font-light mt-2" x-text="t('visitLead', { date: telliDateMin })"></p>
                        <div class="mt-6">
                            <p class="eyebrow" x-text="t('price')"></p>
                            <template x-for="(line, i) in telliPriceLines" :key="'price-' + i">
                                <p class="text-sm font-sans font-light mt-2" x-text="line"></p>
                            </template>
                            <p class="text-sm font-sans mt-3" x-show="telliSumLine" x-text="telliSumLine"></p>
                        </div>
                        <p x-show="telliError" x-cloak class="text-sm text-muted font-sans font-light mt-4" x-text="telliError"></p>
                        <p x-show="telliDone" x-cloak class="text-sm font-sans font-light mt-4" x-text="telliDone"></p>
                        <button type="button" class="p-btn w-full mt-6 disabled:opacity-40" :disabled="telliBusy || !telliDate" @click="submitTelli()" x-text="telliBusy ? t('telliSending') : telliButtonLabel"></button>
                    </section>

                    <div class="mb-12">
                        <button type="button" x-show="serviceById('small-repairs')" @click="openRequest(serviceById('small-repairs'))" class="w-full text-left py-3 border-b border-line flex items-baseline justify-between gap-4">
                            <span class="font-sans text-sm font-light" x-text="t('telliHandyman')"></span>
                            <span class="text-muted" aria-hidden="true">→</span>
                        </button>
                        <button type="button" x-show="serviceById('warranty-claim')" @click="openRequest(serviceById('warranty-claim'))" class="w-full text-left py-3 border-b border-line flex items-baseline justify-between gap-4">
                            <span class="font-sans text-sm font-light" x-text="t('telliWarranty')"></span>
                            <span class="text-muted" aria-hidden="true">→</span>
                        </button>
                    </div>


                    <!-- 03 · History: what has been done stays with the home -->
                    <div id="ajalugu" x-show="pastRequests.length" x-cloak class="mt-12 md:mt-16">
                        <h2 class="p-h mb-4"><span class="p-num">03</span><span x-text="t('doneAnswered')"></span></h2>
                        <div class="border border-line bg-white divide-y divide-line">
                            <template x-for="r in pastRequests" :key="r.id">
                                <button type="button" @click="openThread(r)" class="w-full text-left px-5 py-4 grid sm:grid-cols-[auto_1fr_auto_auto] items-start gap-x-5 gap-y-1 text-sm font-sans hover:bg-cream/40 transition-colors group">
                                    <span class="mt-1.5 w-2 h-2 rounded-full shrink-0" :class="partnerDot(r.category)"></span>
                                    <span class="block min-w-0">
                                        <span class="block text-black" x-text="r.serviceName"></span>
                                        <span x-show="r.note || r.providerMessage" class="block text-muted font-light text-xs mt-0.5 leading-relaxed line-clamp-2" x-text="r.providerMessage || r.note"></span>
                                    </span>
                                    <span class="block text-muted font-light" x-text="formatDateLong(r.scheduledAt || r.answeredAt || r.completedAt || r.createdAt)"></span>
                                    <span class="text-[11px] uppercase tracking-[0.15em] sm:text-right flex items-center sm:justify-end gap-2" :class="r.status === 'cancelled' ? 'text-muted/70' : 'text-muted group-hover:text-black'"><svg x-show="r.status === 'completed' || r.status === 'answered'" class="w-3 h-3 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7"></path></svg><span x-text="requestStatusLabel(r.status, r)"></span></span>
                                </button>
                            </template>
                        </div>
                    </div>
                </div>`;
