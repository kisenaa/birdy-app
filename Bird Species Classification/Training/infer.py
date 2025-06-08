from typing import cast
import torch
from transformers import AutoImageProcessor, Dinov2WithRegistersConfig
from PIL import Image
import torch.nn.functional as F
from model import CustomDinoV2ClassifierWithReg
from config import BASE_MODEL_NAME, NUM_CLASSES , HIDDEN_DIM

checkpoint_path = "./backup/results/checkpoint-602"

# Load processor and fine-tuned DinoV2
processor = AutoImageProcessor.from_pretrained(BASE_MODEL_NAME, cache_dir="./cache", use_fast=True)
config = cast(Dinov2WithRegistersConfig, Dinov2WithRegistersConfig.from_pretrained(checkpoint_path, cache_dir="./cache"))
model = CustomDinoV2ClassifierWithReg.from_pretrained(
    checkpoint_path,
    config=config,
    num_classes=NUM_CLASSES,
    hidden_dim=HIDDEN_DIM,
    cache_dir="./cache"
)

# If our model is only weight (Not exported with base model, we should load the weight)
'''
# Load weights from checkpoint
checkpoint_path = "./backup/results/checkpoint-602/model.safetensors"
state_dict = load_file(checkpoint_path)
model.load_state_dict(state_dict)
'''

# Set model to eval mode and move to GPU if available
model.eval()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device) # type: ignore

# Test an image
image = Image.open(r".\Dataset\Acridotheres javanicus\Javan Myna_Acridotheres javanicus_1.jpg").convert("RGB")
inputs = processor(images=image, return_tensors="pt").to(device)

with torch.no_grad():
    outputs = model(**inputs)
    probs = F.softmax(outputs.logits, dim=-1)
    pred_id = int(torch.argmax(probs, dim=-1).item()) 
    confidence = probs[0][pred_id].item()  

print(pred_id, confidence)