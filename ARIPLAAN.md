# SUKODA Äriplaan

**Eesmärk: €20 000 neto kuutulu**

SUKODA on platvorm. Me ei palka koristajaid — me pakume brändi, kliente ja süsteeme partneritele (FIE-d, väikefirmad). Partner teeb töö, meie võtame 25-30%.

---

## Toode

Üks pakett, kolm rütmi. Iga külastusega: lilled, tervituskaart, magus üllatus, voodipesu.

| Rütm | Külastusi/kuu | Hind (3 tuba) |
|------|---------------|---------------|
| 1× kuus | 1× | €229/kuu |
| 2× kuus | 2× | €399/kuu |
| 4× kuus | 4× | €719/kuu |

Sagedasematel: + hooajalised puuviljad, + taimede kastmine.

### Hinnad tubade arvu järgi

| Tubade arv | 1× kuus | 2× kuus | 4× kuus |
|------------|---------|---------|---------|
| 1-2 tuba | €179 | €319 | €579 |
| 3 tuba | €229 | €399 | €719 |
| 4 tuba | €289 | €499 | €899 |
| 5+ tuba / Maja | Rätseplahendus | | |

### Kingikaardid

| Kingitus | Sisu | Hind (3 tuba) | Marginaal |
|----------|------|---------------|-----------|
| Üks Hetk | 1× hoolitsus | €279 | ~40% |
| Kuu Aega | 2× hoolitsust | €519 | ~35% |
| Kvartal Vabadust | 6× hoolitsust (3 kuud) | €1349 | ~30% |

### Kaartide trükispetsifikatsioonid

Mõlemad kaardid (tervituskaart + kinkekaart) on sama suurusega.

| Parameeter | Väärtus |
|------------|---------|
| Formaat | A6 maastik (148 × 105 mm) |
| Lõikevaru (bleed) | 3 mm igast servast |
| Faili suurus koos bleed-iga | 154 × 111 mm |
| Värviruum | CMYK |
| Väljundformaat | PDF |
| Taust | Valge (trükkimata) |
| Kinkekaardi paber | 350–400g matt tekstuuriga (nt Gmund Cotton) |
| Tervituskaardi paber | 300–350g matt, valge |
| Ümbrik | C6 (162 × 114 mm), 120–150g premium, valge |
| Kuldne element | Hot foil stamping (kuumfoolium) |

**Disainifailid:** `assets/cards/print/` (SVG + disain-brief.html eelvaade)

---

## 3 tuluvoogu

### 1. Püsitellimused (B2C) — põhitulu

Klient tellib veebist, maksab igakuiselt Stripe'i kaudu.

| Rütm | Klient maksab | Partner (70%) | SUKODA (30%) |
|------|---------------|---------------|--------------|
| 1× kuus | €229 | €160 | **€69** |
| 2× kuus | €399 | €279 | **€120** |
| 4× kuus | €719 | €503 | **€216** |

**Keskmine SUKODA tulu: ~€100/klient/kuu**

### 2. Kinkekaardid B2B (arendajad + maaklerid)

Arendajad ostavad kinkekaarte uute korterite ostjatele. Maaklerid ostavad tehingu lõpetamisel.

| Kingitus | Hind | SUKODA jääb | Pärast: partnerile |
|----------|------|-------------|-------------------|
| Üks Hetk | €279 | ~€112 | ~€167 |
| Kuu Aega | €519 | ~€182 | ~€337 |
| Kvartal Vabadust | €1349 | ~€405 | ~€944 |

### 3. Kingisaaja → püsiklient konversioon

Automaatne e-kirjade funnel pärast kingituse kasutamist:

| Aeg | E-kiri | Sooduskood |
|-----|--------|------------|
| 24h pärast | "See tunne." | KINGITUS20 (−20%, 3 kuuks) |
| 7 päeva | "Kas mäletad?" | KINGITUS20 |
| 30 päeva | "Mõtlesime sinu peale" | KINGITUS20 |

**Eeldatav konversioon: 25-35% kingisaajatest → püsiklient.**

Esimesed 3 kuud −20% → seejärel täishind. CAC selle kanali kaudu = €0.

---

## Soovitusprogramm

Iga püsiklient saab unikaalse koodi (SOOVITA-XXXXX).

| Kes | Mida saab |
|-----|-----------|
| Sõber (uus klient) | −20% esimesed 3 kuud (SOOVITA20) |
| Soovitaja | −20% ühelt kuult (SOOVITAJA20) |

Automaatne: Stripe sooduskoodid, Firestore jälgimine, e-kirja teavitus.

**Siht: 10-15% klientidest soovitab. 30-50% uutest klientidest tuleb soovitustest.**

---

## Tee €20 000-ni

### Mida on vaja

| Näitaja | Arv |
|---------|-----|
| Aktiivseid püsikliente | **~230** |
| Koristuspartnereid | **8-10** |
| Arendaja-/maaklerpartnereid | **5-8** |
| SUKODA brutotulu (30% käibest) | ~€33 000/kuu |
| Püsikulud | ~€13 000/kuu |
| **Neto** | **~€20 000/kuu** |

### Kuidas 230 klienti saada

| Kanal | Kliendid | Kuidas |
|-------|----------|--------|
| Arendajate kinkekaardid → konversioon | ~100 | 350 korterit × 30% konversioon |
| Soovitusprogramm | ~60 | 230 × 10% soovitab × 3 = ~70 uut/aastas |
| Orgaaniline + turundus | ~70 | Google, Instagram, suusõnaline |

### Faasid

#### Faas 1: Käivitus (kuud 1-6)

| | Siht |
|-|------|
| Partnerid | 2-3 |
| Arendajad/maaklerid | 1-2 |
| Kliendid | 50 |
| SUKODA tulu | €4 750/kuu |
| Kulud | €1 200/kuu |
| **Neto** | **€3 550/kuu** |

#### Faas 2: Kasv (kuud 7-18)

| | Siht |
|-|------|
| Partnerid | 6-8 |
| Arendajad/maaklerid | 3-5 |
| Kliendid | 200 |
| SUKODA tulu | €19 000/kuu |
| Kulud | €6 200/kuu |
| **Neto** | **€12 800/kuu** |

#### Faas 3: €20k (kuud 19-30)

| | Siht |
|-|------|
| Partnerid | 12-15 |
| Arendajad/maaklerid | 5-8 |
| Kliendid | 230+ |
| SUKODA tulu | €33 000/kuu |
| Kulud | €13 000/kuu |
| **Neto** | **€20 000/kuu** |

---

## Püsikulud

### Faas 1 (50 klienti)

| Kulu | Summa |
|------|-------|
| Turundus | €500 |
| Tarkvara | €100 |
| Lilled, puuviljad, kommid | €400 |
| Brändimaterjal | €50 |
| Raamatupidamine | €150 |
| **Kokku** | **~€1 200/kuu** |

### Faas 3 (230 klienti)

| Kulu | Summa |
|------|-------|
| Turundus | €2 500 |
| Tarkvara | €500 |
| Lilled, puuviljad, kommid | €3 500 |
| Brändimaterjal | €200 |
| 1-2 töötajat (koordinaator) | €5 000 |
| Raamatupidamine | €300 |
| Kindlustus | €100 |
| Muu | €900 |
| **Kokku** | **~€13 000/kuu** |

---

## Tehniline süsteem

| Komponent | Lahendus | Kulu |
|-----------|----------|------|
| Veebileht | Firebase Hosting | €0 |
| Andmebaas | Firebase Firestore | €0 |
| Maksed | Stripe (automaatne) | 1.4% + €0.25 |
| E-kirjad | Resend | €0-20/kuu |
| Broneerimine | Cal.com | €0 |
| Domeen | sukoda.ee | €15/aasta |

Automatiseeritud: checkout → makse → e-kirjad → broneerimine → follow-up → soovituskood.

---

## Kampaaniakalender

| Kuupäev | Sündmus |
|---------|---------|
| 14. veebruar | Valentinipäev |
| 8. märts | Naistepäev |
| Mai | Emadepäev |
| Juuni | Isadepäev |
| Detsember | Jõulud |

---

## Edutegurid

| Tegur | Miinimum |
|-------|----------|
| Kliendi eluiga | 12+ kuud |
| Kliendi hankimiskulu | <€150 |
| Kingisaaja konversioon | >25% |
| Churn (kadu) | <5%/kuu |
| Soovituste osakaal | >30% uutest |

---

## Kokkuvõte

- **Eesmärk:** €20 000 neto/kuu
- **Vajaminev:** ~230 püsiklienti, 8-10 partnerit, 5-8 arendajat
- **Ajakava:** ~24 kuud
- **3 kanalit:** otsetellimus, arendajate kinkekaardid, soovitusprogramm
- **Kõik automatiseeritud:** makse, e-kirjad, broneerimine, follow-up, soovitused
