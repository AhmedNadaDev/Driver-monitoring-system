from typing import List, Dict, Any, Optional

from ultralytics.engine.results import Results

from app.config import CONF_THRES, IMAGE_MAX_EDGE, DEVICE
from app.inference.model_loader import registry


def _boxes_to_payload(result: Results, label_map: Dict[int, str]) -> List[Dict[str, Any]]:
    boxes_out = []
    if result is None or result.boxes is None:
        return boxes_out

    boxes = result.boxes
    cls = boxes.cls
    conf = boxes.conf
    xyxy = boxes.xyxy

    # Convert tensors to python lists (results count is usually small).
    cls_list = cls.tolist() if hasattr(cls, 'tolist') else list(cls)
    conf_list = conf.tolist() if hasattr(conf, 'tolist') else list(conf)
    xyxy_list = xyxy.tolist() if hasattr(xyxy, 'tolist') else list(xyxy)

    for i in range(len(cls_list)):
        class_id = int(cls_list[i])
        label = label_map.get(class_id)
        if not label:
            continue
        confidence = float(conf_list[i])
        x1, y1, x2, y2 = map(float, xyxy_list[i])
        boxes_out.append(
            {
                'label': label,
                'confidence': confidence,
                'xyxy': [x1, y1, x2, y2]
            }
        )
    return boxes_out


def predict_smoking(image) -> Dict[str, Any]:
    if not registry.loaded or registry.smoking_model is None:
        raise RuntimeError('Smoking model not loaded')

    predict_kwargs = {
        'source': image,
        'conf': CONF_THRES,
        'imgsz': IMAGE_MAX_EDGE,
        'verbose': False
    }
    if DEVICE:
        predict_kwargs['device'] = DEVICE
    results = registry.smoking_model.predict(**predict_kwargs)
    result = results[0] if results else None
    boxes = _boxes_to_payload(result, registry.smoking_label_map)

    if not boxes:
        return {
            'detected': False,
            'label': None,
            'confidence': 0.0,
            'boxes': []
        }

    top = max(boxes, key=lambda b: b['confidence'])
    detected = True
    return {
        'detected': detected,
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }


def predict_drowsiness(image) -> Dict[str, Any]:
    if not registry.loaded or registry.drowsiness_model is None:
        raise RuntimeError('Drowsiness model not loaded')

    predict_kwargs = {
        'source': image,
        'conf': CONF_THRES,
        'imgsz': IMAGE_MAX_EDGE,
        'verbose': False
    }
    if DEVICE:
        predict_kwargs['device'] = DEVICE
    results = registry.drowsiness_model.predict(**predict_kwargs)
    result = results[0] if results else None
    boxes = _boxes_to_payload(result, registry.drowsiness_label_map)

    if not boxes:
        # If nothing clears the confidence threshold, treat as awake.
        return {
            'detected': False,
            'label': 'awake',
            'confidence': 0.0,
            'boxes': []
        }

    top = max(boxes, key=lambda b: b['confidence'])
    detected = top['label'] == 'drowsy'
    return {
        'detected': detected,
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }

