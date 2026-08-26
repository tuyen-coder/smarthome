import time
import sys
import threading
import serial
import serial.tools.list_ports
from Adafruit_IO import MQTTClient

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

# Subscribed Feeds: Incoming commands from Adafruit IO to control hardware
SUBSCRIBED_FEEDS = ["bbc-led", "bbc-led1", "bbc-led2", "bbc-led3", "bbc-led4", "bbc-pump"]

# Feed mapping for incoming serial packets (KEY -> Adafruit IO Feed ID)
FEED_MAP = {
    "TEMP": "bbc-temp",
    "HUMI": "bbc-humi"
}

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
    """Callback triggered when a subscribed feed receives a new value from Adafruit IO dashboard."""
    raw_val = str(payload).strip()
    print(f"\n[ADAFRUIT IO INCOMING] Feed: {feed_id} | Payload: {raw_val}")

    # 1. Multi-LED Feeds (bbc-led1, bbc-led2, bbc-led3, bbc-led4)
    if feed_id == "bbc-led1":
        cmd = f"LED:1:{raw_val}"
    elif feed_id == "bbc-led2":
        cmd = f"LED:2:{raw_val}"
    elif feed_id == "bbc-led3":
        cmd = f"LED:3:{raw_val}"
    elif feed_id == "bbc-led4":
        cmd = f"LED:4:{raw_val}"
    # 2. Main LED Feed (bbc-led)
    elif feed_id == "bbc-led":
        upper = raw_val.upper()
        if upper in ["1", "ON", "TRUE"]:
            cmd = "ON"
        elif upper in ["0", "OFF", "FALSE"]:
            cmd = "OFF"
        elif upper in ["L1", "L2", "L3", "L4"]:
            cmd = upper
        else:
            cmd = raw_val
    # 3. Pump Feed (bbc-pump)
    elif feed_id == "bbc-pump":
        upper = raw_val.upper()
        if upper in ["1", "ON", "TRUE"]:
            cmd = "PUMP:1"
        elif upper in ["0", "OFF", "FALSE"]:
            cmd = "PUMP:0"
        else:
            cmd = f"PUMP:{raw_val}"
    else:
        cmd = raw_val

    # Write command down to board via Serial as !CMD#
    send_to_serial(cmd)

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
        except Exception as e:
            print(f"MQTT Connection failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)

def find_microbit_port():
    """Automatically scans serial ports to find a connected Yolo:bit, Micro:bit, or AIoT board."""
    ports = list(serial.tools.list_ports.comports())
    
    # 1. Search by USB Vendor ID:
    # - 0x303A: Espressif (Yolo:bit ESP32-S2/S3)
    # - 0x0D28: ARM mbed / BBC Micro:bit DAPLink
    # - 0x10C4: Silicon Labs CP210x
    # - 0x1A86: WCH CH340
    KNOWN_VIDS = [0x303a, 0x0d28, 0x10c4, 0x1a86]
    for p in ports:
        if p.vid in KNOWN_VIDS:
            return p.device
            
    # 2. Search by keyword in the port description
    for p in ports:
        desc = p.description.lower()
        if any(keyword in desc for keyword in ["micro:bit", "yolo", "mbed", "daplink", "usb serial", "ch340", "cp210"]):
            return p.device
            
    # 3. Fallback: If only 1 COM port is available, use it
    if len(ports) == 1:
        return ports[0].device

    return None

def connect_serial():
    """Tries to open serial port connection to the AIoT / Yolo:bit / Micro:bit board."""
    global ser
    port = find_microbit_port()
    if not port:
        print("Device serial port not auto-detected. Retrying search in 5 seconds...")
        return False
    try:
        with serial_lock:
            ser = serial.Serial(port, baudrate=SERIAL_BAUDRATE, timeout=1)
        print(f"Successfully connected to AIoT / Yolo:bit device on serial port: {port}")
        return True
    except Exception as e:
        print(f"Failed to connect to serial port {port}: {e}. Retrying in 5 seconds...")
        with serial_lock:
            ser = None
        return False

def send_to_serial(payload):
    """Sends command string down to the Micro:bit serial port as !PAYLOAD#\\n."""
    global ser
    with serial_lock:
        if ser and ser.is_open:
            try:
                raw_payload = str(payload).strip().replace("!", "").replace("#", "")
                command = f"!{raw_payload}#\n"
                ser.write(command.encode('utf-8'))
                ser.flush()
                print(f"Sent to Micro:bit Serial -> '{command.strip()}'")
            except Exception as e:
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
                print(f"Parsed Serial Packet -> ID: {pkt_id}, KEY: {key}, VALUE: {value}")
                
                # Publish value to Adafruit IO Feed
                try:
                    client.publish(feed_id, value)
                    print(f"Published to feed '{feed_id}': {value}")
                except Exception as mqtt_err:
                    print(f"Error publishing to Adafruit IO: {mqtt_err}")
            else:
                print(f"Ignored packet with unknown KEY '{key}': {packet}")
        else:
            print(f"Malformed serial packet: '{packet}'")
    except Exception as e:
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

# Track local toggle states for L1, L2, L3, L4 (True = ON, False = OFF)
led_states = {
    "L1": False,
    "L2": False,
    "L3": False,
    "L4": False
}

FEED_MAP_CONTROL = {
    "L1": "bbc-led1",
    "L2": "bbc-led2",
    "L3": "bbc-led3",
    "L4": "bbc-led4"
}

def console_cli():
    """Interactive console CLI in gateway to simulate Adafruit IO feed activations."""
    time.sleep(2)
    print("\n" + "=" * 65)
    print("  [+] SMART HOME GATEWAY & ADAFRUIT SIMULATOR ACTIVE")
    print("  Type any command below and press Enter:")
    print("    * L1 / l1  --> Toggle bbc-led1 on Adafruit IO (ON <-> OFF)")
    print("    * L2 / l2  --> Toggle bbc-led2 on Adafruit IO (ON <-> OFF)")
    print("    * L3 / l3  --> Toggle bbc-led3 on Adafruit IO (ON <-> OFF)")
    print("    * L4 / l4  --> Toggle bbc-led4 on Adafruit IO (ON <-> OFF)")
    print("    * OFF / 0  --> Turn OFF all feeds (0)")
    print("    * ON       --> Turn ON all feeds (1)")
    print("    * STATUS   --> Show current toggle states")
    print("=" * 65 + "\n")

    while True:
        try:
            cmd = input().strip()
            if not cmd:
                continue
            upper_cmd = cmd.upper()

            if upper_cmd in ["L1", "L2", "L3", "L4"]:
                # Toggle state
                led_states[upper_cmd] = not led_states[upper_cmd]
                val = "1" if led_states[upper_cmd] else "0"
                feed_name = FEED_MAP_CONTROL[upper_cmd]

                # 1. Publish to Adafruit IO Feed
                try:
                    client.publish(feed_name, val)
                    label = "ON (1)" if led_states[upper_cmd] else "OFF (0)"
                    print(f"  [CONSOLE -> ADAFRUIT IO] Published '{feed_name}' = {val} ({upper_cmd} {label})")
                except Exception as e:
                    print(f"  [!] Error publishing to MQTT: {e}")

                # 2. Also send directly down to serial
                send_to_serial(f"LED:{upper_cmd[1]}:{val}")

            elif upper_cmd in ["OFF", "0", "ALL OFF"]:
                for key, feed_name in FEED_MAP_CONTROL.items():
                    led_states[key] = False
                    try:
                        client.publish(feed_name, "0")
                    except Exception:
                        pass
                try:
                    client.publish("bbc-led", "0")
                except Exception:
                    pass
                send_to_serial("OFF")
                print("  [CONSOLE -> ADAFRUIT IO] All feeds published 0 (OFF)")

            elif upper_cmd in ["ON", "1", "ALL ON"]:
                for key, feed_name in FEED_MAP_CONTROL.items():
                    led_states[key] = True
                    try:
                        client.publish(feed_name, "1")
                    except Exception:
                        pass
                try:
                    client.publish("bbc-led", "1")
                except Exception:
                    pass
                send_to_serial("ON")
                print("  [CONSOLE -> ADAFRUIT IO] All feeds published 1 (ON)")

            elif upper_cmd == "STATUS":
                print("  Current Dashboard States:")
                for k, v in led_states.items():
                    print(f"    * {k} ({FEED_MAP_CONTROL[k]}): {'ON' if v else 'OFF'}")

            else:
                send_to_serial(cmd)
                print(f"  [CONSOLE] Sent raw command -> '{cmd}'")

        except (EOFError, KeyboardInterrupt):
            break
        except Exception:
            pass

def main():
    global ser
    
    # Connect to MQTT in background
    connect_mqtt()

    # Launch interactive console thread in background
    cli_thread = threading.Thread(target=console_cli, daemon=True)
    cli_thread.start()
    
    print("Starting gateway main loop...")
    while True:
        # Ensure Serial connection is active
        if ser is None or not ser.is_open:
            if not connect_serial():
                time.sleep(5)
                continue
                
        # Read from Serial and parse any incoming data
        try:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting)
                if data:
                    data_str = data.decode('utf-8', errors='ignore')
                    process_serial_data(data_str)
            else:
                time.sleep(0.05)
        except (serial.SerialException, OSError) as ser_err:
            print(f"Serial connection lost or encountered error: {ser_err}")
            with serial_lock:
                try:
                    if ser:
                        ser.close()
                except Exception:
                    pass
                ser = None
            time.sleep(2)
        except KeyboardInterrupt:
            print("KeyboardInterrupt detected. Terminating Gateway...")
            break
        except Exception as e:
            print(f"Error in serial loop: {e}")
            time.sleep(1)
            
    # Clean up on exit
    print("Cleaning up resources...")
    try:
        client.disconnect()
    except Exception:
        pass
    with serial_lock:
        if ser:
            try:
                ser.close()
                print("Serial connection closed.")
            except Exception:
                pass

if __name__ == "__main__":
    main()
