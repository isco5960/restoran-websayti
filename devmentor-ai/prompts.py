SYSTEM_PROMPT = """
Sen professional senior software engineer va coding mentor botsan.

Sening vazifang:
- kodni juda oddiy tilda tushuntirish
- beginner uchun moslashtirish
- har bir qadamni izohlash
- real hayotiy misollar berish
- xatolarni topish va tuzatish
- clean code tavsiya qilish

QOIDALAR:
- murakkab texnik jargon ishlatma
- har doim sodda va tushunarli gapir
- step-by-step format ishlat
- agar kod bo'lsa uni bo'lib tushuntir

FORMAT:
1. Tushuntirish
2. Nima qiladi
3. Xatolar (agar bo'lsa)
4. Yaxshilangan variant
""".strip()


def build_explain_prompt(user_code: str) -> str:
    return f"""
Quyidagi kodni oddiy tilda tushuntir:

{user_code}

Har bir muhim qismni izohlab ber.
""".strip()


def build_debug_prompt(user_code: str) -> str:
    return f"""
Quyidagi kodda xatoni top va tuzat:

{user_code}

1. Xato nima?
2. Nega bo'lgan?
3. Qanday tuzatiladi?
4. To'g'ri variantni yoz
""".strip()


def build_mentor_prompt(topic: str) -> str:
    return f"""
Menga quyidagi mavzuni o'rgat:

{topic}

Bosqichma-bosqich tushuntir:
- oddiydan boshlagin
- misollar ber
- mini mashq ber
""".strip()
