from __future__ import annotations

import hashlib
import tempfile
import urllib.request
from pathlib import Path

from app.core.config import settings

MODELS = (
    (
        settings.face_detection_model_path,
        (
            "https://github.com/opencv/opencv_zoo/raw/main/models/"
            "face_detection_yunet/face_detection_yunet_2026may.onnx"
        ),
        "ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0",
    ),
    (
        settings.face_recognition_model_path,
        (
            "https://github.com/opencv/opencv_zoo/raw/main/models/"
            "face_recognition_sface/face_recognition_sface_2021dec.onnx"
        ),
        "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    ),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as model_file:
        for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(path: Path, url: str, checksum: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and sha256(path) == checksum:
        print(f"Model đã có: {path.name}")
        return
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        print(f"Đang tải {path.name}...")
        urllib.request.urlretrieve(url, temporary_path)
        actual = sha256(temporary_path)
        if actual != checksum:
            raise RuntimeError(f"Checksum không hợp lệ cho {path.name}: {actual}")
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> None:
    for path, url, checksum in MODELS:
        download(path, url, checksum)
    print("Đã chuẩn bị xong model YuNet và SFace.")


if __name__ == "__main__":
    main()
