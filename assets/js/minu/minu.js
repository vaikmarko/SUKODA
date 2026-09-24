import { add } from './dict.js';

add({
  tabMine: { et: 'Minu', en: 'Profile', ru: 'Профиль' },
  langLabel: { et: 'Keel', en: 'Language', ru: 'Язык' },
  accessSaved: { et: 'Juhis on kirjas', en: 'The note is saved', ru: 'Указание записано' },
  profileTitle: { et: 'Sissepääs', en: 'Access', ru: 'Вход' },
  upkeepQuiet: {
    et: 'Voodipesu, rätikud ja masinate hooldus käivad koristusega. Kui koristust enam ei ole, vaheta ventilatsioonifilter ise iga kuue kuu tagant.',
    en: 'Bed linen, towels and appliance care come with the cleaning. If the cleaning stops, change the ventilation filter yourself every six months.',
    ru: 'Постельное бельё, полотенца и уход за техникой идут вместе с уборкой. Если уборки больше нет, меняйте фильтр вентиляции сами каждые шесть месяцев.',
  },
  showUpkeep: { et: 'Näita hooldust', en: 'Show upkeep', ru: 'Показать уход' },
  keeperSees: { et: 'Koduhooldaja näeb sissepääsu, lemmikuid ja eelistusi igal visiidil.', en: 'The housekeeper sees access, pets and preferences on every visit.', ru: 'Специалист по дому видит вход, животных и предпочтения на каждом визите.' },
  edit: { et: 'Muuda', en: 'Edit', ru: 'Измените' },
  notFilled: { et: 'Täitmata: ', en: 'Not filled: ', ru: 'Не заполнено: ' },
  save: { et: 'Salvesta', en: 'Save', ru: 'Сохраните' },
  saved: { et: 'Salvestatud', en: 'Saved', ru: 'Сохранено' },
  upkeep: { et: 'Hooldus', en: 'Upkeep', ru: 'Уход' },
  dueSuffix: { et: ' ootel', en: ' due', ru: ' ждут' },
  youShort: { et: 'Sina', en: 'You', ru: 'Вы' },
  markIt: { et: 'Märgi', en: 'Mark', ru: 'Отметьте' },
  doneWord: { et: 'Tehtud', en: 'Done', ru: 'Готово' },
  otherDate: { et: 'Muu kuupäev', en: 'Other date', ru: 'Другая дата' },
  wantDoer: { et: 'Soovin tegijat', en: 'Want someone', ru: 'Нужен исполнитель' },
  agreeTime: { et: 'Lepi aeg', en: 'Agree a time', ru: 'Согласуйте время' },
  orderVerb: { et: 'Telli', en: 'Order', ru: 'Закажите' },
  doneByPrefix: { et: 'Teeb ', en: 'Done by ', ru: 'Делает ' },
  housekeeper: { et: 'Koduhooldaja', en: 'Housekeeper', ru: 'Специалист по дому' },
  nextPrefix: { et: 'järgmine ', en: 'next ', ru: 'следующее ' },
  iDoIt: { et: 'Teen ise', en: 'I do it', ru: 'Сделаю сам' },
  nothingYet: { et: 'Midagi pole veel kirjas.', en: 'Nothing here yet.', ru: 'Пока ничего не записано.' },
  hideIt: { et: 'Peida', en: 'Hide', ru: 'Скройте' },
  addShort: { et: 'Lisa', en: 'Add', ru: 'Добавьте' },
  addOwn: { et: '+ Lisa oma kirje', en: '+ Add your own', ru: '+ Добавьте свою запись' },
  whatLabel: { et: 'Mis', en: 'What', ru: 'Что' },
  maintPh: { et: 'nt Rõduukse tihendi kontroll', en: 'e.g. Balcony door seal check', ru: 'напр. проверка уплотнителя балконной двери' },
  howOften: { et: 'Kui tihti', en: 'How often', ru: 'Как часто' },
  lastDoneField: { et: 'Viimati tehtud', en: 'Last done', ru: 'Последний раз' },
  reminderMail: { et: 'Meeldetuletus e-postiga, kaks nädalat enne.', en: 'An e-mail reminder, two weeks before.', ru: 'Напоминание по почте за две недели.' },
  whoNotified: { et: 'Kes saab teavitusi', en: 'Who receives notifications', ru: 'Кто получает уведомления' },
  whoElse: { et: 'Kes veel peaks aegadest teada saama. Teade ja kalendrikutse jõuavad ka temani.', en: 'Who else should know the times. The notice and the calendar invite reach them too.', ru: 'Кто ещё должен знать о времени. Уведомление и приглашение в календарь придут и ему.' },
  newPerson: { et: 'Uus inimene', en: 'New person', ru: 'Новый человек' },
  sameTimes: { et: 'Saab samad ajad ja kalendrikutsed', en: 'Gets the same times and calendar invites', ru: 'Получает те же время и приглашения в календарь' },
  household: { et: 'Pere', en: 'Household', ru: 'Семья' },
  homesTitle: { et: 'Kodud', en: 'Homes', ru: 'Дома' },
  currentHome: { et: 'See kodu', en: 'This home', ru: 'Этот дом' },
  openThisHome: { et: 'Ava see kodu', en: 'Open this home', ru: 'Откройте этот дом' },
  makeTenant: { et: 'Märgi üürnikuks', en: 'Mark as tenant', ru: 'Отметьте как арендатора' },
  tenantOn: { et: 'Üürnik', en: 'Tenant', ru: 'Арендатор' },
  tenantHint: { et: 'Näeb aegu ja saab tellida. Omandi dokumente ja üleandmist ei näe.', en: 'Sees the times and can order. Does not see ownership documents or the handover.', ru: 'Видит время и может заказывать. Не видит документы собственности и передачу.' },
  handoverTitle: { et: 'Anna kodu üle', en: 'Hand the home over', ru: 'Передайте дом' },
  handoverBody: { et: 'Uus omanik saab lingi. Sinu kontaktid, sissepääs ja pöördumised lähevad ära. Dokumendid, rütm ja visiidid jäävad.', en: 'The new owner gets a link. Your contacts, the door note and the requests go. Documents, the rhythm and the visits stay.', ru: 'Новый владелец получит ссылку. Ваши контакты, указание ко входу и обращения уходят. Документы, ритм и визиты остаются.' },
  handoverGo: { et: 'Anna üle', en: 'Hand over', ru: 'Передайте' },
  handoverSent: { et: 'Link on saadetud. See kodu on nüüd uue omaniku käes.', en: 'The link is sent. This home is now with the new owner.', ru: 'Ссылка отправлена. Дом теперь у нового владельца.' },
  handoverFail: { et: 'Link ei läinud välja. Proovi sama aadressiga uuesti.', en: 'The link did not go out. Try the same address again.', ru: 'Ссылка не ушла. Попробуйте тот же адрес ещё раз.' },
  nameLabel: { et: 'Nimi', en: 'Name', ru: 'Имя' },
  namePh: { et: 'nt Kristi', en: 'e.g. Mark', ru: 'напр. Кристи' },
  phoneLabel: { et: 'Telefon', en: 'Phone', ru: 'Телефон' },
  emailLabel: { et: 'E-post', en: 'Email', ru: 'Эл. почта' },
  addPerson: { et: '+ Lisa inimene', en: '+ Add person', ru: '+ Добавьте человека' },
  homeFlat: { et: 'Korter', en: 'Flat', ru: 'Квартира' },
  homeHouse: { et: 'Maja', en: 'House', ru: 'Дом' },
  homeCottage: { et: 'Suvila', en: 'Cottage', ru: 'Дача' },
  pfAccess: { et: 'Sissepääs', en: 'Access', ru: 'Вход' },
  pfAccessHint: { et: 'Koduhooldaja püsiv juhis: kood, võti, kellel võti on. Garantiile ja tehnikule küsitakse iga visiidi juures eraldi.', en: 'The housekeeper’s standing note: code, key, who holds it. Warranty and the technician are asked separately, each visit.', ru: 'Постоянная заметка для специалиста по дому: код, ключ, у кого ключ. Гарантию и техника спрашивают отдельно на каждом визите.' },
  pfPets: { et: 'Lemmikloomad', en: 'Pets', ru: 'Животные' },
  pfPetsHint: { et: 'nt kass Luna, sõbralik', en: 'e.g. cat Luna, friendly', ru: 'напр. кошка Луна, дружелюбная' },
  pfAllergies: { et: 'Allergiad ja vahendid', en: 'Allergies & products', ru: 'Аллергии и средства' },
  pfAllergiesHint: { et: 'nt looduslikud vahendid, lateksiallergia', en: 'e.g. natural products, latex allergy', ru: 'напр. натуральные средства, аллергия на латекс' },
  pfFlowerHint: { et: 'nt valged tulbid, mitte liiliaid', en: 'e.g. white tulips, no lilies', ru: 'напр. белые тюльпаны, без лилий' },
  pfLinens: { et: 'Voodipesu', en: 'Linens', ru: 'Постельное бельё' },
  pfLinensHint: { et: 'nt vahetada iga 2 nädala tagant', en: 'e.g. change every 2 weeks', ru: 'напр. менять каждые 2 недели' },
  pfTowels: { et: 'Rätikud', en: 'Towels', ru: 'Полотенца' },
  pfTowelsHint: { et: 'nt vahetada igal visiidil', en: 'e.g. change every visit', ru: 'напр. менять на каждом визите' },
  pfSpecial: { et: 'Erisoovid', en: 'Special requests', ru: 'Особые пожелания' },
  pfSpecialHint: { et: 'nt eritähelepanu köögile; kardinad pooleldi lahti; vannitoas ilma tugeva lõhnata', en: 'e.g. extra attention to the kitchen; curtains half open; no strong scents in the bathroom', ru: 'напр. особое внимание кухне; шторы наполовину открыты; в ванной без резкого запаха' },
  lastDoneOn: { et: 'viimati {date}', en: 'last {date}', ru: 'в последний раз {date}' },
  intervalMonth: { et: 'iga kuu', en: 'monthly', ru: 'каждый месяц' },
  intervalYear: { et: 'kord aastas', en: 'yearly', ru: 'раз в год' },
  intervalTwoYears: { et: 'iga 2 aasta tagant', en: 'every 2 years', ru: 'раз в 2 года' },
  intervalEvery: { et: 'iga {n} kuu tagant', en: 'every {n} months', ru: 'каждые {n} мес.' },
  maintRemoveAsk: { et: 'Eemalda see kirje hooldusrütmist?', en: 'Remove this item?', ru: 'Удалить эту запись из графика ухода?' },
  contactsSaveFailed: { et: 'Salvestamine ebaõnnestus. Kontrolli e-posti aadresse.', en: 'Saving failed. Check the email addresses.', ru: 'Не удалось сохранить. Проверьте адреса электронной почты.' },
});

export const minuHtml = `<div x-show="activeTab === 'mine'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
                    <div x-show="homes.length > 1" x-cloak class="bg-white border border-line mb-6">
                        <div class="px-6 py-4 border-b border-line">
                            <h2 class="p-h" x-text="t('homesTitle')"></h2>
                        </div>
                        <div class="divide-y divide-line">
                            <template x-for="h in homes" :key="h.id">
                                <div class="px-6 py-4 flex items-center justify-between gap-4">
                                    <div class="min-w-0">
                                        <p class="font-sans text-sm truncate" x-text="h.address || t('tabKodu')"></p>
                                        <p class="eyebrow mt-1" x-show="h.current" x-text="t('currentHome')"></p>
                                    </div>
                                    <button type="button" class="p-btn-2 shrink-0" x-show="!h.current" @click="openHome(h.id)" x-text="t('openThisHome')"></button>
                                </div>
                            </template>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start min-w-0">

                        <div class="lg:col-span-7 space-y-6 lg:space-y-8 min-w-0">

                        <!-- ── Kodu: what the people who come here should know. Reads as a card; edits in place ── -->
                        <div class="bg-white border border-line">
                            <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-line">
                                <h2 class="p-h"><span x-text="t('profileTitle')"></span></h2>
                                <!-- Home type: a fact about the home, and it narrows the upkeep suggestions. The developer already knows what it built. -->
                                <div x-show="!brand" class="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-sans shrink-0">
                                    <template x-for="kind in ['apartment', 'house', 'summer']" :key="kind">
                                        <button type="button" @click="setHomeType(kind)" :class="maintenance.homeType === kind ? 'bg-black text-paper border-black' : 'border-line text-muted hover:text-black'" class="px-3 py-1.5 border transition-colors duration-150" x-text="homeTypeLabel(kind)"></button>
                                    </template>
                                </div>
                                <p x-show="brand && homeTypeText" x-cloak class="text-[10px] uppercase tracking-[0.16em] text-muted font-sans shrink-0"><span x-text="homeTypeText"></span><span x-show="brand?.project" x-text="' · ' + brand?.project"></span></p>
                            </div>
                            <div class="p-6 md:p-8">
                                <p class="font-serif text-2xl md:text-3xl font-light leading-snug" x-text="order?.customerAddress || order?.address || (t('tabKodu'))"></p>
                                <p class="text-sm text-muted font-sans font-light leading-relaxed mt-3 max-w-lg" x-text="t('keeperSees')"></p>

                                <!-- Read mode -->
                                <div x-show="!profileEditing" class="mt-7">
                                    <!-- Same voice as the service cards: label above, value below, two columns, one rule on top -->
                                    <dl class="grid sm:grid-cols-2 gap-x-8 gap-y-5 pt-5 border-t border-line">
                                        <template x-for="f in profileFilled" :key="f.key">
                                            <div :class="f.long ? 'sm:col-span-2' : ''">
                                                <dt class="text-[10px] uppercase tracking-[0.16em] text-muted font-sans mb-1" x-text="f.label"></dt>
                                                <dd class="font-sans text-sm leading-relaxed whitespace-pre-line" x-text="f.key === 'access' ? t('accessSaved') : homeProfile[f.key]"></dd>
                                            </div>
                                        </template>
                                    </dl>
                                    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5">
                                        <button type="button" @click="profileEditing = true" class="text-[11px] uppercase tracking-[0.16em] font-sans font-medium text-accent hover:text-black transition-colors" x-text="t('edit')"></button>
                                        <p x-show="profileFilled.length < profileFields.length" class="text-xs text-muted font-sans font-light" x-text="(t('notFilled')) + profileFields.filter((f) => !(homeProfile[f.key] || '').trim()).map((f) => f.label.toLowerCase()).join(', ')"></p>
                                    </div>
                                </div>

                                <!-- Edit mode -->
                                <form x-show="profileEditing" x-cloak @submit.prevent="saveHomeProfile()" class="mt-7">
                                    <div class="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                                        <template x-for="f in profileFields" :key="f.key">
                                            <label class="block" :class="f.long ? 'sm:col-span-2' : ''">
                                                <span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1.5" x-text="f.label"></span>
                                                <template x-if="f.long"><textarea x-model="homeProfile[f.key]" :placeholder="f.hint" rows="3" maxlength="500" class="w-full bg-transparent border border-line focus:border-accent outline-none p-3 font-sans font-light text-base transition-colors placeholder:text-line-strong resize-none"></textarea></template>
                                                <template x-if="!f.long"><input type="text" x-model="homeProfile[f.key]" :placeholder="f.hint" maxlength="300" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base transition-colors placeholder:text-line-strong"></template>
                                            </label>
                                        </template>
                                    </div>
                                    <div class="flex items-center gap-4 mt-8">
                                        <button type="submit" :disabled="profileSaving" class="p-btn disabled:opacity-50">
                                            <span x-show="!profileSaving" x-text="t('save')"></span>
                                            <span x-show="profileSaving" x-cloak x-text="t('docSaving')"></span>
                                        </button>
                                        <button type="button" x-show="profileFilled.length" @click="profileEditing = false" class="text-[11px] uppercase tracking-[0.15em] text-muted hover:text-black font-sans" x-text="t('docCancel')"></button>
                                        <span x-show="profileSaved" x-cloak x-transition class="text-green-600 text-sm font-sans font-light" x-text="t('saved')"></span>
                                    </div>
                                </form>
                                <div class="mt-8 pt-6 border-t border-line">
                                    <p class="eyebrow" x-text="t('langLabel')"></p>
                                    <div class="flex gap-4 mt-3 text-sm font-sans">
                                        <button type="button" @click="lang = 'et'; localStorage.setItem('sukoda_lang', 'et')" :class="lang === 'et' ? 'text-black' : 'text-muted'" class="py-2 min-w-11">ET</button>
                                        <button type="button" @click="lang = 'en'; localStorage.setItem('sukoda_lang', 'en')" :class="lang === 'en' ? 'text-black' : 'text-muted'" class="py-2 min-w-11">EN</button>
                                        <button type="button" @click="lang = 'ru'; localStorage.setItem('sukoda_lang', 'ru')" :class="lang === 'ru' ? 'text-black' : 'text-muted'" class="py-2 min-w-11">RU</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ── Hooldusrütm: what the home needs on a rhythm — split by who does it ── -->
                        <div id="hooldus" class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
                                <h2 class="p-h"><span class="p-num">02</span><span x-text="t('upkeep')"></span></h2>
                                <span x-show="maintenanceDue" class="inline-flex px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] rounded-full bg-accent/10 text-accent" x-text="maintenanceDue + (t('dueSuffix'))"></span>
                            </div>
                            <div class="p-6 md:p-8 space-y-10">
                            <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="t('upkeepQuiet')"></p>
                            <button type="button" @click="upkeepOpen = !upkeepOpen" class="eyebrow" x-text="upkeepOpen ? t('hideIt') : t('showUpkeep')"></button>
                            <div x-show="upkeepOpen" x-cloak class="space-y-10">

                            <div x-show="maintHomeItems.length">
                                <h3 class="font-serif text-2xl font-light mb-2" x-text="t('youShort')"></h3>
                                <div>
                                    <template x-for="item in maintHomeItems" :key="item.id">
                                        <div class="border-b border-line">
                                            <button type="button" @click="maintOpen = maintOpen === item.id ? null : item.id; if (maintOpen === item.id) $nextTick(() => $el.nextElementSibling && $el.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))" class="group w-full text-left py-3 flex items-baseline justify-between gap-4">
                                                <span class="font-sans text-sm font-light" x-text="item.name"></span>
                                                <span class="shrink-0 text-xs font-sans font-light" :class="item.state === 'overdue' ? 'text-red-500' : item.state === 'due' ? 'text-accent' : 'text-muted'" x-text="dueLabel(item)"></span>
                                            </button>
                                            <div x-show="maintOpen === item.id" x-cloak x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" class="pb-4">
                                                <p x-show="item.hint" class="text-sm text-muted font-sans font-light leading-relaxed" x-text="item.hint"></p>
                                                <p x-show="item.note" class="text-sm font-sans font-light leading-relaxed mt-1" x-text="item.note"></p>
                                                <p class="text-sm text-muted font-sans font-light mt-3">
                                                    <select :value="item.intervalMonths" @change="changeInterval(item, $event.target.value)" class="bg-transparent text-muted outline-none font-light cursor-pointer">
                                                        <template x-for="m in maintenance.intervals" :key="m"><option :value="m" :selected="m === item.intervalMonths" x-text="intervalLabel(m)"></option></template>
                                                    </select>
                                                    <span x-show="item.lastDoneAt" x-text="' · ' + lastDoneLabel(item)"></span>
                                                </p>
                                                <div x-show="maintDoneFor === item.id" x-cloak class="flex flex-wrap items-center gap-3 mt-3">
                                                    <input type="date" x-model="maintDoneDate" :max="maintenance.today" class="border border-line bg-white px-3 py-2 text-sm font-sans font-light outline-none focus:border-accent">
                                                    <button type="button" @click="markMaintenanceDone(item, maintDoneDate)" :disabled="!!maintBusy" class="p-btn p-btn-sm disabled:opacity-50" x-text="t('markIt')"></button>
                                                </div>
                                                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] uppercase tracking-[0.14em] font-sans">
                                                    <button type="button" @click="markMaintenanceDone(item)" :disabled="!!maintBusy" class="text-black hover:text-accent transition-colors disabled:opacity-40" x-text="t('doneWord')"></button>
                                                    <button type="button" @click="maintDoneFor = maintDoneFor === item.id ? null : item.id; maintDoneDate = maintenance.today" class="text-muted hover:text-black transition-colors" x-text="t('otherDate')"></button>
                                                    <button type="button" x-show="item.serviceId" @click="orderMaintenance(item)" class="text-accent hover:text-black transition-colors" x-text="!item.orderable ? (t('wantDoer')) : item.doerCategory === 'warranty' ? (t('agreeTime')) : (t('orderVerb'))"></button>
                                                    <button type="button" x-show="showProvider && maintenance.provider && item.doer !== 'partner'" @click="assignMaintenance(item, 'provider')" :disabled="!!maintBusy" class="text-muted hover:text-black transition-colors" x-text="(t('doneByPrefix')) + providerFirstName"></button>
                                                    <button type="button" @click="removeMaintenance(item)" class="text-muted/60 hover:text-black transition-colors" x-text="t('docRemove')"></button>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <div x-show="maintProviderItems.length" x-cloak>
                                <h3 class="font-serif text-2xl font-light mb-2" x-text="(showProvider && providerFirstName) || (t('housekeeper'))"></h3>
                                <div>
                                    <template x-for="item in maintProviderItems" :key="item.id">
                                        <div class="border-b border-line">
                                            <button type="button" @click="maintOpen = maintOpen === item.id ? null : item.id; if (maintOpen === item.id) $nextTick(() => $el.nextElementSibling && $el.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))" class="w-full text-left py-3 flex items-baseline justify-between gap-4">
                                                <span class="font-sans text-sm font-light" x-text="item.name"></span>
                                                <span class="shrink-0 text-xs text-muted font-sans font-light" x-text="intervalLabel(item.intervalMonths)"></span>
                                            </button>
                                            <div x-show="maintOpen === item.id" x-cloak x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" class="pb-4">
                                                <p class="text-sm text-muted font-sans font-light" x-text="(item.lastDoneAt ? lastDoneLabel(item) + ' · ' : '') + (t('nextPrefix')) + nextLabel(item)"></p>
                                                <button type="button" @click="assignMaintenance(item, 'home')" :disabled="!!maintBusy" class="mt-3 text-[11px] uppercase tracking-[0.14em] font-sans text-muted hover:text-black transition-colors" x-text="t('iDoIt')"></button>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <p x-show="!maintenance.items.length && extrasLoaded" class="text-sm text-muted font-sans font-light" x-text="t('nothingYet')"></p>

                            <div x-show="maintenance.suggestions.length">
                                <button type="button" @click="maintShowSuggestions = !maintShowSuggestions" x-show="maintenance.items.length" class="text-[11px] uppercase tracking-[0.14em] font-sans text-muted hover:text-black" x-text="maintShowSuggestions ? (t('hideIt')) : (t('addShort'))"></button>
                                <div x-show="maintShowSuggestions || !maintenance.items.length" x-cloak>
                                    <template x-for="s in maintenance.suggestions" :key="s.id">
                                        <button type="button" @click="addSuggestion(s)" :disabled="!!maintBusy" class="w-full text-left py-3 border-b border-line flex items-baseline justify-between gap-4 disabled:opacity-50 hover:border-black transition-colors">
                                            <span class="font-sans text-sm font-light" x-text="s.name"></span>
                                            <span class="text-xs text-muted font-sans font-light shrink-0" x-text="intervalLabel(s.intervalMonths)"></span>
                                        </button>
                                    </template>
                                </div>
                            </div>

                            <!-- Custom item -->
                            <div class="mt-6">
                                <button type="button" x-show="!maintAdding" @click="maintAdding = true" class="text-[11px] uppercase tracking-[0.16em] font-sans font-medium text-accent hover:text-black transition-colors" x-text="t('addOwn')"></button>
                                <div x-show="maintAdding" x-cloak class="border border-line p-4 grid sm:grid-cols-3 gap-4">
                                    <label class="block sm:col-span-3"><span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('whatLabel')"></span><input type="text" x-model="maintForm.name" maxlength="80" :placeholder="t('maintPh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong"></label>
                                    <label class="block"><span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('howOften')"></span>
                                        <select x-model.number="maintForm.intervalMonths" class="w-full bg-transparent border-b border-line py-2 font-sans font-light text-base outline-none"><template x-for="m in maintenance.intervals" :key="m"><option :value="m" x-text="intervalLabel(m)"></option></template></select></label>
                                    <label class="block"><span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('lastDoneField')"></span><input type="date" x-model="maintForm.lastDoneAt" :max="maintenance.today" class="w-full bg-transparent border-b border-line py-2 font-sans font-light text-base outline-none"></label>
                                    <div class="flex items-end gap-3">
                                        <button type="button" @click="addCustomMaintenance()" :disabled="!maintForm.name || !!maintBusy" class="p-btn p-btn-sm disabled:opacity-50" x-text="t('addShort')"></button>
                                        <button type="button" @click="maintAdding = false" class="text-[11px] uppercase tracking-[0.15em] text-muted hover:text-black font-sans pb-2.5" x-text="t('docCancel')"></button>
                                    </div>
                                </div>
                            </div>
                            <p x-show="maintError" x-cloak class="text-sm text-red-500 font-sans font-light mt-3" x-text="maintError"></p>
                            <label x-show="maintHomeItems.length" class="flex items-start gap-3 mt-6 pt-5 border-t border-line text-sm font-sans font-light text-muted cursor-pointer">
                                <input type="checkbox" :checked="maintenance.remindersEnabled !== false" @change="maintenanceAction({ action: 'reminders', enabled: $event.target.checked }, 'reminders')" class="mt-0.5 accent-black">
                                <span x-text="t('reminderMail')"></span>
                            </label>
                            </div>
                            </div>
                        </div>

                        </div>

                        <aside class="lg:col-span-5 space-y-6 lg:space-y-8 min-w-0">

                        <!-- ── Household contacts ── -->
                        <div class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
                                <h2 class="p-h" x-text="t('whoNotified')"></h2>
                                <p class="text-xs text-muted font-sans font-light" x-text="(1 + contacts.length) + ' / ' + (1 + (extras.maxContacts || 6))"></p>
                            </div>
                            <div class="p-6">
                            <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="t('whoElse')"></p>
                            <div class="mt-6 space-y-3">
                                <div class="flex items-center gap-4 text-base font-sans bg-cream/50 px-4 py-3">
                                    <div class="w-10 h-10 rounded-full bg-black text-paper flex items-center justify-center text-sm shrink-0" x-text="(order?.customerName || '?').charAt(0)"></div>
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate" x-text="order?.customerName"></p>
                                        <p class="text-sm text-muted font-light truncate"><span x-text="order?.customerEmail"></span><span x-show="order?.customerPhone" x-text="' · ' + order?.customerPhone"></span></p>
                                    </div>
                                    <span class="text-[11px] uppercase tracking-[0.15em] text-muted shrink-0" x-text="t('youShort')"></span>
                                </div>
                                <template x-for="(c, i) in contacts" :key="c.id || ('new-' + i)">
                                    <div class="border border-line bg-white p-4">
                                        <div class="flex items-center gap-4 mb-4">
                                            <div class="w-10 h-10 rounded-full bg-cream text-black flex items-center justify-center text-sm shrink-0" x-text="(c.name || '?').charAt(0)"></div>
                                            <div class="min-w-0 flex-1">
                                                <p class="truncate font-sans" x-text="c.name || (t('newPerson'))"></p>
                                                <p class="text-sm text-muted font-light truncate" x-text="t('sameTimes')"></p>
                                            </div>
                                            <span class="eyebrow shrink-0" x-text="c.role === 'tenant' ? t('tenantOn') : t('household')"></span>
                                        </div>
                                        <div class="grid sm:grid-cols-2 gap-4">
                                            <label class="block">
                                                <span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('nameLabel')"></span>
                                                <input type="text" x-model="c.name" :placeholder="t('namePh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                            <label class="block">
                                                <span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('phoneLabel')"></span>
                                                <input type="tel" x-model="c.phone" placeholder="+372 …" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                            <label class="block sm:col-span-2">
                                                <span class="text-[11px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('emailLabel')"></span>
                                                <input type="email" x-model="c.email" placeholder="nimi@näide.ee" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                        </div>
                                        <p class="text-sm text-muted font-sans font-light mt-3" x-show="c.role === 'tenant'" x-text="t('tenantHint')"></p>
                                        <div class="flex items-center justify-end gap-4 mt-3" x-show="viewer && viewer.primary">
                                            <button type="button" @click="c.role = c.role === 'tenant' ? 'household' : 'tenant'" class="text-sm font-sans text-muted hover:text-black" x-text="c.role === 'tenant' ? t('household') : t('makeTenant')"></button>
                                            <button type="button" @click="removeContact(i)" class="text-sm font-sans text-muted hover:text-black shrink-0" x-text="t('docRemove')"></button>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <div class="flex flex-wrap items-center gap-4 mt-6" x-show="viewer && viewer.primary">
                                <button type="button" @click="addContact()" :disabled="contacts.length >= (extras.maxContacts || 6)" class="text-[11px] uppercase tracking-[0.16em] font-sans font-medium text-accent hover:text-black transition-colors disabled:opacity-40" x-text="t('addPerson')"></button>
                                <button type="button" x-show="contacts.length" @click="saveContacts()" :disabled="contactsSaving" class="ml-auto p-btn disabled:opacity-50">
                                    <span x-show="!contactsSaving" x-text="t('save')"></span>
                                    <span x-show="contactsSaving" x-cloak x-text="t('docSaving')"></span>
                                </button>
                                <span x-show="contactsSaved" x-cloak x-transition class="text-green-600 text-sm font-sans font-light" x-text="t('saved')"></span>
                            </div>
                            <p x-show="contactsError" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="contactsError"></p>
                            </div>
                        </div>

                        <div x-show="viewer && viewer.primary" x-cloak class="bg-white border border-line">
                            <div class="px-6 py-4 border-b border-line">
                                <h2 class="p-h" x-text="t('handoverTitle')"></h2>
                            </div>
                            <form class="p-6" @submit.prevent="handOverHome()">
                                <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="t('handoverBody')"></p>
                                <label class="block mt-6">
                                    <span class="eyebrow" x-text="t('nameLabel')"></span>
                                    <input type="text" x-model="handover.name" maxlength="120" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                                </label>
                                <label class="block mt-4">
                                    <span class="eyebrow" x-text="t('emailLabel')"></span>
                                    <input type="email" x-model="handover.email" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                                </label>
                                <button type="submit" class="p-btn mt-6" :disabled="handover.busy" x-text="handover.busy ? t('docSaving') : t('handoverGo')"></button>
                                <p x-show="handover.error" x-cloak class="text-sm text-muted font-sans font-light mt-3" x-text="handover.error"></p>
                                <p x-show="handover.sent" x-cloak class="text-sm font-sans font-light mt-3" x-text="t('handoverSent')"></p>
                            </form>
                        </div>

                        </aside>

                    </div>
                </div>`;
