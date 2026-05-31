# SummerFits Webwinkel

Een professionele kledingwebshop gebouwd met Node.js + React.

## Snel starten

```bash
# Backend
npm install
cp .env.example .env
npm run migrate    # database aanmaken
npm run seed       # voorbeeldproducten + admin account
npm run dev        # start op poort 4000

# Frontend (tweede terminal)
cd client
npm install
npm run dev        # start op poort 5174
```

## Admin inloggen
- E-mail: admin@summerfits.nl
- Wachtwoord: admin123

## Pagina's
- `/`        — Homepage
- `/shop`    — Alle producten
- `/cart`    — Winkelwagen
- `/checkout`— Bestellen
- `/account` — Mijn account
- `/admin`   — Admin panel
