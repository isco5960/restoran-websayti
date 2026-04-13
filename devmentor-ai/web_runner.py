import os
import threading
from flask import Flask

from bot import run_bot

app = Flask(__name__)


@app.get("/")
def health():
    return {"ok": True, "service": "devmentor-ai-bot"}


def start_bot_background():
    t = threading.Thread(target=run_bot, daemon=True)
    t.start()


if __name__ == "__main__":
    start_bot_background()
    port = int(os.getenv("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
