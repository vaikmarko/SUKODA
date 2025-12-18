# SUKODA Äriplaan

## Ärimudel

**Platvorm + partnerlus** – SUKODA ei pea ise koristajaid, vaid pakub brändi, kliente ja süsteeme partneritele (väikefirmad, FIE-d).

---

## Tulumudel

### Püsikliendid (põhitulu)

| | Klient maksab | Partner saab (70%) | SUKODA saab (30%) |
|---|---------------|-------------------|-------------------|
| Värskus | €229 | €160 | €69 |
| Hoolitsus | €349 | €244 | €105 |
| Vabadus | €699 | €489 | €210 |

**Keskmine SUKODA tulu kliendi kohta:** ~€100/kuu

### Kingikaardid (lisatulu)

Müüme kingikaarte tähtpäevadeks – kõrge marginaal, hooajaline tulu.

| Kingitus | Hind | SUKODA marginaal |
|----------|------|------------------|
| Värske Algus (1x süvapuhastus) | €149+ | ~40% |
| Kuu Hoolitsust (2x koristus) | €249+ | ~35% |
| Eriline Hoolitsus (3 kuud) | €799+ | ~30% |

**Kampaaniakalender:**
- 💝 Valentinipäev (14. veebr)
- 💐 Naistepäev (8. märts)
- 🌷 Emadepäev (mai)
- 👔 Isadepäev (juuni)
- 🎄 Jõulud (dets)

**Potentsiaal:** 20-50 kingikaarti/kampaania × €50 marginaal = €1,000-2,500 lisatulu

---

## Sihtarvud

### Faas 1: Käivitus (kuud 1-6)

| Näitaja | Siht |
|---------|------|
| Partnerid | 2-3 |
| Kliendid | 50 |
| Käive | €17,000/kuu |
| SUKODA tulu | €5,000/kuu |
| Püsikulud | €1,300/kuu |
| **Kasum** | **€3,700/kuu** |

### Faas 2: Kasv (kuud 7-18)

| Näitaja | Siht |
|---------|------|
| Partnerid | 6-8 |
| Kliendid | 200 |
| Käive | €68,000/kuu |
| SUKODA tulu | €20,000/kuu |
| Püsikulud | €6,500/kuu |
| **Kasum** | **€13,500/kuu** |

### Faas 3: Skaleerimine (kuud 19-36)

| Näitaja | Siht |
|---------|------|
| Partnerid | 15-20 |
| Kliendid | 500 |
| Käive | €170,000/kuu |
| SUKODA tulu | €50,000/kuu |
| Püsikulud | €18,000/kuu |
| **Kasum** | **€32,000/kuu** |

---

## Stardiinvesteering (Platvormimudel)

| Kulu | Summa |
|------|-------|
| Domeen (sukoda.ee) | €15 |
| Bränd, disain, materjalid | €500 |
| Turundus (6 kuud) | €2,000 |
| Brändimaterjal partneritele (kaardid, juhendid) | €300 |
| Juriidiline (lepingud, tingimused) | €500 |
| Käibekapital | €2,000 |
| **KOKKU** | **€5,300** |

*Tehniline arendus: ise (Firebase, Stripe, veeb – tasuta tööriistad)*

### Tehniline infrastruktuur (kinnitatud)

| Komponent | Lahendus | Kulu |
|-----------|----------|------|
| Domeen | sukoda.ee | ✅ €15/aasta |
| Hosting | Firebase Hosting | €0 (free tier) |
| Andmebaas | Firebase Firestore | €0 (free tier) |
| Maksed | Stripe | 1.4% + €0.25 makse kohta |
| Kliendi arved | Stripe automaatne | €0 |
| Partneri arved | Manuaalne | €0 |
| E-mailid | SendGrid | €0 (free tier) |

---

## Püsikulud kuus (Platvormimudel)

### Faas 1 (50 klienti)

| Kulu | Summa |
|------|-------|
| Turundus | €500 |
| Tarkvara, süsteemid | €100 |
| Lilled, puuviljad (partneritele hüvitis) | €400 |
| Brändimaterjal (kaardid jms) | €50 |
| Raamatupidamine | €150 |
| Muud | €100 |
| **KOKKU** | **~€1,300** |

### Faas 2 (200 klienti)

| Kulu | Summa |
|------|-------|
| Turundus | €1,500 |
| Tarkvara, süsteemid | €300 |
| Lilled, puuviljad | €1,500 |
| Brändimaterjal | €150 |
| 1 töötaja (admin/koordinaator) | €2,500 |
| Raamatupidamine | €200 |
| Muud | €350 |
| **KOKKU** | **~€6,500** |

*Partnerid kasutavad oma autosid ja vahendeid – meie kulud on minimaalsed*

---

## Tasuvuspunkt

| Näitaja | Arv |
|---------|-----|
| Kliendid tasuvuseks | ~15 |
| Aeg tasuvuseni | 1-2 kuud |
| Investeeringu tasuvus | 3-6 kuud |

---

## Kvaliteedisüsteem: Kaamera

### Idee

Partner kannab väikest kaamerat (rinnal/jakil) või kasutab äppi, mis **automaatselt dokumenteerib** iga koristuse.

### Kuidas töötab?

```
ENNE                          PÄRAST
┌─────────────┐              ┌─────────────┐
│ 📸 Foto     │              │ 📸 Foto     │
│ Köök       │     →→→      │ Köök       │
│ (räpane)    │              │ (puhas!)    │
└─────────────┘              └─────────────┘
         ↓                           ↓
         └───────── SUKODA äpp ──────┘
                      ↓
              Automaatne kvaliteedimärk ✓
```

### Mida see annab?

| Kellele | Kasu |
|---------|------|
| **Kliendile** | Näeb pilte, usaldus, läbipaistvus |
| **Partnerile** | Kaitse ("ma tegin ära!"), tõestus |
| **SUKODA-le** | Kvaliteedikontroll, andmed, eristumine |
| **Turundusele** | Enne/pärast fotod = parim reklaam |

### Tehnilised variandid

| Variant | Kirjeldus | Hind |
|---------|-----------|------|
| **A: Äpp + telefon** | Partner teeb fotod äpis (checklist) | €0-500 arendus |
| **B: Kehakaamera** | GoPro-stiilis kaamera jakil | €100-200/tk |
| **C: AI kvaliteedikontroll** | Äpp hindab automaatselt "puhas/mitte" | €5,000+ arendus |

### Soovitus: Alusta A-ga

1. **Faas 1:** Partner teeb käsitsi fotod (telefon)
2. **Faas 2:** Lihtne äpp checklistiga
3. **Faas 3:** Kehakaamera + AI analüüs

### Turundussõnum

> *"Iga SUKODA koristus on dokumenteeritud. Sa näed täpselt, mis tehti. See on meie kvaliteedilubadus."*

### Konkurentsieelis

❌ Teised: "Usaldage meid"  
✅ SUKODA: "Vaadake ise – siin on fotod"

---

## Soovitusprogramm (tasuta turundus)

### Tervituskaart QR-koodiga

Iga koristuse järel jätab partner kliendi lauale SUKODA kaardi:

```
ESIKÜLG: Käsitsi kirjutatud tervitus
TAGAKÜLG: "Kas jäid rahule? Soovita meid sõbrale!"
          + QR-kood → sukoda.ee/soovita
          + Mõlemad saavad -20%
```

### Soovituse voog

1. Klient skaneerib QR-koodi
2. Täidab vormi (sõbra nimi + kontakt)
3. Meie võtame sõbraga ühendust
4. Sõber liitub → mõlemad saavad soodustuse

### Eesmärk

| Näitaja | Siht |
|---------|------|
| Soovituste konversioon | 10-15% klientidest soovitab |
| Uued kliendid soovitustest | 30-50% uutest |
| Kliendi hankimiskulu soovitusest | ~€30 (vs €100-150 reklaamist) |

---

## Kriitilised edutegurid

| Tegur | Miinimum |
|-------|----------|
| Kliendi eluiga | 12+ kuud |
| Kliendi hankimiskulu | <€150 |
| Partneri reiting | 4.5+ / 5 |
| Churn (kadu) | <5% kuus |
| Uusi kliente | 10-15% kasv kuus |

---

## Partneri ökonoomika

**Üks partner (16 klienti):**

| | Summa |
|---|-------|
| Tulu partnerile | €3,800/kuu |
| Tema kulud (palk, vahendid) | €2,500/kuu |
| Tema kasum | €1,300/kuu |

Partner on motiveeritud – teenib hästi, meie bränd toob kliendid.

---

## Kindlustus

### Kes vastutab mille eest?

| Olukord | Vastutab | Kindlustus |
|---------|----------|------------|
| Partner lõhub vaasi | **Partner** | Partneri vastutuskindlustus |
| Partner libiseb, vigastab end | **Partner** | Partneri õnnetusjuhtumi kindlustus |
| Klient väidab, et midagi varastati | **Partner** | Partneri vastutuskindlustus + fotod |
| Andmeleke (kliendi info) | **SUKODA** | SUKODA vastutuskindlustus |

### Nõuded partnerile

Partnerilepingus nõuame:
- ✅ **Vastutuskindlustus** (vähemalt €10,000 kate)
- ✅ Kehtiv FIE / OÜ registreering
- ✅ Maksuvõlgade puudumine

### SUKODA kindlustus

| Kindlustus | Miks | Hinnang |
|------------|------|---------|
| Üldine vastutuskindlustus | Platvormi tegevus | €300-500/aasta |
| Küberriskide kindlustus | Andmed, veeb | €200-400/aasta |

### Kliendile kommunikatsioon

Veebilehel / tingimustes:
> *"Kõik SUKODA partnerid on kindlustatud. Kui midagi juhtub, oled kaitstud."*

### Kust saada?

- **If Kindlustus** – ettevõtte vastutuskindlustus
- **ERGO** – väikeettevõtja pakett
- **Swedbank Kindlustus** – FIE kindlustus
- **Seesam** – vastutuskindlustus

**Hind partnerile:** ~€100-300/aasta (nende kulu, mitte sinu)

---

## Riskid

| Risk | Maandamine |
|------|------------|
| Partneri kvaliteet | **Kaamerasüsteem**, rating, koolitused, lepingu lõpetamine |
| Konkurents | Tugev bränd, **fotodokumentatsioon**, lilled, isiklik lähenemine |
| Klientide kadu | Kvaliteet, sama inimene alati, soovitusprogramm |
| Partnerite lahkumine | Mitu partnerit, hea partnerleping, atraktiivne jaotus |
| "Ta ei teinud korralikult" | **Enne/pärast fotod** = tõestus mõlemale poolele |
| Kahju kliendi varale | **Partneri vastutuskindlustus** (nõuame lepingus) |

---

## Kokkuvõte

- **Investeering:** ~€5,000 (platvormimudel, ise arendades)
- **Tasuvus:** 1-3 kuud
- **Kasum 3. aastal:** €30,000+/kuu
- **Exit-võimalus:** Müük suuremale teenusplatvormile (Bolt, Wolt, vms)

### Automatiseeritud süsteemid

| Protsess | Automaatne? | Märkused |
|----------|-------------|----------|
| Kliendi broneerimine | ✅ | Veebivorm → Firebase |
| Kliendi makse | ✅ | Stripe Subscriptions |
| Kliendi arve | ✅ | Stripe Invoicing (PDF e-mailile) |
| Päevaaruanne | ✅ | Cloud Function → e-mail |
| Kuuaruanne | ✅ | Cloud Function → e-mail |
| Partneri makse | ❌ | Manuaalne (esialgu) |
| Partneri arve | ❌ | Manuaalne (esialgu) |

