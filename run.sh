#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt uvicorn
npm install
echo "Make sure your key is saved in .env (GROQ_API_KEY=...)"
uvicorn api.index:app --reload --port 8000 &
npm run dev
