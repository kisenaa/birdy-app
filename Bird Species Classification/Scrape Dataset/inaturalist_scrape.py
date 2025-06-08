'''
    Scrape Bird Images from Inaturalist API to output_dir (inaturalist_images)
    You need to manually compare if downloaded images from regular scrape from google image search is same as inaturalist result or just add some code
    Note: downloaded link is not saved automatically to json like playwright_scrape
'''
import requests
import os
from urllib.parse import quote
from pathlib import Path
from bird_species import bird_species

# Create an output folder
current_file = os.path.abspath(__file__)
current_dir = os.path.dirname(current_file)
output_dir = os.path.join(current_dir, "inaturalist_images")
os.makedirs(output_dir, exist_ok=True) 

def download_image(url, filename):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"Saved {filename}")
        else:
            print(f"Failed to download {url}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")

def fetch_and_download_images(species_entry, max_images=5):
    # Extract just the scientific name in parentheses
    if "(" in species_entry and ")" in species_entry:
        scientific_name = species_entry.split("(")[-1].split(")")[0]
    else:
        scientific_name = species_entry

    print(f"\nFetching: {scientific_name}")

    params = {
        "taxon_name": scientific_name,
        "photos": "true",
        "per_page": 5, 
        "order_by": "created_at"
    }

    response = requests.get("https://api.inaturalist.org/v1/observations", params=params)
    results = response.json().get("results", [])

    count = 0
    for obs in results:
        for photo in obs.get("photos", []):
            if count >= max_images:
                break
            url = photo["url"].replace("square", "large")  # higher quality
            filename= os.path.join(output_dir, f"{scientific_name.replace(' ', '_')}_{count+1}.jpg")
            download_image(url, filename)
            count += 1
        if count >= max_images:
            break

# Run for each species
for species in bird_species:
    fetch_and_download_images(species)
