# BOS

BOS is a Next.js + Supabase web app for **setting goals**, building **structured roadmaps** (milestones + tasks), and connecting with people on similar journeys.

## ✨ What’s inside

- **Roadmaps**: create milestones and tasks, track progress, and optionally make roadmaps public.
- **Notes + editor**: rich-text editing (TipTap), tagging, and internal/external links.
- **Social layer**: profiles, posts, likes, and messaging (Supabase-backed).
- **UI**: Next.js App Router, TailwindCSS, and Radix/Shadcn-style components.

## 🧱 Tech stack

- **Next.js**: App Router (`next@15`)
- **React**: `react@19`
- **TypeScript**
- **Supabase**: Auth + Postgres + Storage
- **TailwindCSS** + Radix UI components

## ✅ Getting started (local dev)

1) Install dependencies:

```bash
npm install
```

2) Create your env file:

```bash
cp .env.example .env.local
```

3) Fill in the values in `.env.local` (see **Environment variables** below).

4) Run the dev server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## 🔐 Environment variables

This app expects a Supabase project. You’ll need:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (only needed for admin scripts / server-side admin operations):

- `SUPABASE_SERVICE_ROLE_KEY`

Optional (controls console noise):

- `NEXT_PUBLIC_ENABLE_LOGS` (set to `true` to enable verbose logs)

## 🗄️ Database

Supabase SQL migrations live under `supabase/migrations/`.

There’s also a historical schema scratchpad in `supabase-db.md` (not authoritative, but useful context).

## 🧪 Scripts

- `npm run dev`: start dev server
- `npm run build`: build for production
- `npm run start`: run production server
- `npm run lint`: run linting

## 🚧 Status / scope

This repo is published primarily for transparency and reference. It may contain experiments and unfinished features.

If you want to extract a specific module, open an issue describing what you’re trying to reuse.

## 📄 License

MIT — see `LICENSE`.

