# Natiivne rakendus (App Store ja Google Play): mida server juba ootab

Rakendus kasutab samu API-sid mis veeb (`/api/me/*`, `/api/haldus/*`) ja sama 6-kohalist sisenemiskoodi. Allpool on kolm asja, mis on poodide jaoks serveris valmis.

## 1. Päis igal päringul

`X-Sukoda-App: ios` või `X-Sukoda-App: android`

Selle päisega ei näita töölaud paketi hinda ega ostunuppu (`billing.plans` on tühi, `billing.purchase` on `false`), kodude piiril ei soovitata suuremat paketti ja `billing/checkout` ning `billing/resume` vastavad 403. Paketti ostetakse veebis. Tasuta pakett (kuni 3 kodu) töötab rakenduses tavapäraselt.

## 2. Push (FCM, iOS-il APNs kaudu)

- Pärast sisenemist ja teavituste lubamist: `POST /api/haldus/push` kehaga `{ "token": "<FCM token>", "platform": "ios" | "android" }`. Sama päring tokeni uuenemisel.
- Enne väljalogimist: `POST /api/haldus/push/remove` kehaga `{ "token": "<FCM token>" }`.
- Mõlemad töötavad nii elaniku kui tegija sessiooniga (`Authorization: Bearer <token>`).
- Teatel on `data.type` (üks viiest: `morning`, `new_request`, `visit_tomorrow`, `rhythm_due`, `request_status`) ja `data.url`, kuhu teate puudutus viib.
- Veebi (PWA) teavitused jäävad tööle; sama inimene saab teate mõlemasse.

Markol on vaja Firebase'i konsoolis: Project settings → Cloud Messaging → Apple app configuration → lae üles APNs Auth Key (.p8, Apple Developeri kontolt). Androidil eraldi võtit ei ole.

## 3. Konto kustutamine

1. `POST /api/haldus/account/delete-code` saadab konto e-postile 6-kohalise koodi. Vastus `{ sent: true, email }`.
2. `POST /api/haldus/account/delete` kehaga `{ "code": "123456" }` kustutab kohe. Vastus `{ deleted: true }`; rakendus kustutab seejärel oma tokeni.

Partnerilepinguga töölaud (Arco järelteenindus) saab 403 ja juhise kirjutada tere@sukoda.ee.
