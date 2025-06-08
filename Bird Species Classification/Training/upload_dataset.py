import os
import pickle
from datasets import load_dataset, DatasetDict
from huggingface_hub import login

login()

# Load dataset
dataset = load_dataset(path='./dataset', cache_dir='./cache')  # expects ImageFolder-style
train_dataset = dataset["train"]  # type: ignore # The entire dataset is under "train" split

split_file = "./pickle/split_indices.pkl"

if os.path.exists(split_file):
    print(f"Loading train/val split from {split_file}")
    with open(split_file, "rb") as f:
        indices = pickle.load(f)
        train_idx = indices["train"]
        val_idx = indices["val"]
else:
    print(f"Generating new train/val split and saving to {split_file}")
    
    # Get stratification labels (e.g., class indices)
    labels = train_dataset["label"] # type: ignore
    
    from sklearn.model_selection import train_test_split
    train_idx, val_idx = train_test_split(
        list(range(len(train_dataset))),
        test_size=0.2,
        stratify=labels,
        random_state=42,
    )

    with open(split_file, "wb") as f:
        pickle.dump({"train": train_idx, "val": val_idx}, f)

# Use Hugging Face select() to create splits
split_dataset = DatasetDict({
    "train": train_dataset.select(train_idx), # type: ignore
    "validation": train_dataset.select(val_idx), # type: ignore
})

# change hub name
split_dataset.push_to_hub("__HUB__NAME")


