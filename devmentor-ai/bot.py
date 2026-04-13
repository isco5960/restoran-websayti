import telebot
from telebot import types

from ai_engine import ask_claude
from config import TELEGRAM_BOT_TOKEN
from prompts import build_debug_prompt, build_explain_prompt, build_mentor_prompt
from utils import chunk_text

EXPLAIN_MODE = "explain"
DEBUG_MODE = "debug"
MENTOR_MODE = "mentor"

user_modes = {}

bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN, parse_mode="HTML")


def main_keyboard() -> types.ReplyKeyboardMarkup:
    kb = types.ReplyKeyboardMarkup(resize_keyboard=True)
    kb.row("🧠 Explain Code", "🐞 Debug Code")
    kb.row("📘 Learn Topic")
    return kb


@bot.message_handler(commands=["start", "help"])
def start_handler(message: types.Message) -> None:
    bot.send_message(
        message.chat.id,
        (
            "Salom! Men <b>DevMentor AI</b> botman.\n\n"
            "Men sizga:\n"
            "- kodni tushuntirish\n"
            "- xatoni topish\n"
            "- codingni bosqichma-bosqich o'rgatishda yordam beraman.\n\n"
            "Quyidagi tugmalardan birini tanlang:"
        ),
        reply_markup=main_keyboard(),
    )


@bot.message_handler(func=lambda m: m.text in ["🧠 Explain Code", "🐞 Debug Code", "📘 Learn Topic"])
def mode_handler(message: types.Message) -> None:
    if message.text == "🧠 Explain Code":
        user_modes[message.chat.id] = EXPLAIN_MODE
        bot.send_message(message.chat.id, "Kod yuboring. Men uni oddiy tilda tushuntiraman.")
    elif message.text == "🐞 Debug Code":
        user_modes[message.chat.id] = DEBUG_MODE
        bot.send_message(message.chat.id, "Kod yoki errorni yuboring. Xatoni topib tuzataman.")
    else:
        user_modes[message.chat.id] = MENTOR_MODE
        bot.send_message(message.chat.id, "Qaysi mavzuni o'rganmoqchisiz? Masalan: Python loops")


@bot.message_handler(func=lambda m: True, content_types=["text"])
def text_handler(message: types.Message) -> None:
    mode = user_modes.get(message.chat.id)
    text = (message.text or "").strip()

    if not mode:
        bot.send_message(
            message.chat.id,
            "Avval rejim tanlang: 🧠 Explain Code, 🐞 Debug Code yoki 📘 Learn Topic",
            reply_markup=main_keyboard(),
        )
        return

    if mode == EXPLAIN_MODE:
        prompt = build_explain_prompt(text)
    elif mode == DEBUG_MODE:
        prompt = build_debug_prompt(text)
    else:
        prompt = build_mentor_prompt(text)

    bot.send_chat_action(message.chat.id, "typing")
    answer = ask_claude(prompt)
    for part in chunk_text(answer):
        bot.send_message(message.chat.id, part)


if __name__ == "__main__":
    print("DevMentor AI bot ishga tushdi...")
    if not TELEGRAM_BOT_TOKEN:
      print("TELEGRAM_BOT_TOKEN topilmadi. .env yoki Render env variable tekshiring.")
      raise SystemExit(1)
    bot.infinity_polling(skip_pending=True)


def run_bot() -> None:
    print("DevMentor AI bot polling boshlandi...")
    if not TELEGRAM_BOT_TOKEN:
        print("TELEGRAM_BOT_TOKEN topilmadi. Bot ishga tushmadi.")
        return
    bot.infinity_polling(skip_pending=True)
