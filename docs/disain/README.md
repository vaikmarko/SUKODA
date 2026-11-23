# SUKODA uus kujundus

Kinnitatud kujundus elaniku äpile, koristaja töölauale ja veebile. Seis 23.11.2026.

- **Elav lõuend** (kommenteerimiseks ja muutmiseks): https://claude.ai/artifact/BLXBcWB1UdgrWDSHvmdxar
- **`ekraanid/`**: iga ekraan eraldi HTML-failina. Ava brauseris, telefoni ekraanid on 390 × 844, veebilehed 1440 laiad.
- **`pildid/`**: samad ekraanid PNG-na (2× tihedus).

Kui lõuend ja see kaust lähevad lahku, kehtib lõuend. Kausta värskendamiseks palu Claude'il lõuend uuesti siia eksportida.

## Põhimõtted

- Üks ekraan, üks asi. Ebaolulist infot ei näidata.
- **Peaekraan** (jaluse nupu siht) on suure pealkirjaga ja jalusega, tagasinuppu ei ole. **Alamekraan** on tagasilingiga üleval vasakul ja jaluseta.
- Jalus on hõljuv riba kolme päris nupuga: kreemjas täide, aktiivne must.
- Kõik tekstid kolmes keeles: eesti, inglise, vene. Vene termineid vaata failist `assets/js/haldus-ru.js` (koristaja «специалист по уборке», töölaud «рабочий стол», pakett «тариф»).
- Sama loogika peab töötama igas riigis: valuuta, kuupäevad ja keel ei ole koodi sisse kirjutatud.

## Disainikeel

| | |
|---|---|
| Taust | `#FAF8F5` (paber) |
| Tekst, põhinupp | `#141312` |
| Kreem (pinnad, jaluse nupud) | `#F3EFE9` |
| Aktsent | `#8F6E43`, mustal taustal `#C9A46A` |
| Teisene tekst | `#5F5A54` |
| Jooned | `#E6E0D8`, sisendi raam `#D1C9BF` |
| Pealkirjad | Cormorant Garamond 500 (äpis), 300/400 (veebis), kaldkiri rõhuks |
| Tekst | Inter 400/500/600 |
| Kaart | valge, raam `#E6E0D8`, nurk 20 |
| Põhinupp | must, kõrgus 56, nurk 16 |
| Teisene nupp | valge, raamiga, kõrgus 48, nurk 14 |
| Rida | kõrgus vähemalt 60, paremal hall väärtus ja nool |

Koodis on värvid `assets/css/main.css` muutujatena. `npm run lint:ui` keelab toorvärvid ja `text-[Npx]` klassid HTML-is.

## Ekraanid

### Elanik (`minu.html`, `assets/js/minu/*`)
| Fail | Mis see on |
|---|---|
| `Main` | Kodu: järgmine visiit, viimane visiit, kiri koristajale. Peaekraan. |
| `MainEN`, `MainRU` | Sama inglise ja vene keeles |
| `Telli` | Telli: pooleliolevad soovid ja koristaja pakutud teenused hindadega. Peaekraan. |
| `TelliAinultKoristus` | Telli, kui koristaja pakub ainult koristust |
| `Koristus` | Koristuse tellimine: aeg ja rütm |
| `Lilled` | Lillede tellimine, vaikimisi 35 €, klient saab muuta |
| `Minu` | Konto: kokkulepe, pere, eemalolek, juhised, soovita, teavitused, keel. Peaekraan. |
| `Kokkulepe` | Kokkulepe koristajaga: rütm, hind, mis on hinna sees |
| `Soovita` | Soovita oma koristajat sõbrale (jagab koristaja kutselinki) |
| `Kutse` | Kutse avamine, kui koristaja on kliendi kutsunud |

### Koristaja (`haldus.html`, `assets/js/haldus-ru.js`)
| Fail | Mis see on |
|---|---|
| `Toolaud` | Tööd: praegu, hiljem täna, homme. Peaekraan. |
| `Soovid` | Klientide soovid. Peaekraan. |
| `Kodud` | Kliendid. Peaekraan. |
| `Visiit` | Üks visiit |
| `Tehtud` | Pärast nuppu Tehtud |
| `PakuAega` | Paku kliendile teist aega |
| `LisaKlient` | Lisa klient: nimi, telefon, e-post, aadress, rütm |
| `Kutselink` | Kutselink ja QR-kood |
| `TegijaKodu` | Ühe kodu kokkulepe |
| `TegijaKuu` | Kuu kokkuvõte arveldamiseks |
| `TegijaKonto` | Konto: kuu kokkuvõte, teenused, tööajad, pakett, kutsu kolleeg |
| `TegijaTeenused` | Teenused ja hinnad, saab lisada oma |
| `KutsuKolleeg` | Kutsu kolleeg, kuu Standardit tasuta mõlemale |
| `Alusta` | Töölaua avamine uuele koristajale |
| `TegijaTyhi` | Esimene päev, kliente veel ei ole |

### Sisenemine
| Fail | Mis see on |
|---|---|
| `Sisene` | E-posti sisestus |
| `Kood` | Kuuekohaline kood e-postist. Jääb sisse logituks. |

### Veeb
| Fail | Mis see on |
|---|---|
| `Veeb` | Avaleht sukoda.ee koristajale (`index.html`) |
| `VeebKlient` | Eraldi leht koduomanikule |

## Mis on juba koodis ja mis mitte

Koodis on olemas (vana välimusega): kõik elaniku ja koristaja vood, kutselink, kolleegi kutse ja tasuta kuu, kolm keelt. Arco ja arendaja osad, kodu kaust ja garantii on koodist eemaldatud.

Kujunduses on, koodis veel ei ole:
- Uus välimus ise: jalus kolme nupuga, peaekraani ja alamekraani reegel, kaardid ja read. Alusta elaniku jalusest ja Kodu vaatest.
- Koristaja jalus `Tööd · Soovid · Kodud` ja Konto paremal üleval ikoonina.
- Lillede summa numbrina (vaikimisi 35 €) ja lilled kuu kokkuvõttes. See on rahaloogika ja vajab oma plaani.
- „Juhata kohale“: iPhone'is Apple Maps, Androidis Google Maps.

Ei ehita praegu: töötajad koristaja alla (hiljem Stuudio paketiga), Apple ja Google sisselogimine (tuleb koos poe rakendusega).

## Kuidas ehitada

Töö käib reeglite järgi failis `CLAUDE.md`: `/ehitaplaaniga` → `/review` → `/verify` → `/shipit`. Üks ekraan või komponent korraga, iga lõik oma commit'iga. Iga eestikeelne tekst läbib `/kirjuta`.
