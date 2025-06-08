'''
    Scrape birds image according to bird species array on google image search
    original source: https://scrapingant.com/blog/how-to-scrape-google-images
'''
import asyncio
from datetime import datetime
import json
import os
import shutil
from aiohttp import ClientSession, ClientTimeout, TCPConnector
from urllib.parse import urlparse, urlencode
from playwright.async_api import async_playwright
from bird_species import bird_species


def clean_filename(name):
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '')
    return name.strip()

# Function to extract the domain from a URL
def extract_domain(url):
    domain = urlparse(url).netloc
    if domain.startswith("www."):
        domain = domain[4:]
    return domain

# Function to download an image with retry logic
async def download_image(session: ClientSession, img_url, file_path, retries=3):
    attempt = 0
    while attempt < retries:
        try:
            # Attempt to download the image
            async with session.get(img_url) as response:
                if response.status == 200:
                    # Write the image content to the file
                    with open(file_path, "wb") as f:
                        f.write(await response.read())
                    return
                else:
                    print(f"Failed to download image from {img_url}. Status: {response.status}")
        except Exception as e:
            print(f"Error downloading image from {img_url}: {e}")
        attempt += 1
        # Retry if the maximum number of attempts has not been reached
        if attempt < retries:
            print(f"Retrying download for {img_url} (attempt {attempt + 1}/{retries})")
            await asyncio.sleep(2**attempt)  # Exponential backoff for retries
    print(f"Failed to download image from {img_url} after {retries} attempts.")

# Function to scroll to the bottom of the page
async def scroll_to_bottom(page):
    previous_height = await page.evaluate("document.body.scrollHeight")
    i = 0
    while True:
        # Scroll to the bottom of the page
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1)
        new_height = await page.evaluate("document.body.scrollHeight")
        i += 1
        if new_height == previous_height or i == 1:
            break
        previous_height = new_height

# Main function to scrape Google Images
async def scrape_google_images(search_query="macbook m3", max_images=None, timeout_duration=10):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Launch a Chromium browser
        page = await browser.new_page()  # Open a new browser page

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        current_file = os.path.abspath(__file__)
        current_dir = os.path.dirname(current_file)

        # Use it in your paths
        download_folder = os.path.join(current_dir, "downloads", f"bird_images_{timestamp}")
        os.makedirs(download_folder) 
        json_file_path = os.path.join(download_folder, f"birds_metadata_{timestamp}.json")

        # Initialize the JSON file to store image metadata
        with open(json_file_path, "w") as json_file:
            json.dump({}, json_file)

        image_data_list = {}
        try:
            for index, species in enumerate(bird_species):
                try:
                    common_name = species.split('(')[0].strip()
                    latin_name = species.split('(')[1].replace(')', '').strip()
                    clean_common = clean_filename(common_name)
                    clean_latin = clean_filename(latin_name)

                    output_dir = os.path.join(download_folder, f"{clean_common}__{clean_latin}")
                    os.makedirs(output_dir, exist_ok=True)

                    # Build the Google Images search URL with the query
                    query_names = f"{common_name} {latin_name}"
                    query_params = urlencode({"q": query_names, "tbm": "isch"})
                    search_url = f"https://www.google.com/search?{query_params}"

                    print(f"[{index+1}/{len(bird_species)}]. search URL: {search_url}")
                    await page.goto(search_url) 

                    # Scroll to the bottom of the page to load more images
                    await scroll_to_bottom(page)
                    await page.wait_for_selector('div[data-id="mosaic"]', timeout=10000)  # Wait for the image section to appear
                    # Find all image elements on the page
                    image_elements = await page.query_selector_all('div[data-attrid="images universal"]')
                    print(f"Found {len(image_elements)} image elements on the page.")

                    connector = TCPConnector(ssl=False)
                    async with ClientSession(timeout=ClientTimeout(total=timeout_duration), connector=connector) as session:
                        images_downloaded = 0

                        # Iterate through the image elements
                        for idx, image_element in enumerate(image_elements):
                            if max_images is not None and images_downloaded >= max_images:
                                print(f"Reached max image limit of {max_images}. Stopping download.")
                                break
                            try:
                                print(f"Processing image {idx + 1}...")
                                # Click on the image to get a full view
                                await image_element.click()
                                await page.wait_for_selector("img.sFlh5c.FyHeAf.iPVvYb[jsaction]", timeout=7000)

                                img_tag = await page.query_selector("img.sFlh5c.FyHeAf.iPVvYb[jsaction]")
                                if not img_tag:
                                    print(f"Failed to find image tag for element {idx + 1}")
                                    continue

                                # Get the image URL
                                img_url = await img_tag.get_attribute("src")
                                file_extension = os.path.splitext(urlparse(img_url).path)[1] or ".png"
                                file_path = os.path.join(output_dir, f"{clean_common}_{clean_latin}_{idx + 1}{file_extension}")

                                # Download the image
                                await download_image(session, img_url, file_path)

                                # Extract source URL and image description
                                source_url = await page.query_selector('(//div[@jsname="figiqf"]/a[@class="YsLeY"])[2]')
                                source_url = await source_url.get_attribute("href") if source_url else "N/A"
                                image_description = await img_tag.get_attribute("alt")
                                source_name = extract_domain(source_url)

                                # Store image metadata
                                image_data = {
                                    "image_description": image_description,
                                    "source_url": source_url,
                                    "source_name": source_name,
                                    "image_file": file_path,
                                }

                                species_key = f"{common_name}__{latin_name}"
                                image_data_list.setdefault(species_key, []).append(image_data)
                                print(f"Image {idx + 1} metadata prepared.")
                                images_downloaded += 1
                            except Exception as e:
                                print(f"Error processing image {idx + 1}: {e}")
                                continue

                    print(f"Finished downloading {images_downloaded} images.")
                    await asyncio.sleep(5)
                except Exception as e:
                    print(f"error {e}")
        except (KeyboardInterrupt, asyncio.CancelledError):
            pass
        finally:  
            # Save updated data
            with open(json_file_path, "w") as json_file:
                json.dump(image_data_list, json_file, indent=4)
            await browser.close() 

# Run the main function with specified query and limits
if __name__ == "__main__":
    asyncio.run(scrape_google_images(max_images=8, timeout_duration=10))