@echo off
cd /d %~dp0
if not exist .env copy .env.example .env >nul
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
pip install -r requirements.txt uvicorn
call npm install
echo Make sure your key is saved in .env (GROQ_API_KEY=...)
start "Nova Chat API" cmd /k "call .venv\Scripts\activate && uvicorn api.index:app --reload --port 8000"
call npm run dev
