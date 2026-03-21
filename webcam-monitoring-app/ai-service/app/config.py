import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

SMOKING_MODEL_PATH = os.getenv(
    'SMOKING_MODEL_PATH',
    os.getenv('AI_SMOKING_MODEL_PATH', './models/smoking_model.pt')
)
DROWSINESS_MODEL_PATH = os.getenv(
    'DROWSINESS_MODEL_PATH',
    os.getenv('AI_DROWSINESS_MODEL_PATH', './models/drowsiness_model.pt')
)

CONF_THRES = float(os.getenv('AI_CONF_THRES', '0.25'))
IMAGE_MAX_EDGE = int(os.getenv('AI_IMAGE_MAX_EDGE', '640'))

DEVICE = os.getenv('AI_DEVICE', '').strip()  # '' = Ultralytics auto

