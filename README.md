# FightMarketing — Fight Gear Platform

**fightmarketing.nl** — hét overkoepelende merchandise-platform voor vechtsportscholen
in Nederland. Elke aangesloten school krijgt een eigen clubshop in de eigen clubkleuren,
verdient commissie over elke verkoop en volgt alles realtime in een eigen dashboard.
Vechters verdienen mee via persoonlijke kortingscodes.

Gebouwd met Node.js/Express (API) + React/Vite (client) + SQLite (libsql).

## Snel starten

```bash
# Backend
npm install
cp .env.example .env
npm run migrate         # database aanmaken (eenmalig)
npm run seed            # voorbeeldproducten + admin account
npm run seed:platform   # demo-scholen, drop, clubgear en kortingscodes
npm run dev             # start op poort 4000

# Frontend (tweede terminal)
cd client
npm install
npm run dev             # start op poort 5174
```

Bestaande database? Geen probleem — nieuwe tabellen, kolommen en indexes worden bij
het starten van de server automatisch toegevoegd (`ensureSchema`).

## Inloggen

| Rol            | E-mail                  | Wachtwoord | Gaat naar    |
|----------------|-------------------------|------------|--------------|
| Platform-admin | admin@fightmarketing.nl | admin123   | `/admin`     |
| School (demo)  | beheer@mhgym.nl         | school123  | `/dashboard` |

> Bestond je database al vóór de rebrand? Dan heet het oude admin-account nog
> `admin@summerfits.nl` of `admin@seasonfits.nl` — bestaande accounts worden
> bewust niet aangepast. `npm run seed` voegt het nieuwe admin-account toe.

## .env-variabelen

| Variabele        | Verplicht | Uitleg |
|------------------|-----------|--------|
| `PORT`           | nee       | API-poort (standaard 4000) |
| `JWT_SECRET`     | **ja**    | Geheime sleutel voor login-tokens — kies iets langs en willekeurigs |
| `DATABASE_URL`   | nee       | SQLite-bestand. Historische naam `seasonfits.db` is bewust behouden zodat bestaande data blijft werken |
| `APP_URL`        | productie | Publieke site-URL (`https://fightmarketing.nl`) — gebruikt voor Mollie-redirects |
| `BASE_URL`       | productie | Publieke API-URL voor Mollie-webhooks (Mollie weigert localhost) |
| `MOLLIE_API_KEY` | nee       | Leeg = mock-modus; `test_...` of `live_...` = echte Mollie/iDEAL |
| `SMTP_*`         | nee       | E-mailinstellingen (nog niet in gebruik) |

## Betalingen (Mollie)

- **Zonder sleutel** (standaard): mock-modus. De checkout werkt volledig, maar de
  betaalpagina is een simulatie (`/betalen/mock/...`) waar je "Betalen" of
  "Annuleren" kiest. Ideaal voor lokaal testen.
- **Met sleutel**: vul `MOLLIE_API_KEY=test_...` (of `live_...`) in `.env`. De
  checkout stuurt klanten dan naar de echte Mollie-omgeving (iDEAL etc.).
- **Webhooks**: vul `BASE_URL` in met je publieke API-URL zodra de site live
  staat. Lokaal wordt de status ook zonder webhook gesynct via de retourpagina.
  Webhook-verificatie: de webhook ontvangt alleen een betaal-ID; de status wordt
  altijd rechtstreeks bij Mollie opgehaald (aanbevolen Mollie-praktijk).

## Deploy naar fightmarketing.nl (Railway, één service)

De server serveert in productie ook de client-build (`client/dist`) met
SPA-fallback — één service is genoeg. `nixpacks.toml` regelt de build en
draait bij elke start eerst `migrate` (idempotent).

1. **Volume**: mount een Railway-volume op `/data` (database + uploads).
2. **Variabelen** op de service:
   | Variabele        | Waarde |
   |------------------|--------|
   | `JWT_SECRET`     | lange willekeurige string |
   | `DATABASE_URL`   | `file:/data/fightmarketing.db` |
   | `UPLOADS_DIR`    | `/data/uploads` |
   | `APP_URL`        | `https://fightmarketing.nl` |
   | `BASE_URL`       | `https://fightmarketing.nl` (zelfde service = zelfde URL) |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | eerste admin-login op de verse database |
   | `MOLLIE_API_KEY` | `test_...` of `live_...` (leeg = mock-betalingen!) |
   | `SMTP_*`         | mailserver-gegevens (leeg = mails alleen in de log) |
3. **Domein**: voeg in Railway → Settings → Networking het custom domain
   `fightmarketing.nl` toe en zet bij je registrar een CNAME naar de getoonde
   Railway-host. Werkt de site direct via het gegenereerde `*.up.railway.app`
   domein? Zet `APP_URL`/`BASE_URL` dan tijdelijk op dat adres.
4. `robots.txt` en `sitemap.xml` staan in `client/public/` en wijzen al naar
   fightmarketing.nl.

## Het platform

- `/scholen` — overzicht van aangesloten scholen + aansluit-CTA
- `/s/:slug` — clubshop per school (eigen kleuren, logo, drop-countdown)
- `/dashboard` — school-dashboard: omzet, commissie, best verkocht, codes van
  vechters aanmaken (klantgegevens blijven afgeschermd i.v.m. AVG)
- `/admin` — platformbeheer: producten (koppelbaar aan school + drop), scholen
  (incl. school-logins), drops (met productielijst per maat voor de drukpers),
  kortingscodes en bestellingen

### Hoe het geld stroomt
1. Klant bestelt in een clubshop, evt. met kortingscode van een vechter.
2. Commissies worden bij de order berekend over de goederenwaarde ex btw:
   school-% (instelbaar per school) en vechter-% (instelbaar per code).
3. Pas na betaling telt de order mee; bij mislukte betaling gaat de voorraad
   automatisch terug.

## Rebrand-notities (SeasonFits → FightMarketing)

Bewust **niet** hernoemd om data/sessies niet te breken:
- `seasonfits.db` — bestandsnaam van de live database
- `sf_token` / `sf_school` / `sf_school_name` — localStorage-keys (hernoemen
  logt alle gebruikers uit)
- Bestaande accounts en DB-inhoud (zoals `admin@seasonfits.nl` op oude installaties)

## Overige pagina's
- `/` homepage · `/shop` alle producten · `/cart` winkelwagen ·
  `/checkout` bestellen (met kortingscode) · `/account` mijn account ·
  `/bestelling/:id/status` betaalstatus
