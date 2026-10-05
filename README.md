# Life

A personal dashboard for habits, training, money and life admin. React + Supabase, hosted on Vercel.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon key (Supabase dashboard, Project Settings, API).
3. Create the database tables: in the Supabase dashboard open SQL Editor, paste each file from `supabase/migrations/` in name order, and run it.
4. In Supabase, Authentication, URL Configuration, add `http://localhost:5173` (and your Vercel URL later) to the redirect URLs so sign-in links work.
5. `npm run dev` and open http://localhost:5173

The app runs without Supabase keys; it shows a notice until they're added.

## Deploy (GitHub Pages)

The site is published at https://samkiller222.github.io/Life/ by `.github/workflows/deploy.yml`, which builds the app on every push.

One-time setup:

1. Settings, Pages, Source: choose **GitHub Actions**.
2. Settings, Secrets and variables, Actions: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Supabase, Authentication, URL Configuration, add `https://samkiller222.github.io/Life/` to the redirect URLs.

See `CLAUDE.md` for the build plan and conventions.
