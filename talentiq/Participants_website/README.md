This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase responses table

The check-in form stores the submission time as `responses.checkin_time` (a `timestamptz` value in UTC). Use `responses.checkin_time_central` in the Supabase table editor to see Central Time formatted as `8:41 am` or `8:41 pm`, without seconds. This generated display column automatically converts existing and new check-ins using `America/Chicago`, including daylight saving time. Apply the SQL files in `supabase/migrations` in filename order in the Supabase SQL Editor, or set `DATABASE_URL` to your Supabase Postgres connection string and run `node alter_db.js`. The check-in time migration fills existing responses from `created_at` and gives new rows a database default.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Resume metadata includes the validated Central Time string in `checkin_time` and the original instant in `checkin_time_utc`. The candidate time migration also normalizes `candidates.checkin_time` before inserts and updates, converting timezone-qualified ISO timestamps to Central Time and enforcing `h:mm am/pm` without seconds. The candidate website should display that text directly.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
