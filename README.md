# Life

A personal dashboard for habits, training, money and life admin. React + Supabase, hosted on Vercel.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key (Supabase dashboard, Project Settings, API).
3. `npm run dev` and open http://localhost:5173

The app runs without Supabase keys; it shows a notice until they're added.

## Deploy

Import the repo in Vercel, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables, and deploy. Vercel detects Vite automatically.

See `CLAUDE.md` for the build plan and conventions.
