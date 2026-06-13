"""At-rest шифрование эфемерного видео (AES-256-GCM).

Модель ключей описана в README.md (раздел «Key model»). Кратко:
- Алгоритм: AES-256-GCM (AEAD — конфиденциальность + целостность).
- На файл: случайный 96-битный nonce; AAD = submission_id (привязка шифртекста
  к конкретной записи, чтобы блоб нельзя было «переклеить» в другую).
- Формат блоба на диске: nonce(12 байт) || ciphertext+tag.
- Ключ: env DODODO_MEDIA_KEY_B64 = base64(32 байта). Если не задан — ключ
  генерируется в памяти процесса (видео не переживает рестарт; безопасно при
  VIDEO_RETENTION=NONE).
"""

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

import stage1_config as cfg

_NONCE_BYTES = 12  # 96 бит — рекомендованный размер nonce для GCM

# In-memory fallback-ключ (живёт только в этом процессе). Не персистится.
_process_key: bytes | None = None


def get_key() -> bytes:
    """Вернуть 32-байтовый ключ AES-256.

    Приоритет: env DODODO_MEDIA_KEY_B64 → иначе сгенерированный в памяти ключ.
    """
    b64 = os.environ.get(cfg.MEDIA_KEY_ENV)
    if b64:
        try:
            key = base64.b64decode(b64, validate=True)
        except Exception as e:
            raise ValueError(f"{cfg.MEDIA_KEY_ENV} не является корректным base64: {e}")
        if len(key) != 32:
            raise ValueError(
                f"{cfg.MEDIA_KEY_ENV} должен декодироваться в 32 байта (AES-256), "
                f"получено {len(key)}"
            )
        return key

    global _process_key
    if _process_key is None:
        # WARN: ключ не задан в окружении — генерируем эфемерный ключ процесса.
        # Видео станет нечитаемым после рестарта (приемлемо при retention=NONE).
        _process_key = AESGCM.generate_key(bit_length=256)
    return _process_key


def encrypt(plaintext: bytes, aad: bytes) -> bytes:
    """Зашифровать plaintext. Возвращает блоб nonce || ciphertext+tag."""
    nonce = os.urandom(_NONCE_BYTES)
    ciphertext = AESGCM(get_key()).encrypt(nonce, plaintext, aad)
    return nonce + ciphertext


def decrypt(blob: bytes, aad: bytes) -> bytes:
    """Расшифровать блоб (nonce || ciphertext+tag). Бросает при подмене/неверном AAD."""
    if len(blob) <= _NONCE_BYTES:
        raise ValueError("шифр-блоб слишком короткий")
    nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    return AESGCM(get_key()).decrypt(nonce, ciphertext, aad)
