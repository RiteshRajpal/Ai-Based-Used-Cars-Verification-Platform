# 🚗 CarTrust AI — Complete Setup Guide

## Project Structure
```
cartrust/
├── index.html       ← Full frontend (works standalone, auto-connects to backend)
├── server.js        ← Node.js + Express backend
├── schema.sql       ← Supabase database schema + seed data
├── package.json     ← Dependencies
├── .env.example     ← Environment variables template
└── README.md        ← This file
```

---

## ⚡ STEP 1 — Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) → open your project
2. Resume the project if paused (Project Settings → Resume)
3. Go to **SQL Editor**
4. Paste the entire contents of `schema.sql` and click **Run**
5. This creates all tables and seeds mock RTO vehicle data

---

## ⚡ STEP 2 — Get Your Supabase Keys

1. Go to your Supabase project → **Settings → API**
2. Copy:
   - **Project URL** → e.g. `https://wnkohirmijitrucubcyc.supabase.co`
   - **anon / public key** → starts with `eyJ...`

---

## ⚡ STEP 3 — Configure Backend

```bash
# Copy the env template
cp .env.example .env

# Edit .env and fill in your values:
SUPABASE_URL=https://wnkohirmijitrucubcyc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
```

---

## ⚡ STEP 4 — Run the Backend

```bash
# Install dependencies
npm install

# Run (dev mode with auto-restart)
npm run dev

# OR production
npm start
```

Backend starts at: **http://localhost:3001**

---

## ⚡ STEP 5 — Open the Frontend

Simply open `index.html` in your browser.

The frontend will:
- ✅ Auto-detect if backend is online (green dot in nav)
- ✅ Use real backend when available
- 🔄 Fall back to demo mode when backend is offline

---

## 🧪 Test Plate Numbers (Pre-seeded in Database)

| Plate | Car | Expected Score | Notes |
|-------|-----|---------------|-------|
| `MH12AB1234` | Honda City 2021 | ~88 (Safe) | 1 owner, minor claim |
| `DL8CAB5678` | Maruti Swift 2019 | ~74 (Moderate) | 2 owners |
| `KA01MN9012` | Toyota Innova 2020 | ~91 (Safe) | Clean |
| `TN09XX3456` | Hyundai i20 2018 | ~52 (Risky) | Accident, expired docs, loan |
| `MH14ZZ7890` | Ford EcoSport 2019 | ~69 (Moderate) | 2 owners |
| `GJ01XX2233` | Tata Nexon 2022 | ~90 (Safe) | 1 owner, warranty |
| `MH01BJ9988` | BMW 3 Series 2020 | ~85 (Safe) | Luxury |
| `UP16CK4455` | Maruti Baleno 2021 | ~88 (Safe) | Clean |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/rto/:plate` | RTO database lookup |
| GET | `/api/history/:plate` | Car history events |
| POST | `/api/analyze-car` | **Full verification** (main endpoint) |
| POST | `/api/predict-price` | Price estimation only |
| POST | `/api/predict-maintenance` | Maintenance forecast only |
| GET | `/api/verifications?session_id=xxx` | Get user's history |
| GET | `/api/verifications/:id` | Get single verification |

### POST /api/analyze-car — Request Body
```json
{
  "plate_number": "MH12AB1234",
  "make": "Honda",
  "model": "City",
  "year": 2021,
  "mileage_km": 38500,
  "fuel_type": "Petrol",
  "transmission": "Automatic",
  "asking_price": 720000,
  "condition": "good",
  "city": "Mumbai",
  "session_id": "sess_abc123"
}
```

---

## 🏗️ Architecture

```
Browser (index.html)
    │
    ▼
Express Backend (server.js :3001)
    ├── RTO Lookup ──────────────────► Supabase: rto_vehicles table
    ├── History Events ──────────────► Supabase: car_history_events
    ├── Price ML (rule-based) ───────► In-memory computation
    ├── Maintenance Predictor ───────► In-memory computation
    ├── Trust Score Engine ──────────► In-memory computation
    └── Save Result ─────────────────► Supabase: car_verifications
```

---

## 🔧 Hackathon Tips

- The **demo mode** works fully offline — great for presentation if WiFi fails
- All 8 mock cars are pre-seeded with realistic history events
- Trust Score is computed from: History (45%) + Condition (30%) + Price fairness (25%)
- To add real RTO API: replace the Supabase lookup in `/api/rto/:plate` with a real API call (VAHAN, CarInfo, etc.)
- To add image AI: add a `/api/analyze-image` endpoint using TensorFlow.js or a Python Flask microservice
