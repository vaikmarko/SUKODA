# SUKODA Tehniline seadistamine

## Kiirstart

### 1. Firebase seadistamine

Firebase projekt on juba loodud (`sukoda-77b52`). Järgmised sammud:

```bash
# Logi sisse Firebase'i
firebase login

# Initsialiseeri projekt (kui pole veel tehtud)
cd /Users/markovaik/Projects/SUKODA
firebase init
# Vali: Hosting, Functions, Firestore

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### 2. Stripe seadistamine

#### 2.1 Stripe Products loomine

Mine [Stripe Dashboard](https://dashboard.stripe.com/products) ja loo järgmised tooted:

**KINGITUSED (One-time payments):**

| Toode | Suurus | Hind |
|-------|--------|------|
| Üks Hetk | Kuni 50m² | €149 |
| Üks Hetk | 51-90m² | €179 |
| Üks Hetk | 91-120m² | €229 |
| Üks Hetk | 121-150m² | €279 |
| Kuu Aega | Kuni 50m² | €299 |
| Kuu Aega | 51-90m² | €349 |
| Kuu Aega | 91-120m² | €449 |
| Kuu Aega | 121-150m² | €549 |
| Kvartal Vabadust | Kuni 50m² | €749 |
| Kvartal Vabadust | 51-90m² | €899 |
| Kvartal Vabadust | 91-120m² | €1099 |
| Kvartal Vabadust | 121-150m² | €1299 |

**PÜSITELLIMUSED (Recurring monthly):**

| Toode | Suurus | Hind/kuu |
|-------|--------|----------|
| Kord kuus | Kuni 50m² | €119 |
| Kord kuus | 51-90m² | €149 |
| Kord kuus | 91-120m² | €189 |
| Kord kuus | 121-150m² | €229 |
| Üle nädala | Kuni 50m² | €199 |
| Üle nädala | 51-90m² | €249 |
| Üle nädala | 91-120m² | €319 |
| Üle nädala | 121-150m² | €389 |
| Iga nädal | Kuni 50m² | €379 |
| Iga nädal | 51-90m² | €449 |
| Iga nädal | 91-120m² | €579 |
| Iga nädal | 121-150m² | €699 |

#### 2.2 Price ID-de kopeerimine

Pärast toodete loomist kopeeri iga hinna Price ID (algab `price_`) ja lisa need `functions/index.js` faili PRICE_IDS objekti.

#### 2.3 Stripe API võtmed

1. Mine [Stripe Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
2. Kopeeri Secret key (algab `sk_test_` või `sk_live_`)

Seadista Firebase'is:
```bash
firebase functions:config:set stripe.secret_key="sk_test_SINU_KEY"
```

#### 2.4 Webhook seadistamine

1. Mine [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Lisa endpoint: `https://europe-west1-sukoda-77b52.cloudfunctions.net/stripeWebhook`
3. Vali sündmused:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Kopeeri Webhook Secret (algab `whsec_`)

Seadista Firebase'is:
```bash
firebase functions:config:set stripe.webhook_secret="whsec_SINU_SECRET"
```

### 3. E-mail teavitused (Resend)

**Resend** on lihtne e-mail API - lihtsam kui SendGrid, tasuta kuni 100 emaili päevas.

#### 3.1 Loo Resend konto

1. Mine [resend.com](https://resend.com) ja registreeru
2. Mine [Dashboard > API Keys](https://resend.com/api-keys)
3. Loo uus API key
4. Kopeeri key (algab `re_`)

#### 3.2 Seadista Firebase'is

```bash
firebase functions:config:set resend.api_key="re_SINU_API_KEY"
firebase functions:config:set notification.email="sinu@email.ee"
```

#### 3.3 Domeeni verifitseerimine (live jaoks)

Testimiseks töötab kohe, aga live jaoks:
1. Mine [Resend > Domains](https://resend.com/domains)
2. Lisa `sukoda.ee`
3. Lisa DNS kirjed (DKIM, SPF)
4. Oota verifitseerimist (~5 min)

#### Alternatiiv: Firebase Trigger Email Extension

Kui Resend pole seadistatud, salvestuvad emailid Firestore `mail` kollektsiooni.
Sealt saad neid käsitsi saata või seadistada Firebase Email Extension.

### 4. Deploy

```bash
# Installi Cloud Functions dependencies
cd functions
npm install
cd ..

# Deploy kõik
firebase deploy

# Või eraldi:
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### 5. Testimine

#### Test mode:
1. Kasuta Stripe test API võtmeid (`sk_test_...`)
2. Kasuta testkaarti: `4242 4242 4242 4242`
3. Suvaline tuleviku kuupäev ja CVC

#### Stripe CLI (webhook'ide testimiseks):
```bash
# Installi Stripe CLI
brew install stripe/stripe-cli/stripe

# Logi sisse
stripe login

# Kuula webhook'e ja suuna localhost'i
stripe listen --forward-to localhost:5001/sukoda-77b52/europe-west1/stripeWebhook
```

#### Local testing:
```bash
# Käivita Firebase emulaatorid
firebase emulators:start

# Leht on saadaval: http://localhost:5000
# Functions: http://localhost:5001
```

---

## Checklist enne Live'i minekut

- [ ] Stripe live API võtmed seadistatud
- [ ] Stripe webhook live endpoint lisatud
- [ ] Kõik Price ID-d õiged
- [ ] E-mail teavitused töötavad
- [ ] sukoda.ee DNS seadistatud Firebase'ile
- [ ] SSL sertifikaat aktiivne
- [ ] Testtellimus läbi tehtud
- [ ] Privaatsuspoliitika ja tingimused ajakohased

---

## Kasulikud käsud

```bash
# Vaata functions logisid
firebase functions:log

# Vaata config'i
firebase functions:config:get

# Kustuta config
firebase functions:config:unset stripe.secret_key
```

## Abi

- [Firebase Docs](https://firebase.google.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/checkout)

