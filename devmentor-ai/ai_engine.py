import requests
from config import OPENROUTER_API_KEY, OPENROUTER_API_URL, CLAUDE_MODEL
from prompts import SYSTEM_PROMPT


def ask_claude(user_prompt: str) -> str:
    if not OPENROUTER_API_KEY:
        return "OPENROUTER_API_KEY topilmadi. .env faylga API key kiriting."

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    base_payload = {
        "model": CLAUDE_MODEL,
        "temperature": 0.4,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        # Avval kamroq token bilan urinamiz, kredit yetmasa yanada kamaytiramiz.
        for max_tokens in (400, 250, 150):
            payload = {**base_payload, "max_tokens": max_tokens}
            response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=60)
            data = response.json()

            if response.status_code < 400:
                choices = data.get("choices", [])
                if not choices:
                    return "AI javob bermadi. Qayta urinib ko'ring."
                return choices[0].get("message", {}).get("content", "Javob bo'sh keldi.")

            err_message = data.get("error", {}).get("message", "Noma`lum xato")
            if "requires more credits" not in err_message and "fewer max_tokens" not in err_message:
                return f"AI API xatolik: {err_message}"

        return "OpenRouter kredit/token limiti past. Key limitini oshiring yoki keyinroq urinib ko'ring."
    except requests.RequestException as exc:
        return f"Tarmoq xatosi: {exc}"
