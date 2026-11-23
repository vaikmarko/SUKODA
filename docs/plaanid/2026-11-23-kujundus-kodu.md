# Elanik näeb Kodu vaadet uue kujunduse järgi

## TL;DR
🎯 Elaniku telefonis on hõljuv jalus Kodu · Telli · Konto ja Kodu vaade algab aadressi ning järgmise visiidi kellaga.
Selle pärast ei pea elanik enam vana nelja sakiga pilti ja „Tere, Anna“ päist kodu ekraaniks pidama: ekraan ütleb, mis kodu see on ja millal koristaja tuleb.
Mis puudub või on katki: `docs/disain/ekraanid/Main.html` on kinnitatud, `minu.html` joonistab ikka vana päise ja alumise riba.
Mida teen: jalus ja Kodu vaate rahulik olek (visiit on olemas) saavad kujunduse välimuse. Teised olekud (makse, uus aeg, tühi kodu) jäävad alles, samasse kaardikujusse.
Visuaalne mõju: telefonis hõljuv kreemjas jalus, aktiivne nupp must; Kodu pealkiri on aadress, visiidikaardil suur kell.
Mida testida: ava elaniku Kodu telefonilaiuses, kui visiit on olemas ja kui seda ei ole. Töölaud jääb vana jalusega.

## Lõigud
1. Elaniku jalus ja Kodu vaade. Ehitatud. Keelevalik ja väljalogimine jäävad ülemisse riba, kuni Konto ekraan need üle võtab.
2. Telli ja selle alamekraanid (koristus, lilled). Ehitatud. Nimekiri on „Töös“ ja „{nimi} pakub“. Koristus, lilled ja muu soov avanevad tagasilingiga, ilma jaluseta. Lillede summa on olemasolev hind, astet ei ole, sest see muudaks raha. Kui rida läheb maksele, on rütm „Üks kord“ ja seda ei saa vahetada. Teised rütmid jäävad alles siis, kui makset ei küsita.
3. Konto ja selle read (kokkulepe, soovita, keel, väljalogimine). Ehitatud. Keel ja väljalogimine on Kontol, telefoni ülemises ribas neid enam ei ole. Soovita jagab koristaja olemasolevat kutselinki, kui see on olemas. Kutselinki pole, kui koristajal koodi ei ole.
4. Koristaja jalus ja Töölaud. Ehitatud. Telefonis on jalus Tööd · Soovid · Kodud ja Konto ikoon paremal. Kalender ja üksiku visiidi, kuu, teenuste ja kliendi vormid jäid senisesse vormi, uue kaardi sees seal, kus rida juba oli. „Juhata kohale“ avab iPhone’is Apple Mapsi ja mujal Google Mapsi.
5. Veebi avaleht (`index.html`), et telefonipilt ei näitaks enam Kausta. Ehitatud. Telefonis on Kodu · Telli · Konto ja töölaual Tööd · Soovid · Kodud. Kolmas sammas on „Kliendile tasuta“, mitte kaust ega garantii. Sisenemise kest on sama voog, ümarama välja ja nupuga.

## Tehniline plaan
- Ekraan: `minu.html` Kodu plokk ja alumine nav. Andmeid ei kirjutata, `fetch` jääb samaks. `runNext()` ja `openVisitFeedback()` jäävad nuppude taha.
- Uued klassid ainult `assets/css/main.css`: `.p-dock`, `.p-dock-btn`, `.p-has-dock`, `.p-home-title`, `.p-clock`, `.p-sheet`, `.p-sheet-btn`. `.p-tabbar` jääb töölauale.
- Sildid kujundusest: Kodu / Telli / Konto, Home / Book / Account, Главная / Услуги / Профиль. Võtmed `tabKodu`, `tabServices`, `tabMine` failides `kodu.js`, `telli.js`, `minu.js`.
- Uued laused `kodu.js`: `nextVisitEyebrow`, `feedbackShort`, `writeTo`. Tühi kodu viitab Telli sildile.
- Kodu pealkiri on aadress enne koma. Aadressita kodul jääb eesnimi, et pealkiri ei oleks tühi.
- Suur kell ainult siis, kui `nextThing.kind === 'visit'` ja aeg ei ole kinnitamisel. Muud olekud jäävad senise kaardi teksti ja nupuga.
- „Vaata kalendrit“ jääb tekstilingiks, sest visiitide nimekirjal ei ole oma sakki.
- Test: olemasolevad `kodu.test.mjs` peavad jääma roheliseks. Välimust kontrollib brauser telefonilaiuses.
- Plaan `PLATVORMIPLAAN_2026.md`: EI OLE VAJA.

## Väljaspool skoopi
Lilled 35 €, „Juhata kohale“, koristaja ekraanid, avaleht, sisselogimine, poe rakendus.
