import requests
import time
import sys
import json
import uuid
import os
import mimetypes

# 1. Upload the file to the Space
local_image_path = "./logo.png"  # <-- Change this to your image file
upload_id = str(uuid.uuid4())
upload_url = f"https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/upload?upload_id={upload_id}"

filename = os.path.basename(local_image_path)
mime_type, _ = mimetypes.guess_type(filename)
if mime_type is None:
    mime_type = "application/octet-stream"  # fallback

print(mime_type)
files = {"files": (filename, open(local_image_path, "rb"), mime_type)}
upload_resp = requests.post(upload_url, files=files)
upload_resp.raise_for_status()
uploaded_path = json.loads(upload_resp.text)
if isinstance(uploaded_path, list):
    uploaded_path = uploaded_path[0]
print("Uploaded path:", uploaded_path)

# 2. Prepare the prediction payload
payload = {
    "data": [
        {
            "path": uploaded_path,
            "meta": {"_type": "gradio.FileData"}
        }
    ]
}

# 3. POST to the prediction endpoint
post_url = "https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/call/predict"
post_resp = requests.post(post_url, json=payload)
post_resp.raise_for_status()
event_id = post_resp.json()["event_id"]

# 4. Poll for the result
get_url = f"https://kisenaa-indonesian-bird-classification.hf.space/gradio_api/call/predict/{event_id}"

while True:
    get_resp = requests.get(get_url)
    if not get_resp.text.strip():
        print("Empty response, waiting...")
        time.sleep(1)
        continue
    if get_resp.text.startswith("event: complete"):
        for line in get_resp.text.splitlines():
            if line.startswith("data: "):
                result_json = line[len("data: "):]
                result = json.loads(result_json)
                print("Result:", result)
                break
        break
    elif get_resp.text.startswith("event: error"):
        print("Error:", get_resp.text)
        break
    else:
        print("Waiting for result...")
        sys.stdout.flush()
        time.sleep(1)