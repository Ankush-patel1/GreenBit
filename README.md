# 🌿 GreenBit — Climate Intelligence Platform

GreenBit is a full-stack sustainability platform that helps individuals track their carbon footprint, simulate lifestyle changes, get AI coaching, and compete on a green leaderboard.

---

## ✨ Features

- **Carbon Calculator** — Compute your daily, monthly, and yearly CO₂ footprint
- **Activity Tracker** — Log and monitor sustainability habits
- **AI Coach** — Gemini-powered conversational sustainability coach
- **Simulator** — Model the impact of lifestyle changes on your emissions
- **Analytics** — Visualize emission trends with ML-powered predictions
- **Goals** — Set and track personal sustainability targets
- **RAG Library** — Ask questions answered from a curated knowledge base
- **Gamification** — Earn points, badges, and climb the leaderboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | FastAPI, Uvicorn, Python 3.10 |
| Database | PostgreSQL (via Supabase) |
| Auth | JWT (HS256) + Firebase Auth |
| AI | Google Gemini API, LangChain, FAISS |
| ML | scikit-learn (Linear Regression forecasting) |
| Deploy (Frontend) | Firebase Hosting |
| Deploy (Backend) | Railway |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+

### Frontend Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Start dev server (http://localhost:5173)
npm run dev
```

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in values
cp .env.example .env

# Start backend server (http://localhost:8000)
uvicorn main:app --reload
```

> Visit `http://localhost:8000/api/docs` for the interactive Swagger UI.

---

## ⚙️ Environment Variables

### Frontend (`.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | URL of the running backend (e.g. `http://localhost:8000`) |
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics measurement ID |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret — use a strong random value |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler URL) |
| `DIRECT_URL` | PostgreSQL direct connection URL (Supabase) |
| `GEMINI_API_KEY` | Google Gemini API key for AI coach + RAG |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |

See [`backend/.env.example`](./backend/.env.example) and [`.env.example`](./.env.example) for templates.

---

## 🗄️ Database Setup

SQL schema files are provided for both Supabase and GCP Cloud SQL:

- [`backend/supabase_schema.sql`](./backend/supabase_schema.sql) — For Supabase PostgreSQL
- [`backend/gcp_postgres_schema.sql`](./backend/gcp_postgres_schema.sql) — For GCP Cloud SQL

Run the appropriate schema against your PostgreSQL instance before starting the backend.

---

## 🚂 Backend Deployment (Railway)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Select your repository, set **Root Directory** to `backend`
4. Railway auto-detects the `Dockerfile` and `railway.toml`
5. Add the following environment variables in the Railway dashboard:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `CORS_ORIGINS` (set to your deployed frontend URL)
6. Deploy — your API will be live at the Railway-provided URL

> After deploying, update `VITE_API_BASE_URL` in your frontend `.env` to the Railway URL.

---

## 🌐 Frontend Deployment (Firebase Hosting)

```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy
```

---

## 📁 Project Structure

```
GreenBit/
├── backend/                # FastAPI backend
│   ├── main.py             # All API routes and business logic
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Container build config
│   ├── railway.toml        # Railway deployment config
│   ├── supabase_schema.sql # DB schema for Supabase
│   ├── gcp_postgres_schema.sql  # DB schema for GCP
│   ├── test_main.py        # API tests
│   ├── .env.example        # Backend env template
│   └── .env                # ← NOT committed (secrets)
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Feature pages
│   ├── config/             # API config
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── constants/          # App constants
├── public/                 # Static assets
├── .env.example            # Frontend env template
├── .env                    # ← NOT committed (secrets)
├── firebase.json           # Firebase Hosting config
└── package.json
```

---

## 🧪 Running Tests

```bash
cd backend
venv\Scripts\activate
pytest test_main.py -v
```

---

## 📄 License

MIT
