# Fall Fest Ticket Tracker

Real-time ticket counter for school Fall Fest booths. Each booth volunteer opens the app on their phone or tablet and taps + as tickets come in. Counts sync live across all devices.

## Features

- 24 booths across grades K–5 (4 classes per grade)
- Live sync via Vercel KV — all devices update every 2 seconds
- Organizer view with totals by grade and a full booth table
- Works on any phone or tablet browser, no install needed

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv) for real-time shared state
- TypeScript

## Getting Started

### Prerequisites

- Node.js 20+
- A Vercel account with a KV database created and linked to this project

### Local Development

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/YOUR_USERNAME/fall-fest.git
   cd fall-fest
   npm install
   ```

2. Pull your Vercel environment variables:

   ```bash
   vercel env pull .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Deploy

```bash
vercel --prod
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | Returns all booth counts |
| POST | `/api/tickets` | Updates one booth count. Body: `{ boothId: "K-A", count: 5 }` |

## Booth IDs

Booths are identified as `{grade}-{class}`, e.g. `K-A`, `3-C`, `5-D`.