from fastapi import FastAPI, HTTPException
from threading import Lock

from app.inference.model_loader import registry
from app.inference.predictor import predict_smoking, predict_drowsiness
from app.schemas import PredictRequest, PredictResponse
from app.utils.image_utils import decode_image, resize_to_max_edge


app = FastAPI(title='YOLO Inference Service')

inference_lock = Lock()


@app.on_event('startup')
def _startup():
    registry.load()


@app.get('/health')
def health():
    return {
        'ok': True,
        'loaded': registry.loaded,
        'smoking_label_map': registry.smoking_label_map,
        'drowsiness_label_map': registry.drowsiness_label_map
    }


@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest):
    if not registry.loaded:
        raise HTTPException(status_code=503, detail='Models not loaded yet')

    try:
        image = decode_image(req.imageBase64)
        image = resize_to_max_edge(image)

        # Serialize inference to avoid GPU/CPU contention and keep latency stable.
        with inference_lock:
            smoking = predict_smoking(image)
            drowsiness = predict_drowsiness(image)

        return PredictResponse(success=True, smoking=smoking, drowsiness=drowsiness)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

