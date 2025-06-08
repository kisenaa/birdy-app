import os
import json
from PIL import Image, ImageDraw
import matplotlib.pyplot as plt

def visualize_one_coco_image(coco_json_path, images_dir, image_index=0):
    """
    Load the COCO-format JSON at coco_json_path, pick the image at position `image_index`
    in coco['images'], load it from images_dir, draw all its annotations, and show it.

    - coco_json_path: path to your valid.json
    - images_dir:      directory where the images live (filenames must match coco['images'][i]['file_name'])
    - image_index:     which entry in coco['images'] to visualize (0-based)
    """
    # 1) Load the JSON
    with open(coco_json_path, "r") as f:
        coco = json.load(f)

    all_images      = coco["images"]
    all_annotations = coco["annotations"]
    # Build a mapping: image_id -> list of annotation dicts
    anns_by_image = {}
    for ann in all_annotations:
        img_id = ann["image_id"]
        anns_by_image.setdefault(img_id, []).append(ann)

    # 2) Pick one image entry
    if image_index < 0 or image_index >= len(all_images):
        raise IndexError(f"image_index={image_index} out of range (0..{len(all_images)-1})")

    img_info = all_images[image_index]
    img_id   = img_info["id"]
    fname    = img_info["file_name"]
    width    = img_info["width"]
    height   = img_info["height"]

    # 3) Load the actual image file
    image_path = os.path.join(images_dir, fname)
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found:\n  {image_path}")

    pil_img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(pil_img)

    # 4) Draw every bbox for this img_id
    #    In COCO, bbox = [x_min, y_min, box_w, box_h]
    for ann in anns_by_image.get(img_id, []):
        x_min, y_min, box_w, box_h = ann["bbox"]
        x0, y0 = x_min, y_min
        x1 = x_min + box_w
        y1 = y_min + box_h

        # Draw a red rectangle of thickness=2
        for t in range(2):
            draw.rectangle(
                [ (x0 - t, y0 - t), (x1 + t, y1 + t) ],
                outline=(255, 0, 0)
            )

    # 5) Show via matplotlib
    plt.figure(figsize=(8, 8 * (height/width)))
    plt.axis("off")
    plt.imshow(pil_img)
    plt.title(f"Image ID {img_id}  —  {fname}")
    plt.show()


if __name__ == "__main__":
    # — Adjust these two paths to wherever your files live:
    COCO_JSON   = "./coco_annotations/valid.json"
    IMAGES_DIR  = "./valid/images"

    # If you want the very first entry, keep image_index=0. To pick e.g. the fifth image, set=4.
    visualize_one_coco_image(COCO_JSON, IMAGES_DIR, image_index=0)
