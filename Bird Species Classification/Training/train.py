'''
    Original File. Use train.ipynb for newer version
'''
import os
import pickle
import torch
import torch.nn as nn
from typing import List, Optional, cast
import numpy as np
from PIL import Image
from glob import glob
from copy import deepcopy
from datetime import datetime
from sklearn.model_selection import train_test_split
from transformers import AutoImageProcessor, Dinov2WithRegistersModel, Dinov2WithRegistersConfig
from transformers.trainer import Trainer
from transformers.training_args import TrainingArguments
from torch.utils.data import Dataset
from transformers.data.data_collator import default_data_collator
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import LabelEncoder
from transformers.trainer_callback import EarlyStoppingCallback, TrainerCallback
from torchvision import transforms
from config import BASE_MODEL_NAME, NUM_CLASSES , HIDDEN_DIM, DATASET_DIR
from model import CustomDinoV2ClassifierWithReg

# Train Config
BATCH_SIZE  = 32
NUM_EPOCHS  = 50

# 1. Load pretrained DINOv2 backbone + processor
processor = AutoImageProcessor.from_pretrained(BASE_MODEL_NAME, cache_dir="./cache", use_fast=True)
config = cast(Dinov2WithRegistersConfig, Dinov2WithRegistersConfig.from_pretrained(BASE_MODEL_NAME, cache_dir="./cache"))

model = CustomDinoV2ClassifierWithReg.from_pretrained(
    BASE_MODEL_NAME,
    config=config,
    num_classes=NUM_CLASSES,
    hidden_dim=HIDDEN_DIM,
    cache_dir="./cache",
)

# Optionally Freeze backbone
'''
model.backbone.requires_grad_(False)
for param in model.backbone.parameters():
    param.requires_grad = False
'''

# 2. Load image from DATASET DIR
image_paths = []
labels = []
for class_folder in os.listdir(DATASET_DIR):
    class_path = os.path.join(DATASET_DIR, class_folder)
    if os.path.isdir(class_path):
        # Assume images are jpg/png inside
        for img_file in glob(os.path.join(class_path, "*.*")):
            image_paths.append(img_file)
            labels.append(class_folder)

print(f"Total images: {len(image_paths)}, classes: {len(set(labels))}")

# 3. Encode labels as integers
label_encoder_path = "./pickle/label_encoder.pkl"
if os.path.exists(label_encoder_path):
    with open(label_encoder_path, "rb") as f:
        le = pickle.load(f)
    print("LabelEncoder loaded from file.")
else:
    le = LabelEncoder()
    with open(label_encoder_path, "wb") as f:
        pickle.dump(le, f)
    print("LabelEncoder created and saved to file.")

labels_encoded = le.fit_transform(labels)
for original_label, encoded_label in zip(le.classes_, range(len(le.classes_))):
    print(f"{original_label} -> {encoded_label}")

# 4. Generate Train and Test Split
split_file = "./pickle/split_indices.pkl"
if os.path.exists(split_file):
    print(f"Loading train/val split from {split_file}")
    with open(split_file, "rb") as f:
        indices = pickle.load(f)
        train_idx = indices["train"]
        val_idx = indices["val"]
else:
    print(f"Generating new train/val split and saving to {split_file}")
    train_idx, val_idx = train_test_split(
        range(len(image_paths)), test_size=0.2, stratify=labels_encoded, random_state=42
    )
    with open(split_file, "wb") as f:
        pickle.dump({"train": train_idx, "val": val_idx}, f)

# 5. Custom Dataset
class BirdDataset(Dataset):
    def __init__(self, image_paths: List[str], labels: List[int], processor: AutoImageProcessor, augment = False):
        self.image_paths = image_paths
        self.labels = labels
        self.processor = processor
        self.augment = augment
        self.augmentations = transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(0.1, 0.1, 0.1, 0.05),
        ])


    def __len__(self) -> int:
        """Returns the total number of images in the dataset."""
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> dict:
        # Load the image (using PIL)
        image = Image.open(self.image_paths[idx]).convert("RGB")
        
        # Retrieve the label (already encoded as an integer)
        label = self.labels[idx]

        if self.augment:
            image = self.augmentations(image)
        
        # Use processor to prepare the image for the model
        encoding = self.processor(images=image, return_tensors="pt") # type: ignore
        
        # Return the processed image (pixel_values) and the label
        return {"pixel_values": encoding["pixel_values"].squeeze(0), "label": torch.tensor(label)}

# 6. Split data into training and validation sets using the indices
train_image_paths = [image_paths[i] for i in train_idx]
train_labels = [labels_encoded[i] for i in train_idx] # type: ignore

val_image_paths = [image_paths[i] for i in val_idx]
val_labels = [labels_encoded[i] for i in val_idx] # type: ignore

# Create dataset objects for train and validation
train_dataset = BirdDataset(train_image_paths, train_labels, processor, augment=True) # type: ignore
val_dataset = BirdDataset(val_image_paths, val_labels, processor) # type: ignore

# Use default data collator to handle batching
data_collator = default_data_collator

# 7. Add Callback and Metrics for Training
def compute_metrics(eval_pred):
    logits, labels = eval_pred.predictions, eval_pred.label_ids
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds, average="weighted"),
    }

early_stopping_callback = EarlyStoppingCallback(
    early_stopping_patience=5,  # Stop after 5 epochs without improvement
    early_stopping_threshold=0.0001,  # Minimum improvement to reset the patience counter
)

class TrainingDataInfoCallback(TrainerCallback):
    def __init__(self, trainer) -> None:
        super().__init__()
        self._trainer = trainer
        self._header_printed = False
    
    def on_epoch_end(self, args, state, control, **kwargs): # type: ignore
        if control.should_evaluate:
            control_copy = deepcopy(control)
            self._trainer.evaluate(eval_dataset=self._trainer.train_dataset, metric_key_prefix="train")
            return control_copy
        

current_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
output_dir = f"./results/{current_time}"
logging_dir = f"./logs/{current_time}"

# Change to "steps" strategy for non aggressive model saving
training_args = TrainingArguments(
    output_dir=output_dir,                   # output directory where the model checkpoints will be saved
    eval_strategy="epoch",                   # Evaluate after each epoch
    save_strategy="epoch",
    learning_rate=4e-5,                      # Learning rate for Adam optimizer . use 1e-5 if batch size = 16
    per_device_train_batch_size=BATCH_SIZE,  # Batch size for training
    per_device_eval_batch_size=BATCH_SIZE,   # Batch size for evaluation
    num_train_epochs=NUM_EPOCHS,             # Number of training epochs
    weight_decay=0.01,                       # Weight decay for optimization
    logging_dir=logging_dir,                 # Directory for logs
    logging_strategy="epoch",                # log after every epoch
    save_steps=2000,                         # Save checkpoint every 500 steps
    save_total_limit= 5,
    load_best_model_at_end=True,             # Load the best model when training finishes
    metric_for_best_model="accuracy",        # Metric to use for best model selection
    lr_scheduler_type = "cosine",
    warmup_ratio= 0.04,
    max_grad_norm=1.0, 
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=data_collator,
    compute_metrics=compute_metrics,
    callbacks=[early_stopping_callback],
)
trainer.add_callback(TrainingDataInfoCallback(trainer)) 

print(output_dir)
print(logging_dir)

if __name__ == "__main__":
    try:
        os.environ["TRANSFORMERS_NO_TF"] = "1"
        trainer.train()
        model.save_pretrained(output_dir)
        processor.save_pretrained(output_dir)
    except (KeyboardInterrupt, InterruptedError):
        pass
    except Exception as e:
        print(f"{e}")