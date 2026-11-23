# Koristaja pakub soovile teist aega ja klient kinnitab selle oma äpis

## TL;DR
🎯 Kujunduse viimased ekraanid saavad valmis: „Paku teist aega“, kuus koodikasti, töölaua avamise hinnasamm ja isiklik kutse ekraan.
Selle pärast ei pea koristaja enam sobimatu aja peale kirja kirjutama ja vastust ootama: ta valib päeva ja kella, klient vajutab „Sobib“ ja visiit on kalendris.
Mis puudub või on katki: koristaja saab praegu aja kas kohe kinnitada või ära öelda. Ära öeldes kirjutab klient uue päeva vabas tekstis ja ring algab otsast.
Mida teen: neli lõiku, igaüks oma commit'iga. Esimene on puhas välimus (koodikastid, alumine nupuriba, kolleegi olek), teine on pakkumise voog, kolmas töölaua avamise sammud, neljas isiklik kutse ekraan.
Visuaalne mõju: sisselogimisel kuus kasti ja nupp ekraani all; soovi kaardil „Paku teist aega“; kliendi Kodu kaardil „Kristi pakub: R 11. detsember 14:00“ nuppudega „Sobib“ ja „Paku teist aega“.
Mida testida: logi sisse kuue kastiga (ka kood e-kirjast kleepides); paku soovile teine aeg ja kinnita see kliendina; ava töölaud uue aadressiga ja vaata hinnasammu.
🚨 Sinu otsus: valuuta rida, isikliku kutse ekraani kandja ja pakkumise teavitus (vt „Otsused“).

## Lõigud
1. **Koodikastid, alumine nupuriba, kolleegi olek.** Ehitatud. Ainult välimus, serverit ei puuduta. Koodi kleepimine tühikuga töötab. Päris telefoni klaviatuuri ja koodi automaattäidet ei ole kontrollitud.
2. **Paku teist aega.** Ehitatud. Pakkumine kannab hinda, mille koristaja oleks kinnitades saatnud, nii et „Sobib“ peale tehtud visiit on sama hinnaga; makstud soovil on hind makstud summa. Emulaatoriga läbi mängimata (arvutis on Java 8); kliendi kaarti ei ole päris kontoga nähtud.
3. **Töölaua avamise sammud.** „+ Lisa oma“ teenus ja samm „Edasi: hinnad“ pärast koodi. Kasutab olemasolevat teenuste salvestust.
4. **Isiklik kutse ekraan.** Kliendi isiklik link näitab järgmist koristust enne kodu avamist. Vajab otsust 2.

## Tehniline plaan

### Lõik 1
- **Kuus kasti.** Päris sisend jääb üks (`#signup-code`, kestas `#field`), kuus kasti on selle all joonistatud lahtrid; sisend on läbipaistva taustaga ja laia tähevahega, nii et iga number satub oma lahtrisse. Nii jäävad tööle `one-time-code` automaattäide iOS-is ja Androidis (kuus `maxlength=1` kasti lõikaks täidetud koodi ühele numbrile), kleepimine, paroolihaldur, `x-model` ja kesta `render()`, mis kasutab sama `#field`-i ka e-posti jaoks: lisandub ainult klassi lüliti. Ekraanilugeja saab ühe välja „Kood, 6 numbrit“. Saatmine jääb nupu ja Enteri taha.
- Failid: `public/app.js`, `public/app.html`, `public/too.html`, `public/app-shell.css`, `public/sw.js` (vahemälu number), `haldus.html` (koodisamm), `assets/css/main.css` (`.p-code-grid`). Konto kustutamise kood jääb ühe väljaga, seda kujunduses ei ole.
- **Alumine nupuriba.** Sisene, Kood ja töölaua avamine: põhinupp ja märkus on ekraani all valgel ribal. Riba on `position: sticky; bottom: 0` veerus kõrgusega `100dvh`, alumine polsterdus `env(safe-area-inset-bottom)`; `fixed` jääks iOS-is klaviatuuri alla. `lunasta.html` jääb nupuga vormi lõpus, sest vorm on pikk ja kujunduses riba seal ei ole. Brauseri emulatsioon klaviatuuri ei näita: päris telefoni kontroll on Marko käik.
- **Kolleegi olek.** `colleagueRewarded`: „Liitus · kuu teenitud“ / „Joined · month earned“ / «Присоединилась · месяц получен». „Link avatud“ jääb tegemata: server ei tea, kas linki avati; ootel olek jääb „Ootab esimest klienti“.
- Test: `functions/test/minu-strings.test.js` võtmete pariteet jääb roheliseks. Välimust, kleepimist ja kustutamist kontrollib brauser telefonilaiuses kolmes keeles.

### Lõik 2
- **Väli** dokumendil `serviceRequests`: `proposal: { date: 'YYYY-MM-DD', time: 'HH:MM', durationMin, force, at, by: 'provider' }`. Staatus jääb `requested`, et olemasolevad lugejad (avatud soovide loendur, konto kustutamine, eemaloleku tühistus) käituksid samamoodi. `serializeRequest` annab `proposal` edasi mõlemale poolele. Tagasipööramisel ignoreerib vana kood välja ja soov on tavaline ootel soov.
- **Puhas loogika** `functions/lib/haldus-core.js`: `sanitizeProposal(body, todayStr)` ja `proposalState(request, nowMs)` → `none | waiting-client | expired`. Algus arvutatakse Tallinna aja abilistega, mitte UTC kuupäevast. Staatus ≠ `requested` → alati `none`; väljata vanad soovid → `none`. Testid: „pakkumine minevikku lükatakse tagasi“, „aegunud pakkumine ei ole enam kehtiv“, „kinnitatud või tühistatud soovil pakkumist ei ole“, „väljata soov on tavaline soov“.
- **Hind.** Pakkumise ekraanil hinnavälja ei ole. Töölaud saadab pakkumisega sama hinna, mille ta saadaks kinnitamisel (kliendi valitud summa, koristaja oma hind või tühi, kui teenus on kodu tingimustes hinna sees), ja klient näeb seda kaardil enne „Sobib“ vajutamist. Makstud soovil on visiidi hind makstud summa. `awaiting_payment` soovile pakkuda ei saa.
- **Koristaja:** `POST /api/haldus/requests/propose` `{requestId, date, time, durationMin, message, force}`. Auth esimesena, soov peab kuuluma sellele koristajale ja olema `requested`. Konfliktikontroll `slotConflicts` nagu kinnitamisel (409, `force` lubab). Uus pakkumine kirjutab vana üle. Lõime läheb rida „Pakun: R 11. detsember 14:00“ kodu keeles. Teavitus: vt otsus 1.
- **Üks ühine paigutus.** `confirm` ja `accept-proposal` kutsuvad sama funktsiooni `placeRequest({request, start, durationMin, price, message, by})`, muidu jäävad kliendi kinnitusest välja lillede lisarida, oma teenuse nimi, „koos koristusega“ konfliktierand ja ümberpaigutuse lõpetamine. Visiidi loomine ei mahu tehingusse, seepärast tehing ainult hõivab: loeb soovi, nõuab `requested` (ja kliendi poolel kehtivat pakkumist), kirjutab staatuse ja kustutab `proposal`-i. Siis tehakse visiit; vea korral taastatakse `requested` ilma pakkumiseta ja lõime läheb rida. `confirm` ja `decline` kasutavad sama hõivet, nii et koristaja „Kinnita“ ja kliendi „Sobib“ samal sekundil ei tee kahte visiiti.
- **Klient:** `POST /api/me/requests/accept-proposal` `{requestId}`. Auth, soov peab kuuluma selle sessiooni kodule (muidu 404). Aegunud või puuduv pakkumine → 409 ja pakkumine kustub. Kui koristaja pakkus `force`-iga, tema enda kalendrit uuesti ei kontrollita (ta otsustas teadlikult); kodu teise tegija kattuvust kontrollitakse alati. Kui aeg on vahepeal kinni, kustub pakkumine, klient näeb „See aeg läks vahepeal täis“ ja soov on koristajal tagasi. Ümberpaigutusel kutsutakse `rescheduleVisit({by: 'client'})`; kui see ebaõnnestub, sama tee.
- Kliendi „Paku teist aega“ saadab olemasoleva sõnumi lipuga `declineProposal: true`, mis kustutab pakkumise. Tavaline sõnum lõimes („võti on mati all“) jätab pakkumise kehtima.
- **Vastamata pakkumine** aegub pakutud ajal vaikselt ja soov on töölaual tagasi „Ootab sind“ all. Uut meeldetuletust ei tule.
- **Kirjutajad, mis kustutavad `proposal`-i:** confirm, decline, accept, kliendi sõnum lipuga, kliendi tühistus, seotud visiidi tühistus. Lugejad: `/api/haldus/me`, `/api/me/extras`.
- **Töölaud.** `pendingRequests` ja saki märk loevad ainult soove, mis ei oota klienti. Pakutud soovid on eraldi rühmas „Ootab klienti“ reaga „Pakutud: R 11. detsember 14:00“ ja vaikse lingiga „Muuda pakkumist“. Alamekraan `PakuAega.html` järgi: päevad, kellaajad, sõnum, nupp „Paku: R 11. detsember 14:00“, märkus „{nimi} kinnitab aja oma äpis.“ Kaardi nupud: vt otsus 2.
- **Elanik.** `pickNextThing` (`assets/js/minu/kodu.js`) saab haru `proposal` kohe pärast maksmata haru ja enne ootel ümberpaigutuse haru, muidu näitaks ümberpaigutuse pakkumine „Uus aeg on kinnitamisel“. Kaardil „Sobib“ (põhinupp) ja „Paku teist aega“. Testid `kodu.test.mjs`: „koristaja pakkumine on kaart enne visiiti“, „pakkumine ümberpaigutusele võidab ootel kaardi“, „aegunud pakkumine ei ole kaart“.
- **Keeled.** Töölaual `proposeTime`, `proposeTitle`, `proposeWished`, `proposeDay`, `proposeClock`, `proposeMsg`, `proposeSend`, `proposeNote`, `proposedWaiting`, `proposeEdit`; elanikul `proposalTitle`, `proposalFits`, `proposalOther`, `proposalGone`; kõik et/en/ru. Serveri uued veateated `{et, en, ru}` kaudu.
- `/verify` emulaatoriga: soov → paku → „Sobib“ → visiit kalendris; topeltvajutus; „Kinnita“ ja „Sobib“ korraga; võõra kodu sessioon → 404; makstud soov; ümberpaigutus; aegunud pakkumine; klient pakub teist aega ja pakkumine kaob.
- Plaan `PLATVORMIPLAAN_2026.md`: Soovide rida saab „Paku teist aega“; märkus, et tulevane „soov ootab üle 24 h“ meeldetuletus jätab kliendi järel ootavad soovid vahele.

### Lõik 3
- „+ Lisa oma“: teenuse nimi hoitakse vormis mälus. Pärast koodi kinnitamist ja andmete laadimist lisatakse see teenuste vormi ja salvestatakse terve vormiga olemasoleva salvestuse kaudu. Ainult oma teenuste saatmine ei sobi, sest salvestus asendab kogu tööaja seade ja kirjutaks päevad, kellaajad ja piirkonnad vaikeväärtusteks.
- „Edasi: hinnad“: registreerimise nupu tekst. Pärast koodi avaneb üks kord olemasolev „Teenused ja hinnad“ vaade pealkirjaga „Pane hinnad paika“ ja nupuga „Valmis“, mis viib Töödesse; vahele saab jätta. Sammu käivitab mälus lipp koodi kinnitamise sees, `localStorage` märki ei ole, sest tavaline sisselogimine ja teine seade seda teed ei kasuta.
- Valuuta: vt otsus 4.

### Lõik 4
- Vt otsus 3. Isiklik link logib kliendi juba sisse, nii et „enne kodu avamist“ ei ole päris värav. Soovitatud kujul on ekraan tervitus esimesel avamisel pärast sisselogimist, andmed tulevad juba laetud päringust, uut avalikku päringut ei tule. Rida „Saadame sulle e-postile koodi“ jääb välja, sest see ei vasta tõele. Üldine kutsekood (`/lunasta`) jääb vormiga: see kood on kõigile klientidele sama ja visiidi näitamine selle peale lekitaks võõrale aadressi ja aja, millal kodus käiakse.

## Otsused
Marko 23.11.2026:
1. **Teavitused:** nagu praegu vastamisel. Pakkumisel saavad kirja ja äpiteate kodu samad kontaktid, kes saavad teate koristaja vastusest; „Sobib“ peale saab koristaja teate ja kodu tavalise kinnituskirja. Uusi saajaid ei teki.
2. **Soovi kaart:** kaks nuppu nagu kujunduses, nende all vaiksed lingid „Vasta“ ja „Ütle ära“, et äraütlemiseks ei peaks soovi avama.
3. **Kutse ekraan:** tervitus isiklikul lingil esimesel avamisel. Üldine kutsekood jääb vormiga, sest visiidi näitamine lekitaks aadressi ja kellaaja.
4. **Valuuta:** rida on näha lukus „EUR“, valida ei saa, kuni makse on ainult eurodes.
5. **Lilled:** jäävad ühekordseks tellimuseks, „Iga koristusega“ ei ehitata.

## Väljaspool skoopi
Lilled „Iga koristusega“ (Marko 23.11.2026: lilled jäävad ühekordseks tellimuseks). Töötajad koristaja all. Apple ja Google sisselogimine. Teised valuutad makses.
