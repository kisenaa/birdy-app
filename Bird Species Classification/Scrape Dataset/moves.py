'''
    Move inaturalist image to destination directory
    Todo: Need to actually compare raw bytes to check if the file is the same or not
'''
import os
import shutil

# ==== CONFIG ====
dry_run = False  # Set to False to actually move files
# ================

# Paths
current_file = os.path.abspath(__file__)
current_dir = os.path.dirname(current_file)
src_folder = os.path.join(current_dir, "inaturalist_images")
dst_root_folder = os.path.join(current_dir, "downloads", "bird_images_20250604_164500") # change according to your directory

# Build mapping: lowercase scientific name -> actual folder path (case preserved)
scientific_to_folder = {}
for folder in os.listdir(dst_root_folder):
    if "__" in folder:
        parts = folder.split("__", 1)
        if len(parts) == 2:
            sci_name_original = parts[1].strip()
            sci_name_key = sci_name_original.lower()
            scientific_to_folder[sci_name_key] = os.path.join(dst_root_folder, folder)

# Track skipped files
skipped = []

# Process source images
for filename in os.listdir(src_folder):
    if not filename.lower().endswith(".jpg"):
        continue

    name_parts = filename.rsplit("_", 2)
    if len(name_parts) < 2:
        skipped.append((filename, "Malformed filename"))
        continue

    genus = name_parts[0]
    species = name_parts[1]
    sci_name_key = f"{genus} {species}".lower()

    dst_folder = scientific_to_folder.get(sci_name_key)

    if dst_folder:
        src_path = os.path.join(src_folder, filename)
        dst_path = os.path.join(dst_folder, filename)

        if dry_run:
            print(f"[Dry Run] Would move: {filename} -> {dst_folder}")
        else:
            shutil.move(src_path, dst_path)
            print(f"Moved: {filename} -> {dst_folder}")
    else:
        skipped.append((filename, f"No folder for scientific name '{sci_name_key}'"))

# Summary
print("\n=== Summary ===")
print(f"Dry run mode: {dry_run}")
print(f"Total skipped: {len(skipped)}")
if skipped:
    print("Skipped files:")
    for fname, reason in skipped:
        print(f"  - {fname}: {reason}")
