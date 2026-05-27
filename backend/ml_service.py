import os
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import keras
import urllib.request
import re

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

def load_model():
    global _skin_model
    if _skin_model is None:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        MODEL_PATH = os.path.join(BASE_DIR, "model.keras")
        
        # 🛠️ AUTOMATED WORKAROUND: Handle Google Drive's 2.5GB virus confirmation shield
        if not os.path.exists(MODEL_PATH):
            print("Model weights not found locally. Initializing 2.5GB cloud stream from Google Drive...")
            file_id = "1eR3KfGAlJzC8KCCyJ5EqW7sqXQB9gRMz"
            base_url = "https://docs.google.com/uc?export=download"
            url = f"{base_url}&id={file_id}"
            
            try:
                opener = urllib.request.build_opener()
                opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')]
                
                with opener.open(url) as response:
                    content = response.read()
                
                content_str = content.decode('utf-8', errors='ignore')
                confirm_match = re.search(r'confirm=([0-9A-Za-z_-]+)', content_str)
                
                if confirm_match:
                    token = confirm_match.group(1)
                    print(f"Large file warning bypassed. Streaming 2.5GB weights with token: {token}")
                    url = f"{base_url}&id={file_id}&confirm={token}"
                    
                    with opener.open(url) as response:
                        content = response.read()
                
                with open(MODEL_PATH, 'wb') as f:
                    f.write(content)
                print("Cloud weights downloaded successfully!")
                
            except Exception as e:
                raise RuntimeError(f"Automated Google Drive streaming sequence failed: {e}")

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