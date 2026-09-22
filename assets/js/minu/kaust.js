import { add } from './dict.js';

add({
  folderTitle: { et: 'Kodu kaust', en: 'Home folder', ru: 'Папка дома' },
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
  docUpload: { et: 'Laadi kausta', en: 'Upload to folder', ru: 'Загрузите в папку' },
  docAdd: { et: 'Lisa kausta', en: 'Add to folder', ru: 'Добавьте в папку' },
  docCancel: { et: 'Loobu', en: 'Cancel', ru: 'Отмена' },
  docRemove: { et: 'Eemalda', en: 'Remove', ru: 'Удалите' },
  docOpen: { et: 'Ava', en: 'Open', ru: 'Откройте' },
  folderEmpty: { et: 'Kaust on veel tühi. Lisa esimene fail — leping, garantii või seadme juhend.', en: 'The folder is still empty. Add the first file — a contract, a warranty or an appliance manual.', ru: 'Папка ещё пуста. Добавьте первый файл — договор, гарантию или инструкцию к прибору.' },
  docTooBig: { et: 'Fail on suurem kui 8 MB', en: 'File is larger than 8 MB', ru: 'Файл больше 8 МБ' },
  docRemoveAsk: { et: 'Eemalda dokument nimekirjast?', en: 'Remove this document?', ru: 'Удалить документ из списка?' },
  askLabel: { et: 'Küsi', en: 'Ask', ru: 'Спросите' },
  askPh: { et: 'nt filtri mõõt', en: 'e.g. the filter size', ru: 'напр. размер фильтра' },
  askEmpty: { et: 'Juhendites seda ei ole.', en: 'The guides do not say.', ru: 'В инструкциях этого нет.' },
  askPage: { et: 'lk {page}', en: 'p. {page}', ru: 'стр. {page}' },
  askOpen: { et: 'Ava juhend', en: 'Open the guide', ru: 'Откройте инструкцию' },
  askTechBtn: { et: 'Telli tehnik', en: 'Order a technician', ru: 'Закажите техника' },
  askPerson: { et: 'Saada inimesele', en: 'Send to a person', ru: 'Отправьте человеку' },
  askSent: { et: 'Saadetud. Vastus tuleb siia.', en: 'Sent. The answer comes here.', ru: 'Отправлено. Ответ придёт сюда.' },
  exportHome: { et: 'Laadi kodu alla', en: 'Download this home', ru: 'Скачайте дом' },
});

export const kaustHtml = `<div id="dokumendid" class="lg:col-span-12 bg-white border border-line p-have">
                            <div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-line">
                                <h2 class="p-h"><span class="p-num">03</span><span x-text="t('folderTitle')"></span></h2>
                                <button type="button" @click="docAdding = !docAdding; docFile = null" class="p-btn-2 p-btn-sm" x-text="t('addFile')"></button>
                            </div>
                            <form class="px-6 py-4 border-b border-line" @submit.prevent="askFolder()">
                                <label class="eyebrow" for="ask-q" x-text="t('askLabel')"></label>
                                <div class="flex flex-col sm:flex-row gap-3 mt-2">
                                    <input id="ask-q" type="text" x-model="askText" maxlength="200" :placeholder="t('askPh')" class="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 font-sans font-light text-base placeholder:text-line-strong">
                                    <button type="submit" class="p-btn shrink-0" x-text="t('askLabel')"></button>
                                </div>
                                <div x-show="askCard" x-cloak class="mt-4 border border-line p-4 text-left">
                                    <p class="text-sm font-sans font-light" x-show="askCard && askCard.fact" x-text="askCard && askCard.fact"></p>
                                    <p class="text-sm text-muted font-sans font-light mt-1" x-show="askCard && askCard.place" x-text="askCard && askCard.place"></p>
                                    <p class="text-sm font-sans font-light" x-show="askCard && !askCard.fact" x-text="t('askEmpty')"></p>
                                    <a x-show="askCard && askCard.action === 'open'" class="p-btn mt-4 no-underline" :href="askCard ? askCard.href : ''" target="_blank" rel="noopener" x-text="t('askOpen')"></a>
                                    <button type="button" x-show="askCard && askCard.action === 'tech'" class="p-btn mt-4" @click="orderTechnician()" x-text="t('askTechBtn')"></button>
                                    <button type="button" x-show="askCard && askCard.action === 'person'" class="p-btn mt-4" @click="sendAskToPerson()" x-text="t('askPerson')"></button>
                                </div>
                                <button type="button" class="text-sm font-sans mt-3 underline underline-offset-4" @click="downloadHome()" x-text="t('exportHome')"></button>
                            </form>

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
                                                        <a x-show="d.file || d.url" :href="docHref(d)" target="_blank" rel="noopener" class="text-[11px] uppercase tracking-[0.14em] font-sans text-muted hover:text-black" x-text="t('docOpen')"></a>
                                                    </span>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <p x-show="!documents.items.length" class="px-6 py-10 text-center text-sm text-muted font-sans font-light" x-text="t('folderEmpty')"></p>
                        </div>`;
