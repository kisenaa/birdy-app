import os
import json
from PIL import Image
from tqdm import tqdm

def yolo_to_coco_per_split(split_name, image_dir, label_dir, output_dir):
    """
    Convert one split (e.g. 'train', 'valid', or 'test') from YOLO txt labels
    into a COCO-format JSON file. Saves to `{output_dir}/{split_name}.json`.
    """
    # 1‐category: person → give it category_id = 1
    categories = [
        {
            "id": 0,
            "name": "non-bird",
            "supercategory": "none"
        },
        {
            "id": 1,
            "name": "bird",
            "supercategory": "none"
        }
    ]

    # Build the COCO dict for “split_name”
    coco_dict = {
        "info": {
            "description": f"{split_name} split converted from YOLO",
            "version": "1.0",
            "year": 2025
        },
        "licenses": [],
        "images": [],
        "annotations": [],
        "categories": categories
    }

    image_files = sorted(os.listdir(image_dir))
    ann_id = 1
    # Loop over images
    with tqdm(total=len(image_files), desc=f"Processing {split_name}") as pbar:
        for img_idx, img_fname in enumerate(image_files, start=1):
            image_path = os.path.join(image_dir, img_fname)
            try:
                im = Image.open(image_path)
            except Exception as e:
                print(f"Warning: Could not open {image_path}: {e}")
                pbar.update(1)
                continue

            width, height = im.size
            # 1) Add one entry to "images"
            coco_dict["images"].append({
                "id": img_idx,
                "file_name": img_fname,
                "width": width,
                "height": height
            })

            # 2) Read corresponding YOLO‐txt file
            label_fname = os.path.splitext(img_fname)[0] + ".txt"
            label_path = os.path.join(label_dir, label_fname)
            if not os.path.exists(label_path):
                # If there's no .txt file, skip (or create an empty annotation set)
                pbar.update(1)
                continue

            with open(label_path, "r") as f:
                lines = f.read().strip().splitlines()

            for line in lines:
                parts = line.strip().split()
                if len(parts) != 5:
                    # YOLO format is "class_id x_center y_center width height" (all floats)
                    # If it isn’t length 5, skip
                    continue

                class_id, x_c, y_c, w_norm, h_norm = parts
                class_id = int(class_id)       # e.g. 0 for "person"
                x_c = float(x_c)
                y_c = float(y_c)
                w_norm = float(w_norm)
                h_norm = float(h_norm)

                # Convert normalized YOLO → absolute pixel bbox
                #   YOLO's (x_c, y_c) are relative to image size (0..1), and w_norm/h_norm are also relative.
                bbox_w = w_norm * width
                bbox_h = h_norm * height
                bbox_x = (x_c * width) - bbox_w / 2
                bbox_y = (y_c * height) - bbox_h / 2

                # Make sure we don’t go negative
                if bbox_x < 0:
                    bbox_x = 0.0
                if bbox_y < 0:
                    bbox_y = 0.0
                if bbox_x + bbox_w > width:
                    bbox_w = width - bbox_x
                if bbox_y + bbox_h > height:
                    bbox_h = height - bbox_y

                area = bbox_w * bbox_h

                coco_dict["annotations"].append({
                    "id": ann_id,
                    "image_id": img_idx,
                    "category_id": class_id + 1,  # assuming class_id=0 → category_id=1
                    "bbox": [bbox_x, bbox_y, bbox_w, bbox_h],
                    "area": area,
                    "iscrowd": 0
                })
                ann_id += 1

            pbar.update(1)

    # 3) Write out the JSON
    out_path = os.path.join(output_dir, f"{split_name}.json")
    with open(out_path, "w") as f:
        json.dump(coco_dict, f, indent=2)

    return coco_dict


if __name__ == "__main__":
    base = os.path.dirname(__file__)  # wherever convert_yolo_to_coco.py lives

    splits = {
        "train": {
            "images": os.path.join(base,"train", "images"),
            "labels": os.path.join(base, "train", "labels"),
        },
        "valid": {
            "images": os.path.join(base, "valid", "images"),
            "labels": os.path.join(base,  "valid", "labels"),
        },
        "test": {
            "images": os.path.join(base, "test", "images"),
            "labels": os.path.join(base, "test", "labels"),
        },
    }

    output_dir = os.path.join(base, "coco_annotations")
    os.makedirs(output_dir, exist_ok=True)

    for split_name, paths in splits.items():
        img_dir = paths["images"]
        lbl_dir = paths["labels"]
        if not os.path.isdir(img_dir) or not os.path.isdir(lbl_dir):
            print(f"[Warning] Skipping '{split_name}' because {img_dir} or {lbl_dir} doesn’t exist.")
            continue

        yolo_to_coco_per_split(split_name, img_dir, lbl_dir, output_dir)
        print(f"→ Saved {split_name}.json to {output_dir}")
