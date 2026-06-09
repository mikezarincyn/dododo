import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

MODEL_FILE = PROJECT_ROOT / "pose_landmarker.task"
FACE_MODEL_PATH = PROJECT_ROOT / "face_landmarker.task"

DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

CHILDREN_DIR = DATA_DIR / "children"
CHILDREN_DIR.mkdir(parents=True, exist_ok=True)

CHECKLIST_VERSION = "reaction_to_name_v1"  # сохранён ради обратной совместимости
CHECKLIST_VERSIONS = {
    "reaction_to_name": "reaction_to_name_v1",
    "functional_task":  "functional_task_v1",
}

# --- Распознавание речи (faster-whisper) ---
WHISPER_MODEL_SIZE = "small"
WHISPER_LANGUAGE = None  # None = автоопределение; можно задать "ru"

# --- Сценарий «Функциональная задача» ---
WRIST_MOVE_THRESHOLD = 0.01     # порог превышения скорости кисти над базовой линией (норм. ед./кадр)
ACTION_WINDOW_S = 5.0           # окно ожидания начала движения после команды (legacy, для старого вызова)

# Группировка слов Whisper в фразы-высказывания
UTTERANCE_GAP_S = 0.6           # пауза между словами больше — новая фраза

# Чистка сигнала движения кисти
WRIST_MIN_VISIBILITY = 0.5      # минимальная visibility, чтобы засчитать запястье
WRIST_MAX_JUMP = 0.15           # макс. смещение запястья за кадр (норм. ед.); больше — артефакт

# Детектор начала действия (используется suggest_action_onset на сигнале wrist_extension)
# Значения подобраны от статистики extension: baseline ~0.02-0.03, std ~0.01-0.015.
ACTION_K = 3.0                  # порог = baseline + ACTION_K × std
ACTION_MIN_THRESHOLD = 0.05     # абсолютный минимальный порог; отсекает шум при низком std
ACTION_MIN_BURST_FRAMES = 3     # сколько подряд кадров должны быть выше порога
BASELINE_WINDOW_S = 2.0         # ширина окна базовой линии (берём первые N секунд видео)

# --- Анализ звука ---
AUDIO_SAMPLE_RATE = 16000          # Гц, моно
AUDIO_WINDOW_MS = 50               # размер окна RMS для огибающей громкости
AUDIO_PEAK_MIN_GAP_S = 0.7         # минимальный интервал между кандидатами-окликами

# --- Расчёт латентности ---
RESPONSE_WINDOW_S = 4.0            # сколько секунд после оклика ждём реакцию
TURN_THRESHOLD = 0.12              # изменение индекса поворота для засчёта реакции
HEAD_TURN_SMOOTH_K = 5             # окно сглаживания сигнала head_turn (в кадрах)

# --- Покадровая разметка (степпер эталона) ---
# Кэш кадров — ВНЕ data/, в системном temp, помечен как эфемерный.
# При удалении session-папки осиротевшие каталоги вычищаются purge_orphan_frame_caches().
FRAME_CACHE_ROOT = Path(tempfile.gettempdir()) / "dododo_frame_cache"
ONSET_ANNOTATIONS_FILENAME = "onset_annotations.json"

# --- Рабочая папка обработки видео ---
# Все промежуточные артефакты process_video (копия входного видео, raw-видео
# со скелетом, h264-выход до копирования в session-папку, извлечённый wav)
# пишутся СЮДА, не в data/. Это устраняет orphan-файлы в DATA_DIR (SEC-02) и
# отвязывает их от оригинального имени файла, поданного пользователем (SEC-01).
# Папка эфемерная — после сохранения сессии work_id-каталог чистится.
WORK_DIR_ROOT = Path(tempfile.gettempdir()) / "dododo_work"

# Разрешённые расширения входного видео.
# Хранимое расширение клампится по этому whitelist (BUG-02): загрузка
# «video.mp4.exe» → суффикс .exe → откатываемся в .mp4.
ALLOWED_VIDEO_SUFFIXES = {".mp4", ".mov", ".avi", ".mkv"}

# Псевдоним ребёнка (display_code) — генерируется автоматически в формате CH-XXXXXX.
# Шесть base32-символов от криптослучайных байтов. Свободный ввод человеком запрещён.
DISPLAY_CODE_PREFIX = "CH-"
DISPLAY_CODE_PATTERN = r"CH-[A-Z2-7]{6}"  # base32 алфавит без 0/1/8/9

# Шаги навигации степпером (в кадрах). ±1 — отдельная пара кнопок, всегда есть.
STEP_FRAMES_MEDIUM = 5
STEP_FRAMES_LARGE = 30

# Текст и версия определения «начала движения» (onset). Версия пишется в каждую аннотацию.
# ВНИМАНИЕ: пока OT не дал формулировку — используется ЧЕРНОВАЯ версия "draft0".
# Не повышать в "v1" до согласования с OT, иначе эталон получит неверную этикетку
# и его нельзя будет отличить от финальных формулировок задним числом.
ONSET_DEFINITION_VERSION = "movement_onset_draft0"
ONSET_DEFINITION_TEXT = (
    "ВРЕМЕННО: первый кадр, на котором запястье покидает позу покоя в направлении цели. "
    "Заменить формулировкой OT перед сбором рабочего эталона."
)

# Известные сценарии — используются для явного выбора, когда meta.json содержит unknown
# или валидное значение и разметчик хочет переопределить (с предупреждением).
VALID_SCENARIOS = ["reaction_to_name", "functional_task"]

# Разметчики: ID-список для селектбокса. Псевдонимы, не настоящие имена.
DEFAULT_ANNOTATOR_ID = "ot_default"
ANNOTATORS = ["ot_default", "ot_anna", "ot_mike"]

# Версия схемы файла разметок — для будущей миграции при изменении схемы.
ONSET_SCHEMA_VERSION = "onset_annotation_v1"
