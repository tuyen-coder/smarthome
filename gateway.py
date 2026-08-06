import os
import threading
import time

import serial
import serial.tools.list_ports
from Adafruit_IO import MQTTClient

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

# Subscribed Feeds: Incoming commands from Adafruit IO to control hardware
SUBSCRIBED_FEEDS = ["bbc-led", "bbc-pump"]

# Feed mapping for incoming serial packets (KEY -> Adafruit IO Feed ID)
FEED_MAP = {"TEMP": "bbc-temp", "HUMI": "bbc-humi"}

# Serial Connection Setup
SERIAL_BAUDRATE = 115200
ser = None
serial_lock = threading.Lock()
serial_buffer = ""


# Adafruit IO MQTT Callback Functions
def connected(client):
    """Callback triggered when the MQTT client successfully connects."""
    print("Connected to Adafruit IO Broker successfully!")
    for feed in SUBSCRIBED_FEEDS:
        print(f"Subscribing to feed: {feed}")
        client.subscribe(feed)


def disconnected(client):
    """Callback triggered when the MQTT client disconnects."""
    print("Disconnected from Adafruit IO Broker!")


def message(client, feed_id, payload):
    """Callback triggered when a subscribed feed receives a new value."""
    print(f"Received from Adafruit IO | Feed: {feed_id} | Command: {payload}")
    # Write incoming feed command down to Micro:bit Serial as PAYLOAD# (e.g. 1#)
    send_to_serial(payload)


# Initialize MQTT Client
client = MQTTClient(AIO_USERNAME, AIO_KEY)
client.on_connect = connected
client.on_disconnect = disconnected
client.on_message = message


def connect_mqtt():
    """Tries to connect to Adafruit IO MQTT broker with reconnection retries."""
    connected_mqtt = False
    while not connected_mqtt:
        try:
            print("Connecting to Adafruit IO MQTT Broker...")
            client.connect()
            client.loop_background()
            connected_mqtt = True
            print("MQTT background loop started.")
        except Exception as e:  # noqa: BLE001 - keep retrying after broker failures
            print(f"MQTT Connection failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)


def find_microbit_port():
    """Automatically scans serial ports to find a connected Micro:bit device."""
    ports = list(serial.tools.list_ports.comports())

    # 1. Search by USB Vendor ID (0x0D28 is the official ARM mbed/Micro:bit VID)
    for p in ports:
        if p.vid == 0x0D28:
            return p.device

    # 2. Search by keyword in the port description
    for p in ports:
        desc = p.description.lower()
        if "micro:bit" in desc or "mbed" in desc or "daplink" in desc:
            return p.device

    return None


def connect_serial():
    """Tries to open serial port connection to Micro:bit."""
    global ser
    port = find_microbit_port()
    if not port:
        print("Micro:bit port not auto-detected. Retrying search in 5 seconds...")
        return False
    try:
        with serial_lock:
            ser = serial.Serial(port, baudrate=SERIAL_BAUDRATE, timeout=1)
        print(f"Successfully connected to Micro:bit on serial port: {port}")
        return True
    except Exception as e:  # noqa: BLE001 - serial backends raise platform errors
        print(f"Failed to connect to serial port {port}: {e}. Retrying in 5 seconds...")
        with serial_lock:
            ser = None
        return False


def send_to_serial(payload):
    """Sends command string down to the Micro:bit serial port as PAYLOAD#."""
    with serial_lock:
        if ser and ser.is_open:
            try:
                command = f"{payload}#"
                ser.write(command.encode("utf-8"))
                print(f"Sent to Micro:bit Serial -> '{command}'")
            except Exception as e:  # noqa: BLE001 - keep the gateway alive
                print(f"Error writing to serial: {e}")
        else:
            print(f"Cannot send command: Serial port is not open (payload: {payload})")


def parse_packet(packet):
    """Parses incoming serial packet matching standard format !ID:KEY:VALUE#."""
    try:
        # Strip the start symbol '!' and end symbol '#'
        content = packet[1:-1]
        parts = content.split(":")

        if len(parts) == 3:
            pkt_id, key, value = parts
            key = key.strip().upper()
            value = value.strip()

            if key in FEED_MAP:
                feed_id = FEED_MAP[key]
                print(
                    f"Parsed Serial Packet -> ID: {pkt_id}, KEY: {key}, VALUE: {value}"
                )

                # Publish value to Adafruit IO Feed
                try:
                    client.publish(feed_id, value)
                    print(f"Published to feed '{feed_id}': {value}")
                except Exception as mqtt_err:  # noqa: BLE001 - external client boundary
                    print(f"Error publishing to Adafruit IO: {mqtt_err}")
            else:
                print(f"Ignored packet with unknown KEY '{key}': {packet}")
        else:
            print(f"Malformed serial packet: '{packet}'")
    except Exception as e:  # noqa: BLE001 - reject malformed device packets safely
        print(f"Exception parsing packet '{packet}': {e}")


def process_serial_data(data_str):
    """Buffers incoming serial string and extracts complete !ID:KEY:VALUE# packets."""
    global serial_buffer
    serial_buffer += data_str

    # Process all complete packets in the buffer
    while "!" in serial_buffer and "#" in serial_buffer:
        start_idx = serial_buffer.find("!")
        end_idx = serial_buffer.find("#", start_idx)

        # If '!' exists but no '#' after it, wait for more data
        if end_idx == -1:
            # Cleanup any junk characters before the '!'
            if start_idx > 0:
                serial_buffer = serial_buffer[start_idx:]
            break

        # Extract the full packet including '!' and '#'
        packet = serial_buffer[start_idx : end_idx + 1]
        serial_buffer = serial_buffer[end_idx + 1 :]

        parse_packet(packet)


def main():
    global ser

    # Connect to MQTT in background
    connect_mqtt()

    print("Starting gateway main loop...")
    while True:
        # Ensure Serial connection is active
        if (ser is None or not ser.is_open) and not connect_serial():
            time.sleep(5)
            continue

        # Read from Serial and parse any incoming data
        try:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                if data:
                    data_str = data.decode("utf-8", errors="ignore")
                    process_serial_data(data_str)
            else:
                # Idle delay to reduce CPU overhead
                time.sleep(0.1)
        except (serial.SerialException, OSError) as ser_err:
            print(f"Serial connection lost or encountered error: {ser_err}")
            with serial_lock:
                try:
                    if ser:
                        ser.close()
                except Exception as close_error:  # noqa: BLE001
                    print(f"Failed to close lost serial connection: {close_error}")
                ser = None
            time.sleep(2)
        except KeyboardInterrupt:
            print("KeyboardInterrupt detected. Terminating Gateway...")
            break
        except Exception as e:  # noqa: BLE001 - keep processing after device errors
            print(f"Error in serial loop: {e}")
            time.sleep(1)

    # Clean up on exit
    print("Cleaning up resources...")
    try:
        client.disconnect()
    except Exception as disconnect_error:  # noqa: BLE001
        print(f"Failed to disconnect MQTT client cleanly: {disconnect_error}")
    with serial_lock:
        if ser:
            try:
                ser.close()
                print("Serial connection closed.")
            except Exception as close_error:  # noqa: BLE001
                print(f"Failed to close serial connection cleanly: {close_error}")


if __name__ == "__main__":
    main()
