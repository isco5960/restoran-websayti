# DevMentor AI (MVP)

Telegram AI Coding Mentor bot.

## Features
- Explain Code
- Debug Code
- Mentor Mode

## Project structure
- `bot.py` - Telegram bot logic
- `ai_engine.py` - Claude API integration
- `prompts.py` - Prompt templates
- `config.py` - Config/env variables
- `utils.py` - Helper functions
- `requirements.txt`

## Setup (local)
1. Create virtual environment
2. Install dependencies:
   `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`
4. Put your real keys in `.env`
5. Run:
   `python bot.py`

## 24/7 Online (Render)
1. Push `devmentor-ai` folder to GitHub.
2. Render dashboard -> New -> Blueprint.
3. Select repo and set Blueprint Path:
   `devmentor-ai/render.yaml`
4. Fill env vars:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENROUTER_API_KEY`
   - `CLAUDE_MODEL` (optional)
5. Deploy. Bot 24/7 ishlaydi.

Eslatma: free plan'da ba'zan cheklov bo'lishi mumkin. Muhim bot uchun paid worker tavsiya etiladi.
