# SeasonFits — Fight Gear Platform

Webshop + merchandise-platform voor vechtsportscholen, gebouwd met Node.js + React.
Elke aangesloten school krijgt een eigen wit-label clubshop, verdient commissie over
elke verkoop en volgt alles realtime in een eigen dashboard.

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

Bestaande database? Geen probleem — nieuwe tabellen en kolommen worden bij het
starten van de server automatisch toegevoegd (`ensureSchema`).

## Inloggen

| Rol            | E-mail               | Wachtwoord | Gaat naar    |
|----------------|----------------------|------------|--------------|
| Platform-admin | admin@seasonfits.nl  | admin123   | `/admin`     |
| School (demo)  | beheer@mhgym.nl      | school123  | `/dashboard` |

## Betalingen (Mollie)

- **Zonder sleutel** (standaard): mock-modus. De checkout werkt volledig, maar de
  betaalpagina is een simulatie (`/betalen/mock/...`) waar je "Betalen" of
  "Annuleren" kiest. Ideaal voor lokaal testen.
- **Met sleutel**: vul `MOLLIE_API_KEY=test_...` (of `live_...`) in `.env`. De
  checkout stuurt klanten dan naar de echte Mollie-omgeving (iDEAL etc.).
- **Webhooks**: vul `BASE_URL` in met je publieke API-URL zodra de site live
  staat (Mollie weigert localhost). Lokaal wordt de status ook zonder webhook
  gesynct via de retourpagina.

## Het platform

- `/scholen` — overzicht van aangesloten scholen
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

## Overige pagina's
- `/` homepage · `/shop` alle producten · `/cart` winkelwagen ·
  `/checkout` bestellen (met kortingscode) · `/account` mijn account ·
  `/bestelling/:id/status` betaalstatus
