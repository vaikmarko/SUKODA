#!/usr/bin/env python3
"""
Arco Vara demo — the developer's handover folder as real PDFs.

Writes HTML letterhead pages to a temp dir and prints them to scripts/demo-docs/*.pdf with
headless Chrome. seed-arco-demo.js uploads these into the home's folder (GCS) so the client
portal opens real files, not links.

Usage: python3 scripts/make-demo-docs.py
"""
import os, subprocess, tempfile, shutil, sys

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demo-docs')

HEAD = '''<!doctype html><html lang="et"><head><meta charset="utf-8"><style>
@page{size:A4;margin:22mm 20mm}
body{font-family:Georgia,"Times New Roman",serif;color:#111;font-size:12.5px;line-height:1.55}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #B8976A;padding-bottom:10px;margin-bottom:26px}
.brand{font-size:22px;letter-spacing:.14em}.brand small{display:block;font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.3em;color:#6B6560;margin-top:4px}
.meta{font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.2em;color:#6B6560;text-align:right;text-transform:uppercase;max-width:45%}
h1{font-weight:400;font-size:26px;margin:0 0 6px}.sub{color:#6B6560;margin:0 0 22px}
h2{font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.25em;text-transform:uppercase;color:#B8976A;margin:22px 0 8px}
table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #E8E3DD;text-align:left;vertical-align:top}th{font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#6B6560;font-weight:500;white-space:nowrap}
.sig{display:flex;gap:40px;margin-top:40px}.sig div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:11px;color:#6B6560}
.foot{position:fixed;bottom:0;left:0;right:0;font-family:Helvetica,Arial,sans-serif;font-size:8.5px;color:#9A948E;letter-spacing:.1em;display:flex;justify-content:space-between}
.box{border:1px solid #E8E3DD;padding:12px 14px;margin:10px 0}.big{font-size:34px;font-weight:400;color:#B8976A}
ul{padding-left:18px;margin:6px 0}li{margin:3px 0}
</style></head><body>
<div class="top"><div class="brand">ARCO VARA<small>Kodulahe · Iili 8 · Tallinn</small></div><div class="meta">__META__</div></div>
__BODY__
<div class="foot"><span>Arco Vara AS · Rävala pst 4, Tallinn · info@arcovara.com · +372 614 4630</span><span>Demo-dokument · SUKODA kodu kaust</span></div>
</body></html>'''

DOCS = {
'akt': ('Üleandmise-vastuvõtmise akt · 14.03.2026', '''<h1>Üleandmise-vastuvõtmise akt</h1><p class="sub">Korteriomand Iili 8-14, Kodulahe, Tallinn · Kinnistu nr 2211940 · Notariaalse müügilepingu lisa</p>
<h2>Pooled</h2><table><tr><th>Müüja</th><td>Arco Vara AS, registrikood 10261718, esindaja Kristel Käbi</td></tr><tr><th>Ostja</th><td>Anna Tamm</td></tr><tr><th>Üleandmise aeg</th><td>14. märts 2026, 11:30</td></tr></table>
<h2>Näidud üleandmisel</h2><table><tr><th>Mõõtur</th><th>Number</th><th>Näit</th></tr><tr><td>Külm vesi (kaugloetav)</td><td>KV-2026-0417</td><td>0,000 m³</td></tr><tr><td>Soe vesi (kaugloetav)</td><td>SV-2026-0417</td><td>0,000 m³</td></tr><tr><td>Elekter (kaugloetav)</td><td>EE-77410825</td><td>12 kWh</td></tr><tr><td>Küte (soojusarvesti)</td><td>SA-14-08</td><td>0,00 MWh</td></tr></table>
<h2>Üle antud</h2><ul><li>Korteri võtmed 3 tk, välisukse pult 2 tk, postkasti võti 2 tk</li><li>Panipaik K-14 (kelder B), parkimiskoht P-23 (–1 korrus)</li><li>Kodu kasutus- ja hooldusjuhend, seadmete juhendid ja garantiikaardid</li><li>Energiamärgis (klass A), ventilatsiooniseadme pass</li></ul>
<h2>Garantii</h2><p>Ehitusgarantii 24 kuud alates üleandmisest, kehtib kuni <strong>14.03.2028</strong>. Puudustest teavitab ostja arendaja järelteeninduse portaali kaudu.</p>
<div class="sig"><div>Müüja · Arco Vara AS</div><div>Ostja · Anna Tamm</div></div>'''),
'garantii': ('Garantiitingimused · kehtib kuni 14.03.2028', '''<h1>Ehitusgarantii tingimused</h1><p class="sub">Iili 8-14 · Garantiiperiood 14.03.2026 – 14.03.2028</p>
<div class="box"><span class="big">24 kuud</span><br>ehitusgarantii kõigile ehitus- ja viimistlustöödele ning tehnosüsteemidele</div>
<h2>Mida garantii katab</h2><ul><li>Konstruktsioonid, siseviimistlus, uksed ja aknad, sanitaartehnika paigaldus</li><li>Ventilatsioon, küte, vesi-kanalisatsioon, elekter — seadmed ja paigaldus</li><li>Rõdu, terrass, fassaadi ja katuse osad korteri ulatuses</li></ul>
<h2>Mida garantii ei kata</h2><ul><li>Loomulik kulumine ja hoone vajumisest tulenevad peenpraod (alla 0,3 mm)</li><li>Hooldamata jäetud filtrid, silikoonvuugid ja seadmete kasutusjuhendi eiramine</li><li>Omaniku või kolmanda isiku tehtud muudatused</li></ul>
<h2>Kuidas pöörduda</h2><p>Puudusest teavitada esimesel võimalusel <strong>järelteeninduse portaalist</strong> (Teenused → Garantii ja maja → Garantiipöördumine). Garantiimeeskond kinnitab ülevaatuse aja tavaliselt 2 tööpäeva jooksul; avariiline puudus (leke, elektririke) — helista 24h avariinumbrile.</p>
<h2>Plaanilised ülevaatused</h2><table><tr><th>Millal</th><th>Mis</th></tr><tr><td>Märts 2027</td><td>1. aasta garantiiülevaatus — puudused fikseeritakse ühe aktiga</td></tr><tr><td>Veebruar 2028</td><td>2. aasta lõppülevaatus enne garantii lõppu</td></tr></table>'''),
'puudused': ('Puuduste akt · üleandmine 14.03.2026', '''<h1>Puuduste akt üleandmisel</h1><p class="sub">Iili 8-14 · Koostatud üleandmise käigus 14.03.2026 · Kõik puudused kõrvaldatud 02.04.2026</p>
<table><tr><th>#</th><th>Ruum</th><th>Puudus</th><th>Kõrvaldatud</th></tr>
<tr><td>1</td><td>Esik</td><td>Põrandaliist parema seina ääres ei ole kinni (u 40 cm)</td><td>24.03.2026</td></tr>
<tr><td>2</td><td>Vannituba</td><td>Silikoonvuuk vanni ja plaadi vahel katkendlik</td><td>24.03.2026</td></tr>
<tr><td>3</td><td>Elutuba</td><td>Rõduukse tihend alumises servas lahti</td><td>02.04.2026</td></tr></table>
<h2>Märkused</h2><p>Puudused kõrvaldas ehitaja garantiimeeskond kahe visiidiga. Omanik kinnitas tööde vastuvõtmise 02.04.2026.</p>
<div class="sig"><div>Arco Vara järelteenindus</div><div>Anna Tamm</div></div>'''),
'plaan': ('Korteri plaan · Iili 8-14 · 3 tuba · 68,4 m²', '''<h1>Korteri plaan</h1><p class="sub">Iili 8-14 · 3. korrus · 3 tuba · 68,4 m² + rõdu 6,2 m² · Mõõtkava 1:100</p>
<svg width="560" height="360" viewBox="0 0 560 360" style="display:block;margin:10px auto">
<g fill="#FAF8F5" stroke="#111" stroke-width="2">
<rect x="20" y="20" width="520" height="300"/>
<rect x="20" y="20" width="230" height="170"/><rect x="250" y="20" width="150" height="110"/><rect x="400" y="20" width="140" height="110"/>
<rect x="250" y="130" width="120" height="60"/><rect x="370" y="130" width="170" height="60"/>
<rect x="20" y="190" width="140" height="130"/><rect x="160" y="190" width="380" height="130"/>
<rect x="160" y="320" width="200" height="30" fill="#F5F0EB" stroke-dasharray="4 3"/>
</g>
<g font-family="Helvetica,Arial" font-size="11" fill="#111">
<text x="30" y="40">ELUTUBA-KÖÖK</text><text x="30" y="56" fill="#6B6560">28,6 m²</text>
<text x="260" y="40">MAGAMISTUBA 1</text><text x="260" y="56" fill="#6B6560">12,1 m²</text>
<text x="410" y="40">MAGAMISTUBA 2</text><text x="410" y="56" fill="#6B6560">9,8 m²</text>
<text x="258" y="150">WC</text><text x="258" y="166" fill="#6B6560">1,9 m²</text>
<text x="380" y="150">VANNITUBA</text><text x="380" y="166" fill="#6B6560">5,4 m²</text>
<text x="30" y="210">ESIK</text><text x="30" y="226" fill="#6B6560">6,2 m²</text>
<text x="170" y="210">TÖÖTUBA / GARDEROOB</text><text x="170" y="226" fill="#6B6560">4,4 m²</text>
<text x="170" y="340" fill="#6B6560">RÕDU 6,2 m²</text>
</g>
<g stroke="#B8976A" stroke-width="2"><line x1="90" y1="320" x2="120" y2="320"/><line x1="250" y1="90" x2="250" y2="120"/><line x1="400" y1="60" x2="400" y2="90"/></g>
<text x="20" y="345" font-family="Helvetica,Arial" font-size="9" fill="#6B6560" letter-spacing="2">N ↑ · SISSEPÄÄS TREPIKOJAST B</text>
</svg>
<h2>Eriosad</h2><table><tr><th>Süsteem</th><th>Asukoht</th></tr><tr><td>Elektrikilp</td><td>Esik, ukse kõrval vasakul</td></tr><tr><td>Ventilatsiooniseade</td><td>Vannitoa lagi, luuk</td></tr><tr><td>Vee peakraanid ja veemõõtjad</td><td>WC, revisjoniluuk</td></tr><tr><td>Põrandakütte kollektor</td><td>Esiku kapp</td></tr></table>'''),
'juhend': ('Kodu kasutus- ja hooldusjuhend · Iili 8', '''<h1>Kodu kasutus- ja hooldusjuhend</h1><p class="sub">Iili 8, Kodulahe · Versioon 2026-03 · Kehtib kõigile maja korteritele</p>
<h2>Küte</h2><p>Kaugküte, korteris vesipõrandaküte. Igas toas termostaat; soovituslik 21 °C. Ära kata termostaate mööbliga. Kütteperioodi alguses (oktoober) kontrolli režiimid üle.</p>
<h2>Ventilatsioon</h2><p>Soojustagastusega korteripõhine seade (vannitoa laes). Režiimid: 1 – eemal, 2 – tavaline, 3 – külalised/köök. Filtrid F7/M5 vahetada iga 6 kuu tagant; märgutuli seadmel.</p>
<h2>Vesi</h2><p>Veemõõtjad on kaugloetavad — näite ei pea esitama. Peakraanid WC revisjoniluugi taga. Pikemal eemalolekul sulge peakraanid.</p>
<h2>Põrandad ja pinnad</h2><p>Tammeparkett: niiske (mitte märg) mopp, pH-neutraalne vahend, õhuniiskus 40–60 protsenti. Kvartskomposiit köögis: mitte abrasiivseid vahendeid.</p>
<h2>Aknad ja rõdu</h2><p>Hingede reguleerimine ja tihendite hooldus garantiiajal ehitaja poolt. Rõdul grillimine ainult elektrigrilliga (kodukord).</p>
<h2>Hooldusrütm</h2><table><tr><th>Iga kuu</th><td>Nõudepesumasina filter, pliidikubu filter</td></tr><tr><th>Iga 6 kuud</th><td>Ventilatsioonifiltrid, akende pesu</td></tr><tr><th>Kord aastas</th><td>Silikoonvuugid, suitsuandur, põrandakütte režiimid</td></tr></table>'''),
'vent': ('Ventilatsiooniseadme kasutusjuhend', '''<h1>Ventilatsiooniseade</h1><p class="sub">Soojustagastusega korteripõhine seade · Mudel VHR-250 · Paigaldatud 02.2026</p>
<h2>Režiimid</h2><table><tr><th>1</th><td>Eemal — minimaalne õhuvahetus, pikem eemalolek</td></tr><tr><th>2</th><td>Tavaline — igapäevane režiim</td></tr><tr><th>3</th><td>Tugev — köök, külalised, pesu kuivatamine (max 2 h)</td></tr></table>
<h2>Filtrid</h2><p>Sissepuhe F7, väljatõmme M5. Vahetus iga 6 kuu tagant või kui märgutuli põleb. Varufiltrid: 2 komplekti panipaigas. Vahetuse saab tellida portaalist arendaja järelteeninduselt (Ventilatsiooni ja kütte seadistus).</p>
<h2>Suvi / talv</h2><p>Suvel automaatne möödaviik jahedatel öödel. Talvel sulatusrežiim käivitub ise — seadme hääl võib ajutiselt muutuda, see on normaalne.</p>
<h2>Kui midagi on valesti</h2><ul><li>Punane tuli — filtrid vahetada</li><li>Vilkuv tuli — võtta ühendust järelteenindusega (garantii)</li><li>Kondensaat vannitoa laes — kontrollida, et äravooluvoolik ei ole kinni</li></ul>'''),
'kook': ('Köögimööbli ja -tehnika garantii · Aunman', '''<h1>Köögi garantiikaart</h1><p class="sub">Aunman (Baltest Mööbel OÜ) · Tellimus KL-8-14 · Paigaldatud 06.03.2026</p>
<div class="box"><span class="big">5 a</span> mööbel ja furnituur &nbsp;·&nbsp; <span class="big">2 a</span> tehnika</div>
<h2>Tehnika</h2><table><tr><th>Seade</th><th>Mudel</th><th>Seerianumber</th></tr><tr><td>Induktsioonplaat</td><td>Bosch PXE651FC1E</td><td>FD0402 118834</td></tr><tr><td>Ahi</td><td>Bosch HBG7341B1</td><td>FD0402 220913</td></tr><tr><td>Külmik-sügavkülmik</td><td>Bosch KIN86VFE0</td><td>FD0401 007741</td></tr><tr><td>Nõudepesumasin</td><td>Bosch SMV4HVX00E</td><td>FD0403 551206</td></tr><tr><td>Õhupuhasti</td><td>Falmec Move 60</td><td>MV60-2026-0718</td></tr></table>
<h2>Garantiijuhtum</h2><p>Köögimööbli ja -tehnika garantiijuhtumid lahendab otse Aunman: garantii@aunman.ee, +372 600 8800. Kaasa võtta see kaart ja seerianumber.</p>'''),
'energia': ('Energiamärgis · klass A · kehtib kuni 2036', '''<h1>Energiamärgis</h1><p class="sub">Iili 8, Kodulahe, Tallinn · Korterelamu · Väljastatud 20.01.2026 · Kehtib 10 aastat</p>
<div class="box"><span class="big">A</span> &nbsp; Energiatõhususarv 98 kWh/(m²·a) · Liginullenergiahoone</div>
<h2>Hoone</h2><table><tr><th>Köetav pind</th><td>4 812 m²</td></tr><tr><th>Küte</th><td>Kaugküte, vesipõrandaküte</td></tr><tr><th>Ventilatsioon</th><td>Korteripõhine soojustagastusega</td></tr><tr><th>Taastuvenergia</th><td>Päikesepaneelid katusel 42 kWp (üldelekter)</td></tr></table>
<h2>Väljastaja</h2><p>Energiaaudiitor OÜ, litsents EA-0412. Märgis on registreeritud ehitisregistris.</p>'''),
'ky': ('Korteriühistu põhikiri ja kodukord', '''<h1>Kodukord</h1><p class="sub">Iili 8 korteriühistu · Kinnitatud üldkoosolekul 05.05.2026 · Põhikiri lisas</p>
<h2>Elamine</h2><ul><li>Vaikne aeg 23:00–07:00, nädalavahetusel 23:00–09:00</li><li>Remonditööd tööpäeviti 09:00–19:00, laupäeval 10:00–17:00</li><li>Rõdul grillimine ainult elektrigrilliga; rõdule ei kinnitata midagi fassaadi külge</li></ul>
<h2>Maja</h2><ul><li>Prügimaja sisehoovis, kood 2580 — sorteerimine: pakend, paber, bio, olme</li><li>Rattaparkla –1 korrusel, pult sama mis välisuksel</li><li>Panipaigad kelder B, koridoris asju ei hoita</li></ul>
<h2>Haldus</h2><p>Haldur Kodulahe Haldus OÜ, tööpäeviti 9–17. Avarii 24h: +372 600 0000. Ühistu juhatus: juhatus@iili8.ee.</p>'''),
'haldur': ('Maja haldur ja avariinumber', '''<h1>Haldur ja kontaktid</h1><p class="sub">Iili 8, Kodulahe · Kehtib alates 01.04.2026</p>
<div class="box"><span class="big">+372 600 0000</span><br>Avarii 24h — leke, elektririke, lift, välisuks</div>
<h2>Igapäevane</h2><table><tr><th>Haldur</th><td>Kodulahe Haldus OÜ · Mart Mets · +372 5555 1234 · haldur@kodulahehaldus.ee · E–R 9–17</td></tr><tr><th>Tehnik / remondimees</th><td>Kodulahe Haldus OÜ tehnik — tellitav portaalist (Teenused → Remondimees)</td></tr><tr><th>Koristus üldpindadel</th><td>E ja N hommikul</td></tr><tr><th>Garantii (korter)</th><td>Arco Vara järelteenindus — portaalist (Teenused → Garantii ja maja)</td></tr></table>
<h2>Kes mida</h2><ul><li>Korteri sees garantiiajal → Arco Vara järelteenindus</li><li>Üldpinnad, lift, välisuksed, parkla → haldur</li><li>Vesi, elekter, küte majas → avarii 24h</li></ul>'''),
'parkimine': ('Parkimiskoht P-23 ja panipaik K-14', '''<h1>Parkimiskoht ja panipaik</h1><p class="sub">Iili 8-14 · Kuuluvad korteriomandi juurde</p>
<table><tr><th>Parkimiskoht</th><td>P-23, –1 korrus, sissesõit Iili tänavalt, pult 2 tk</td></tr><tr><th>Panipaik</th><td>K-14, kelder B, 3,2 m², võti 2 tk</td></tr><tr><th>Elektriauto laadimine</th><td>Valmidus P-23 juures (kaabel paigas), laadija tellitav halduri kaudu</td></tr><tr><th>Puldi vahetus</th><td>Halduri kaudu, 45 €</td></tr></table>
<h2>Kord</h2><ul><li>Parklas ei hoita esemeid; rehvid panipaigas</li><li>Külaliste parkimine Iili tänaval, 2 h tasuta</li></ul>'''),
}

def main():
    if not os.path.exists(CHROME):
        sys.exit('Google Chrome not found at ' + CHROME)
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='arco-docs-')
    procs = []
    for key, (meta, body) in DOCS.items():
        html = os.path.join(tmp, key + '.html')
        with open(html, 'w') as f:
            f.write(HEAD.replace('__META__', meta).replace('__BODY__', body))
        prof = os.path.join(tmp, 'profile-' + key)
        pdf = os.path.join(OUT, key + '.pdf')
        procs.append(subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--user-data-dir=' + prof,
                                       '--no-pdf-header-footer', '--print-to-pdf=' + pdf, 'file://' + html],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    for p in procs:
        try: p.wait(timeout=60)
        except subprocess.TimeoutExpired: p.kill()
    shutil.rmtree(tmp, ignore_errors=True)
    for key in DOCS:
        pdf = os.path.join(OUT, key + '.pdf')
        print(f'{key:10s} {os.path.getsize(pdf) if os.path.exists(pdf) else 0:>8} B')

if __name__ == '__main__':
    main()
