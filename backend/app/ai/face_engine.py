from __future__ import annotations

from dataclasses import dataclass
from threading import Lock

import cv2
import numpy as np

from app.core.config import settings
from app.core.exceptions import AIUnavailableError, InvalidFaceImageError


@dataclass(frozen=True, slots=True)
class FaceDetection:
    x: int
    y: int
    width: int
    height: int
    confidence: float
    brightness: float
    sharpness: float
    quality_score: float


@dataclass(frozen=True, slots=True)
class FaceSample:
    embedding: list[float]
    detection: FaceDetection


class FaceEngine:
    """Thread-safe YuNet detector and SFace embedding extractor."""

    def __init__(self) -> None:
        self._detector: cv2.FaceDetectorYN | None = None
        self._recognizer: cv2.FaceRecognizerSF | None = None
        self._lock = Lock()

    def _load(self) -> None:
        if self._detector is not None and self._recognizer is not None:
            return
        detector_path = settings.face_detection_model_path
        recognizer_path = settings.face_recognition_model_path
        missing = [
            str(path) for path in (detector_path, recognizer_path) if not path.exists()
        ]
        if missing:
            raise AIUnavailableError(
                "Thiếu model nhận diện khuôn mặt. Chạy: "
                "cd backend && ../.venv/bin/python -m app.ai.download_models"
            )
        try:
            self._detector = cv2.FaceDetectorYN.create(
                str(detector_path), "", (320, 320), 0.9, 0.3, 5000
            )
            self._recognizer = cv2.FaceRecognizerSF.create(str(recognizer_path), "")
        except cv2.error as error:
            raise AIUnavailableError(f"Không thể tải model OpenCV: {error}") from error

    @staticmethod
    def _decode(image_bytes: bytes) -> np.ndarray:
        if not image_bytes:
            raise InvalidFaceImageError("Ảnh khuôn mặt không được để trống")
        encoded = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        if image is None:
            raise InvalidFaceImageError("Không thể đọc định dạng ảnh")
        return image

    @staticmethod
    def _quality(image: np.ndarray, face: np.ndarray) -> FaceDetection:
        image_height, image_width = image.shape[:2]
        x, y, width, height = (round(float(value)) for value in face[:4])
        left = max(0, x)
        top = max(0, y)
        right = min(image_width, x + width)
        bottom = min(image_height, y + height)
        crop = image[top:bottom, left:right]
        if crop.size == 0:
            raise InvalidFaceImageError("Vùng khuôn mặt không hợp lệ")
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        brightness = float(gray.mean())
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        size_score = min(1.0, min(width, height) / 180.0)
        brightness_score = max(0.0, 1.0 - abs(brightness - 128.0) / 128.0)
        sharpness_score = min(1.0, sharpness / 150.0)
        quality_score = (
            0.4 * size_score + 0.3 * brightness_score + 0.3 * sharpness_score
        )
        return FaceDetection(
            x=left,
            y=top,
            width=right - left,
            height=bottom - top,
            confidence=float(face[-1]),
            brightness=round(brightness, 2),
            sharpness=round(sharpness, 2),
            quality_score=round(quality_score, 4),
        )

    def extract(self, image_bytes: bytes, *, strict_quality: bool = True) -> FaceSample:
        image = self._decode(image_bytes)
        with self._lock:
            self._load()
            assert self._detector is not None
            assert self._recognizer is not None
            height, width = image.shape[:2]
            self._detector.setInputSize((width, height))
            _, faces = self._detector.detect(image)
            if faces is None or len(faces) == 0:
                raise InvalidFaceImageError("Không tìm thấy khuôn mặt trong ảnh")
            if len(faces) != 1:
                raise InvalidFaceImageError("Ảnh phải chứa đúng một khuôn mặt")
            face = faces[0]
            detection = self._quality(image, face)
            if min(detection.width, detection.height) < settings.face_min_size:
                raise InvalidFaceImageError("Khuôn mặt quá nhỏ, hãy đưa camera lại gần")
            if strict_quality and not 35 <= detection.brightness <= 225:
                raise InvalidFaceImageError("Ảnh quá tối hoặc quá sáng")
            if strict_quality and detection.sharpness < 25:
                raise InvalidFaceImageError("Ảnh bị mờ, hãy giữ camera ổn định")
            aligned = self._recognizer.alignCrop(image, face)
            features = self._recognizer.feature(aligned).flatten().astype(np.float32)

        norm = float(np.linalg.norm(features))
        if norm == 0:
            raise InvalidFaceImageError("Không thể tạo đặc trưng khuôn mặt")
        embedding = (features / norm).tolist()
        return FaceSample(embedding=embedding, detection=detection)

    @staticmethod
    def cosine_similarity(left: list[float], right: list[float]) -> float:
        if len(left) != len(right) or not left:
            return -1.0
        similarity = float(np.dot(np.asarray(left), np.asarray(right)))
        return max(-1.0, min(1.0, similarity))


face_engine = FaceEngine()
