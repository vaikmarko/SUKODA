# SUKODA Testimise juhend

## Eeltingimused

Enne testimist veendu, et:
- [ ] Node.js on paigaldatud
- [ ] Firebase CLI on paigaldatud (`npm install -g firebase-tools`)
- [ ] Oled Firebase'i sisse loginud (`firebase login`)
- [ ] Stripe konto on olemas

---

## 1. Lokaalne testimine (ilma Stripe'ita)

Kiire testimine, et veenduda veebilehe töötamises:

```bash
cd /Users/markovaik/Projects/SUKODA

# Käivita lihtne server
npx serve . -p 3000

# Või Python'iga
python3 -m http.server 3000
```

Ava brauseris: http://localhost:3000

### Mida kontrollida:
- [ ] Avaleht laeb
- [ ] Pakettide hinnad kuvatakse õigesti
- [ ] Suuruse valimine töötab
- [ ] Tellimuse flow sammud töötavad (ilma makseta)
- [ ] Kingituse leht laeb ja töötab

---

## 2. Firebase Emulaatorid (täielik lokaalne test)

```bash
cd /Users/markovaik/Projects/SUKODA

# Käivita emulaatorid
firebase emulators:start

# See käivitab:
# - Hosting: http://localhost:5000
# - Functions: http://localhost:5001
# - Firestore: http://localhost:8080
```

---

## 3. Stripe integratsioon testimine

### 3.1 Loo test tooted Stripe'is

1. Mine [Stripe Dashboard (Test mode)](https://dashboard.stripe.com/test/products)
2. Veendu, et oled TEST mode's (vaata ülemist menüüd)
3. Loo vähemalt üks test toode:
   - Nimi: "Test - Üks Hetk 51-90m²"
   - Hind: €179 (one-time)
4. Kopeeri Price ID (nt `price_1QaBC...`)

### 3.2 Seadista Price ID

Muuda `functions/index.js` failis:
```javascript
const PRICE_IDS = {
  gifts: {
    moment: {
      medium: 'price_SINU_TEST_PRICE_ID',  // Asenda siia
      // ...
    },
    // ...
  },
  // ...
};
```

### 3.3 Seadista Stripe võtmed

```bash
# Test API key (algab sk_test_)
firebase functions:config:set stripe.secret_key="sk_test_SINU_KEY"

# Webhook secret (seadistatakse hiljem)
firebase functions:config:set stripe.webhook_secret="whsec_TEST"
```

### 3.4 Deploy ja testi

```bash
# Deploy functions
firebase deploy --only functions

# Testi brauseris
# Mine https://sukoda.ee (või localhost kui emulaatorid)
# Vali pakett ja proovi maksta
```

### 3.5 Testkaaart

Stripe test mode's kasuta:
- Kaardi number: `4242 4242 4242 4242`
- Kehtivusaeg: Suvaline tuleviku kuupäev (nt 12/25)
- CVC: Suvaline 3 numbrit (nt 123)
- Postikood: Suvaline (nt 12345)

---

## 4. Webhook testimine (Stripe CLI)

```bash
# Paigalda Stripe CLI
brew install stripe/stripe-cli/stripe

# Logi sisse
stripe login

# Edasta webhook'id lokaalsetele functions'itele
stripe listen --forward-to localhost:5001/sukoda-77b52/europe-west1/stripeWebhook

# See annab sulle webhook signing secret (whsec_...)
# Kopeeri see ja kasuta emulaatoris
```

---

## 5. End-to-End test

### Stsenaarium A: Kingitus

1. Ava kingitus.html
2. Vali "Üks Hetk", suurus 51-90m²
3. Täida andmed:
   - Sinu nimi: Test Tellija
   - E-post: test@example.com
   - Kingisaaja: Mari Mets
   - Aadress: Test 123, Tallinn
4. Vajuta "Maksa nüüd"
5. Stripe Checkout avaneb
6. Kasuta testkaarti
7. Kontrolli:
   - [ ] Suunatakse success.html lehele
   - [ ] Firebase Console's on uus order
   - [ ] E-mail saadeti (kui seadistatud)

### Stsenaarium B: Püsitellimus

1. Ava index.html
2. Vali "Üle nädala", suurus 51-90m²
3. Täida andmed
4. Maksa
5. Kontrolli:
   - [ ] Stripe Subscription loodud
   - [ ] Order Firestore's

---

## 6. Vigade lahendamine

### "Price not configured"
- Veendu, et Price ID on õige `functions/index.js` failis
- Kontrolli, et toode on Stripe's olemas

### Checkout ei avane
- Kontrolli brauseri konsooli vigu
- Veendu, et Functions on deployed
- Kontrolli, et Stripe key on seadistatud

### E-mail ei tule
- Kontrolli Firebase Console > Extensions
- Veendu, et Trigger Email on paigaldatud
- Kontrolli `mail` collection Firestore's

---

## 7. Go-Live checklist

- [ ] Vaheta Stripe test keys → live keys
- [ ] Loo kõik tooted Stripe live mode's
- [ ] Uuenda Price ID'd functions'is
- [ ] Lisa live webhook endpoint Stripe Dashboard'is
- [ ] Testi üks päris makse (väike summa)
- [ ] Kontrolli, et e-mailid tulevad

