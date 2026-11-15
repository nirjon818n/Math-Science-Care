# MSCare Center

Student management web app for Math-Science-Care: attendance, questions, exams, and results in one place.

## Features

- Student attendance tracking
- Question bank and exam management
- Results publishing
- SMS notifications

## Tech stack

- TypeScript + Vite frontend (see `src/`)
- Supabase backend (see `src/lib/supabase.ts` and `supabase/`)
- Node server (`server.ts`)

## Setup

1. Copy `.env.example` to `.env` and fill in the values (Supabase URL/key, SMS API key, admin password).
2. Install dependencies and run the dev server (see the scripts in `package.json`).

## Security

Secrets are read from environment variables only — never commit real keys or passwords.
