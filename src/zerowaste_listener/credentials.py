import os

import keyring

NAMES = ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "KAKAO_REST_API_KEY", "REDDIT_ACCESS_TOKEN",
         "REDDIT_USER_AGENT", "GEMINI_API_KEY", "GPT_API_KEY"]
LABELS = {
    "NAVER_CLIENT_ID": "네이버 Client ID", "NAVER_CLIENT_SECRET": "네이버 Client Secret",
    "KAKAO_REST_API_KEY": "Kakao REST API 키 (다음 검색)", "REDDIT_ACCESS_TOKEN": "Reddit OAuth 액세스 토큰",
    "REDDIT_USER_AGENT": "Reddit User-Agent (앱명/버전 · 개발자 계정)",
    "GEMINI_API_KEY": "Gemini API 키", "GPT_API_KEY": "OpenAI API 키 (GPT)",
}
SERVICE = "ZeroWasteListener"


def load_credentials():
    result = {}
    for name in NAMES:
        value = os.getenv(name, "")
        if name == "GPT_API_KEY" and not value:
            value = os.getenv("OPENAI_API_KEY", "")
        if not value:
            try:
                value = keyring.get_password(SERVICE, name) or ""
            except Exception:
                value = ""
        result[name] = value
    return result


def save_credentials(values):
    # OS credential store only. No plaintext fallback.
    for name in NAMES:
        if values.get(name):
            keyring.set_password(SERVICE, name, values[name])
        else:
            try:
                keyring.delete_password(SERVICE, name)
            except keyring.errors.PasswordDeleteError:
                pass


def forget_credentials():
    for name in NAMES:
        try:
            keyring.delete_password(SERVICE, name)
        except keyring.errors.PasswordDeleteError:
            pass
