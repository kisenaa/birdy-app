import torch
import onnxruntime as ort
from transformers import AutoImageProcessor
from PIL import Image
import numpy as np
from config import BASE_MODEL_NAME, NUM_CLASSES , HIDDEN_DIM
from torchvision import transforms

# Constants (same as in PyTorch)
IMAGE_PATH = r".\Dataset\Acridotheres javanicus\Javan Myna_Acridotheres javanicus_1.jpg"
ONNX_PATH = "./quant/baseQUInt8_quantized_dynamic.onnx"  # Path to the ONNX model

# Preprocess image using HuggingFace processor
processor = AutoImageProcessor.from_pretrained(BASE_MODEL_NAME, cache_dir="./cache", use_fast=False)
image = Image.open(IMAGE_PATH).convert("RGB")
inputs = processor(images=image, return_tensors="np")  # use numpy instead of torch

# ONNX expects float32 inputs
pixel_values = inputs["pixel_values"].astype(np.float32)  # shape: (1, 3, 224, 224)

# Step 2–6: Compose transforms
transform = transforms.Compose([
    transforms.Resize(256, interpolation=transforms.InterpolationMode.BICUBIC),  # shortest edge = 256
    transforms.CenterCrop(224),                                                 # crop to 224x224
    transforms.ToTensor(),                                                      # converts to tensor, scales to [0, 1]
    transforms.Normalize(mean=[0.485, 0.456, 0.406],                             # normalize
                         std=[0.229, 0.224, 0.225])
])

# NCHW [1, 3, 224, 224]
''' 
image_tensor = transform(image).unsqueeze(0)   # shape: [3, 224, 224]
print(image_tensor.numpy().flatten()[:10])
image_np = image_tensor.detach().cpu().numpy()
'''

# NHWC [1, 224, 224, 3]
tensor_chw = transform(image)  # shape: [3, 224, 224]
tensor_nhwc = tensor_chw.permute(1, 2, 0)  # shape: [224, 224, 3]
image_np = tensor_nhwc.unsqueeze(0).detach().cpu().numpy().astype(np.float32)

# Run inference
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

sess_options.log_severity_level = 4
session = ort.InferenceSession(ONNX_PATH, sess_options, providers=["CPUExecutionProvider"])  # or "CUDAExecutionProvider"
input_name = session.get_inputs()[0].name  # 'pixel_values'
output_name = session.get_outputs()[0].name  # 'logits'

import time
start_time = time.perf_counter()
outputs = session.run([output_name], {input_name: image_np})  # list of outputs

# Softmax and prediction
logits = np.array(outputs[0])
exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))  # stable softmax
probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)
pred_id = int(np.argmax(probs))
confidence = float(probs[0][pred_id])
print(f"Prediction took {time.perf_counter() - start_time:.4f} seconds")
print(f"Predicted class ID: {pred_id}, Confidence: {confidence:.4f}")
