import cv2
import numpy as np
import tensorflow as tf

# ── Letterbox Preprocessing ───────────────────────────────────────────────────
def preprocess(image, input_size=(640, 640), fill_value=114):
    """
    Resize and pad image to keep aspect ratio consistent with model training (letterbox style).
    Returns: tensor, scale, top, left for later coordinate correction.
    """
    ih, iw = image.shape[:2]
    h, w = input_size
    scale = min(w / iw, h / ih)
    nw, nh = int(iw * scale), int(ih * scale)

    # Resize image
    image_resized = cv2.resize(image, (nw, nh))
    # Padding to (h, w)
    image_padded = np.full((h, w, 3), fill_value, dtype=np.uint8)
    top = (h - nh) // 2
    left = (w - nw) // 2
    image_padded[top:top + nh, left:left + nw] = image_resized

    # BGR to RGB, normalize
    image_rgb = cv2.cvtColor(image_padded, cv2.COLOR_BGR2RGB)
    image_norm = image_rgb.astype(np.float32) / 255.0
    input_tensor = np.expand_dims(image_norm, axis=0)  # BCHW

    return input_tensor, scale, top, left

# ── Load TFLite model ─────────────────────────────────────────────────────────
TFLITE_MODEL_PATH = r".\best_saved_model\best_float16.tflite"
interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH, num_threads=6)
interpreter.allocate_tensors()

input_details  = interpreter.get_input_details()[0]
output_details = interpreter.get_output_details()[0]
print("Model input shape:", input_details["shape"], "dtype:", input_details["dtype"])

# ── Load image and preprocess ─────────────────────────────────────────────────
IMAGE_PATH = "_MG_4080_jpg.rf.d8fa547169cc0ca415f30a1cdd440a91.jpg"
orig = cv2.imread(IMAGE_PATH)
if orig is None:
    raise FileNotFoundError(f"Image not found at '{IMAGE_PATH}'")

input_tensor, scale, top, left = preprocess(orig, input_size=tuple(input_details["shape"][1:3]))

# Quantize input if needed
if input_details["dtype"] == np.uint8:
    input_scale, input_zero_point = input_details["quantization"]
    input_tensor = (input_tensor / input_scale + input_zero_point).astype(np.uint8)

# ── Run inference ─────────────────────────────────────────────────────────────
interpreter.set_tensor(input_details["index"], input_tensor)
import time
start = time.perf_counter()
interpreter.invoke()
end = time.perf_counter()
outputs = interpreter.get_tensor(output_details["index"])  # shape [1, N, 6]
print(f"Inference time: {end - start:.4f} seconds")
# ── Postprocess ───────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.25
CLASS_NAMES = ["bird"]
h_orig, w_orig = orig.shape[:2]

for x1, y1, x2, y2, score, cls in outputs[0]:
    if score < CONF_THRESHOLD:
        continue

    # Undo letterbox: model output is in 640x640 space
    x1p = x1 * 640
    y1p = y1 * 640
    x2p = x2 * 640
    y2p = y2 * 640

    # Remove padding, scale back to original size
    x1o = int((x1p - left) / scale)
    y1o = int((y1p - top) / scale)
    x2o = int((x2p - left) / scale)
    y2o = int((y2p - top) / scale)

    # Clamp to image boundaries
    x1o, y1o = max(x1o, 0), max(y1o, 0)
    x2o, y2o = min(x2o, w_orig - 1), min(y2o, h_orig - 1)

    # Draw detection
    cv2.rectangle(orig, (x1o, y1o), (x2o, y2o), (0, 255, 0), 2)
    label = f"{CLASS_NAMES[int(cls)]}: {score:.2f}"
    cv2.putText(orig, label, (x1o, y1o - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

# ── Display Result ────────────────────────────────────────────────────────────
cv2.imshow("TFLite YOLOv11 Inference", orig)
cv2.waitKey(0)
cv2.destroyAllWindows()


'''
NO LETTER BOX
import cv2
import numpy as np
import tensorflow as tf

# ── Direct Resize Preprocessing ───────────────────────────────────────────────
def preprocess(image, input_size=(640, 640)):
    """
    Resize and normalize the image directly without keeping aspect ratio.
    Returns input_tensor and original image size.
    """
    orig_h, orig_w = image.shape[:2]
    resized = cv2.resize(image, input_size)
    image_rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    image_norm = image_rgb.astype(np.float32) / 255.0
    input_tensor = np.expand_dims(image_norm, axis=0)  # (1, H, W, C)
    return input_tensor, orig_w, orig_h

# ── Load TFLite model ─────────────────────────────────────────────────────────
TFLITE_MODEL_PATH = r".\best_saved_model\best_float32.tflite"
interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()[0]
output_details = interpreter.get_output_details()[0]
input_h, input_w = input_details["shape"][1:3]
print("Model input shape:", input_details["shape"], "dtype:", input_details["dtype"])

# ── Load image and preprocess ─────────────────────────────────────────────────
IMAGE_PATH = "_MG_4080_jpg.rf.d8fa547169cc0ca415f30a1cdd440a91.jpg"
orig = cv2.imread(IMAGE_PATH)
if orig is None:
    raise FileNotFoundError(f"Image not found at '{IMAGE_PATH}'")

input_tensor, orig_w, orig_h = preprocess(orig, input_size=(input_w, input_h))

# Quantize input if needed
if input_details["dtype"] == np.uint8:
    input_scale, input_zero_point = input_details["quantization"]
    input_tensor = (input_tensor / input_scale + input_zero_point).astype(np.uint8)

# ── Run inference ─────────────────────────────────────────────────────────────
interpreter.set_tensor(input_details["index"], input_tensor)
interpreter.invoke()
outputs = interpreter.get_tensor(output_details["index"])  # [1, N, 6]

# ── Postprocess ───────────────────────────────────────────────────────────────
CONF_THRESHOLD = 0.25
CLASS_NAMES = ["bird"]

for x1, y1, x2, y2, score, cls in outputs[0]:
    if score < CONF_THRESHOLD:
        continue

    # Scale back to original size
    x1o = int(x1 * orig_w)
    y1o = int(y1 * orig_h)
    x2o = int(x2 * orig_w)
    y2o = int(y2 * orig_h)

    # Clamp
    x1o, y1o = max(x1o, 0), max(y1o, 0)
    x2o, y2o = min(x2o, orig_w - 1), min(y2o, orig_h - 1)

    cv2.rectangle(orig, (x1o, y1o), (x2o, y2o), (0, 255, 0), 2)
    label = f"{CLASS_NAMES[int(cls)]}: {score:.2f}"
    cv2.putText(orig, label, (x1o, y1o - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

# ── Display ───────────────────────────────────────────────────────────────────
cv2.imshow("TFLite YOLOv11 Inference (Resized)", orig)
cv2.waitKey(0)
cv2.destroyAllWindows()

'''