import os
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import keras
import urllib.request

# --- THE MAGIC LINE: Force Keras to match the model's bfloat16 data type ---
keras.mixed_precision.set_global_policy("mixed_bfloat16")

# Import the custom layer registration function from your services folder
from app.services.keras_custom_layers import get_custom_objects

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_skin_model = None

# 🔗 PLACE YOUR CLOUD DOWNLOAD LINK HERE
# For Google Drive: Use https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
# For Dropbox: Change the "dl=0" at the end of your link to "dl=1"
MODEL_URL = "YOUR_DIRECT_DOWNLOAD_LINK_HERE"

def load_model():
    global _skin_model
    if _skin_model is None:
        # Determine paths
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        MODEL_PATH = os.path.join(BASE_DIR, "model.keras")
        
        # 🛠️ THE WORKAROUND: If the heavy file isn't on Render, stream it from the cloud
        if not os.path.exists(MODEL_PATH):
            print("Model weights not found locally. Streaming weights from cloud storage...")
            if MODEL_URL == "YOUR_DIRECT_DOWNLOAD_LINK_HERE":
                raise ValueError("Deployment Error: Please replace the MODEL_URL placeholder with your direct cloud link!")
            
            # Programmatically fetch the binary structure
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            print("Cloud weights downloaded successfully!")

        print("Loading Model with your custom layers & mixed precision...")
        custom_objs = get_custom_objects()
        
        _skin_model = keras.models.load_model(
            MODEL_PATH, 
            custom_objects=custom_objs,
            compile=False
        )
        print("Model loaded successfully!")
    return _skin_model

def analyze_photo(image_bytes: bytes):
    model = load_model()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((512, 512))
    img_array = np.array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array)[0]

    class_labels = [
        "acne", "actinic_keratosis", "basal_cell_carcinoma",
        "dermatofibroma", "melanoma", "nevus",
        "pigmented_benign_keratosis", "seborrheic_keratosis",
        "squamous_cell_carcinoma", "vascular_lesion"
    ]

    detected = []
    confidence_scores = {}

    for idx, prob in enumerate(predictions):
        if prob > 0.20:
            condition = class_labels[idx]
            detected.append(condition)
            confidence_scores[condition] = float(prob)

    return {
        "conditions_detected": detected,
        "confidence_scores": confidence_scores
    }

@app.post("/analyze")
async def process_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    results = analyze_photo(image_bytes)
    return results