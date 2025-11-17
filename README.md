# Junapedia (Pluxee Junaeb Guide)

Interactive guide to franchises and locales that accept the Pluxee Junaeb benefit. Built with React, Vite, Tailwind, and Supabase.

## Features
- Browse consolidated franchise groups and individual locales
- Open addresses directly in Google Maps
- Open official (or fallback search) websites for franchises
- Supabase-backed store data fetch (client-only anon key)
- Tailwind v3 styling, ready for v0 / shadcn-style component generation

## Tech Stack
- React 18 + Vite
- Tailwind CSS v3 (+ `tailwindcss-animate`)
- Supabase JS client (anon key only)
- Lucide React icons
- UI primitives scaffold (`components/ui/`) ready for v0.dev generated components

## Prerequisites
- Node.js 18+
- A Supabase project with a `pluxee_stores` table matching expected fields (`id`, `canonical_name`, `addresses` array, `category`, etc.)

## Environment Variables
Create (or edit) an `.env.local` file in the project root:
```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
Restart `npm run dev` after changes.

## Development
```bash
npm install
npm run dev
```
Open http://localhost:3000

## GitHub Setup (Quick)
```bash
git init
git add .
git commit -m "feat: initial Junapedia project"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Adding v0 Components
Paste generated components into `components/ui/`. Ensure any new Radix packages (`@radix-ui/react-dialog`, etc.) are installed:
```bash
npm install @radix-ui/react-dialog
```

## License
Add a license section here if you plan to open source.

## Notes
- Do NOT commit service role keys. Only the anon key belongs in client env vars.
- Fallback website links perform Google searches when official domains are unknown.
