# FotoScout — Manifest-overblik

Hurtigt overblik over projektets rammer. Stabil fil — ændres kun når `MANIFEST.md` ændres. For nuværende status, se evaluate-blokken nedenfor.

## Vision og rolle

- **Personlig foto-app** — mobile-first PWA der hjælper Johnny finde fotomotiver hvor han er
- **Indtastet eller GPS-detekteret by** → overblik over lokale landmarks (OSM) + inspirations-billeder (Flickr) + Google Billeder-link
- **Reducér tid med at lede** — mere tid bag kameraet
- **Afløser `shotspot`** — fra WP-plugin/desktop/Danmark-MVP til standalone PWA/mobil/Danmark-bredt

## Rolle-fordeling

- **Claude:** vedligeholder + feature-researcher — kode-ændringer på request, polish, dokumentation, app-research
- **Johnny:** retning og scope, faktisk brug i marken, beslutter hvilke features der implementeres
- **Ikke et autonomt cron-projekt** — ad-hoc udvikling, ét planlagt job (research)

## Kerne-funktionalitet (allerede på plads)

- Vælg dansk by (manuelt eller GPS)
- Vis landmarks fra OSM (Overpass)
- Vis inspirations-billeder fra Flickr (geotag-søgning)
- Link til Google Billeder per landmark (genbrugt fane via navngivet target)
- PWA-installerbar, dark theme, mobile-first
- Service Worker med versioneret cache
- Android tilbage-knap håndteret

## Hvad vi leder efter i features-research

- Funktioner der gør appen bedre **i marken** — offline-cache, GPS-præcision, foto-tider, lys-forhold, vejr
- Inspiration fra konkurrenter — PhotoPills, PlanIt Pro, Sun Surveyor, Hipstamatic, Shotpro, Light Trac
- Lavt-friktion / høj værdi i hverdagen

## Hvad vi IKKE leder efter

- Sociale features (deling, kommentarer, profiler)
- Komplekse editor-funktioner (dedikerede apps findes)
- Monetisering / abonnementer (personligt værktøj)

## Rammer

- **Stack:** Vanilla HTML/JS, ingen build-step — holdes enkelt
- **Privacy:** Personlig app — ingen analytics, telemetri, brugerdata
- **Performance:** Brugbar offline (besøgte byer), hurtig på 4G
- **Mobile-first:** Layout, touch-targets, navigation prioriterer telefon
- **Cron:** kun `claude -p "research"` hver 2. uge (mandage 11:00, ulige ISO-uger)

## Succeskriterier

- Johnny bruger appen i marken **uden friktion**
- Nye features foreslås **kvalificeret** (research-baseret), ikke spekulativt
- Eksisterende kerne forbliver stabil — polish må ikke regressere PWA-install eller offline

## Nøglefiler

- `MANIFEST.md` — fuld vision og rammer
- `index.html` — hoved-app (alt-i-én PWA)
- `admin.html` — admin/data-håndtering
- `manifest.json` — PWA-manifest
- `sw.js` — Service Worker (versioneret cache)
- `extension/` — browser-extension companion
- `config/vestkyst-byer.json` — lokal by-database
- `data.json` — app-data
- `research/YYYY-MM-DD.md` — research-rapporter fra `research`-prompt
- `research/INDEX.md` — overblik over undersøgte apps + features
- `photos/` — lokalt cachede billeder
