# pip install ultralytics roboflow

from ultralytics import YOLO
import os
import json

from roboflow import Roboflow
rf = Roboflow(api_key="44FwJI2Sq2u6nqmVpDGE")
project = rf.workspace("takoyati").project("cigarette-vape-detection")
version = project.version(14)
dataset = version.download("yolov8")

print(dataset.location)

os.listdir(dataset.location)

data_yaml = dataset.location + "/data.yaml"
print(data_yaml)

model = YOLO("yolov8n.pt")

model.train(
    data=data_yaml,
    epochs=10,
    imgsz=640
)

model = YOLO("/content/runs/detect/train/weights/best.pt")

# In Colab: uploaded = files.upload()
# For local use, set image_path manually:
# image_path = "your_image.jpg"
from google.colab import files
uploaded = files.upload()

image_path = list(uploaded.keys())[0]
print(image_path)

results = model(image_path)

result = results[0]

boxes = result.boxes.xyxy
conf = result.boxes.conf
cls = result.boxes.cls
names = result.names

for box, c, cl in zip(boxes, conf, cls):
    print("Class:", names[int(cl)])
    print("Confidence:", float(c))
    print("BBox:", box.tolist())
    print("------------")

from IPython.display import Image, display
from PIL import Image as PILImage

pil_img = PILImage.open(image_path)

converted_image_path = "converted_image.png"

pil_img.save(converted_image_path)

display(Image(filename=converted_image_path))
