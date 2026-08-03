import time
import random
import sys
from Adafruit_IO import Client

import os

# Try to load environment variables from local .env file if present
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ[k.strip()] = v.strip()

# Credentials & Configuration
AIO_USERNAME = os.getenv("AIO_USERNAME", "dadn253")
AIO_KEY = os.getenv("AIO_KEY", "")

# Initialize the Adafruit IO REST API Client
try:
    aio = Client(AIO_USERNAME, AIO_KEY)
    print("Adafruit IO REST Client initialized successfully.")
except Exception as e:
    print(f"Error initializing Adafruit IO Client: {e}")
    sys.exit(1)

print("\nStarting hardware simulator...")
print("Press Ctrl+C to stop publishing simulated data.")
print("-" * 50)

# Main simulator loop
try:
    while True:
        # Generate simulated sensor readings
        # Temperature typically oscillates around 20-35 degrees Celsius
        temp_val = random.randint(20, 35)
        # Humidity typically fluctuates between 40% and 80%
        humi_val = random.randint(40, 80)
        
        # Publish temperature to 'bbc-temp' feed
        try:
            aio.send_data("bbc-temp", temp_val)
            print(f"[{time.strftime('%H:%M:%S')}] Simulated TEMP = {temp_val}°C -> Sent successfully to 'bbc-temp'")
        except Exception as e:
            print(f"Failed to send temperature value to Adafruit IO: {e}")
            
        # Publish humidity to 'bbc-humi' feed
        try:
            aio.send_data("bbc-humi", humi_val)
            print(f"[{time.strftime('%H:%M:%S')}] Simulated HUMI = {humi_val}% -> Sent successfully to 'bbc-humi'")
        except Exception as e:
            print(f"Failed to send humidity value to Adafruit IO: {e}")
            
        print("-" * 50)
        
        # Wait for 5 seconds before next transmission
        time.sleep(5)
        
except KeyboardInterrupt:
    print("\nSimulator stopped by user.")
except Exception as e:
    print(f"An unexpected error occurred in the simulator loop: {e}")
