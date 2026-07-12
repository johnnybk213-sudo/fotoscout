# FotoScout — Manifest

## Vision

FotoScout er Johnnys personlige foto-app: en mobile-first PWA der hjælper med at finde fotomotiver hvor han nu er. Indtast (eller GPS-detektér) en by/lokation et sted i Danmark, og få et overblik over lokale landmarks (fra OSM) suppleret med inspirations-billeder (Flickr + valgfri Google Billeder-link). Målet er at reducere tid brugt på at lede efter motiver i marken og i stedet bruge mere tid bag kameraet.

FotoScout afløser det gamle `shotspot`-projekt (nu arkiveret i `projects/_archived/shotspot`). Forskellen: shotspot var WP-plugin / desktop-first / Danmark-MVP; FotoScout er standalone PWA / mobile-first / Danmark-bredt.

## Rolle

Claude er **vedligeholder og feature-researcher** for FotoScout.

- **Claude:** kode-ændringer på request, feature-forslag på basis af research, polish og bugfix, dokumentation.
- **Johnny:** retning og scope, faktisk brug i marken, beslutninger om hvilke features der skal med, godkendelse af research-forslag før implementering.

Bemærk: FotoScout er **ikke et autonomt cron-drevet projekt** som vestkysten/invest/investor. Det er en personlig app der udvikles ad-hoc når Johnny beder om det. Eneste planlagte job er det ugentlige app-research-script (se "Cron").

## Mål og kriterier

**Kerne-funktionalitet (i.e. allerede på plads):**
1. Vælg en hvilken som helst dansk by (manuelt eller via GPS)
2. Vis landmarks i området fra OSM (Overpass)
3. Vis inspirations-billeder fra Flickr (geotag-søgning)
4. Link til Google Billeder for hvert landmark (genbrugt fane via navngivet target)
5. PWA-installerbar, dark theme, mobile-first, Service Worker med versioneret cache
6. Android tilbage-knap håndteret korrekt

**Vi leder efter (i features-research):**
- Funktioner der gør appen bedre i marken (offline-cache, GPS-præcision, foto-tider, lys-forhold, vejr-integration)
- Inspiration fra konkurrerende foto-apps (PhotoPills, PlanIt Pro, Sun Surveyor, Hipstamatic, Shotpro, Light Trac, m.fl.)
- Lavt-friktion features med høj værdi i hverdagen

**Vi leder IKKE efter:**
- Sociale features (deling, kommentarer, profiler)
- Komplekse editor-funktioner (det har dedikerede apps)
- Monetisering / abonnementer (personligt værktøj)

## Deliverables

| Fil/artefakt | Formål |
|---|---|
| `MANIFEST.md` | Dette dokument |
| `index.html` | Hoved-app (alt-i-én PWA) |
| `admin.html` | Admin/data-håndtering |
| `manifest.json` | PWA-manifest |
| `sw.js` | Service Worker (versioneret cache) |
| `extension/` | Browser-extension (companion) |
| `photos/` | Lokalt cachede billeder |
| `config/vestkyst-byer.json` | Lokal by-database (kun startsæt, udvides ad-hoc) |
| `data.json` | App-data |
| `.claude/CLAUDE.md` | Instruktioner til Claude (definerer `research`-prompt) |
| `research/YYYY-MM-DD.md` | Research-rapporter fra `claude -p "research"` |
| `research/INDEX.md` | Liste over undersøgte apps + features-overblik |
| `logs/` | Manuelle udviklings-noter |

## Fase

**Polish & features (aktiv).**

Kerne-funktionaliteten er på plads. Fokus er nu løbende polish, bug-fixes og udvælgelse af nye features baseret på (a) faktisk brug i marken og (b) app_research-output. Ingen klassiske fase-overgange — appen er et personligt værktøj der udvikles iterativt.

## Cron

Et eneste planlagt job:

- **`claude -p "research"`** — hver 2. uge (mandage kl. 11:00, ulige ISO-uger). Undersøger 1-2 lignende foto-apps, sammenligner features mod FotoScout, foreslår potentielle additions. Output til `research/YYYY-MM-DD.md`. Letvægts-variant af vestkysten site-explorer.

Ingen daily-jobs.

## Rammer

- **Stack:** Vanilla HTML/JS, ingen build-step. Service Worker for offline + cache. Holde det enkelt.
- **Privacy:** Personlig app — ingen analytics, ingen telemetri, ingen brugerdata sendes nogensteds.
- **API-nøgler:** Flickr API-nøgle (i `data.json` eller config — IKKE i git hvis hemmelig). Google Billeder bruges via simpel søge-URL, ingen API-nøgle nødvendig.
- **Performance:** App skal være brugbar offline (allerede besøgte byer) og hurtig på 4G.
- **Mobile-first:** Layout, touch-targets og navigation prioriterer telefon-brug. Desktop er sekundær.

## Succeskriterier

- Johnny bruger appen i marken uden friktion.
- Nye features foreslås kvalificeret (research-baseret), ikke spekulativt.
- Eksisterende kerne forbliver stabil — polish må ikke regressere PWA-install eller offline-mode.
