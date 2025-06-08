import os
import argparse
import json

def coco_to_yolo(coco_json_path: str, output_dir: str):
    """
    Given a COCO-format JSON file, create YOLO-format .txt files (one per image),
    using normalized bbox coordinates and zero-based class indices.
    """

    # 1) Load COCO JSON
    with open(coco_json_path, 'r') as f:
        coco = json.load(f)

    # 2) Build a mapping from original COCO category_id -> YOLO class index (0,1,2,…)
    #    We enumerate through coco['categories'] in the order they appear.
    cat_id_to_yolo: dict = {}
    for idx, cat in enumerate(coco.get("categories", [])):
        original_id = cat["id"]
        cat_id_to_yolo[original_id] = idx

    # 3) Gather image info: image_id -> (file_name, width, height)
    img_info: dict = {}
    for img in coco.get("images", []):
        img_id   = img["id"]
        fname    = img["file_name"]
        w, h     = img["width"], img["height"]
        img_info[img_id] = {
            "file_name": fname,
            "width": w,
            "height": h
        }

    # 4) Group annotations by image_id
    ann_per_image: dict = {img_id: [] for img_id in img_info.keys()}
    for ann in coco.get("annotations", []):
        img_id     = ann["image_id"]
        bbox       = ann["bbox"]        # [x_min, y_min, box_width, box_height]
        cat_id     = ann["category_id"] # original COCO category ID
        # Skip any annotation whose image_id is not in coco['images']
        if img_id not in ann_per_image:
            continue
        ann_per_image[img_id].append({
            "bbox": bbox,
            "category_id": cat_id
        })

    # 5) Ensure output_dir exists
    os.makedirs(output_dir, exist_ok=True)

    # 6) For each image, compute YOLO lines and write a .txt
    for img_id, info in img_info.items():
        fname    = info["file_name"]
        width    = info["width"]
        height   = info["height"]
        anns     = ann_per_image.get(img_id, [])

        # Build the text lines:
        #   <yolo_class_id> <x_center_norm> <y_center_norm> <w_norm> <h_norm>
        lines = []
        for ann in anns:
            x_min, y_min, box_w, box_h = ann["bbox"]
            original_cat_id = ann["category_id"]

            # Compute center in pixels:
            x_center = x_min + (box_w / 2.0)
            y_center = y_min + (box_h / 2.0)

            # Normalize:
            x_center_norm = x_center / width
            y_center_norm = y_center / height
            w_norm        = box_w    / width
            h_norm        = box_h    / height

            # Map to a zero-based YOLO class index:
            yolo_cat = cat_id_to_yolo.get(original_cat_id, None)
            if yolo_cat is None:
                # If the annotation’s category_id wasn't in coco['categories'], skip it
                continue

            line = f"{yolo_cat} " \
                   f"{x_center_norm:.6f} " \
                   f"{y_center_norm:.6f} " \
                   f"{w_norm:.6f} " \
                   f"{h_norm:.6f}"
            lines.append(line)

        # Write the .txt file (same basename as image, but .txt)
        base, _ext = os.path.splitext(fname)
        txt_fname = f"{base}.txt"
        txt_path  = os.path.join(output_dir, txt_fname)

        with open(txt_path, "w") as out_f:
            if lines:
                out_f.write("\n".join(lines))
            else:
                # Create an empty file if there are no annotations
                out_f.write("")

    print(f"Converted COCO annotations → YOLO .txt files in: {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert COCO-format JSON annotations into YOLO-format .txt labels (one file per image)."
    )
    parser.add_argument(
        "--coco_json", 
        type=str, 
        required=True,
        help="Path to the COCO-format JSON (e.g. `instances_train2017.json`)."
    )
    parser.add_argument(
        "--output_dir", 
        type=str, 
        required=True,
        help="Directory where the YOLO-format .txt files will be written. "
             "One .txt per image with same basename as the image."
    )

    args = parser.parse_args()
    coco_to_yolo(args.coco_json, args.output_dir)
