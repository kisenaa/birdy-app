import torch
from ultralytics import YOLO
import os
from clearml import Task


# Change this every time you train new model
training_name = "bird-detect3" 

def train_yolo():
    task = Task.init(project_name="Mobile Programming - Bird", task_name=training_name)

    device = 'cpu' 
    if torch.xpu.is_available():      # Intel XPU
        device = 'xpu'
    elif torch.cuda.is_available():   # Nvidia CUDA / Amd ROCm
        device = 'cuda' 

        num_gpus = torch.cuda.device_count()
        if num_gpus > 1:
            device = list(range(num_gpus)) 

    # Check last trained model
    last_model_path = f"./run/{training_name}/weights/last.pt"
    if os.path.isfile(last_model_path):
        print(f"Model training result path alrady exist at {last_model_path}")
        print(f"change name if dont want resume")
        model = YOLO(last_model_path).to(device=device)
        model.train(resume=True)
    else:
        model = YOLO('yolo11s.pt')
        model.train(
            data            = './datasets/data.yaml',
            epochs          = 150,
            imgsz           = 640,
            batch           = 32, # Lower batch size according to your gpu VRAM
            device          = device,
            project         = './run',
            name            = training_name,
            patience        = 25,
            optimizer       = 'SGD',
            lr0             = 0.0001,
            momentum        = 0.999
        )

if __name__ == "__main__":
    train_yolo()