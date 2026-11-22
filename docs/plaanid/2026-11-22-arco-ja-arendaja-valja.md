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
| 2 ✅ | Elaniku äpp: kingitud esimene koristus, arendaja nimi ja pilt päises, garantiiread, kaust | `minu.html`, `assets/js/minu/*.js` | otsus 2 |
| 3 ✅ | Töölaud: liitumisel valikud „Garantii ja maja“ ja „Maja haldus“, maja üleandmine | `haldus.html`, `assets/js/haldus-ru.js` | lõik 2 |
| 4 ✅ | Koodi lunastamine: Arco üleandmiskaardi haru | `lunasta.html` | otsus 3 |
| 5 | Taust: maja üleandmise ja kausta käsitlejad, Arco kirjad, garantii meeldetuletused, kataloogi garantiiread, hooldusrütmi garantiiread, testid | `functions/haldus.js`, `functions/index.js`, `functions/lib/haldus-core.js`, `functions/test/*` | lõigud 2 kuni 4, otsus 4, andmete kontroll |
| 6 | Näidisandmed ja dokumendid | `scripts/seed-arco-demo.js`, `scripts/demo-doc-text.js`, `scripts/make-demo-docs.py`, `scripts/demo-docs/`, `PLATVORMIPLAAN_2026.md`, `.cursor/rules/sukoda.mdc`, `CLAUDE.md`, `TEST_GUIDE.md` | lõik 5 |

Järjekord on väljast sisse: kõigepealt kaob see, mida inimene näeb, ja alles siis kood selle taga. Nii ei teki hetke, kus nupp on alles, aga tema käsitlejat enam ei ole.

## Tehniline plaan

### Lõik 1 (ehitatud 23.11.2026)
- `arendajale.html` ja `arco-pakkumine.html` on gitist eemaldatud. Ajalugu jääb alles.
- `vite.config.js`: sisendid `arendajale` ja `pakkumine` väljas.
- `firebase.json`: seitse püsivat ümbersuunamist (301) avalehele: `/arco`, `/arendajale`, `/arendajale/`, `/arendajale.html`, `/arco-pakkumine`, `/arco-pakkumine/`, `/arco-pakkumine.html`. Alguses olid need ajutised (302); Marko kinnitas 23.11.2026, et Arco on lõplikult maas, seega püsivad.
- `public/robots.txt`: rida `Disallow: /arendajale` väljas, et otsimootor näeks ümbersuunamist.
- `index.html`, jaotis „Alusta“: rolli nupp „Arendaja“ ja tema vorm on väljas. Koos nendega läks kood, mida ainult see haru kasutas: päring aadressile `/api/waitlist` väljaga `city: 'Arendaja'`, olek `name` ja `note`, teade „Aitäh. Kirjutame sulle peagi.“ ning sõnastiku võtmed `roleDeveloper`, `fCompany`, `fEmail`, `devLead`, `leaveContact`, `sentWaitTitle`, `sentWaitText` (et, en, ru). Koduomaniku kaks teed (kutsu oma inimene, mul on kood) ja teenusepakkuja tee on muutmata. `canSend` tagastab teenusepakkuja rollis nüüd alati väära, enne piisas e-postist.
- `scripts/ui-lint.js`: `arendajale.html` loendist `PAGES` väljas. Baasjoones selle faili kohta ridu ei olnud.
- Kontrollitud: `npm run check` roheline (ui-lint ok, 106 testi); `index.html`-is ei ole enam ühtegi vastet sõnadele arendaja, developer, застройщик ega aadressile `/arco`; ükski teine leht ei lingi eemaldatud lehtedele.
- Kontrollimata: `npm run build` ei jookse selles keskkonnas (rollup'i macOS-i binaar). Esimene päris ehitus on CI push'i järel või Marko masinas.
- Jäi alles, otsustada: `assets/images/story-interior*` (viis pildifaili) kasutas ainult Arco pakkumise leht. Ma ei kustutanud neid, sest uus avaleht võib päris fotot vajada.

### Lõik 2 (ehitatud 23.11.2026)
Elaniku äpist on väljas kolm asja, mida nägi ainult arendaja kodu või mis kandis Arco nime:
- Kaart „Vali esimene koristus. Arco kingib esimese koristuse“ ja rida „Esimene koristus · Kingitus“ jaotises „Sinu teenused“.
- Rida „Teata probleemist · Tasuta“ koos garantiivormiga jaotises „Lisa juurde“. Seda nägi ainult kodu, millel ei olnud oma koristajat.
- Saki „Kaust“ nupud (arvutis ja telefonis) ning Kodu ekraani vorm „Küsi kodu kohta“. Vanad kirjalingid `/minu?tab=home` ja `?tab=folder` avavad nüüd Kodu ekraani.

Mis jäi teadlikult samaks:
- Kodu, mille tingimustes on koristus kokkulepitud arvu kordi sees, tellib endiselt ühe koristuse korraga ja ilma kaardita. Sama loogika, uus nimi (`includedCleanLine`), Arco tekstita.
- Tühja Kodu kaardi nupp on nüüd igal kodul „Telli teenus“.

Jäänukid lõigu 5 jaoks (kasutaja nendeni enam ei jõua, kood on alles):
- `minu.html`: kausta vaate meetodid (`askFolder`, `askCardFrom`, `canShowAskFolder`, dokumentide lisamine ja eelvaade), garantiipaneeli harud (`'warranty'` võrdlused, `onTelliPhoto`, `telliPhotoName`), `openWarrantyClaim`, arendaja nimi ja pilt päises (`brand`), kodu üleandmine (`handOverHome`).
- `assets/js/minu/kaust.js` tervikuna; `mount.js` paigaldab selle endiselt.
- `reportProblem` on sõnastikus alles, sest soovi dialoog kasutab seda.

Kontrollitud:
- `npm run check` roheline: ui-lint ok, 102 testi (neli Arco kingituse ja garantii testi eemaldatud koos koodiga). Test „iga `t()` võti on sõnastikus kolmes keeles“ läbib.
- Leht ehitatud Vite'iga eraldi keskkonnas ja avatud peata brauseris jäljendatud andmetega (koristaja hallatav kodu): Kodu, Teenused ja Minu avanevad, konsoolis vigu ei ole, jaluses on kolm nuppu, `?tab=folder` avab Kodu. See kontroll tehti enne viimast väikest parandust (`includedCleanLine`); pärast seda jooksid ainult testid.
- Kontrollimata: kodu, millel ei ole oma koristajat, ja kodu, mille tingimustes on kordade arv. Päris andmetes selliseid teadaolevalt ei ole.

### Lõik 3 (ehitatud 23.11.2026)
- Töölaua Konto vaatest on väljas plokk „Maja“ ja „Anna kodu üle“ (maja salvestamine, garantii ja maja teadete suunamine, korteri üleandmine ostjale koodiga). Seda nägi ainult lepinguline partner (`isEnterprise`).
- Koos plokiga läksid meetodid `saveBuilding` ja `handOver`, nende olek ning 15 ainult selle ploki tekstivõtit (et, en, ru). Lisaks kaks juba varem kasutuseta võtit `svcSignWarranty` ja `svcSignBuilding`: liitumisel neid valikuid enam ei pakutud.
- Jäänukid lõigu 5 jaoks: `isEnterprise` juhib veel 12 kohas lepingulise partneri vaadet; garantiisoovi vastamise tekstid (`notWarranty`, `declineIssueHint` jt) ja tingimuste read (`termsWarrantyOk`).
- Kontrollitud: `npm run check` roheline, leht ehitub Vite'iga. Sisselogitud töölauda ma brauseris ei avanud; muudatus puudutab ainult plokki, mida tavaline koristaja ei näe.
- Märkus, mitte selle lõigu viga: töölaua avamisel ilma sisselogimiseta tekib konsooli viga `Cannot read properties of null (reading 'awayPeriods')`. See oli olemas enne seda lõiku ja ma ei parandanud seda.

### Lõik 4 (ehitatud 23.11.2026)
- `lunasta.html`: Arco üleandmiskaardi haru on väljas (ekraan „Sinu uus kodu“, kolm rida selle kohta, mis kodus juba sees on, nupp „Ava kodu“ ja lõpuekraan „Sinu kodu on valmis“).
- Kui keegi sisestab siiski arendaja kaardi koodi, näeb ta sama teadet nagu tundmatu koodi puhul: „Koodi ei leitud. Kontrolli tähti ja numbreid või kirjuta tere@sukoda.ee.“
- Koristaja kutse ja vana kinkekaardi teed on muutmata.
- Kontrollitud brauseris jäljendatud vastustega: tühi koodiväli, koristaja kutse vorm ja arendaja kaardi kood (annab „Koodi ei leitud“). Konsoolis vigu ei ole.

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
