# --- Cell 1: Install dependencies ---
# Run in terminal: pip install ultralytics roboflow

# --- Cell 2: Download dataset from Roboflow ---
from roboflow import Roboflow

rf = Roboflow(api_key="U5Flfxv2gUkTT4gZ4io8")
project = rf.workspace("ctufinalthesis").project("drowsinessdetectionyolov8-test2")
version = project.version(9)
dataset = version.download("yolov8")

# --- Cell 3: Train YOLOv8 model ---
from ultralytics import YOLO

model = YOLO("yolov8n.pt")
model.train(
    data="/content/DrowsinessDetectionYolov8-Test2-9/data.yaml",
    epochs=10,
    imgsz=640,
    batch=16
)

# --- Cell 4: Check CUDA / GPU availability ---
import torch

print("CUDA available:", torch.cuda.is_available())
print("Device:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")

# --- Cell 5: Remove dataset folder to free space ---
import shutil

shutil.rmtree("/content/DrowsinessDetectionYolov8-Test2-9")

# --- Cell 6: Download best model weights ---
# Colab-only originally; replaced with a local copy operation
import shutil

src_weights = "runs/detect/train3/weights/best.pt"
dst_weights = "best.pt"
shutil.copy(src_weights, dst_weights)
print(f"Weights saved to: {dst_weights}")

# --- Cell 7: Zip the runs folder ---
import zipfile
import os

runs_dir = "runs"
zip_path = "runs.zip"

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(runs_dir):
        for file in files:
            file_path = os.path.join(root, file)
            zf.write(file_path, os.path.relpath(file_path))

print(f"Runs folder zipped to: {zip_path}")

# --- Cell 8: Download runs.zip ---
# Colab-only originally; the zip file is already saved locally as runs.zip (see Cell 7)
print("runs.zip is ready for use in the current directory.")
