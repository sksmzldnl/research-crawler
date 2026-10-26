import sys
import threading
import json
from pathlib import Path
from datetime import date

from PySide6.QtCore import QDate, Qt, QThread, QTimer, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QDateEdit, QDialog, QDialogButtonBox,
    QFileDialog, QFormLayout, QFrame, QGridLayout, QGroupBox, QHBoxLayout, QLabel,
    QLineEdit, QMainWindow, QMessageBox, QPlainTextEdit, QProgressBar, QPushButton,
    QScrollArea, QSlider, QSpinBox, QSplitter, QTableWidget, QTableWidgetItem,
    QVBoxLayout, QWidget, QHeaderView, QAbstractItemView,
)

from .ai import Translator
from .articles import ArticleLoader
from .credentials import LABELS, NAMES, forget_credentials, load_credentials, save_credentials
from .models import COLUMNS, Options
from .network import Cancelled, ServiceError, Transport
from .pipeline import export_csv, run
from .providers import ENGINE_NAMES, REQUIRED, SearchProvider
from .query import parse_bundle

STYLE = """
QWidget { color: #203b32; font-size: 14px; }
QMainWindow, QDialog { background: #f4f6f2; }
QGroupBox { background: white; border: 1px solid #cbd6ce; border-radius: 10px;
            margin-top: 18px; padding: 18px 12px 12px; font-weight: 600; }
QGroupBox::title { subcontrol-origin: margin; left: 14px; padding: 0 5px; }
QLineEdit, QPlainTextEdit, QComboBox, QDateEdit, QSpinBox { background: #fff;
            border: 1px solid #9bab9e; border-radius: 5px; padding: 6px; }
QPushButton { background: #e5eee7; border: 1px solid #8caa97; border-radius: 6px; padding: 8px 12px; }
QPushButton:hover { background: #d1e4d8; }
QPushButton:focus, QLineEdit:focus, QPlainTextEdit:focus, QComboBox:focus { border: 2px solid #156447; }
QPushButton#primary { background: #176447; color: white; font-weight: bold; }
QPushButton:disabled { background: #e1e3df; color: #68736b; border-color: #c0c8c1; }
QProgressBar { border: 1px solid #9bab9e; border-radius: 5px; text-align: center; min-height: 24px; }
QProgressBar::chunk { background: #82baa1; }
QTableWidget { background: white; alternate-background-color: #eef4ef; gridline-color: #d4ded6; }
QHeaderView::section { background: #e5eee7; padding: 8px; border: none; border-right: 1px solid #cbd6ce; }
QCheckBox { spacing: 7px; padding: 3px; }
QSlider::groove:horizontal { height: 6px; background: #cbd6ce; border-radius: 3px; }
QSlider::handle:horizontal { background: #176447; width: 20px; margin: -7px 0; border-radius: 9px; }
"""


def help_button(title, text, parent):
    button = QPushButton("?")
    button.setFixedWidth(32)
    button.setToolTip(text)
    button.setAccessibleName(title + " 도움말")
    button.clicked.connect(lambda: QMessageBox.information(parent, title, text))
    return button


def field_label(title, help_text, parent):
    row = QHBoxLayout()
    row.addWidget(QLabel(title))
    row.addStretch()
    row.addWidget(help_button(title, help_text, parent))
    return row


class CheckWorker(QThread):
    result = Signal(str)

    def __init__(self, service, credentials, parent=None):
        super().__init__(parent)
        self.service, self.credentials = service, credentials
        self.cancel = threading.Event()

    def run(self):
        http = Transport(self.cancel)
        try:
            if self.service in ENGINE_NAMES:
                message = SearchProvider(http, self.credentials).check(self.service)
            else:
                message = Translator(http, self.credentials, self.service).check()
            self.result.emit(message)
        except Cancelled:
            self.result.emit("연결 확인 취소")
        except ServiceError as error:
            self.result.emit(str(error))
        except Exception:
            self.result.emit("연결 확인 실패: API 응답·설정을 확인하세요.")
        finally:
            http.close()


class CredentialsDialog(QDialog):
    def __init__(self, credentials, parent=None):
        super().__init__(parent)
        self.setWindowTitle("API 연결 설정")
        self.resize(680, 710)
        self.values = dict(credentials)
        self.worker = None
        root = QVBoxLayout(self)
        notice = QLabel("선택할 검색 엔진과 AI의 키만 입력하세요. 계정 비밀번호는 필요하지 않습니다.\n"
                        "기본값은 이번 실행에만 보관하며, 선택하면 OS 자격 증명 저장소에 저장합니다.\n"
                        "AI 연결 확인과 번역에는 해당 제공자의 API 요금이 발생할 수 있습니다.")
        notice.setWordWrap(True)
        root.addWidget(notice)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        form_widget = QWidget()
        form = QFormLayout(form_widget)
        self.fields = {}
        for name in NAMES:
            edit = QLineEdit(self.values.get(name, ""))
            edit.setEchoMode(QLineEdit.EchoMode.Password if name != "REDDIT_USER_AGENT" else QLineEdit.EchoMode.Normal)
            edit.setAccessibleName(LABELS[name])
            form.addRow(LABELS[name], edit)
            self.fields[name] = edit
        scroll.setWidget(form_widget)
        root.addWidget(scroll)
        links = QLabel('<a href="https://developers.naver.com/docs/serviceapi/search/blog/blog.md">네이버 키 발급 안내</a> · '
                       '<a href="https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide">다음 검색 API</a> · '
                       '<a href="https://www.reddit.com/wiki/api/">Reddit API / 접근 승인</a><br>'
                       '<a href="https://aistudio.google.com/apikey">Gemini API 키</a> · '
                       '<a href="https://platform.openai.com/api-keys">OpenAI API 키</a>')
        links.setOpenExternalLinks(True)
        root.addWidget(links)
        root.addWidget(QLabel("Reddit은 승인된 OAuth 토큰과 앱 식별 User-Agent가 필요합니다.\n토큰 만료 시 재발급한 뒤 바꾸세요. API 사용 승인·한도는 제공자 정책에 따릅니다."))
        self.persist = QCheckBox("이 컴퓨터의 OS 자격 증명 저장소에 키 저장 (선택)")
        root.addWidget(self.persist)
        forget = QPushButton("저장된 키 삭제 및 입력값 비우기")
        forget.clicked.connect(self.forget)
        root.addWidget(forget)
        row = QHBoxLayout()
        self.service = QComboBox()
        for key, label in {**ENGINE_NAMES, "Gemini": "Gemini", "GPT": "GPT"}.items():
            self.service.addItem(label, key)
        self.check = QPushButton("선택 서비스 연결 확인")
        self.check.clicked.connect(self.test_connection)
        row.addWidget(self.service)
        row.addWidget(self.check)
        root.addLayout(row)
        self.status = QLabel("연결 확인 전")
        self.status.setWordWrap(True)
        root.addWidget(self.status)
        self.buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        self.buttons.button(QDialogButtonBox.StandardButton.Save).setText("적용")
        self.buttons.button(QDialogButtonBox.StandardButton.Cancel).setText("닫기")
        self.buttons.accepted.connect(self.apply)
        self.buttons.rejected.connect(self.reject)
        root.addWidget(self.buttons)

    def current(self):
        return {name: edit.text().strip() for name, edit in self.fields.items()}

    def test_connection(self):
        service = self.service.currentData()
        missing = [LABELS[k] for k in REQUIRED[service] if not self.current().get(k)]
        if missing:
            self.status.setText("입력 필요: " + ", ".join(missing))
            return
        self.worker = CheckWorker(service, self.current(), self)
        self.check.setEnabled(False)
        self.buttons.setEnabled(False)
        self.status.setText("연결 확인 중…")
        self.worker.result.connect(self.status.setText)
        self.worker.finished.connect(self.check_finished)
        self.worker.start()

    def check_finished(self):
        self.worker.deleteLater()
        self.worker = None
        self.check.setEnabled(True)
        self.buttons.setEnabled(True)

    def forget(self):
        try:
            forget_credentials()
        except Exception:
            QMessageBox.warning(self, "키 삭제", "OS 자격 증명 저장소에 접근하지 못했습니다.")
            return
        for field in self.fields.values():
            field.clear()
        # This is an explicit deletion action even when the dialog is later cancelled.
        self.values.clear()
        self.status.setText("저장된 키 삭제 완료. 환경변수로 공급한 키는 별도로 제거하세요.")

    def apply(self):
        if self.worker:
            return
        self.values = self.current()
        if self.persist.isChecked():
            try:
                save_credentials(self.values)
            except Exception:
                QMessageBox.warning(self, "저장 실패", "OS 자격 증명 저장소를 사용할 수 없습니다.\n이번 실행에는 적용되며 평문 파일에는 저장하지 않습니다.")
        self.accept()

    def reject(self):
        if self.worker:
            self.worker.cancel.set()
            self.status.setText("연결 요청 종료를 기다리는 중…")
            return
        super().reject()


class ResearchWorker(QThread):
    row = Signal(dict)
    progress = Signal(int, int, str)
    outcome = Signal(str)

    def __init__(self, options, credentials, parent=None):
        super().__init__(parent)
        self.options, self.credentials = options, dict(credentials)
        self.cancel = threading.Event()

    def run(self):
        http = Transport(self.cancel)
        try:
            count, scanned, errors = run(self.options, SearchProvider(http, self.credentials),
                Translator(http, self.credentials, self.options.ai), ArticleLoader(http), self.cancel,
                self.row.emit, self.progress.emit)
            suffix = f" / 오류 {len(errors)}건 (각 행의 번역 상태와 진행 기록 확인)" if errors else ""
            self.outcome.emit(f"검색 종료: {scanned}개 검토, {count}/{self.options.limit}개 확보{suffix}. "
                              "목표 미달은 검색 범위·필터·API 한도에 따라 발생할 수 있습니다.")
        except Cancelled:
            self.outcome.emit("사용자 중단: 지금까지 확보한 자료는 CSV로 저장할 수 있습니다.")
        except Exception:
            self.outcome.emit("조사 오류: 예기치 않은 응답입니다. 확보한 자료는 보존됩니다. API 연결 설정을 확인하세요.")
        finally:
            http.close()


class MainWindow(QMainWindow):
    def __init__(self, credentials=None):
        super().__init__()
        self.setWindowTitle("새로듣기 · Zero Waste Listener")
        self.resize(1280, 920)
        self.setMinimumSize(880, 680)
        self.credentials = load_credentials() if credentials is None else credentials
        self.rows, self.worker = [], None
        self.pending_close = False
        root_widget = QWidget()
        self.setCentralWidget(root_widget)
        root = QVBoxLayout(root_widget)
        root.setContentsMargins(22, 16, 22, 16)
        heading = QHBoxLayout()
        title = QLabel("새로듣기")
        title.setStyleSheet("font-size: 30px; font-weight: bold; color: #176447;")
        heading.addWidget(title)
        heading.addWidget(QLabel("ZERO WASTE LISTENER\n제로웨이스트 소비자의 경험을 모으는 연구 도구"))
        heading.addStretch()
        self.settings = QPushButton("API 연결 설정")
        self.settings.clicked.connect(self.open_settings)
        heading.addWidget(self.settings)
        root.addLayout(heading)
        notice = QLabel("공개 자료 · 출처 보존 · 한국어 번역   |   AI 결과와 광고 판정은 원문을 대조해 검토하세요.")
        notice.setWordWrap(True)
        root.addWidget(notice)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        root.addWidget(splitter, 1)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setMinimumWidth(360)
        panel = QWidget()
        left = QVBoxLayout(panel)
        left.setContentsMargins(0, 0, 10, 0)
        self.form = panel
        search = QGroupBox("01   조사 범위")
        layout = QVBoxLayout(search)
        layout.addLayout(field_label("쿼리 번들 · 한 줄에 하나", 'AND는 모두 포함, OR는 하나 이상 포함입니다. 괄호와 "따옴표 구문"을 지원합니다.\n예: (제로웨이스트 OR "zero waste") AND (리필 OR refill)\n한 번에 최대 10줄·총 64개 검색 조합을 허용합니다. 매칭은 정규화된 문자열 포함 여부를 기준으로 합니다.', self))
        self.query = QPlainTextEdit('(제로웨이스트 OR "zero waste") AND (리필 OR refill)')
        self.query.setAccessibleName("쿼리 번들")
        self.query.setMaximumHeight(100)
        layout.addWidget(self.query)
        layout.addLayout(field_label("검색 엔진", "선택한 엔진의 공식 API만 호출합니다. 네이버·다음은 블로그 검색, Reddit은 공개 게시물 검색입니다. 각 API 키·승인과 제공자 한도에 따라 검색 가능 범위가 다릅니다.", self))
        engine_row = QHBoxLayout()
        self.engines = {}
        for engine, name in ENGINE_NAMES.items():
            checkbox = QCheckBox(name)
            checkbox.setChecked(engine == "naver")
            engine_row.addWidget(checkbox)
            self.engines[engine] = checkbox
        layout.addLayout(engine_row)
        layout.addLayout(field_label("제외할 검색어 · 한 줄에 하나", "제목 또는 확보한 원문에 제외어가 하나라도 있으면 제외합니다. 쉼표 대신 줄바꿈으로 구분하세요.", self))
        self.exclusions = QPlainTextEdit()
        self.exclusions.setPlaceholderText("예: 공동구매\n체험단")
        self.exclusions.setMaximumHeight(70)
        self.exclusions.setAccessibleName("제외할 검색어")
        layout.addWidget(self.exclusions)
        left.addWidget(search)
        filters = QGroupBox("02   자료 정제")
        layout = QVBoxLayout(filters)
        self.ads = QCheckBox("광고 단서가 있는 자료 제외")
        self.ads.setChecked(True)
        row = QHBoxLayout()
        row.addWidget(self.ads)
        row.addWidget(help_button("광고 제거", "API 광고 표시, #광고·#협찬·sponsored 등의 공개 단서를 사용합니다. 숨겨진 광고를 모두 탐지하지는 못합니다. 판정은 CSV에 기록합니다.", self))
        layout.addLayout(row)
        self.dedupe = QCheckBox("자동 중복 제거")
        self.dedupe.setChecked(True)
        row = QHBoxLayout()
        row.addWidget(self.dedupe)
        row.addWidget(help_button("중복 제거", "추적 매개변수를 제거한 URL 또는 공백·대소문자를 정규화한 동일 본문으로 중복을 제거합니다. 의미가 비슷한 별개의 글까지 제거하지 않습니다. 중복 글은 먼저 매칭된 번들에 한 번 기록됩니다.", self))
        layout.addLayout(row)
        self.full_text = QCheckBox("허용된 공개 페이지에서 원문 본문 확보")
        self.full_text.setChecked(True)
        row = QHBoxLayout()
        row.addWidget(self.full_text)
        row.addWidget(help_button("원문 범위", "robots.txt와 접근 제한을 존중합니다. 로그인·유료·차단 페이지를 우회하지 않습니다. 본문 추출에 실패하면 API 발췌문을 보존하고 ‘전문 미확보’ 사유를 기록합니다. 엄격한 전문 조사는 이 행을 제외하세요. 확보한 원문은 번역 제공자에게 전송됩니다.", self))
        layout.addLayout(row)
        self.dates_enabled = QCheckBox("작성 기간 적용 (게시일 미상 자료 제외)")
        self.dates_enabled.setChecked(True)
        layout.addWidget(self.dates_enabled)
        dates = QHBoxLayout()
        self.start_date = QDateEdit(QDate.currentDate().addYears(-1))
        self.end_date = QDateEdit(QDate.currentDate())
        for widget, name in [(self.start_date, "시작일"), (self.end_date, "종료일")]:
            widget.setCalendarPopup(True)
            widget.setDisplayFormat("yyyy-MM-dd")
            widget.setAccessibleName(name)
            dates.addWidget(widget)
        self.dates_enabled.toggled.connect(self.start_date.setEnabled)
        self.dates_enabled.toggled.connect(self.end_date.setEnabled)
        layout.addLayout(dates)
        layout.addLayout(field_label("확보할 자료 수 · 1~1000개", "필터를 통과한 전체 자료의 목표 개수입니다. API 검색 범위·중복·필터 때문에 목표보다 적을 수 있습니다. 결과 수나 API 비용을 보장하는 값은 아닙니다. 날짜는 API가 제공한 게시일을 사용하며 Reddit은 UTC 날짜 기준입니다.", self))
        row = QHBoxLayout()
        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.setRange(1, 1000)
        self.slider.setValue(100)
        self.slider.setAccessibleName("확보할 자료 수 슬라이더")
        self.limit = QSpinBox()
        self.limit.setRange(1, 1000)
        self.limit.setValue(100)
        self.limit.setAccessibleName("확보할 자료 수 숫자 입력")
        self.slider.valueChanged.connect(self.limit.setValue)
        self.limit.valueChanged.connect(self.slider.setValue)
        row.addWidget(self.slider, 1)
        row.addWidget(self.limit)
        layout.addLayout(row)
        left.addWidget(filters)
        translation = QGroupBox("03   번역 및 실행")
        layout = QVBoxLayout(translation)
        row = QHBoxLayout()
        row.addWidget(QLabel("한국어 번역 AI"))
        self.ai = QComboBox()
        self.ai.addItems(["Gemini", "GPT"])
        row.addWidget(self.ai, 1)
        row.addWidget(help_button("AI 번역", "Gemini 또는 GPT 중 하나만 사용합니다. 확보한 원문 전체를 여러 부분으로 나누어 번역하고 요약합니다. API 요금이 발생하며 원문이 제공자에게 전송됩니다. 개인정보가 포함된 자료 전송 전 사용 권한을 확인하세요. 실패는 번역 상태에 표시됩니다.", self))
        layout.addLayout(row)
        self.demo = QCheckBox("시연 모드 · 가상 자료 / API 호출·요금 없음")
        layout.addWidget(self.demo)
        left.addWidget(translation)
        left.addStretch()
        scroll.setWidget(panel)
        splitter.addWidget(scroll)
        right_widget = QWidget()
        right = QVBoxLayout(right_widget)
        right.setContentsMargins(10, 0, 0, 0)
        self.mode_label = QLabel("실제 조사 대기 · API 키를 설정하거나 시연 모드를 선택하세요.")
        self.mode_label.setWordWrap(True)
        right.addWidget(self.mode_label)
        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        self.progress.setValue(0)
        self.progress.setFormat("확보 0 / 목표 100개")
        right.addWidget(self.progress)
        self.status = QLabel("조사를 시작하면 진행 상황이 표시됩니다.")
        self.status.setWordWrap(True)
        self.status.setAccessibleName("조사 진행 상황")
        right.addWidget(self.status)
        row = QHBoxLayout()
        self.start = QPushButton("조사 시작")
        self.start.setObjectName("primary")
        self.start.clicked.connect(self.start_research)
        self.stop = QPushButton("중단")
        self.stop.setEnabled(False)
        self.stop.clicked.connect(self.cancel_research)
        self.export = QPushButton("CSV로 저장")
        self.export.setEnabled(False)
        self.export.clicked.connect(self.save_csv)
        for button in [self.start, self.stop, self.export]:
            row.addWidget(button)
        right.addLayout(row)
        right.addWidget(QLabel("조사 결과 · 행을 선택하면 확보한 원문과 번역을 볼 수 있습니다."))
        self.table = QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["출처", "제목", "게시일", "원문 확보 범위", "번역 상태"])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setAlternatingRowColors(True)
        self.table.setAccessibleName("수집 결과 표")
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setColumnWidth(1, 230)
        self.table.setWordWrap(False)
        self.table.itemSelectionChanged.connect(self.show_row)
        right.addWidget(self.table, 3)
        self.detail = QPlainTextEdit()
        self.detail.setReadOnly(True)
        self.detail.setAccessibleName("선택한 자료 원문과 번역")
        self.detail.setPlaceholderText("선택한 자료의 출처·원문·한국어 번역·요약이 표시됩니다.")
        right.addWidget(self.detail, 2)
        self.log = QPlainTextEdit()
        self.log.setReadOnly(True)
        self.log.setMaximumBlockCount(200)
        self.log.setMaximumHeight(100)
        self.log.setAccessibleName("조사 진행 기록")
        right.addWidget(self.log)
        splitter.addWidget(right_widget)
        splitter.setSizes([440, 800])

    def open_settings(self):
        dialog = CredentialsDialog(self.credentials, self)
        dialog.exec()
        self.credentials = dialog.values

    def options(self):
        lines = [line.strip() for line in self.query.toPlainText().splitlines() if line.strip()]
        if not 1 <= len(lines) <= 10:
            raise ValueError("쿼리 번들을 1~10줄 입력하세요.")
        bundles = [parse_bundle(line) for line in lines]
        if sum(len(b.clauses) for b in bundles) > 64:
            raise ValueError("전체 검색 조합은 최대 64개입니다. 쿼리를 줄이세요.")
        engines = [key for key, checkbox in self.engines.items() if checkbox.isChecked()]
        if not engines:
            raise ValueError("검색 엔진을 하나 이상 선택하세요.")
        start = self.start_date.date().toPython() if self.dates_enabled.isChecked() else None
        end = self.end_date.date().toPython() if self.dates_enabled.isChecked() else None
        if start and end and start > end:
            raise ValueError("시작일은 종료일보다 늦을 수 없습니다.")
        return Options(bundles, engines,
            [s.strip() for s in self.exclusions.toPlainText().splitlines() if s.strip()],
            self.ads.isChecked(), self.dedupe.isChecked(), start, end, self.limit.value(),
            self.ai.currentText(), self.full_text.isChecked(), self.demo.isChecked())

    def start_research(self):
        if self.worker:
            return
        try:
            options = self.options()
            if not options.demo:
                required = set(k for service in options.engines + [options.ai] for k in REQUIRED[service])
                missing = [LABELS[k] for k in sorted(required) if not self.credentials.get(k)]
                if missing:
                    raise ValueError("API 연결 설정에서 입력하세요:\n" + "\n".join(missing))
        except ValueError as error:
            QMessageBox.warning(self, "조사 설정 확인", str(error))
            return
        if self.rows:
            answer = QMessageBox.question(self, "새 조사", "기존 결과를 비우고 새 조사를 시작할까요? 저장하지 않은 결과는 사라집니다.")
            if answer != QMessageBox.StandardButton.Yes:
                return
        self.rows.clear()
        self.table.setRowCount(0)
        self.detail.clear()
        self.log.clear()
        self.export.setEnabled(False)
        self.progress.setRange(0, options.limit)
        self.progress.setValue(0)
        self.progress.setFormat(f"확보 %v / 목표 {options.limit}개")
        self.mode_label.setText("시연 중 · 가상 자료이며 과제의 조사 근거로 사용할 수 없습니다." if options.demo
                                else f"실제 조사 · {options.ai} 번역 · 확보한 원문을 AI 제공자에게 전송합니다.")
        self.form.setEnabled(False)
        self.settings.setEnabled(False)
        self.start.setEnabled(False)
        self.stop.setEnabled(True)
        self.worker = ResearchWorker(options, self.credentials, self)
        self.worker.row.connect(self.add_row)
        self.worker.progress.connect(self.update_progress)
        self.worker.outcome.connect(self.finish_message)
        self.worker.finished.connect(self.worker_finished)
        self.status.setText("검색 요청을 준비하는 중…")
        self.worker.start()

    def add_row(self, row):
        self.rows.append(row)
        index = self.table.rowCount()
        self.table.insertRow(index)
        for col, key in enumerate(["engine", "title", "published", "completeness", "translation_status"]):
            item = QTableWidgetItem(row[key])
            item.setToolTip(row[key])
            self.table.setItem(index, col, item)
        self.export.setEnabled(True)
        if index == 0:
            self.table.selectRow(0)

    def update_progress(self, count, scanned, message):
        self.progress.setValue(count)
        self.status.setText(f"검토 {scanned}개 · {message}")
        self.log.appendPlainText(message)

    def finish_message(self, message):
        self.status.setText(message)
        self.log.appendPlainText(message)

    def worker_finished(self):
        self.worker.deleteLater()
        self.worker = None
        self.start.setEnabled(True)
        self.stop.setEnabled(False)
        self.form.setEnabled(True)
        self.settings.setEnabled(True)
        if self.pending_close:
            self.close()

    def cancel_research(self):
        if self.worker:
            self.worker.cancel.set()
            self.stop.setEnabled(False)
            self.status.setText("중단 요청됨 · 진행 중인 네트워크 요청이 끝나면 중단합니다.")

    def show_row(self):
        index = self.table.currentRow()
        if 0 <= index < len(self.rows):
            row = self.rows[index]
            self.detail.setPlainText("\n\n".join(f"{label}\n{row.get(key, '')}" for key, label in COLUMNS.items()))

    def save_csv(self):
        path, _ = QFileDialog.getSaveFileName(self, "CSV로 저장", f"제로웨이스트_조사_{date.today():%Y%m%d}.csv", "CSV 파일 (*.csv)")
        if path:
            if not path.lower().endswith(".csv"):
                path += ".csv"
            try:
                export_csv(path, list(self.rows))
                QMessageBox.information(self, "저장 완료", f"{len(self.rows)}개 자료를 UTF-8 CSV로 저장했습니다.")
            except OSError:
                QMessageBox.warning(self, "저장 실패", "파일 경로·권한을 확인하거나 열려 있는 CSV를 닫으세요.")

    def closeEvent(self, event):
        if self.worker:
            self.pending_close = True
            self.cancel_research()
            event.ignore()
        else:
            if self.rows:
                reply = QMessageBox.question(self, "종료", "결과를 CSV로 저장했는지 확인하세요. 종료할까요?")
                if reply != QMessageBox.StandardButton.Yes:
                    self.pending_close = False
                    event.ignore()
                    return
            event.accept()


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("ZeroWasteListener")
    app.setOrganizationName("ZeroWasteResearch")
    app.setFont(QFont("sans-serif", 11))
    app.setStyleSheet(STYLE)
    smoke = len(sys.argv) == 3 and sys.argv[1] == "--smoke-test"
    window = MainWindow(credentials={} if smoke else None)
    window.show()
    if smoke:
        output = Path(sys.argv[2])
        output.mkdir(parents=True, exist_ok=True)
        window.demo.setChecked(True)
        window.limit.setValue(3)
        window.start_research()

        def finish_smoke():
            if window.worker:
                QTimer.singleShot(25, finish_smoke)
                return
            export_csv(output / "demo.csv", window.rows)
            window.grab().save(str(output / "demo.png"))
            report = {"rows": len(window.rows), "all_demo": all(r["mode"] == "시연용 가상 자료" for r in window.rows),
                      "columns": len(COLUMNS), "message": window.status.text()}
            (output / "report.json").write_text(json.dumps(report, ensure_ascii=False), encoding="utf-8")
            window.rows.clear()
            app.quit()
        QTimer.singleShot(25, finish_smoke)
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
