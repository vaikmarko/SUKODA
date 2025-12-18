# SUKODA Tehniline arenduskava

## Ärimudel: Platvorm

SUKODA on vahendaja – ühendame kliente partneritega (koristusfirmad/FIE-d).

```
KLIENT ←→ SUKODA ←→ PARTNER
          (platvorm)
```

## Praegune seis

- ✅ Maandumisleht (index.html)
- ✅ Partnerluse leht (partnerlus.html) – arendajatele
- ✅ Kingituste leht (kingitus.html)
- ✅ Soovitusleht (soovita.html)
- ✅ Bränd, tekstid, hinnad
- ❌ Broneerimissüsteem
- ❌ Partneri haldus
- ❌ Tagasisidesüsteem
- ❌ Makselahendus

---

## Prioriteet 1: Broneerimissüsteem

### Funktsionaalsus

1. **Paketi valik** – Värskus / Hoolitsus / Vabadus
2. **Korteri suurus** – m² valik
3. **Asukoht** – aadress, linnaosa
4. **Ajaeelistus** – sobivad päevad/kellaajad
5. **Kontaktandmed** – nimi, telefon, e-post
6. **Kinnitus** – kokkuvõte, nõustumine tingimustega

### Tehniline lahendus

| Variant | Kirjeldus | Hind | Aeg |
|---------|-----------|------|-----|
| **A: Vormipõhine** | Lihtne HTML vorm → e-mail | €500 | 1 nädal |
| **B: Cal.com** | Kalendri integratsioon | €30/kuu | 2 päeva |
| **C: Kohandatud** | Täisfunktsionaalne süsteem | €5,000-8,000 | 4-6 nädalat |

**Soovitus:** Alusta variandiga A, liiguta C peale kui 50+ klienti.

---

## Prioriteet 2: Stripe + Automaatne arveldus (VÕTMETÄHTSUSEGA)

### Miks Stripe?

- **Subscriptions** – korduvmaksed igakuiselt automaatselt
- **Invoicing** – automaatsed arved klientidele
- **Customer Portal** – klient saab ise hallata makseid
- **Webhook'id** – automaatteavitused süsteemile
- **Tugev API** – lihtne Firebase'iga siduda

### Stripe funktsioonid mida kasutame

| Funktsioon | Kirjeldus | Kasutus |
|------------|-----------|---------|
| **Stripe Subscriptions** | Korduvmaksed | Kuutasud klientidelt |
| **Stripe Invoicing** | Automaatarved | PDF arve e-mailile |
| **Customer Portal** | Iseteenindus | Klient haldab ise kaarte |
| **Stripe Connect** | Partnerimaksed | (Tulevikus) Automaatne split |
| **Webhooks** | Sündmuste teavitused | Makse õnnestus → teavita |

### Arvelduse loogika

```
KLIENDID (automaatne):
┌─────────────────────────────────────────────────┐
│ Klient liitub                                   │
│      ↓                                          │
│ Stripe Subscription (€229/kuu, €349/kuu vms)   │
│      ↓                                          │
│ Iga kuu 1. kuupäev → automaatne makse          │
│      ↓                                          │
│ Stripe saadab arve PDF → kliendi e-mail        │
│      ↓                                          │
│ Webhook → Firebase → uuenda kliendi staatust   │
└─────────────────────────────────────────────────┘

PARTNERID (manuaalne esialgu):
┌─────────────────────────────────────────────────┐
│ Kuu lõpus vaatad: mitu koristust tehti          │
│      ↓                                          │
│ Arvutad partneri osa (70%)                      │
│      ↓                                          │
│ Saadad arve või teed ülekande                   │
└─────────────────────────────────────────────────┘
```

### Stripe hinnad

| Teenus | Hind |
|--------|------|
| Kaardimakse | 1.4% + €0.25 |
| SEPA Direct Debit | 0.35% (max €5) |
| Invoicing | €0 (Stripe maksete puhul) |

**Soovitus:** Kasuta SEPA Direct Debit – odavam ja töökindlam.

### Stripe seadistus

1. Loo Stripe konto (stripe.com)
2. Seadista Products (Värskus, Hoolitsus, Vabadus × suurused)
3. Seadista Customer Portal
4. Ühenda Firebase'iga (Stripe Firebase Extension)
5. Testi sandbox keskkonnas

---

## Prioriteet 3: Firebase + Automaatne aruandlus

### Miks Firebase?

- **Hosting** – kiire, tasuta SSL, sukoda.ee domeen
- **Firestore** – andmebaas klientidele, broneeringutele
- **Authentication** – sisselogimine (tulevikus)
- **Cloud Functions** – automaatloogika (webhookid, teavitused)
- **Stripe Extension** – valmis integratsioon

### Firebase struktuur

```
firestore/
├── customers/           # Kliendid
│   └── {customerId}/
│       ├── name
│       ├── email
│       ├── phone
│       ├── address
│       ├── package        # Värskus/Hoolitsus/Vabadus
│       ├── size           # m²
│       ├── stripeCustomerId
│       ├── subscriptionStatus
│       └── partnerId
│
├── partners/            # Partnerid
│   └── {partnerId}/
│       ├── name
│       ├── email
│       ├── phone
│       ├── areas[]        # Teeninduspiirkonnad
│       └── rating
│
├── bookings/            # Broneeringud
│   └── {bookingId}/
│       ├── customerId
│       ├── partnerId
│       ├── date
│       ├── status         # scheduled/completed/cancelled
│       └── photos[]
│
└── transactions/        # Maksed (Stripe sync)
    └── {transactionId}/
        ├── customerId
        ├── amount
        ├── date
        └── status
```

### Automaatne aruandlus

| Aruanne | Sagedus | Sisu |
|---------|---------|------|
| **Päevaaruanne** | Iga päev 20:00 | Tänased broneeringud, tulud |
| **Nädalaaruanne** | Esmaspäev | Nädala kokkuvõte, partnerite tööd |
| **Kuuaruanne** | Kuu 1. kuupäev | Käive, marginaal, partnerite maksed |

```
AUTOMAATNE PÄEVAARUANNE (e-mail):
┌─────────────────────────────────────────────────┐
│ 📊 SUKODA päevakokkuvõte – 17.12.2024           │
│                                                 │
│ Broneeringuid täna: 8                           │
│ Õnnestunud: 8 ✓                                 │
│                                                 │
│ Tulud täna: €892                                │
│ SUKODA osa: €268 (30%)                          │
│                                                 │
│ Partnerite jaotus:                              │
│ - Koristus OÜ: 5 koristust (€442)              │
│ - Puhas FIE: 3 koristust (€265)                │
│                                                 │
│ Uued kliendid: 2                                │
│ Tühistatud: 0                                   │
└─────────────────────────────────────────────────┘
```

### Firebase Cloud Functions

```javascript
// Automaatne päevaaruanne
exports.dailyReport = functions.pubsub
  .schedule('0 20 * * *')  // Iga päev 20:00
  .onRun(async () => {
    // Kogu päeva andmed
    // Saada e-mail
  });

// Stripe webhook handler
exports.stripeWebhook = functions.https
  .onRequest(async (req, res) => {
    // Makse õnnestus → uuenda Firestore
    // Saada kliendile kinnitus
  });

// Kuu alguse partnerite kokkuvõte
exports.monthlyPartnerSummary = functions.pubsub
  .schedule('0 9 1 * *')  // Iga kuu 1. kuupäev
  .onRun(async () => {
    // Arvuta partnerite summad
    // Saada meeldetuletus arve tegemiseks
  });
```

### Raamatupidamise integratsioon

| Lahendus | Kirjeldus | Hind |
|----------|-----------|------|
| **Merit Aktiva** | Eesti raamatupidamistarkvara | €15/kuu |
| **Directo** | API olemas | €25/kuu |
| **CSV eksport** | Stripe → Excel → raamatupidajale | €0 |

**Soovitus:** Alguses CSV eksport Stripe'ist, hiljem Merit Aktiva API.

---

## Prioriteet 4: Tagasisidesüsteem

### Funktsionaalsus

1. **Automaatne teavitus** – 2h pärast koristust
2. **Hinnang** – 1-5 tärni
3. **Kommentaar** – vabatahtlik
4. **Fotod** – partner laeb üles pärast koristust

### Tehniline lahendus

| Variant | Kirjeldus | Hind |
|---------|-----------|------|
| **A: E-mail link** | Typeform/Google Forms | €0-30/kuu |
| **B: SMS** | Automaatnse SMS-iga | €100-200/kuu |
| **C: Äpp** | Push notification | €3,000+ |

**Soovitus:** Alusta A-ga (Typeform), hiljem C.

---

## Prioriteet 5: Partneri haldus

### Miks see on oluline?
Platvormimudeli edu sõltub headest partneritest. Vajame:
- Lihtsat suhtlust partneritega
- Broneeringute jagamist
- Kvaliteedi jälgimist
- Maksete haldust

### Algus (0-20 klienti): Käsitsi + WhatsApp

```
UUEST BRONEERINGUST:
┌────────────────────────────────────┐
│ WhatsApp grupp: "SUKODA partnerid" │
├────────────────────────────────────┤
│ 📍 Uus broneering!                 │
│                                    │
│ Klient: Mari Mets                  │
│ Aadress: Kadriorg, Weizenbergi 8   │
│ Pakett: Hoolitsus                  │
│ Aeg: Kolmapäev 14:00-17:00         │
│                                    │
│ Kes võtab? 🙋                      │
└────────────────────────────────────┘

Partner vastab: "Mina! ✓"
```

**Hind:** €0
**Töötab kuni:** ~20 klienti

### Kasv (20-50 klienti): Notion/Airtable

| Veerg | Sisu |
|-------|------|
| Klient | Mari Mets |
| Aadress | Weizenbergi 8 |
| Piirkond | Kadriorg |
| Partner | [valik] Koristus OÜ / Puhas FIE |
| Pakett | Hoolitsus |
| Järgmine külastus | 18.12.2024 |
| Staatus | Kinnitatud ✓ |
| Märkused | Kass, allergia lõhnaainele |

- Partner näeb ainult oma kliente (filtered view)
- Saad jagada linki partnerile
- **Hind:** €10-20/kuu

### Skaleerimine (50+ klienti): Partneriportaal

1. **Sisselogimine** – partneri konto
2. **Broneeringute vaade** – tulevased, tehtud
3. **Kalender** – sünkroniseerib Google Calendariga
4. **Rating** – oma reiting, kliendi tagasiside
5. **Tulud** – kui palju teeninud, mis veel maksmata
6. **Materjalid** – SUKODA standardid, koolitused

| Variant | Kirjeldus | Hind |
|---------|-----------|------|
| **A: Notion/Airtable** | Lihtsustatud | €20/kuu |
| **B: Kohandatud portaal** | Täisfunktsionaalne | €8,000-15,000 |

**Soovitus:** Alusta WhatsAppiga → Notion → Kohandatud

---

## Prioriteet 6: Kvaliteediäpp (kaamerasüsteem)

### Miks?
- Automaatne kvaliteedikontroll
- Enne/pärast fotod = tõestus
- Kaitse partnerile JA kliendile
- Turundusmaterjal (enne/pärast)

### Funktsionaalsus

**Partner äpp:**
1. Checklist ruumide kaupa (köök, vannituba, magamistuba...)
2. Foto ENNE + PÄRAST iga ruum
3. Märgi "Valmis" → saadab SUKODA-le
4. GPS + ajatempel = tõestus kohalolekust

**Kliendi vaade (hiljem):**
1. Näeb fotosid peale koristust
2. Annab tagasisidet
3. Näeb ajalugu

### Tehnilised variandid

| Variant | Kirjeldus | Hind | Aeg |
|---------|-----------|------|-----|
| **A: Google Forms + Drive** | Käsitsi, aga töötab | €0 | 1 päev |
| **B: Lihtne äpp (no-code)** | Glide/Adalo põhine | €50/kuu | 1 nädal |
| **C: Custom äpp** | iOS + Android | €8,000-15,000 | 2-3 kuud |

### Soovitus: Alusta A → B → C

**Faas 1 (0-30 klienti):**
- Partner saadab WhatsAppi fotod
- Või täidab Google Formi fotodega

**Faas 2 (30-100 klienti):**
- Glide/Adalo äpp partneritele
- Lihtne dashboard sulle

**Faas 3 (100+ klienti):**
- Custom äpp
- AI kvaliteedikontroll (kas puhas?)
- Kliendi portaal

### Kehakaamera (tulevikus)

| Seade | Hind | Märkused |
|-------|------|----------|
| GoPro Hero | €200-400 | Kvaliteetne, aga kallis |
| Xiaomi/budget action cam | €50-100 | Piisav kvaliteet |
| Bodycam (politsei stiil) | €80-150 | Kompaktne, pikk aku |

**Millal:** Kui 50+ klienti ja süsteem töötab

---

## Prioriteet 7: CRM

### Variandid

| Lahendus | Hind | Sobivus |
|----------|------|---------|
| **HubSpot Free** | €0 | Hea alguseks |
| **Pipedrive** | €15-50/kuu | Müügifookus |
| **Notion** | €10/kuu | Paindlik |

**Soovitus:** HubSpot Free alguses.

---

## Arenduse ajakava (ise tehes)

### Nädal 1-2: Firebase + Stripe baas

- [ ] Firebase projekti loomine
- [ ] sukoda.ee → Firebase Hosting
- [ ] Stripe konto loomine
- [ ] Stripe Products seadistus (12 toodet: 3 paketti × 4 suurust)
- [ ] Stripe Firebase Extension paigaldus
- [ ] Broneerimis-/tellimisvorm lehele

### Nädal 3-4: Automaatne arveldus

- [ ] Stripe Subscriptions seadistus
- [ ] Stripe Customer Portal seadistus
- [ ] Webhook'id → Firebase Cloud Functions
- [ ] Automaatne arve e-mailile

### Kuu 2: Aruandlus + teavitused

- [ ] Cloud Function: päevaaruanne e-mailile
- [ ] Cloud Function: kuuaruanne e-mailile
- [ ] SendGrid integratsioon
- [ ] Tagasiside vorm (Typeform/Google Forms)

### Kuu 3+: Partneri tööriistad

- [ ] Notion/Airtable partnerivaade
- [ ] Google Calendar sünkroniseerimine
- [ ] WhatsApp grupp partneritele

### Hiljem (kui kasv nõuab):

- [ ] Kohandatud partneriportaal
- [ ] Mobiiliäpp partneritele
- [ ] Kliendi äpp
- [ ] AI kvaliteedikontroll

---

## Tehniline stack (kinnitatud)

| Komponent | Tehnoloogia | Staatus |
|-----------|-------------|---------|
| **Domeen** | sukoda.ee | ✅ Ostetud |
| **Hosting** | Firebase Hosting | 🔜 Seadistada |
| **Andmebaas** | Firebase Firestore | 🔜 Seadistada |
| **Maksed** | Stripe (Subscriptions + Invoicing) | 🔜 Seadistada |
| **Kliendi arveldus** | Stripe automaatne | 🔜 |
| **Partneri arveldus** | Manuaalne (esialgu) | ✓ |
| **Veebileht** | HTML/Tailwind (praegune) | ✅ Valmis |
| **Backend loogika** | Firebase Cloud Functions | 🔜 |
| **E-mailid** | SendGrid (Firebase Extension) | 🔜 |
| **Aruandlus** | Automaatne (Cloud Functions) | 🔜 |
| **CRM** | Firestore + HubSpot Free | 🔜 |

### Firebase seadistuse sammud

1. **Firebase projekt**
   ```bash
   firebase login
   firebase init
   # Vali: Hosting, Firestore, Functions
   ```

2. **sukoda.ee ühendamine**
   - Firebase Console → Hosting → Add custom domain
   - Lisa DNS kirjed (A ja TXT)
   - SSL automaatselt

3. **Stripe Firebase Extension**
   - Firebase Console → Extensions → "Run Payments with Stripe"
   - Ühenda Stripe konto
   - Seadista Products ja Prices

4. **Deploy**
   ```bash
   firebase deploy
   ```

---

## Lähim tehniline ülesanne

**Firebase + Stripe seadistus:**

1. Loo Firebase projekt
2. Ühenda sukoda.ee domeen
3. Loo Stripe konto
4. Seadista Products (Värskus, Hoolitsus, Vabadus × 4 suurust = 12 toodet)
5. Paigalda Stripe Firebase Extension
6. Lisa broneerimis-/tellimis-vorm lehele
7. Testi end-to-end voog

**Aeg:** 1-2 nädalat

---

## Kokkuvõte

| Faas | Aeg | Tulemus |
|------|-----|---------|
| Baas | Nädal 1-4 | Firebase + Stripe + automaatne arveldus |
| Aruandlus | Kuu 2 | Automaatsed raportid |
| Partnerid | Kuu 3+ | Partneri tööriistad |

**Arenduskulu: €0** (ise tehes, tasuta tööriistad)

**Jooksvad kulud:**
- Firebase: €0 (free tier katab ~50k päringut/päev)
- Stripe: 1.4% + €0.25 makse kohta
- SendGrid: €0 (100 e-maili/päev tasuta)
- Domeen: ~€15/aasta

---

## Võtmeotsused (kinnitatud)

| Otsus | Valik | Põhjendus |
|-------|-------|-----------|
| **Domeen** | sukoda.ee ✅ | Ostetud |
| **Hosting** | Firebase | Tasuta, kiire, Stripe integratsioon |
| **Maksed** | Stripe | Subscriptions, automaatarved, SEPA |
| **Kliendi arveldus** | Automaatne | Stripe Subscriptions + Invoicing |
| **Partneri arveldus** | Manuaalne | Esialgu käsitsi, hiljem Stripe Connect |
| **Aruandlus** | Automaatne | Cloud Functions, igapäevased e-mailid |

