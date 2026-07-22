---
project_name: BioCake
client: BioCake
type: Magazin Online Complet
status: "🟡 În lucru (Etapa 6 — post-audit Ziua 1–2)"
date_created: 2026-07-03
date_modified: 2026-07-19
limba: RO
locatie: București, România
telefon: "+40 700 000 000"  # Actualizează în js/config.js + aici când ai numărul real
email: "contact@biocake.ro"
tags:
  - proiect/landing-page
  - proiect/web-app
  - proiect/domeniu/restaurant/cofetarie
  - proiect/status/in-lucru
---
# 🍰 BioCake

## Rezumat Proiect

| Câmp | Detalii |
| :--- | :--- |
| **Tip Proiect** | Magazin Online Complet (Frontend + Backend + Gestiune Stoc) |
| **Client** | BioCake (Dream project pentru mama lui Emi) |
| **Locație** | Livrare exclusivă în București (Fără ridicare personală) |
| **Status** | 🟡 Etapa 6: Netopia (cod gata — de deployat) · telefon real · WebP |
| **Data creare** | 2026-07-03 |
| **Ultima actualizare** | 2026-07-19 |
| **URL live** | https://biocake.ro |

---

## ⚖️ Date Legale Companie

| Câmp                 | Valoare                                                                            |       |
| :------------------- | :--------------------------------------------------------------------------------- | ----- |
| **Denumire**         | BIOCAKE SRL                                                                        |       |
| **CUI**              | 43164490                                                                           |       |
| **Nr. Reg. Com.**    | J40/13150/2020                                                                     |       |
| **EUID**             | ROONRC.J40/13150/2020                                                              |       |
| **Data înființării** | 2020-10-09                                                                         |       |
| **Sediu Social**     | Sos. Colentina 45, Bl. OD45, Sc. 1, Et. 6, Ap. 26, Sector 2, București, Cod 021161 |       |


---

## 🗂️ Fișiere Proiect

- **Plan de Afaceri:** [[Plan de Afaceri]]
- **Arhitectura Sistemului:** [[Arhitectura Sistemului]]
- **Ghid de Implementare:** [[Ghid de Implementare]]
- **Handover Cursor:** [[CURSOR_HANDOVER]]
- **Imagini:** `output/biocake/images/`

---

## 💡 Concept

**BioCake** este visul unei cofetărese cu o viață de experiență, care își dorește propria afacere independentă. În prezent, brandul colaborează cu restaurantul vegan **"Sublimmme"**, preparând deserturile lor vegane și raw-vegane, însă pentru propriul brand **BioCake** se concentrează pe o gamă completă de **prăjituri clasice, tradiționale și moderne**, adaptate tuturor gusturilor, fără a se poziționa ca un brand exclusiv vegan.

Pasul următor este lansarea unui **magazin online premium**, dedicat vânzării directe către consumatorul final din București. Serviciul va funcționa **exclusiv pe bază de livrare**, oferind:
1. **Torturi & Prăjituri standard** (clasice, moderne; categorie **De Post** pentru opțiuni fără produse de origine animală).
2. **Office Boxes** — Cutii cu mini-prăjituri artizanale în 4 mărimi (6 / 12 / 18 / 24 buc), mix asortat sau un singur sortiment. Inspirate de tradiția românească de a aduce dulciuri la birou de ziua ta.
3. **Comenzi Speciale** — Candy bar-uri pentru evenimente, torturi personalizate și pachete aniversare. **Toate comenzile speciale necesită un avans de 50%.**
4. **Filozofie Ingrediente**: **Fără zahăr rafinat** (zahăr alb). În funcție de rețetă se folosesc indulcitori naturali: zahăr brut, zahăr de mesteacăn (xilitol), zahăr de cocos, sirop de agave, sirop de curmale, miere etc. Accent pe caracter **artizanal** și **făcut în casă**. *(Actualizat 22.07.2026 — nu e „fără zahăr”, ci fără zahăr **rafinat**.)*

### Categorii tehnice (slug DB)
`torturi-clasice` · `prajituri` · `office-box` · `de-post`

---

## 🎨 Paletă de Culori & Estetică (Actualizată din Logo)

![[logo.png|300]]

Designul magazinului se bazează pe identitatea logo-ului oficial, completată cu tonuri calde, organice:

| Culoare | Hex | Rol în Design |
| :--- | :--- | :--- |
| 💖 Roz brand | `#FC6D9F` | Accente, badge-uri, soft UI |
| 💗 Roz | `#FC6D9F` | Brand + butoane CTA |
| 💚 Verde Natural | `#37B536` | Ingrediente naturale, badge-uri de calitate |
| 🟤 Ciocolată profundă | `#3D2014` | Text principal, titluri, fundal footer |
| 🍫 Ciocolată medie | `#6B3A2A` | Text secundar, nuanțe de profunzime |
| 🥂 Champagne Gold | `#C9A84C` | Accente premium, elemente decorative |
| 🍦 Vanilie caldă | `#FAF6F1` | Fundal principal al site-ului |
| 🌸 Roz soft | `#FEE8F1` | Fundal carduri, elemente vizuale secundare |

**Font-uri (Design System Actual)**:
- `DM Serif Display` — titluri principale editoriale
- `Cormorant Garamond` — citate, text serif rafinat
- `DM Sans` — corp de text, UI elements

---

## 🚗 Politica de Livrare & Reguli de Plată

* **Timp de preparare**: Comandă cu **minimum 48 de ore înainte** pentru a asigura ingredientele proaspete și timpul de decor.
* **Procesator de Plăți**: **Netopia Payments** (procesator român autorizat).
* **Reguli de Plată**:
  - **Comenzi Directe pe Site**: Clientul poate alege să achite online un **avans de 50%** sau **integral (100%)** prin Netopia Payments. În procesul de comandă se afișează o informare discretă privind opțiunea de avans și notificarea că, deoarece torturile sunt realizate manual, greutatea finală poate înregistra o marjă de eroare de **sub 100 de grame** față de cea comandată (cu regularizare la livrare).
  - **Comenzi Custom (Candy Bar, Torturi Speciale)**: Clientul completează formularul de detalii, se stabilește prețul final cu administratorul (mama), apoi se trimite manual un **link de plată Netopia** pentru achitarea avansului sau a sumei totale.
* **Tarife Livrare București**:
  - Tarif livrare: **20 RON**
  - Livrare **gratuită** la comenzi de peste **250 RON**
* **Tarife Livrare Județul Ilfov**:
  - Tarif livrare: **40 RON**
  - Livrare **gratuită** la comenzi de peste **600 RON**

---

## 📥 Checklist Materiale Lipsă

Pentru a putea dezvolta platforma la potențial maxim, avem nevoie de următoarele materiale:

- [x] **Meniu detaliat**: Listă cu produse, descrieri, ingrediente/alergeni și prețuri (implementat și seed-uit în Supabase).
- [ ] **Fotografii reale**: Poze de rezoluție mare cu preparatele reale (momentan se folosesc imagini placeholder premium).
- [ ] **Telefon real de comenzi**: Numărul real — setează în `js/config.js` (`phoneDisplay`, `phoneTel`, `whatsapp`).
- [ ] **Email real**: Adresa de email dedicată comenzilor (ex: comenzi@biocake.ro).
- [x] **Prețuri finale**: Confirmarea prețurilor orientative pentru Office Boxes (6/12/18/24 buc) - implementat.
- [x] **Logo**: Fișier PNG transparent, salvat local în [[logo.png|images/logo.png]].
- [x] **Date Legale**: BIOCAKE SRL, CUI: 43164490, J40/13150/2020.
- [x] **Detalii Livrare**: Comandă min. 48h în avans. București (20 RON, gratuită >250 RON), Ilfov (40 RON, gratuită >600 RON).
- [x] **Design System**: Etapa 1 finalizată — HTML/CSS/JS complet, premium redesign aplicat.
- [x] **Concept Office Box**: Definit — 6/12/18/24 buc, mix sau sortiment unic, tradiție românească de birou.
- [x] **Panou Admin**: `admin.html` — PWA instalabilă, comenzi realtime, editare/creare/ștergere produse, notificări push la comandă nouă.
- [x] **PWA Admin**: manifest, service worker, iconițe, banner instalare, abonare push (Android + iOS 16.4+ instalat pe ecran).
- [x] **Deployment staging**: GitHub (`EmanuelRado/biocake`, privat) → Netlify cu auto-deploy din `main`.
- [x] **Migrare SQL `max_qty`**: coloana există în DB; legată în `admin.js` (SELECT + UPDATE) ✅ 2026-07-18.
- [x] **Securitate P0**: `is_admin()` pe `admin@biocake.ro` — RLS comenzi/produse/push/storage; CHECK status; grants pe coloane. ✅ 2026-07-18.
- [x] **Domeniu producție**: `https://biocake.ro` pe Netlify DNS (nsone) — live ✅ 2026-07-18.
- [x] **Categorie De Post**: ex-Vegan & Raw → slug `de-post` ✅ 2026-07-19.
- [x] **`piece_grams`**: gramaj per bucată în admin + UI ✅ 2026-07-19.
- [x] **RPC `place_order`**: preț din DB + insert atomic; fără INSERT anon pe tabele ✅ 2026-07-19.
- [x] **Audit pre-lansare Ziua 1–2**: XSS escape, a11y drawer/CTA, pills greutate din produs, selector cutie ✅ 2026-07-19.

---

## 🛠️ Probleme Identificate & Corecții (Bugs)

- [x] **Buton Produs Activ**: Apare ca un checkbox clasic, nu funcționează checkbox-ul stilizat creat de Cursor. *(Notat pe 08.07.2026)* ✅ 2026-07-13
- [x] **Opțiuni Greutate Torturi**: Nu există opțiuni pentru selectarea greutății la torturi (1.2kg, 1.8kg, 2.4kg, etc.). *(Notat pe 08.07.2026)* ✅ 2026-07-13
- [x] **Greutate Aproximativă**: Câmpul apare completat cu `true` pentru torturi (trebuie verificat dacă activează greșit notificarea de marjă de 100g). *(Notat pe 08.07.2026)* ✅ 2026-07-13
- [x] **Catalog nu se încarcă**: `WEIGHT_OPTIONS` duplicat în `data.js` (SyntaxError). ✅ 2026-07-19

---

## 🔮 Idei de Viitor & Optimizări (Backlog)

- [ ] **Conturi Clienți / Autofill**: Analizarea posibilității de creare cont sau implementarea unei funcții de autofill pentru următoarele comenzi (cu scopul colectării datelor de marketing și simplificării checkout-ului). *(Notat pe 10.07.2026)*
- [x] **Aplicație Admin dedicată**: Transformarea panoului de administrare într-o aplicație de sine stătătoare (PWA dedicat / Aplicație Mobilă). *(Notat pe 10.07.2026)* ✅ 2026-07-13
- [x] **Reordonare Imagini**: Reordine în admin (săgeți / drag) — prima imagine = copertă. ✅ 2026-07
- [x] **SEO / OG / fonts non-blocking / mesaj fără zahăr rafinat** — Ziua 3 (parțial) ✅ 2026-07-22
- [x] **Netopia Payments (cod)** — checkout 50%/100%, EF start+IPN, SQL — ✅ 2026-07-22 (deploy: vezi [[NETOPIA]])
- [ ] **Deploy Netopia** — SQL + secrets + functions pe Supabase + test sandbox
- [ ] **Pipeline WebP / resize la upload** — rămâne
- [ ] **Rate-limit comenzi** pe RPC public

