
import os
import requests

# This script will trigger the pipeline specifically for media 68 (Mr. Robot) 
# and we will monitor the logs or any return errors.
# Actually, it's better to just check the count of needsReEnrichment.

url = "http://localhost:8080/api/admin/media/68/pipeline/start?size=10"
try:
    response = requests.post(url)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
