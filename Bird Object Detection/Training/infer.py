'''
    Inference with NMS embedded on the model (Nvidia TensorRT , Cuda and CPU)
'''
import cv2
import numpy as np
import onnxruntime
import time
import os

# Load cuda and cudnn dlls. If not installed, import torch with CUDA support before import onnxruntime
model_path = "./bestfp32_nhwc.onnx"
sess_options = onnxruntime.SessionOptions()
sess_options.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
sess_options.log_severity_level = 1
session = onnxruntime.InferenceSession(model_path, sess_options, providers=['CPUExecutionProvider']) #TensorrtExecutionProvider
# Print optimized graph

# get the outputs metadata as a list of :class:`onnxruntime.NodeArg`
output_name = session.get_outputs()[0].name

# get the inputs metadata as a list of :class:`onnxruntime.NodeArg`
input_name = session.get_inputs()[0].name

class_names = ['bird']  

def preprocess(image, input_size=(640, 640)):
    """
    Preprocess the image: convert BGR to RGB, resize, normalize, and reformat dimensions.
    """
    # Convert to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # Resize to model input size
    resized = cv2.resize(image_rgb, input_size)
    print(f"Resized image shape: {resized.shape}")  # Debugging line to check resized shape
    # Normalize (0-255 -> 0-1)
    normalized = resized.astype(np.float32) / 255.0
    # Change shape from (H, W, C) to (C, H, W)
    #transposed = np.transpose(normalized, (2, 0, 1))
    # Add batch dimension: (1, C, H, W)
    input_tensor = np.expand_dims(normalized, axis=0)
    return input_tensor

def postprocess(outputs, conf_threshold):
    """
    Postprocess ONNX model output with expected output shape (1, 300, 6).
    """
    # Remove the batch dimension: shape becomes (300, 6)
    detections = np.squeeze(outputs[0], axis=0)
    
    boxes = []
    for det in detections:
        # det is expected to be an array with 6 elements: [x1, y1, x2, y2, score, class_id]
        x1, y1, x2, y2, score, class_id = det
        
        if score >= conf_threshold:
            boxes.append([x1, y1, x2, y2, score, int(class_id)])
            
    return boxes

# Open a connection to the webcam
image_path = './_MG_4080_jpg.rf.d8fa547169cc0ca415f30a1cdd440a91.jpg'  # <-- replace with your image path
frame = cv2.imread(image_path)

if frame is None:
    raise FileNotFoundError(f"Image not found: {image_path}")

try:
    # Preprocess the frame to match model input
    input_tensor = preprocess(frame, input_size=(640, 640))

    # Run inference with the ONNX model
    import time
    start_time = time.perf_counter()
    outputs = session.run([output_name], {input_name: input_tensor})
    end_time = time.perf_counter()
    print(f"Inference time: {end_time - start_time:.4f} seconds")

    # Postprocess outputs: filter detections by confidence
    detections = postprocess(outputs, conf_threshold=0.25)


    # Draw detections on the original frame
    for det in detections:
        x1, y1, x2, y2, score, class_id = det

        # If the model's coordinates are based on the resized input,
        # scale them back to the original frame dimensions:
        h_orig, w_orig = frame.shape[:2]
        x_scale = w_orig / 640
        y_scale = h_orig / 640
        x1 = int(x1 * x_scale)
        y1 = int(y1 * y_scale)
        x2 = int(x2 * x_scale)
        y2 = int(y2 * y_scale)

        # Draw the bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{class_names[class_id]}: {score:.2f}"
        cv2.putText(frame, label, (x1 + 5, y1 + 17), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Display the frame with drawn detections
    cv2.imshow("output", frame)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
except Exception as e:
    print(f"An unexpected error occurred: {e}")
