# Arco ja arendaja osa välja: äpp on koristajale ja tema kliendile

## TL;DR
🎯 SUKODA-s ei ole enam arendaja lehte, Arco pakkumist, garantiivoogu ega kausta. Jääb koristaja ja tema klient.
Selle pärast ei pea koristaja ega klient enam nägema valikuid ja tekste, mis käivad uue maja üleandmise kohta: iga ekraan räägib ainult nende kokkuleppest.
Mis puudub või on katki: Arcoga edasi ei mindud, aga arendaja loogika on põimitud avalehte, elaniku äppi, töölauda, kirjadesse ja kataloogi.
Mida teen: võtan selle välja kuues lõigus, väljastpoolt sissepoole. Andmebaasist ei kustuta midagi. Cristelle konto ja tema kaks kodu jäävad puutumata.
Visuaalne mõju: avalehelt kaob arendaja valik, elaniku äpist garantii ja kaust, töölaualt garantii ja maja halduse valikud.
Mida testida: 1) Cristelle töölaud avaneb ja tänane päev on sama mis enne. 2) Sinu kodu avaneb ja järgmine visiit on sama mis enne. 3) sukoda.ee/arendajale ei ava enam arendaja lehte.

## Lõigud

| Lõik | Mis | Failid | Sõltub |
|---|---|---|---|
| 1 ✅ | Avalik pind: arendaja leht, Arco pakkumise leht, avalehe arendaja valik, vanad aadressid | `arendajale.html`, `arco-pakkumine.html`, `index.html`, `vite.config.js`, `firebase.json`, `public/robots.txt`, `scripts/ui-lint.js`, `scripts/ui-lint.baseline.json` | otsus 1 |
| 2 | Elaniku äpp: kingitud esimene koristus, arendaja nimi ja pilt päises, garantiiread, kaust | `minu.html`, `assets/js/minu/*.js` | otsus 2 |
| 3 | Töölaud: liitumisel valikud „Garantii ja maja“ ja „Maja haldus“, maja üleandmine | `haldus.html`, `assets/js/haldus-ru.js` | lõik 2 |
| 4 | Koodi lunastamine: Arco üleandmiskaardi haru | `lunasta.html` | otsus 3 |
| 5 | Taust: maja üleandmise ja kausta käsitlejad, Arco kirjad, garantii meeldetuletused, kataloogi garantiiread, hooldusrütmi garantiiread, testid | `functions/haldus.js`, `functions/index.js`, `functions/lib/haldus-core.js`, `functions/test/*` | lõigud 2 kuni 4, otsus 4, andmete kontroll |
| 6 | Näidisandmed ja dokumendid | `scripts/seed-arco-demo.js`, `scripts/demo-doc-text.js`, `scripts/make-demo-docs.py`, `scripts/demo-docs/`, `PLATVORMIPLAAN_2026.md`, `.cursor/rules/sukoda.mdc`, `CLAUDE.md`, `TEST_GUIDE.md` | lõik 5 |

Järjekord on väljast sisse: kõigepealt kaob see, mida inimene näeb, ja alles siis kood selle taga. Nii ei teki hetke, kus nupp on alles, aga tema käsitlejat enam ei ole.

## Tehniline plaan

### Lõik 1 (ehitatud 23.11.2026)
- `arendajale.html` ja `arco-pakkumine.html` on gitist eemaldatud. Ajalugu jääb alles.
- `vite.config.js`: sisendid `arendajale` ja `pakkumine` väljas.
- `firebase.json`: seitse ajutist ümbersuunamist (302) avalehele: `/arco`, `/arendajale`, `/arendajale/`, `/arendajale.html`, `/arco-pakkumine`, `/arco-pakkumine/`, `/arco-pakkumine.html`. 302, mitte 301, sest brauser jätab 301 jäädavalt meelde ja seda ei saa tagasi võtta. Kui otsus on lõplik, saab hiljem muuta 301-ks.
- `public/robots.txt`: rida `Disallow: /arendajale` väljas, et otsimootor näeks ümbersuunamist.
- `index.html`, jaotis „Alusta“: rolli nupp „Arendaja“ ja tema vorm on väljas. Koos nendega läks kood, mida ainult see haru kasutas: päring aadressile `/api/waitlist` väljaga `city: 'Arendaja'`, olek `name` ja `note`, teade „Aitäh. Kirjutame sulle peagi.“ ning sõnastiku võtmed `roleDeveloper`, `fCompany`, `fEmail`, `devLead`, `leaveContact`, `sentWaitTitle`, `sentWaitText` (et, en, ru). Koduomaniku kaks teed (kutsu oma inimene, mul on kood) ja teenusepakkuja tee on muutmata. `canSend` tagastab teenusepakkuja rollis nüüd alati väära, enne piisas e-postist.
- `scripts/ui-lint.js`: `arendajale.html` loendist `PAGES` väljas. Baasjoones selle faili kohta ridu ei olnud.
- Kontrollitud: `npm run check` roheline (ui-lint ok, 106 testi); `index.html`-is ei ole enam ühtegi vastet sõnadele arendaja, developer, застройщик ega aadressile `/arco`; ükski teine leht ei lingi eemaldatud lehtedele.
- Kontrollimata: `npm run build` ei jookse selles keskkonnas (rollup'i macOS-i binaar). Esimene päris ehitus on CI push'i järel või Marko masinas.
- Jäi alles, otsustada: `assets/images/story-interior*` (viis pildifaili) kasutas ainult Arco pakkumise leht. Ma ei kustutanud neid, sest uus avaleht võib päris fotot vajada.

### Lõigud 2 kuni 4 (kirjeldus, täpne plaan enne iga lõiku)
- Lõik 2: `pickNextThing` haru `welcome` ja tekstid `welcome*`, `giftRow`, `giftCleanMeta`, `giftNote`, `giftCovers`; päise plokk `brand?.image`; Telli read `reportProblem` ja garantii vorm; `allClearBody`; sakk „Kaust“ ja Kodu vormi „Küsi kodu kohta“. `kodu.test.mjs` uuendatakse samas commit'is.
- Lõik 3: `svcSignWarranty`, `svcSignBuilding`, `POST /api/haldus/buildings/handover` kutsuv vaade.
- Lõik 4: `lunasta.html` haru 2a (Arco kaart). Kutse ja vana kinkekaardi harud jäävad.

### Lõik 5 (kõige riskantsem, eraldi plaan ja andmete kontroll enne)
- Käsitlejad: `POST /api/haldus/buildings/handover`, `POST /api/me/handover`, `/api/me/documents*` (viis tükki).
- Kirjad: `welcomeIntroArco`, `subjReminderWarranty`, `reminderTitleWarranty`, valge sildi saatjanimi (`functions/index.js` rida 1351, `functions/haldus.js` rida 511 jj).
- Kataloog: `SERVICE_CATEGORIES.warranty`, viis garantiirida, hooldusrütmi read `warranty-inspection` ja `sealant-check`, dokumentide kategooria `handover`.
- Omaniku liik `developer` (`ownerKindOf`, konto kustutamise reegel real 1841 jj). See jääb alles seni, kuni andmete kontroll kinnitab, et ükski kodu seda ei kasuta.
- Enne ehitamist loen andmebaasist (ainult lugedes) kõik kodud, millel on `brand`, `source: 'developer'`, `warrantyId` või dokumente. Kui Cristelle kahel kodul on mõni neist väljadest, jääb vastav kood alles ja ma näitan leidu enne edasi minekut.

## Otsused
Marko vastused 22.11.2026:
1. Vanad aadressid `/arco` ja `/arendajale` suunatakse avalehele. Põhjus: keegi ei näe vealehte.
2. Kaust: lõigus 2 peidan ainult ekraani. Failid ja nende käsitlejad jäävad lõiguni 5 alles. Põhjus: midagi ei lähe kaotsi.
3. Arco üleandmiskaarte ei ole välja antud. `lunasta.html` haru 2a eemaldatakse lõigus 4.
4. Teise agendi teavituste muudatus (App Store'i ja Google Play äpp) ei olnud enam lõpetamata: teine agent tegi sellest kell 22:55 commit'i `10b8d4a` koos testidega, ja kell 22:56 veel ühe (`8f8838c`, kinkekaardi ostja konto kustutamine). Marko valis „viska minema“ eeldusel, et töö on pooleli. Commit'i ma tagasi ei võtnud; see on uus otsus ja ootab Marko vastust. Lõike 1 kuni 4 see ei sega.

## Väljaspool skoopi
- `sales.html`, `muuk.html` ja `deck.html` mainivad arendajaid vanade müügimaterjalide tekstis. Need on vanad lehed, neid ma ei puuduta. Kui tahad need üldse eemaldada, on see eraldi otsus.
- Lillede automaattellimus (`sendFlowerOrders`) on koodis olemas. See ei ole Arco osa ja jääb puutumata.
- Uus kujundus (lõuend „SUKODA äpp ja veeb: uus kujundus“) on eraldi töö. See plaan ainult eemaldab.
