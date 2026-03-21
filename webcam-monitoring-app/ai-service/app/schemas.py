from typing import List, Optional, Literal
from pydantic import BaseModel


class Box(BaseModel):
    label: str
    confidence: float
    xyxy: List[float]


class SmokingPrediction(BaseModel):
    detected: bool
    label: Optional[str]  # 'cigarettes' | 'vape' | None
    confidence: float
    boxes: List[Box]


class DrowsinessPrediction(BaseModel):
    detected: bool  # True only when drowsy is detected
    label: Literal['awake', 'drowsy']
    confidence: float
    boxes: List[Box]


class PredictRequest(BaseModel):
    imageBase64: str
    imageMime: str = 'image/jpeg'
    width: Optional[int] = None
    height: Optional[int] = None


class PredictResponse(BaseModel):
    success: bool
    smoking: SmokingPrediction
    drowsiness: DrowsinessPrediction

