import { add } from './dict.js';

add({
  folderTitle: { et: 'Kaust', en: 'Folder', ru: 'Папка' },
  factHeat: { et: 'Küte', en: 'Heating', ru: 'Отопление' },
  factFilter: { et: 'Filter', en: 'Filter', ru: 'Фильтр' },
  factWater: { et: 'Vesi', en: 'Water', ru: 'Вода' },
  factPower: { et: 'Elekter', en: 'Electricity', ru: 'Электричество' },
  factWarranty: { et: 'Garantii lõpp', en: 'Warranty end', ru: 'Конец гарантии' },
  addFile: { et: '+ Lisa fail', en: '+ Add a file', ru: '+ Добавьте файл' },
  docChoose: { et: 'Vali fail — PDF või foto', en: 'Choose a file — PDF or photo', ru: 'Выберите файл — PDF или фото' },
  docFileHint: { et: 'kuni 8 MB · või jäta tühjaks ja lisa link', en: 'up to 8 MB · or leave empty and add a link', ru: 'до 8 МБ · или оставьте пустым и добавьте ссылку' },
  docTitle: { et: 'Pealkiri', en: 'Title', ru: 'Название' },
  docTitlePh: { et: 'nt Kodukindlustus 2026', en: 'e.g. Home insurance 2026', ru: 'напр. страховка дома 2026' },
  docCategory: { et: 'Kategooria', en: 'Category', ru: 'Категория' },
  docLink: { et: 'Link (kui faili pole)', en: 'Link (if there is no file)', ru: 'Ссылка (если файла нет)' },
  docNote: { et: 'Märge', en: 'Note', ru: 'Заметка' },
  docNotePh: { et: 'nt kehtib kuni 03.2028', en: 'e.g. valid until 03.2028', ru: 'напр. действует до 03.2028' },
  docSaving: { et: 'Salvestan…', en: 'Saving…', ru: 'Сохраняю…' },
  docUpload: { et: 'Lisa fail', en: 'Add the file', ru: 'Добавьте файл' },
  docAdd: { et: 'Lisa dokument', en: 'Add the document', ru: 'Добавьте документ' },
  docCancel: { et: 'Loobu', en: 'Cancel', ru: 'Отмена' },
  docRemove: { et: 'Eemalda', en: 'Remove', ru: 'Удалите' },
  docOpen: { et: 'Ava', en: 'Open', ru: 'Откройте' },
  docClose: { et: 'Sulge', en: 'Close', ru: 'Закройте' },
  folderEmpty: { et: 'Dokumente veel ei ole. Lisa fail, kui sul on leping või juhend.', en: 'There are no documents yet. Add a file if you have a contract or a guide.', ru: 'Документов пока нет. Добавьте файл, если есть договор или инструкция.' },
  docTooBig: { et: 'Fail on suurem kui 8 MB', en: 'File is larger than 8 MB', ru: 'Файл больше 8 МБ' },
  docRemoveAsk: { et: 'Eemalda dokument nimekirjast?', en: 'Remove this document?', ru: 'Удалить документ из списка?' },
  askLabel: { et: 'Küsi', en: 'Ask', ru: 'Спросите' },
  askHomeLead: { et: 'Küsi kodu kohta', en: 'Ask about the home', ru: 'Спросите о доме' },
  askPh: { et: 'nt filtri mõõt', en: 'e.g. the filter size', ru: 'напр. размер фильтра' },
  askEmpty: { et: 'Dokumentides seda ei ole.', en: 'This is not in the documents.', ru: 'В документах этого нет.' },
  askIn: { et: 'Dokumendis', en: 'In the document', ru: 'В документе' },
  askPage: { et: 'lk {page}', en: 'p. {page}', ru: 'стр. {page}' },
  askOpen: { et: 'Ava dokument', en: 'Open the document', ru: 'Откройте документ' },
  askTechBtn: { et: 'Telli tehnik', en: 'Order a technician', ru: 'Закажите техника' },
  askPerson: { et: 'Saada küsimus edasi', en: 'Send the question on', ru: 'Отправьте вопрос дальше' },
  askSent: { et: 'Saadetud. Vastus tuleb siia.', en: 'Sent. The answer comes here.', ru: 'Отправлено. Ответ придёт сюда.' },
  exportHome: { et: 'Laadi dokumendid alla', en: 'Download the documents', ru: 'Скачайте документы' },
  exportPdfWaits: {
    et: 'Passi PDF tuleb hiljem. Alla tuleb kodu, kinnitatud faktid ja ajalugu.',
    en: 'The pass PDF comes later. This file is the home, the confirmed facts and the history.',
    ru: 'PDF паспорта будет позже. Сейчас в файле дом, подтверждённые факты и история.',
  },
});

export const kaustHtml = `<div id="dokumendid" x-show="activeTab === 'folder'" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-2" x-transition:enter-end="opacity-100 translate-y-0" class="min-w-0 bg-white border border-line p-have">
                            <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-line">
                                <h2 class="p-h"><span x-text="t('folderTitle')"></span></h2>
                                <button type="button" @click="docAdding = !docAdding; docFile = null" class="p-btn-2 p-btn-sm" x-text="t('addFile')"></button>
                            </div>
                            <div x-show="folderFacts.length" x-cloak class="px-6 border-b border-line">
                                <template x-for="fact in folderFacts" :key="fact.id">
                                    <div class="py-4 border-b border-line last:border-b-0">
                                        <p class="eyebrow" x-text="t(fact.labelKey)"></p>
                                        <p class="text-sm font-sans font-light mt-2" x-text="fact.value"></p>
                                        <p class="text-xs text-muted font-sans font-light mt-1" x-show="fact.page" x-text="t('askPage', { page: fact.page })"></p>
                                        <button type="button" x-show="fact.docId" class="text-sm font-sans mt-2 underline underline-offset-4" @click="openPassLine(fact)" x-text="t('docOpen')"></button>
                                    </div>
                                </template>
                            </div>

                            <!-- Add: a file (PDF or photo) or a link — one form -->
                            <div x-show="docAdding" x-cloak class="px-6 py-6 border-b border-line bg-white">
                                <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                    <label class="block lg:col-span-2 border border-dashed border-line-strong hover:border-black transition-colors p-4 cursor-pointer flex items-center gap-4" :class="docFile ? 'border-black bg-cream/40' : ''">
                                        <svg class="w-6 h-6 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"></path></svg>
                                        <span class="min-w-0">
                                            <span class="font-sans text-sm block truncate" x-text="docFile ? docFile.name : t('docChoose')"></span>
                                            <span class="text-xs text-muted font-sans font-light" x-text="docFile ? Math.round(docFile.size / 1024) + ' KB' : t('docFileHint')"></span>
                                        </span>
                                        <input type="file" class="hidden" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" @change="onDocFile($event)">
                                    </label>
                                    <label class="block"><span class="text-[10px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('docTitle')"></span><input type="text" x-model="docForm.title" maxlength="120" :placeholder="t('docTitlePh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong"></label>
                                    <label class="block"><span class="text-[10px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('docCategory')"></span>
                                        <select x-model="docForm.category" class="w-full bg-transparent border-b border-line py-2 font-sans font-light text-base outline-none"><template x-for="c in documents.categories" :key="c.id"><option :value="c.id" x-text="c.label"></option></template></select></label>
                                    <label class="block lg:col-span-2" x-show="!docFile"><span class="text-[10px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('docLink')"></span><input type="url" x-model="docForm.url" placeholder="https://" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong"></label>
                                    <label class="block lg:col-span-2"><span class="text-[10px] uppercase tracking-[0.15em] text-muted font-sans block mb-1" x-text="t('docNote')"></span><input type="text" x-model="docForm.note" maxlength="300" :placeholder="t('docNotePh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong"></label>
                                </div>
                                <div class="flex items-center gap-4 mt-5">
                                    <button type="button" @click="addDocument()" :disabled="!docForm.title || docBusy" class="p-btn" x-text="docBusy ? t('docSaving') : (docFile ? t('docUpload') : t('docAdd'))"></button>
                                    <button type="button" @click="docAdding = false; docFile = null" class="text-[11px] uppercase tracking-[0.15em] text-muted hover:text-black font-sans" x-text="t('docCancel')"></button>
                                    <p x-show="docError" x-cloak class="text-sm text-red-500 font-sans font-light" x-text="docError"></p>
                                </div>
                            </div>

                            <div x-show="documents.items.length">
                                <template x-for="group in documentsByCategory" :key="group.id">
                                    <div class="border-b border-line last:border-b-0">
                                        <p class="px-6 pt-5 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted font-sans" x-text="group.label"></p>
                                        <div class="divide-y divide-line">
                                            <template x-for="d in group.items" :key="d.id">
                                                <div class="px-6 py-3 flex items-center justify-between gap-4">
                                                    <span class="min-w-0">
                                                        <span class="block font-sans text-sm truncate" x-text="d.title"></span>
                                                        <span x-show="d.note" class="block text-xs text-muted font-sans font-light truncate" x-text="d.note"></span>
                                                    </span>
                                                    <span class="flex items-center gap-4 shrink-0">
                                                        <button type="button" x-show="d.source !== 'developer' && d.source !== 'building'" @click="removeDocument(d)" class="text-[10px] uppercase tracking-[0.14em] text-muted hover:text-black font-sans" x-text="t('docRemove')"></button>
                                                        <button type="button" x-show="d.file || d.url" @click="openDoc(d)" class="text-[11px] uppercase tracking-[0.14em] font-sans text-muted hover:text-black" x-text="t('docOpen')"></button>
                                                    </span>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <p x-show="!documents.items.length" class="px-6 py-10 text-center text-sm text-muted font-sans font-light" x-text="t('folderEmpty')"></p>
                            <button type="button" class="text-sm font-sans px-6 py-4 underline underline-offset-4" @click="downloadHome()" x-text="t('exportHome')"></button>
                        </div>
                        <div x-show="docPreview" x-cloak class="fixed inset-0 z-[120] bg-paper flex flex-col" role="dialog" aria-modal="true" @keydown.escape.window="if (docPreview) closeDoc()">
                            <div class="flex items-center justify-between gap-4 px-4 h-14 border-b border-line shrink-0">
                                <p class="font-sans text-sm truncate" x-text="docPreview && docPreview.title"></p>
                                <button type="button" class="p-btn-2 p-btn-sm shrink-0" @click="closeDoc()" x-text="t('docClose')"></button>
                            </div>
                            <iframe class="flex-1 w-full min-h-0 border-0" :src="docPreview ? docPreview.href : ''" title=""></iframe>
                        </div>`;
