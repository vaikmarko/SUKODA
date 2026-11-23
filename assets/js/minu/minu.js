import { add } from './dict.js';

add({
  tabMine: { et: 'Konto', en: 'Account', ru: 'Профиль' },
  langLabel: { et: 'Keel', en: 'Language', ru: 'Язык' },
  accessSaved: { et: 'Juhis on kirjas', en: 'The note is saved', ru: 'Указание записано' },
  profileTitle: { et: 'Juhised koristajale', en: 'Notes for the cleaner', ru: 'Указания для специалиста по уборке' },
  showUpkeep: { et: 'Ava', en: 'Open', ru: 'Открыть' },
  upkeepLead: { et: 'Kodu regulaarsed hooldustööd ja tähtajad.', en: 'Scheduled home upkeep and due dates.', ru: 'Регулярные работы по дому и сроки.' },
  keeperSees: { et: 'Nähtav ainult sinu koduhooldajale.', en: 'Visible only to your housekeeper.', ru: 'Видно только вашему специалисту по уборке.' },
  edit: { et: 'Muuda', en: 'Edit', ru: 'Изменить' },
  notFilled: { et: 'Täitmata: ', en: 'Not filled in: ', ru: 'Не заполнено: ' },
  save: { et: 'Salvesta', en: 'Save', ru: 'Сохранить' },
  saved: { et: 'Salvestatud', en: 'Saved', ru: 'Сохранено' },
  saveFailed: { et: 'Salvestamine ei õnnestunud. Proovi uuesti.', en: 'Saving did not work. Try again.', ru: 'Сохранить не удалось. Попробуйте снова.' },
  upkeep: { et: 'Hooldus', en: 'Upkeep', ru: 'Уход за домом' },
  dueSuffix: { et: ' ootel', en: ' due', ru: ' ждут' },
  youShort: { et: 'Sina', en: 'You', ru: 'Вы' },
  markIt: { et: 'Märgi', en: 'Mark', ru: 'Отметить' },
  doneWord: { et: 'Tehtud', en: 'Done', ru: 'Сделано' },
  otherDate: { et: 'Muu kuupäev', en: 'Other date', ru: 'Другая дата' },
  wantDoer: { et: 'Soovin tellida', en: 'I want to order this', ru: 'Хочу заказать' },
  agreeTime: { et: 'Lepi aeg kokku', en: 'Agree a time', ru: 'Согласовать время' },
  orderVerb: { et: 'Telli', en: 'Order', ru: 'Заказать' },
  doneByPrefix: { et: 'Teeb ', en: 'Done by ', ru: 'Делает ' },
  housekeeper: { et: 'Koristaja', en: 'Cleaner', ru: 'Специалист по уборке' },
  nextPrefix: { et: 'järgmine ', en: 'next ', ru: 'следующий раз ' },
  iDoIt: { et: 'Teen ise', en: 'I do it myself', ru: 'Сделаю сам(а)' },
  nothingYet: { et: 'Hooldusrida veel ei ole. Vali allpool, mida kodu vajab.', en: 'There is no upkeep item yet. Choose below what the home needs.', ru: 'Пунктов ухода пока нет. Выберите ниже, что нужно дому.' },
  hideIt: { et: 'Peida', en: 'Hide', ru: 'Скрыть' },
  addShort: { et: 'Lisa', en: 'Add', ru: 'Добавить' },
  addOwn: { et: '+ Lisa oma rida', en: '+ Add your own item', ru: '+ Добавить свой пункт' },
  whatLabel: { et: 'Mis', en: 'What', ru: 'Что' },
  maintPh: { et: 'nt rõduukse tihendi kontroll', en: 'e.g. balcony door seal check', ru: 'напр. проверка уплотнителя балконной двери' },
  howOften: { et: 'Kui tihti', en: 'How often', ru: 'Как часто' },
  lastDoneField: { et: 'Viimati tehtud', en: 'Last done', ru: 'Последний раз' },
  reminderMail: { et: 'Saada mulle meeldetuletus e-postiga kaks nädalat enne tähtaega.', en: 'Send me an e-mail reminder two weeks before the due date.', ru: 'Присылать мне напоминание по почте за две недели до срока.' },
  whoNotified: { et: 'Pere', en: 'Household', ru: 'Семья' },
  whoElse: { et: 'Saavad samad kalendrikutsed ja pääsevad oma e-postiga rakendusse.', en: 'Receive the same calendar invites and sign in with their own e-mail.', ru: 'Получают те же приглашения в календарь и входят по своей эл. почте.' },
  ownerBadge: { et: 'Omanik', en: 'Owner', ru: 'Владелец' },
  newPerson: { et: 'Uus inimene', en: 'New person', ru: 'Новый человек' },
  sameTimes: { et: 'Saab samad teated', en: 'Gets the same notices', ru: 'Получает те же уведомления' },
  household: { et: 'Pere', en: 'Household', ru: 'Семья' },
  homesTitle: { et: 'Kodud', en: 'Homes', ru: 'Дома' },
  currentHome: { et: 'See kodu', en: 'This home', ru: 'Этот дом' },
  openThisHome: { et: 'Ava see kodu', en: 'Open this home', ru: 'Открыть этот дом' },
  makeTenant: { et: 'Märgi üürnikuks', en: 'Mark as tenant', ru: 'Отметить как арендатора' },
  tenantOn: { et: 'Üürnik', en: 'Tenant', ru: 'Арендатор' },
  tenantHint: { et: 'Üürnik näeb aegu ja saab tellida. Omaniku dokumente ja kodu üleandmist üürnik ei näe.', en: 'The tenant sees the times and can order. The tenant does not see the owner’s documents or the handover.', ru: 'Арендатор видит время и может заказывать. Документы владельца и передачу дома арендатор не видит.' },
  handoverTitle: { et: 'Anna kodu üle', en: 'Hand the home over', ru: 'Передать дом' },
  handoverBody: { et: 'Uus omanik saab e-kirjaga lingi. Sinu kontaktid, sissepääsu juhis ja küsimused kustutatakse. Dokumendid, hooldus ja visiidid jäävad uuele omanikule.', en: 'The new owner gets a link by e-mail. Your contacts, the access note and your questions are deleted. The documents, the upkeep and the visits stay with the new owner.', ru: 'Новый владелец получит ссылку по электронной почте. Ваши контакты, указание для входа и вопросы будут удалены. Документы, уход за домом и визиты перейдут к новому владельцу.' },
  handoverGo: { et: 'Anna üle', en: 'Hand over', ru: 'Передать' },
  handoverSent: { et: 'Link on saadetud. See kodu on nüüd uue omaniku käes.', en: 'The link is sent. This home is now with the new owner.', ru: 'Ссылка отправлена. Дом теперь у нового владельца.' },
  handoverFail: { et: 'Link ei läinud teele. Kontrolli aadressi ja proovi uuesti.', en: 'The link did not go out. Check the address and try again.', ru: 'Ссылка не отправилась. Проверьте адрес и попробуйте снова.' },
  deleteTitle: { et: 'Kustuta konto', en: 'Delete the account', ru: 'Удалить аккаунт' },
  deleteOwnerBody: { et: 'Kustutame sinu konto ja kõik, mida oled lisanud: kontaktid, dokumendid, soovid ja pereliikmete ligipääsu. Tulevased visiidid tühistatakse ja kaarditellimus lõpeb. Tehtud visiidid jäävad spetsialisti arvestusse ilma nime ja aadressita. Seda ei saa tagasi võtta.', en: 'We delete your account and everything you added: contacts, documents, requests and the household\'s access. Upcoming visits are cancelled and the card subscription ends. Done visits stay in the specialist\'s records without your name or address. This cannot be undone.', ru: 'Мы удалим ваш аккаунт и всё, что вы добавили: контакты, документы, запросы и доступ членов семьи. Предстоящие визиты будут отменены, подписка по карте закончится. Выполненные визиты останутся в учёте специалиста без имени и адреса. Отменить это нельзя.' },
  deleteMemberBody: { et: 'Kustutame sinu ligipääsu ja andmed. Kodu jääb teistele alles. Seda ei saa tagasi võtta.', en: 'We delete your access and your data. The home stays for the others. This cannot be undone.', ru: 'Мы удалим ваш доступ и ваши данные. Дом останется у остальных. Отменить это нельзя.' },
  deleteSendCode: { et: 'Saada kinnituskood', en: 'Send a confirmation code', ru: 'Отправить код подтверждения' },
  deleteCodeSent: { et: 'Saatsime koodi aadressile {email}.', en: 'We sent a code to {email}.', ru: 'Мы отправили код на {email}.' },
  deleteCodeLabel: { et: 'Kood', en: 'Code', ru: 'Код' },
  deleteGo: { et: 'Kustuta lõplikult', en: 'Delete for good', ru: 'Удалить окончательно' },
  deleteDone: { et: 'Konto on kustutatud.', en: 'The account is deleted.', ru: 'Аккаунт удалён.' },
  deleteFail: { et: 'Kustutamine ei õnnestunud. Proovi uuesti.', en: 'Deleting did not work. Try again.', ru: 'Удалить не удалось. Попробуйте снова.' },
  homePeopleTitle: { et: 'Inimesed sinu kodu juures', en: 'People caring for your home', ru: 'Кто заботится о вашем доме' },
  disconnectAsk: { et: 'Eemaldad selle spetsialisti oma kodu juurest?', en: 'Remove this specialist from your home?', ru: 'Отключить этого специалиста от вашего дома?' },
  nameLabel: { et: 'Nimi', en: 'Name', ru: 'Имя' },
  namePh: { et: 'nt Kristi', en: 'e.g. Anna', ru: 'напр. Анна' },
  phoneLabel: { et: 'Telefon', en: 'Phone', ru: 'Телефон' },
  emailLabel: { et: 'E-post', en: 'E-mail', ru: 'Эл. почта' },
  addPerson: { et: '+ Lisa inimene', en: '+ Add a person', ru: '+ Добавить человека' },
  homeFlat: { et: 'Korter', en: 'Flat', ru: 'Квартира' },
  homeHouse: { et: 'Maja', en: 'House', ru: 'Дом' },
  homeCottage: { et: 'Suvila', en: 'Cottage', ru: 'Дача' },
  pfAccess: { et: 'Sissepääs', en: 'Access', ru: 'Вход' },
  pfAccessHint: { et: 'nt uksekood 8821#, võti on naabri käes. Seda juhist näeb ainult koristaja, remondimehelt ja garantiilt küsitakse eraldi.', en: 'e.g. door code 8821#, the neighbour holds the key. Only the cleaner sees this note, the handyman and the warranty team are asked separately.', ru: 'напр. код двери 8821#, ключ у соседа. Это указание видит только специалист по уборке, для мастера и гарантийной службы оно запрашивается отдельно.' },
  pfPets: { et: 'Lemmikloomad', en: 'Pets', ru: 'Животные' },
  pfPetsHint: { et: 'nt kass Luna, sõbralik', en: 'e.g. cat Luna, friendly', ru: 'напр. кошка Луна, дружелюбная' },
  pfAllergies: { et: 'Allergiad ja vahendid', en: 'Allergies & products', ru: 'Аллергии и средства' },
  pfAllergiesHint: { et: 'nt looduslikud vahendid, lateksiallergia', en: 'e.g. natural products, latex allergy', ru: 'напр. натуральные средства, аллергия на латекс' },
  pfFlowerHint: { et: 'nt valged tulbid, mitte liiliaid', en: 'e.g. white tulips, no lilies', ru: 'напр. белые тюльпаны, без лилий' },
  pfLinens: { et: 'Voodipesu', en: 'Linens', ru: 'Постельное бельё' },
  pfLinensHint: { et: 'nt vahetada iga 2 nädala tagant', en: 'e.g. change every 2 weeks', ru: 'напр. менять каждые 2 недели' },
  pfTowels: { et: 'Rätikud', en: 'Towels', ru: 'Полотенца' },
  pfTowelsHint: { et: 'nt vahetada igal visiidil', en: 'e.g. change every visit', ru: 'напр. менять при каждом визите' },
  pfSpecial: { et: 'Erisoovid', en: 'Special requests', ru: 'Особые пожелания' },
  pfSpecialHint: { et: 'nt eritähelepanu köögile; kardinad pooleldi lahti; vannitoas ilma tugeva lõhnata', en: 'e.g. extra attention to the kitchen; curtains half open; no strong scents in the bathroom', ru: 'напр. особое внимание кухне; шторы наполовину открыты; в ванной без резких запахов' },
  lastDoneOn: { et: 'viimati {date}', en: 'last {date}', ru: 'в последний раз {date}' },
  intervalMonth: { et: 'iga kuu', en: 'monthly', ru: 'каждый месяц' },
  intervalYear: { et: 'kord aastas', en: 'yearly', ru: 'раз в год' },
  intervalTwoYears: { et: 'iga 2 aasta tagant', en: 'every 2 years', ru: 'раз в 2 года' },
  intervalEvery: { et: 'iga {n} kuu tagant', en: 'every {n} months', ru: 'каждые {n} мес.' },
  maintRemoveAsk: { et: 'Eemaldad selle rea hooldusest?', en: 'Remove this item from the upkeep?', ru: 'Удалить этот пункт из ухода за домом?' },
  maintFailed: { et: 'Muudatus ei salvestunud. Proovi uuesti.', en: 'The change was not saved. Try again.', ru: 'Изменение не сохранилось. Попробуйте снова.' },
  contactsSaveFailed: { et: 'Salvestamine ei õnnestunud. Kontrolli e-posti aadresse ja proovi uuesti.', en: 'Saving did not work. Check the e-mail addresses and try again.', ru: 'Сохранить не удалось. Проверьте адреса электронной почты и попробуйте снова.' },
  dealWith: { et: 'Kokkulepe {name}', en: 'Agreement with {name}', ru: 'Договорённость с {name}' },
  dealPlain: { et: 'Kokkulepe', en: 'Agreement', ru: 'Договорённость' },
  recommendName: { et: 'Soovita {name}', en: 'Recommend {name}', ru: 'Порекомендовать {name}' },
  recommendPlain: { et: 'Soovita', en: 'Recommend', ru: 'Порекомендовать' },
  awayRow: { et: 'Olen eemal', en: 'I am away', ru: 'Меня не будет' },
  awayAddDates: { et: 'Lisa kuupäevad', en: 'Add dates', ru: 'Добавить даты' },
  notifyRow: { et: 'Teavitused', en: 'Notices', ru: 'Уведомления' },
  notifyOn: { et: 'Sees', en: 'On', ru: 'Включены' },
  notifyOff: { et: 'Väljas', en: 'Off', ru: 'Выключены' },
  langEt: { et: 'Eesti', en: 'Estonian', ru: 'Эстонский' },
  langEn: { et: 'Inglise', en: 'English', ru: 'Английский' },
  langRu: { et: 'Vene', en: 'Russian', ru: 'Русский' },
  priceWord: { et: 'Hind', en: 'Price', ru: 'Цена' },
  rhythmWord: { et: 'Rütm', en: 'Rhythm', ru: 'Ритм' },
  includedLabel: { et: 'Hinna sees', en: 'Included', ru: 'Входит в цену' },
  pricePerVisit: { et: '{amount} kord', en: '{amount} a visit', ru: '{amount} за раз' },
  alsoEach: { et: 'Lisaks iga korraga', en: 'With every visit', ru: 'К каждому визиту' },
  writeIfChanges: { et: 'Kirjuta {name}, kui midagi muutub', en: 'Write to {name} if something changes', ru: 'Напишите {name}, если что-то изменится' },
  writeIfChangesPlain: { et: 'Kirjuta, kui midagi muutub', en: 'Write if something changes', ru: 'Напишите, если что-то изменится' },
  recommendLead: { et: '{name} on vabu aegu. Saada link sõbrale või naabrile. Aja ja hinna lepivad nad omavahel kokku.', en: '{name} has open times. Send the link to a friend or a neighbour. They agree the time and the price between them.', ru: 'У {name} есть свободное время. Отправьте ссылку другу или соседу. Время и цену они согласуют между собой.' },
  recommendLeadPlain: { et: 'Saada link sõbrale või naabrile. Aja ja hinna lepivad nad omavahel kokku.', en: 'Send the link to a friend or a neighbour. They agree the time and the price between them.', ru: 'Отправьте ссылку другу или соседу. Время и цену они согласуют между собой.' },
  friendSees: { et: 'Seda näeb sinu sõber', en: 'This is what your friend sees', ru: 'Это увидит ваш друг' },
  recommendsLine: { et: 'Soovitab {name}', en: '{name} recommends', ru: 'Рекомендует {name}' },
  copyWord: { et: 'Kopeeri', en: 'Copy', ru: 'Копировать' },
  copiedWord: { et: 'Kopeeritud', en: 'Copied', ru: 'Скопировано' },
  shareLink: { et: 'Jaga linki', en: 'Share the link', ru: 'Поделиться ссылкой' },
  noInviteYet: { et: 'Kutselinki veel ei ole.', en: 'There is no invite link yet.', ru: 'Ссылки-приглашения пока нет.' },
});

const mineChev = `<svg class="p-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>`;
const mineBack = `<svg class="p-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/></svg>`;

export const minuHtml = `<div x-show="activeTab === 'mine'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0">
                    <div x-show="!minePane" class="max-w-xl">
                        <h1 class="p-home-title" x-text="t('tabMine')"></h1>
                        <div class="p-sheet mt-5 p-5 flex items-center gap-4">
                            <span class="font-serif text-2xl w-14 h-14 rounded-full bg-cream inline-flex items-center justify-center shrink-0" x-text="(order?.customerName || '?').charAt(0)"></span>
                            <div class="min-w-0">
                                <p class="text-lg font-medium truncate" x-text="order?.customerName"></p>
                                <p class="text-sm text-muted truncate" x-show="order?.customerAddress || order?.address" x-text="order?.customerAddress || order?.address"></p>
                            </div>
                        </div>
                        <div class="p-rows mt-3.5">
                            <button type="button" class="p-row" x-show="hasCleaner" @click="openMine('deal')">
                                <span class="p-row-name" x-text="nameIn('ga') ? t('dealWith', { name: nameIn('ga') }) : t('dealPlain')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" @click="openMine('people')">
                                <span class="p-row-name" x-text="t('whoNotified')"></span>
                                <span class="p-row-side"><span class="text-muted" x-show="peopleRowValue" x-text="peopleRowValue"></span>${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" x-show="order?.status === 'paid'" @click="openMine('away')">
                                <span class="p-row-name" x-text="t('awayRow')"></span>
                                <span class="p-row-side"><span class="text-muted" x-text="awayRowValue"></span>${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" @click="openMine('notes')">
                                <span class="p-row-name" x-text="t('profileTitle')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" x-show="hasCleaner" @click="openMine('share')">
                                <span class="p-row-name" x-text="nameIn('t') ? t('recommendName', { name: nameIn('t') }) : t('recommendPlain')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                        </div>
                        <div class="p-rows mt-3.5">
                            <button type="button" class="p-row" @click="openMine('notify')">
                                <span class="p-row-name" x-text="t('notifyRow')"></span>
                                <span class="p-row-side"><span class="text-muted" x-text="notifyState"></span>${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" @click="openMine('lang')">
                                <span class="p-row-name" x-text="t('langLabel')"></span>
                                <span class="p-row-side"><span class="text-muted" x-text="langName"></span>${mineChev}</span>
                            </button>
                        </div>
                        <div class="p-rows mt-3.5" x-show="(partners && partners.length) || (viewer && viewer.primary) || viewer">
                            <button type="button" class="p-row" x-show="partners.length" @click="openMine('partners')">
                                <span class="p-row-name" x-text="t('homePeopleTitle')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" @click="openMine('upkeep')">
                                <span class="p-row-name" x-text="t('upkeep')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" x-show="viewer && viewer.primary" @click="openMine('handover')">
                                <span class="p-row-name" x-text="t('handoverTitle')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                            <button type="button" class="p-row" x-show="viewer" @click="openMine('delete')">
                                <span class="p-row-name" x-text="t('deleteTitle')"></span>
                                <span class="p-row-side">${mineChev}</span>
                            </button>
                        </div>
                        <div x-show="homes.length > 1" x-cloak class="p-sheet mt-3.5">
                            <div class="px-5 py-4 border-b border-line">
                                <h2 class="p-h" x-text="t('homesTitle')"></h2>
                            </div>
                            <div class="divide-y divide-line">
                                <template x-for="h in homes" :key="h.id">
                                    <div class="px-5 py-4 flex items-center justify-between gap-4">
                                        <div class="min-w-0">
                                            <p class="truncate" x-text="h.address || t('tabKodu')"></p>
                                            <p class="eyebrow mt-1" x-show="h.current" x-text="t('currentHome')"></p>
                                        </div>
                                        <button type="button" class="p-sheet-btn mt-0 w-auto px-4" x-show="!h.current" @click="openHome(h.id)" x-text="t('openThisHome')"></button>
                                    </div>
                                </template>
                            </div>
                        </div>
                        <button type="button" class="text-base mt-4 h-11" @click="logout()" x-text="t('logOut')"></button>
                    </div>
                    <div x-show="minePane" x-cloak class="max-w-xl p-sub">
                        <button type="button" class="p-back" @click="minePane = ''">${mineBack}<span x-text="t('tabMine')"></span></button>
                        <h1 class="p-sub-title" x-text="minePaneTitle"></h1>
                        <div x-show="minePane === 'deal'">
                            <div class="p-rows mt-5">
                                <div class="p-row">
                                    <span class="text-muted" x-text="t('rhythmWord')"></span>
                                    <span class="font-medium text-right" x-text="dealRhythm"></span>
                                </div>
                                <div class="p-row">
                                    <span class="text-muted" x-text="t('priceWord')"></span>
                                    <span class="font-medium text-right" x-text="dealPrice"></span>
                                </div>
                                <div class="px-5 py-4" x-show="dealIncludes">
                                    <p class="text-muted" x-text="t('includedLabel')"></p>
                                    <p class="mt-1.5" x-text="dealIncludes"></p>
                                </div>
                            </div>
                            <p class="eyebrow mt-5" x-show="serviceById('flowers')" x-text="t('alsoEach')"></p>
                            <div class="p-rows mt-2.5" x-show="serviceById('flowers')">
                                <button type="button" class="p-row" @click="activeTab = 'extras'; openTelli('flowers')">
                                    <span class="p-row-name" x-text="t('addonFlowers')"></span>
                                    <span class="p-row-side"><span class="text-muted" x-text="t('addShort')"></span>${mineChev}</span>
                                </button>
                            </div>
                            <button type="button" class="p-sheet-btn" @click="openVisitFeedback()" x-text="nameIn('le') ? t('writeIfChanges', { name: nameIn('le') }) : t('writeIfChangesPlain')"></button>
                        </div>
                        <div x-show="minePane === 'away'">
                            <p class="text-sm text-muted mt-4" x-text="t('awayLead')"></p>
                            <div x-show="extras.away?.length" x-cloak class="p-rows mt-4">
                                <template x-for="p in extras.away" :key="p.id">
                                    <div class="p-row">
                                        <span><span x-text="formatDateShort(p.from)"></span><span x-show="p.to && p.to !== p.from"> – <span x-text="formatDateShort(p.to)"></span></span></span>
                                        <button type="button" class="text-sm text-muted" @click="removeAway(p)" :disabled="awayProcessing" x-text="t('docRemove')"></button>
                                    </div>
                                </template>
                            </div>
                            <div class="grid grid-cols-2 gap-2 mt-4">
                                <label class="block"><span class="eyebrow" x-text="t('fromLabel')"></span><input id="konto-away-from" type="date" x-model="awayFrom" :min="todayStr()" class="p-field"></label>
                                <label class="block"><span class="eyebrow" x-text="t('untilLabel')"></span><input id="konto-away-to" type="date" x-model="awayTo" :min="awayFrom || todayStr()" class="p-field"></label>
                            </div>
                            <input type="text" x-model="awayNote" maxlength="300" :placeholder="t('awayNotePh')" :aria-label="t('awayNotePh')" class="p-field">
                            <div class="flex gap-4 mt-2 text-sm">
                                <button type="button" @click="presetAwayMonth(1)" x-text="t('awayNextMonth')"></button>
                                <button type="button" @click="presetAwayMonth(0)" x-text="t('awayThisMonth')"></button>
                            </div>
                            <button type="button" class="p-go is-wide mt-5" @click="addAway()" :disabled="awayProcessing || !awayFrom" x-text="awayProcessing ? t('docSaving') : t('awaySave')"></button>
                            <p x-show="awayError" x-cloak class="text-sm text-accent mt-3" x-text="awayError"></p>
                            <p x-show="awayDone" x-cloak class="text-sm mt-3" x-text="awayDone"></p>
                        </div>
                        <div x-show="minePane === 'share'">
                            <p class="text-sm text-muted mt-3" x-text="nameIn('l') ? t('recommendLead', { name: nameIn('l') }) : t('recommendLeadPlain')"></p>
                            <p class="eyebrow mt-6" x-text="t('friendSees')"></p>
                            <div class="p-sheet mt-2.5 p-5 flex items-center gap-4">
                                <span class="font-serif text-2xl w-14 h-14 rounded-full bg-cream inline-flex items-center justify-center shrink-0" x-text="(providerFirstName || '?').charAt(0)"></span>
                                <div>
                                    <p class="text-lg font-medium" x-text="extras.provider?.name || order?.provider?.name"></p>
                                    <p class="text-sm text-muted" x-text="t('cleaning')"></p>
                                    <p class="text-sm text-accent mt-1.5" x-show="order?.customerName" x-text="t('recommendsLine', { name: order?.customerName })"></p>
                                </div>
                            </div>
                            <div class="p-sheet mt-3.5 pl-5 pr-2 h-16 flex items-center justify-between gap-3" x-show="extras.provider && extras.provider.inviteUrl">
                                <span class="truncate" x-text="extras.provider && extras.provider.inviteUrl"></span>
                                <button type="button" class="p-seg shrink-0" @click="copyCleanerLink()" x-text="linkCopied ? t('copiedWord') : t('copyWord')"></button>
                            </div>
                            <p x-show="!(extras.provider && extras.provider.inviteUrl)" class="text-sm text-muted mt-4" x-text="t('noInviteYet')"></p>
                            <div class="p-order-bar is-stack" x-show="extras.provider && extras.provider.inviteUrl">
                                <button type="button" class="p-go is-wide" @click="shareCleanerLink()" x-text="t('shareLink')"></button>
                            </div>
                        </div>
                        <div x-show="minePane === 'notify'">
                            <label class="flex items-start gap-3 mt-5 text-sm cursor-pointer">
                                <input type="checkbox" class="mt-0.5 accent-black" :checked="maintenance.remindersEnabled !== false" @change="maintenanceAction({ action: 'reminders', enabled: $event.target.checked }, 'reminders')">
                                <span x-text="t('reminderMail')"></span>
                            </label>
                        </div>
                        <div x-show="minePane === 'lang'" class="p-rows mt-5">
                            <button type="button" class="p-row" @click="setPortalLang('et')"><span :class="lang === 'et' ? 'font-medium' : ''" x-text="t('langEt')"></span></button>
                            <button type="button" class="p-row" @click="setPortalLang('en')"><span :class="lang === 'en' ? 'font-medium' : ''" x-text="t('langEn')"></span></button>
                            <button type="button" class="p-row" @click="setPortalLang('ru')"><span :class="lang === 'ru' ? 'font-medium' : ''" x-text="t('langRu')"></span></button>
                        </div>
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start min-w-0 mt-6" x-show="['notes','upkeep','people','partners','handover','delete'].includes(minePane)">

                        <div class="lg:col-span-7 space-y-6 lg:space-y-8 min-w-0">

                        <!-- ── Kodu: what the cleaner should know. Compact read mode; edits in place ── -->
                        <div x-show="minePane === 'notes'" class="bg-white border border-line">
                            <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-line">
                                <h2 class="p-h"><span x-text="t('profileTitle')"></span></h2>
                                <button type="button" x-show="!profileEditing" @click="profileEditing = true" class="p-btn-2 p-btn-sm" x-text="t('edit')"></button>
                            </div>
                            <div class="p-6">
                                <p class="text-xs text-muted font-sans font-light" x-text="t('keeperSees')"></p>

                                <!-- Read mode -->
                                <div x-show="!profileEditing" class="mt-4">
                                    <dl x-show="profileFilled.length" class="grid sm:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-line">
                                        <template x-for="f in profileFilled" :key="f.key">
                                            <div :class="f.long ? 'sm:col-span-2' : ''">
                                                <dt class="eyebrow mb-1" x-text="f.label"></dt>
                                                <dd class="font-sans text-sm leading-relaxed whitespace-pre-line" x-text="f.key === 'access' ? t('accessSaved') : homeProfile[f.key]"></dd>
                                            </div>
                                        </template>
                                    </dl>
                                </div>

                                <!-- Edit mode -->
                                <form x-show="profileEditing" x-cloak @submit.prevent="saveHomeProfile()" class="mt-5">
                                    <div x-show="!brand" class="flex items-center gap-1.5 text-xs font-sans mb-5">
                                        <template x-for="kind in ['apartment', 'house', 'summer']" :key="kind">
                                            <button type="button" @click="setHomeType(kind)" :class="maintenance.homeType === kind ? 'bg-black text-paper border-black' : 'border-line text-muted hover:text-black'" class="px-3 py-1.5 border transition-colors" x-text="homeTypeLabel(kind)"></button>
                                        </template>
                                    </div>
                                    <div class="grid sm:grid-cols-2 gap-x-8 gap-y-5">
                                        <template x-for="f in profileFields" :key="f.key">
                                            <label class="block" :class="f.long ? 'sm:col-span-2' : ''">
                                                <span class="eyebrow mb-1.5" x-text="f.label"></span>
                                                <template x-if="f.long"><textarea x-model="homeProfile[f.key]" :placeholder="f.hint" rows="3" maxlength="500" class="w-full bg-transparent border border-line focus:border-accent outline-none p-3 font-sans font-light text-base transition-colors placeholder:text-line-strong resize-none"></textarea></template>
                                                <template x-if="!f.long"><input type="text" x-model="homeProfile[f.key]" :placeholder="f.hint" maxlength="300" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base transition-colors placeholder:text-line-strong"></template>
                                            </label>
                                        </template>
                                    </div>
                                    <div class="flex items-center gap-4 mt-6">
                                        <button type="submit" :disabled="profileSaving" class="p-btn disabled:opacity-50">
                                            <span x-show="!profileSaving" x-text="t('save')"></span>
                                            <span x-show="profileSaving" x-cloak x-text="t('docSaving')"></span>
                                        </button>
                                        <button type="button" @click="profileEditing = false; profileError = ''" class="text-sm font-sans text-muted hover:text-black" x-text="t('docCancel')"></button>
                                        <span x-show="profileSaved" x-cloak x-transition class="text-sm font-sans font-light" x-text="t('saved')"></span>
                                    </div>
                                    <p x-show="profileError" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="profileError"></p>
                                </form>
                            </div>
                        </div>

                        <!-- ── Hooldusrütm: compact header until opened ── -->
                        <div id="hooldus" x-show="minePane === 'upkeep'" class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4" :class="upkeepOpen ? 'border-b border-line' : ''">
                                <div class="min-w-0">
                                    <h2 class="p-h"><span x-text="t('upkeep')"></span></h2>
                                    <p class="text-xs text-muted font-sans font-light mt-0.5" x-text="maintenanceDue ? (maintenanceDue + t('dueSuffix')) : t('upkeepLead')"></p>
                                </div>
                                <button type="button" @click="upkeepOpen = !upkeepOpen" class="p-btn-2 p-btn-sm shrink-0" x-text="upkeepOpen ? t('hideIt') : t('showUpkeep')"></button>
                            </div>
                            <div x-show="upkeepOpen" x-cloak class="p-6 space-y-8">

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
                                                <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm font-sans">
                                                    <button type="button" @click="markMaintenanceDone(item)" :disabled="!!maintBusy" class="underline underline-offset-4 hover:text-accent transition-colors disabled:opacity-40" x-text="t('doneWord')"></button>
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
                                                <button type="button" @click="assignMaintenance(item, 'home')" :disabled="!!maintBusy" class="mt-3 text-sm font-sans text-muted hover:text-black transition-colors" x-text="t('iDoIt')"></button>
                                            </div>
                                        </div>
                                    </template>
                                </div>
                            </div>

                            <p x-show="!maintenance.items.length && extrasLoaded" class="text-sm text-muted font-sans font-light" x-text="t('nothingYet')"></p>

                            <div x-show="upkeepSuggestions.length">
                                <button type="button" @click="maintShowSuggestions = !maintShowSuggestions" x-show="maintenance.items.length" class="text-sm font-sans text-muted hover:text-black" x-text="maintShowSuggestions ? (t('hideIt')) : (t('addShort'))"></button>
                                <div x-show="maintShowSuggestions || !maintenance.items.length" x-cloak>
                                    <template x-for="s in upkeepSuggestions" :key="s.id">
                                        <button type="button" @click="addSuggestion(s)" :disabled="!!maintBusy" class="w-full text-left py-3 border-b border-line flex items-baseline justify-between gap-4 disabled:opacity-50 hover:border-black transition-colors">
                                            <span class="font-sans text-sm font-light" x-text="s.name"></span>
                                            <span class="text-xs text-muted font-sans font-light shrink-0" x-text="intervalLabel(s.intervalMonths)"></span>
                                        </button>
                                    </template>
                                </div>
                            </div>

                            <!-- Custom item -->
                            <div class="mt-6">
                                <button type="button" x-show="!maintAdding" @click="maintAdding = true" class="text-sm font-sans underline underline-offset-4" x-text="t('addOwn')"></button>
                                <div x-show="maintAdding" x-cloak class="border border-line p-4 grid sm:grid-cols-3 gap-4">
                                    <label class="block sm:col-span-3"><span class="eyebrow mb-1" x-text="t('whatLabel')"></span><input type="text" x-model="maintForm.name" maxlength="80" :placeholder="t('maintPh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong"></label>
                                    <label class="block"><span class="eyebrow mb-1" x-text="t('howOften')"></span>
                                        <select x-model.number="maintForm.intervalMonths" class="w-full bg-transparent border-b border-line py-2 font-sans font-light text-base outline-none"><template x-for="m in maintenance.intervals" :key="m"><option :value="m" x-text="intervalLabel(m)"></option></template></select></label>
                                    <label class="block"><span class="eyebrow mb-1" x-text="t('lastDoneField')"></span><input type="date" x-model="maintForm.lastDoneAt" :max="maintenance.today" class="w-full bg-transparent border-b border-line py-2 font-sans font-light text-base outline-none"></label>
                                    <div class="flex items-end gap-3">
                                        <button type="button" @click="addCustomMaintenance()" :disabled="!maintForm.name || !!maintBusy" class="p-btn p-btn-sm disabled:opacity-50" x-text="t('addShort')"></button>
                                        <button type="button" @click="maintAdding = false" class="text-sm text-muted hover:text-black font-sans pb-2" x-text="t('docCancel')"></button>
                                    </div>
                                </div>
                            </div>
                            <p x-show="maintError" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="maintError"></p>
                            <label x-show="maintHomeItems.length" class="flex items-start gap-3 mt-6 pt-5 border-t border-line text-sm font-sans font-light text-muted cursor-pointer">
                                <input type="checkbox" :checked="maintenance.remindersEnabled !== false" @change="maintenanceAction({ action: 'reminders', enabled: $event.target.checked }, 'reminders')" class="mt-0.5 accent-black">
                                <span x-text="t('reminderMail')"></span>
                            </label>
                            </div>
                        </div>

                        </div>

                        <aside class="lg:col-span-5 space-y-6 lg:space-y-8 min-w-0">

                        <!-- ── Connected specialists ── -->
                        <div x-show="minePane === 'partners' && partners.length" x-cloak class="bg-white border border-line">
                            <div class="px-6 py-4 border-b border-line">
                                <h2 class="p-h" x-text="t('homePeopleTitle')"></h2>
                            </div>
                            <div class="divide-y divide-line">
                                <template x-for="p in partners" :key="p.category">
                                    <div class="px-6 py-4 flex items-center justify-between gap-4">
                                        <div class="min-w-0">
                                            <p class="eyebrow" x-text="p.label"></p>
                                            <p class="font-sans text-sm mt-1 truncate" x-text="p.name + (p.businessName ? ' · ' + p.businessName : '')"></p>
                                            <p class="text-xs text-muted font-sans font-light mt-0.5 truncate" x-text="[p.phone, p.email].filter(Boolean).join(' · ')"></p>
                                        </div>
                                        <button type="button" x-show="viewer && viewer.primary && p.canDisconnect" @click="disconnectPartner(p)" class="text-xs font-sans text-muted hover:text-black shrink-0" x-text="t('docRemove')"></button>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- ── Household contacts (compact rows until edited) ── -->
                        <div x-show="minePane === 'people'" class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
                                <h2 class="p-h" x-text="t('whoNotified')"></h2>
                                <button type="button" x-show="viewer && viewer.primary && contacts.length && !contactsEditing" @click="contactsEditing = true" class="p-btn-2 p-btn-sm" x-text="t('edit')"></button>
                            </div>
                            <div class="p-6">
                            <p class="text-xs text-muted font-sans font-light" x-text="t('whoElse')"></p>
                            <div class="mt-4 space-y-2.5">
                                <div class="flex items-center gap-3 text-sm font-sans bg-cream/50 px-4 py-3">
                                    <div class="w-8 h-8 rounded-full bg-black text-paper flex items-center justify-center text-xs shrink-0" x-text="(order?.customerName || '?').charAt(0)"></div>
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate" x-text="order?.customerName"></p>
                                        <p class="text-xs text-muted font-light truncate" x-text="order?.customerEmail"></p>
                                    </div>
                                    <span class="eyebrow shrink-0" x-text="viewer && viewer.primary === false ? t('ownerBadge') : t('youShort')"></span>
                                </div>
                                <template x-for="(c, i) in contacts" :key="c.id || ('new-' + i)">
                                    <div class="border border-line bg-white px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-full bg-cream text-black flex items-center justify-center text-xs shrink-0" x-text="(c.name || '?').charAt(0)"></div>
                                            <div class="min-w-0 flex-1">
                                                <p class="truncate text-sm font-sans" x-text="c.name || (t('newPerson'))"></p>
                                                <p class="text-xs text-muted font-light truncate" x-text="[c.email, c.phone].filter(Boolean).join(' · ') || t('sameTimes')"></p>
                                            </div>
                                            <span class="eyebrow shrink-0" x-text="(viewer && !viewer.primary && c.email && viewer.email && c.email.toLowerCase() === viewer.email.toLowerCase()) ? t('youShort') : (c.role === 'tenant' ? t('tenantOn') : t('household'))"></span>
                                        </div>
                                        <div class="grid sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-line" x-show="(!viewer || viewer.primary) && (contactsEditing || String(c.id || '').startsWith('new-'))">
                                            <label class="block">
                                                <span class="eyebrow mb-1" x-text="t('nameLabel')"></span>
                                                <input type="text" x-model="c.name" :placeholder="t('namePh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                            <label class="block">
                                                <span class="eyebrow mb-1" x-text="t('phoneLabel')"></span>
                                                <input type="tel" x-model="c.phone" placeholder="+372 …" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                            <label class="block sm:col-span-2">
                                                <span class="eyebrow mb-1" x-text="t('emailLabel')"></span>
                                                <input type="email" x-model="c.email" placeholder="nimi@näide.ee" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                            </label>
                                            <p class="sm:col-span-2 text-xs text-muted font-sans font-light" x-show="c.role === 'tenant'" x-text="t('tenantHint')"></p>
                                            <div class="sm:col-span-2 flex items-center justify-end gap-4">
                                                <button type="button" @click="c.role = c.role === 'tenant' ? 'household' : 'tenant'" class="text-xs font-sans text-muted hover:text-black" x-text="c.role === 'tenant' ? t('household') : t('makeTenant')"></button>
                                                <button type="button" @click="removeContact(i)" class="text-xs font-sans text-muted hover:text-black shrink-0" x-text="t('docRemove')"></button>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <div class="flex flex-wrap items-center gap-4 mt-5" x-show="viewer && viewer.primary">
                                <button type="button" @click="addContact()" :disabled="contacts.length >= (extras.maxContacts || 6)" class="text-sm font-sans underline underline-offset-4 disabled:opacity-40" x-text="t('addPerson')"></button>
                                <button type="button" x-show="contactsEditing" @click="saveContacts()" :disabled="contactsSaving" class="ml-auto p-btn p-btn-sm disabled:opacity-50">
                                    <span x-show="!contactsSaving" x-text="t('save')"></span>
                                    <span x-show="contactsSaving" x-cloak x-text="t('docSaving')"></span>
                                </button>
                                <span x-show="contactsSaved" x-cloak x-transition class="text-sm font-sans font-light" x-text="t('saved')"></span>
                            </div>
                            <p x-show="contactsError" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="contactsError"></p>
                            </div>
                        </div>

                        <!-- ── Hand over home (collapsed until needed) ── -->
                        <div x-show="minePane === 'handover' && viewer && viewer.primary" x-cloak class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4" :class="handoverOpen ? 'border-b border-line' : ''">
                                <h2 class="p-h" x-text="t('handoverTitle')"></h2>
                                <button type="button" @click="handoverOpen = !handoverOpen" class="p-btn-2 p-btn-sm" x-text="handoverOpen ? t('hideIt') : t('showUpkeep')"></button>
                            </div>
                            <form x-show="handoverOpen" x-cloak class="p-6" @submit.prevent="handOverHome()">
                                <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="t('handoverBody')"></p>
                                <label class="block mt-5">
                                    <span class="eyebrow" x-text="t('nameLabel')"></span>
                                    <input type="text" x-model="handover.name" maxlength="120" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                                </label>
                                <label class="block mt-4">
                                    <span class="eyebrow" x-text="t('emailLabel')"></span>
                                    <input type="email" x-model="handover.email" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base">
                                </label>
                                <button type="submit" class="p-btn mt-6" :disabled="handover.busy" x-text="handover.busy ? t('docSaving') : t('handoverGo')"></button>
                                <p x-show="handover.error" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="handover.error"></p>
                                <p x-show="handover.sent" x-cloak class="text-sm font-sans font-light mt-3" x-text="t('handoverSent')"></p>
                            </form>
                        </div>

                        <!-- ── Delete the account (App Store asks for it; collapsed until needed) ── -->
                        <div x-show="minePane === 'delete' && viewer" x-cloak class="bg-white border border-line">
                            <div class="flex items-center justify-between gap-4 px-6 py-4" :class="deleteOpen ? 'border-b border-line' : ''">
                                <h2 class="p-h" x-text="t('deleteTitle')"></h2>
                                <button type="button" @click="deleteOpen = !deleteOpen" class="p-btn-2 p-btn-sm" x-text="deleteOpen ? t('hideIt') : t('showUpkeep')"></button>
                            </div>
                            <div x-show="deleteOpen" x-cloak class="p-6">
                                <p class="text-sm text-muted font-sans font-light leading-relaxed" x-text="viewer && viewer.primary ? t('deleteOwnerBody') : t('deleteMemberBody')"></p>
                                <button type="button" x-show="!del.step" class="p-btn-2 mt-6" :disabled="del.busy" @click="askDeleteCode()" x-text="del.busy ? t('docSaving') : t('deleteSendCode')"></button>
                                <form x-show="del.step === 'code'" x-cloak class="mt-5" @submit.prevent="deleteAccount()">
                                    <p class="text-sm font-sans font-light" x-text="t('deleteCodeSent', { email: del.email })"></p>
                                    <label class="block mt-4">
                                        <span class="eyebrow" x-text="t('deleteCodeLabel')"></span>
                                        <input type="text" x-model="del.code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base tracking-[0.3em]">
                                    </label>
                                    <button type="submit" class="p-btn mt-6" :disabled="del.busy || del.code.length !== 6" x-text="del.busy ? t('docSaving') : t('deleteGo')"></button>
                                </form>
                                <p x-show="del.step === 'done'" x-cloak class="text-sm font-sans font-light mt-5" x-text="t('deleteDone')"></p>
                                <p x-show="del.error" x-cloak class="text-sm text-accent font-sans font-light mt-3" x-text="del.error"></p>
                            </div>
                        </div>

                        </aside>

                    </div>
                    </div>
                </div>`;
