import os
import time
import threading
import httpx

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QDate
import pytest

from zerowaste_listener import app as ui
from zerowaste_listener.pipeline import export_csv
from zerowaste_listener.network import Transport


@pytest.fixture(scope="module")
def application():
    return QApplication.instance() or QApplication([])


def test_real_ui_demo_worker_and_csv(application, monkeypatch, tmp_path):
    monkeypatch.setattr(ui, "load_credentials", lambda: {})
    window = ui.MainWindow()
    window.show()
    window.demo.setChecked(True)
    window.limit.setValue(5)
    assert window.slider.value() == 5
    window.start_research()
    assert not window.form.isEnabled()
    deadline = time.monotonic() + 10
    while window.worker and time.monotonic() < deadline:
        application.processEvents()
        time.sleep(0.01)
    assert window.worker is None
    assert len(window.rows) == 1
    assert window.table.rowCount() == len(window.rows)
    assert window.export.isEnabled() and window.form.isEnabled()
    assert "시연" in window.mode_label.text()
    assert "원문" in window.detail.toPlainText()
    export_csv(tmp_path / "ui.csv", window.rows)
    assert "가상 자료" in (tmp_path / "ui.csv").read_text(encoding="utf-8-sig")
    window.rows.clear()  # Avoid the deliberate unsaved-results confirmation during teardown.
    window.close()


def test_validation_and_date_popup(application, monkeypatch):
    monkeypatch.setattr(ui, "load_credentials", lambda: {})
    window = ui.MainWindow()
    assert window.start_date.calendarPopup()
    window.start_date.setDate(QDate(2026, 10, 2))
    window.end_date.setDate(QDate(2026, 10, 1))
    with pytest.raises(ValueError, match="시작일"):
        window.options()
    window.dates_enabled.setChecked(False)
    assert window.options().start is None
    for checkbox in window.engines.values():
        checkbox.setChecked(False)
    with pytest.raises(ValueError, match="엔진"):
        window.options()
    window.close()


def test_live_mode_worker_with_official_api_contracts(application, monkeypatch):
    """No demo shortcut: exercise UI -> worker -> HTTP adapters -> AI -> table."""
    calls = []
    def handler(request):
        calls.append(request.url.host)
        if request.url.host == "openapi.naver.com":
            return httpx.Response(200, json={"total": 1, "items": [{"title": "제로웨이스트 리필 후기",
                "description": "리필 용기의 무게를 재기가 어렵다.", "link": "https://example.com/post", "postdate": "20261001"}]})
        assert request.url.host == "api.openai.com"
        return httpx.Response(200, json={"choices": [{"finish_reason": "stop", "message": {"content": '{"text":"리필 용기 사용이 어렵다."}'}}]})
    monkeypatch.setattr(ui, "Transport", lambda cancel: Transport(cancel, httpx.Client(transport=httpx.MockTransport(handler)), interval=0))
    window = ui.MainWindow(credentials={"NAVER_CLIENT_ID": "test-id", "NAVER_CLIENT_SECRET": "test-secret", "GPT_API_KEY": "test-key"})
    window.query.setPlainText("제로웨이스트 AND 리필")
    window.ai.setCurrentText("GPT")
    window.full_text.setChecked(False)
    window.dates_enabled.setChecked(False)
    window.limit.setValue(1)
    window.start_research()
    deadline = time.monotonic() + 10
    while window.worker and time.monotonic() < deadline:
        application.processEvents()
        time.sleep(0.01)
    assert window.worker is None and len(window.rows) == 1
    assert window.rows[0]["mode"] == "실제 API"
    assert window.rows[0]["translation_ko"] == "리필 용기 사용이 어렵다."
    assert calls == ["openapi.naver.com", "api.openai.com", "api.openai.com"]
    window.rows.clear()
    window.close()
