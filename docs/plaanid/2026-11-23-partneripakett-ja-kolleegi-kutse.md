# Partneripakett välja, kolleegi kutse sisse

**TL;DR:** Admini loodud koristaja on edaspidi tavaline koristaja: tasuta pakett kuni 3 kodu, ise kliendid, kutselink, paketi valik ja konto kustutamine. Koristaja saab töölaual jagada kolleegile linki. Kui kolleeg avab töölaua ja lisab esimese kliendi, saavad mõlemad ühe kuu Standardit tasuta.

Marko otsused 23.11.2026: lepingulise partneri paketti ei ole; admini loodud konto saab tasuta paketi; kolleegi kutse tasu on üks kuu Standardit mõlemale.

## Kuidas tasuta kuu töötab
- **Tasuta paketil olija** saab Standardi 30 päevaks (`provider.planGrant = { plan: 'pro', until: 'YYYY-MM-DD' }`). Stripe'i see ei puuduta. Teine tasuta kuu pikendab olemasolevat.
- **Juba maksja** (Standard või Stuudio, Stripe'is elus) saab Stripe'i kliendisaldosse 19 € krediiti. Stripe arvestab selle järgmise arve vastu.
- Kui tasuta kuuga koristaja ostab Standardi enne kuu lõppu, algab makse alles kuu lõppedes (Stripe'i prooviaeg `trial_end`).
- Tasu antakse üks kord kutsutud koristaja kohta: tehingus pannakse `referralRewardedAt`, alles siis jagatakse kuud.
- Kutsuja ei saa iseennast kutsuda (sama e-post või sama konto). Kutse kehtib ainult uue konto loomisel.

## Lõigud
1. Partneripakett välja (`haldus-core.js`, `haldus.js`, `haldus.html`, `haldus-ru.js`, test). Kontroll: test, töölaud ehitub.
2. Kolleegi kutse: puhas loogika `haldus-core.js` + testid; liitumine võtab `kolleeg` parameetri; `createHome` jagab tasu; `/api/haldus/me` annab lingi ja kutsutute nimekirja; töölaua Konto all rida „Kutsu kolleeg“. Kontroll: testid, töölaud ehitub.

## Mida see ei tee
- Kutsujale e-kirja ei saadeta (kes saab kirja, on Marko otsus). Töölaud näitab seisu.
- Kahe võltskonto vastu kaitset ei ole peale ühe-korra-kontrolli. Risk on 19 € kuus.

## Tehtud 23.11.2026
- Lõik 1 ja 2 on ehitatud ühes commit'is, sest paketi vaade ja tasuta kuu kasutavad sama `effectivePlan` funktsiooni.
- Kontrollitud: 6 uut testi (`npm run check` roheline), töölaua Konto vaade brauseris jäljendatud andmetega (Pakett „tasuta kuni 23. dets“, avatud „Kutsu kolleeg“ koos kahe kutsutuga, paketi valik tasuta kuu ajal).
- Kontrollimata: päris Stripe'i krediit ja prooviaeg (vajab testvõtmega katset), päris Firestore'i tehing.
- Teadmiseks: admini loodud koristaja, kellel on üle 3 kodu, hoiab kõiki olemasolevaid kodusid, aga uue kodu lisamiseks peab ta Standardi ostma.
