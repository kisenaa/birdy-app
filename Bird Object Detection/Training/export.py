import os
if __name__ == "__main__":
    print("Exporting YOLO model to ONNX format...")
    import torch
    from ultralytics import YOLO

    # Replace with your YOLO model path
    model_path = 'best.pt'  # or 'yolov5s.pt', etc.

    print(f"is cuda available: {torch.cuda.is_available()}")
    model = YOLO(model_path).to(device='cuda' if torch.cuda.is_available() else 'cpu')

    model.export(format="tflite", half=True, nms=False, batch=1, device='cuda', data='./bird_datasets/data.yaml')  # creates 'yolo11n_float32.tflite'


