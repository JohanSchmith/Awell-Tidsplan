# Awell Boringregenerering — Tidsplanlægning

App til tidsplanlægning af regenerering af boringer. Bygget som en simpel HTML-app uden dependencies.

## Indhold

```
index.html      ← Hele appen (én fil)
manifest.json   ← PWA-opsætning (kan installeres på telefon/tablet)
icon-512.png    ← App-ikon (kopiér fra jeres andre projekter)
README.md
```

## Deploy på Vercel

1. Gå på [vercel.com](https://vercel.com) → **Add New Project**
2. Vælg dette GitHub-repo
3. Klik **Deploy** — ingen konfiguration nødvendig

Vercel opdager automatisk at det er en statisk app.

## Lokal test

Åbn `index.html` direkte i en browser, eller kør en lokal server:

```bash
npx serve .
```

## PWA — installer på iPad/telefon

Når appen er deployed, kan den installeres som en app:
- **iOS**: Åbn i Safari → Del → "Føj til hjemmeskærm"
- **Android**: Åbn i Chrome → menu → "Installer app"

## Fremtidige udvidelser

Appen gemmer i øjeblikket ikke data mellem sessioner. Næste skridt er at tilkoble Supabase:

- Opret en `boringer`-tabel med kolonner: `id`, `navn`, `tasks` (jsonb), `opdateret_at`
- Tilføj Supabase JS-klienten og erstat `state.boringer` med database-kald
- Tilføj login via Supabase Auth hvis ønsket

## Tilpasning

Standardtidsplanen redigeres i `DEFAULT_TASKS`-arrayet i `index.html`.  
Weekend-dage sættes i `WE`-arrayet (standard: dag 4 og 5).
