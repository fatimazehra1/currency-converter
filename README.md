# Currency Converter

A full-stack currency converter built with **React (Vite)**, **NestJS** and
**Bootstrap 5**, using live and historical exchange rates from
[FreeCurrencyAPI](https://freecurrencyapi.com).

The React app never talks to FreeCurrencyAPI directly. All requests go through
the NestJS backend, which is the only place the API key exists.

```
Browser (React)  ──►  NestJS API  ──►  FreeCurrencyAPI
                      (holds the secret key)
```

---

## Features

- Dynamic currency list — nothing is hardcoded, the dropdowns are filled from the API
- Convert any amount between the 33 supported currencies
- **Historical rates** — pick any date from 1999-01-01 up to yesterday
- Conversion history saved in `localStorage`, surviving page reloads
- Loading and error states on every request
- Mobile-first responsive Bootstrap UI
- API key kept server-side only

---

## Project structure

```
currency-converter/
├── backend/                    NestJS API
│   ├── .env                    your real API key (git-ignored)
│   ├── .env.example            template, safe to commit
│   └── src/
│       ├── main.ts             bootstrap: /api prefix, CORS, ValidationPipe
│       ├── app.module.ts       root module
│       └── currency/
│           ├── currency.module.ts
│           ├── currency.controller.ts   routes only
│           ├── currency.service.ts      all logic + API calls + cache
│           └── dto/convert-query.dto.ts request validation
├── frontend/                   React + Vite
│   ├── .env                    VITE_API_BASE_URL (git-ignored)
│   ├── .env.example
│   ├── netlify.toml
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/         ConverterForm, CurrencySelect,
│       │                       ConversionResult, HistoryList, ErrorAlert
│       ├── hooks/              useCurrencies, useConversionHistory
│       └── services/currencyApi.js
├── docs/CODE-GUIDE.md          detailed walkthrough of the whole codebase
└── render.yaml                 backend deployment blueprint
```

---

## Running locally

**Requirements:** Node.js 20 or newer.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # then open .env and add your key
npm run start:dev
```

Runs on `http://localhost:3000/api`.

Get a free API key at
[app.freecurrencyapi.com/register](https://app.freecurrencyapi.com/register)
and put it in `backend/.env`:

```
FREECURRENCY_API_KEY=your_key_here
```

The server will refuse to start if this is missing — that is intentional.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs on `http://localhost:5173`.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/currencies` | All supported currencies |
| `GET` | `/api/convert` | Convert an amount |

**`GET /api/convert`**

| Parameter | Required | Description |
|---|---|---|
| `from` | yes | 3-letter currency code, e.g. `USD` |
| `to` | yes | 3-letter currency code, e.g. `INR` |
| `amount` | yes | Positive number, max 1,000,000,000 |
| `date` | no | `YYYY-MM-DD`. Present = historical rate |

```bash
curl "http://localhost:3000/api/convert?from=USD&to=INR&amount=100"
```

```json
{
  "from": "USD",
  "to": "INR",
  "amount": 100,
  "rate": 95.6180147979,
  "convertedAmount": 9561.8,
  "rateDate": "2026-08-18",
  "historical": false
}
```

**Error responses**

| Status | Meaning |
|---|---|
| `400` | Invalid input, unsupported currency, or out-of-range date |
| `500` | Unexpected server error |
| `502` | Provider unreachable, rejected credentials, or returned an invalid response |
| `503` | Provider rate limit / monthly quota reached |
| `504` | Provider request timed out or was too slow (8s timeout) |

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `FREECURRENCY_API_KEY` | **yes** | Your secret key. Server will not start without it. |
| `PORT` | no | Defaults to `3000`. Hosting platforms set this automatically. |
| `CORS_ORIGINS` | no | Comma-separated allowed origins. Defaults to `http://localhost:5173`. |
| `NODE_ENV` | **in production** | Set to `production` when deployed. See below. |

**About CORS and `NODE_ENV`:** in development the backend accepts any
`localhost` / `127.0.0.1` port, because Vite moves to 5174, 5175... whenever
5173 is busy and a hard-coded port produces a confusing CORS failure. When
`NODE_ENV=production`, that convenience is switched off completely and **only**
the origins listed in `CORS_ORIGINS` are allowed. Always set `NODE_ENV=production`
on your host (`render.yaml` does this for you).

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | yes | URL of the backend, e.g. `http://localhost:3000/api` |

> `VITE_*` variables are embedded into the JavaScript bundle at build time and
> are therefore **public**. `VITE_API_BASE_URL` is only the address of our own
> backend, which is not a secret. **Never** put the FreeCurrencyAPI key in a
> `VITE_` variable.

---

## Deployment

### Backend → Render

1. Push the repository to GitHub.
2. In Render: **New → Web Service**, connect the repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Health Check Path:** `/api/health`
4. Add environment variables:
   - `FREECURRENCY_API_KEY` = your key
   - `CORS_ORIGINS` = your Netlify URL (add after step 2 below)
5. Deploy and note the URL, e.g. `https://currency-converter-api.onrender.com`.

Alternatively import `render.yaml` via **New → Blueprint**.

### Frontend → Netlify

1. In Netlify: **Add new site → Import an existing project**, pick the repo.
2. Settings are read from `frontend/netlify.toml` (base `frontend`, build
   `npm run build`, publish `dist`).
3. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com/api`
4. Deploy.

### Finally

Go back to Render and set `CORS_ORIGINS` to your Netlify URL
(e.g. `https://your-app.netlify.app`, no trailing slash), then redeploy the
backend. Without this the browser will block every request.

> **Note:** Render's free tier sleeps after inactivity, so the first request
> after a pause can take ~30 seconds. The app's loading states cover this.

---

## Build commands

```bash
# Frontend production build -> frontend/dist
cd frontend && npm run build

# Backend production build -> backend/dist
cd backend && npm run build && npm run start:prod
```

---

## Security notes

- `backend/.env` is git-ignored and never committed.
- The API key is sent to FreeCurrencyAPI in a request **header**, so it cannot
  leak into URLs or server logs.
- The production frontend bundle contains no key and no reference to
  FreeCurrencyAPI — verified by scanning the built output.
- CORS uses an explicit allowlist rather than `*`.

---

## Learning guide

See [`docs/CODE-GUIDE.md`](docs/CODE-GUIDE.md) for a detailed explanation of
every important file, function and design decision.
