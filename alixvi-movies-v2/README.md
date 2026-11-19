# ALIXVI MOVIES V2

A separate Next.js starter for ALIXVI MOVIES. This project is independent of ALIXVI AI Video Studio.

## Included
- Responsive cinematic home and catalogue
- English / Kinyarwanda titles and descriptions
- Movie, series and documentary filters
- Search and genre filtering
- Detail pages with authorized external watch/download links
- Supabase integration using the existing public.movies table
- Admin magic-link sign-in

## Setup
1. Install Node.js 20 or newer.
2. Run npm install.
3. Copy .env.example to .env.local and add the Supabase URL and publishable key.
4. Run npm run dev.

This starter does not modify the database or storage. Only published records are requested. Do not upload copyrighted video unless authorized. Admin content management, episode management and AI assistant are not implemented yet. Preview deployment must be tested before production replacement.
