"""
Adafruit IO Backend Simulator CLI
Simulates a user toggling dashboard buttons on Adafruit IO Cloud.
Publishes L1, L2, L3, L4 activation states directly to Adafruit IO Feeds.
"""
import os
import sys
import time
from Adafruit_IO import MQTTClient

# Try to load credentials from .env file if available
if os.path.exists(".env"):
    with open(".env") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ[k.strip()] = v.strip()

AIO_USERNAME = os.getenv("AIO_USERNAME", "dadn253")
AIO_KEY = os.getenv("AIO_KEY", "")

# Track local simulated dashboard button toggle states (True = ON, False = OFF)
led_states = {
    "L1": False,
    "L2": False,
    "L3": False,
    "L4": False
}

FEED_MAP = {
    "L1": "bbc-led1",
    "L2": "bbc-led2",
    "L3": "bbc-led3",
    "L4": "bbc-led4"
}

def on_connect(client):
    print("[+] Connected to Adafruit IO MQTT Broker successfully!")

def on_disconnect(client):
    print("[-] Disconnected from Adafruit IO MQTT Broker.")

def main():
    print("=" * 65)
    print("  [+] ADAFRUIT IO DASHBOARD SIMULATOR CLI")
    print(f"  Connected User: {AIO_USERNAME}")
    print("=" * 65)
    print("[*] Connecting to Adafruit IO MQTT Broker...")

    client = MQTTClient(AIO_USERNAME, AIO_KEY)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    try:
        client.connect()
        client.loop_background()
        time.sleep(1)
    except Exception as e:
        print(f"[-] Failed to connect to Adafruit IO: {e}")
        return

    print("\nSIMULATOR COMMANDS (Type command & press Enter):")
    print("  * L1 / L2 / L3 / L4          --> Toggle LED on/off")
    print("  * L1 200 200 200 / L1 #FF0000--> Set LED to custom RGB color")
    print("  * L1 1                       --> Turn ON LED in White")
    print("  * L1 0                       --> Turn OFF LED")
    print("  * PUMP / PUMP ON / PUMP OFF  --> Control Water Pump")
    print("  * OFF / 0                    --> Turn OFF all feeds on Adafruit IO")
    print("  * ON / ON 255 255 255        --> Turn ON all feeds")
    print("  * STATUS                     --> Show current toggle states")
    print("  * EXIT / Q                   --> Quit simulator\n")
    print("-" * 65)

    try:
        while True:
            try:
                user_input = input("Adafruit-Simulator> ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue

            parts = user_input.split()
            cmd = parts[0].upper()

            if cmd in ["Q", "QUIT", "EXIT"]:
                break

            if cmd in ["L1", "L2", "L3", "L4"]:
                feed_name = FEED_MAP[cmd]
                if len(parts) >= 4:
                    # L1 200 200 200
                    r, g, b = parts[1], parts[2], parts[3]
                    val_to_send = f"{r},{g},{b}"
                    led_states[cmd] = True
                elif len(parts) == 2:
                    # L1 0 or L1 1 or L1 #FF0000
                    arg = parts[1]
                    if arg == "0":
                        val_to_send = "0"
                        led_states[cmd] = False
                    elif arg == "1":
                        val_to_send = "1"
                        led_states[cmd] = True
                    elif "," in arg:
                        val_to_send = arg
                        led_states[cmd] = True
                    elif arg.startswith("#"):
                        val_to_send = arg
                        led_states[cmd] = True
                    else:
                        val_to_send = arg
                        led_states[cmd] = (arg not in ["0", "OFF", "FALSE"])
                else:
                    # Toggle state
                    led_states[cmd] = not led_states[cmd]
                    val_to_send = "1" if led_states[cmd] else "0"

                # Publish to Adafruit IO Feed
                try:
                    client.publish(feed_name, val_to_send)
                    print(f"  [Published ->] Feed '{feed_name}' = {val_to_send} ({cmd})")
                except Exception as err:
                    print(f"  [!] Error publishing: {err}")

            elif cmd in ["PUMP", "P"]:
                if len(parts) >= 2 and parts[1].upper() in ["ON", "1"]:
                    pump_state = True
                elif len(parts) >= 2 and parts[1].upper() in ["OFF", "0"]:
                    pump_state = False
                else:
                    pump_state = not led_states.get("PUMP", False)
                led_states["PUMP"] = pump_state
                val_to_send = "1" if pump_state else "0"
                try:
                    client.publish("bbc-pump", val_to_send)
                    print(f"  [Published ->] Feed 'bbc-pump' = {val_to_send} | PUMP is now {'ON (1)' if pump_state else 'OFF (0)'}")
                except Exception as err:
                    print(f"  [!] Error publishing pump: {err}")

            elif cmd in ["OFF", "0", "ALL OFF"]:
                for key, feed_name in FEED_MAP.items():
                    led_states[key] = False
                    client.publish(feed_name, "0")
                client.publish("bbc-led", "0")
                client.publish("bbc-pump", "0")
                led_states["PUMP"] = False
                print("  [Published ->] All feeds set to 0 (OFF).")

            elif cmd in ["ON", "1", "ALL ON"]:
                color_val = "1"
                if len(parts) >= 4:
                    color_val = f"{parts[1]},{parts[2]},{parts[3]}"
                for key, feed_name in FEED_MAP.items():
                    led_states[key] = True
                    client.publish(feed_name, color_val)
                client.publish("bbc-led", color_val)
                client.publish("bbc-pump", "1")
                led_states["PUMP"] = True
                print(f"  [Published ->] All feeds set to ON ({color_val}).")

            elif cmd == "STATUS":
                print("  Current Dashboard States:")
                for k, v in led_states.items():
                    feed = FEED_MAP.get(k, "bbc-pump" if k == "PUMP" else k)
                    print(f"    * {k} ({feed}): {'ON' if v else 'OFF'}")

            else:
                print(f"  [?] Unknown command '{cmd}'. Available: L1, L2, L3, L4, OFF, ON, STATUS, EXIT")

    except KeyboardInterrupt:
        pass
    finally:
        print("\nDisconnecting from Adafruit IO...")
        try:
            client.disconnect()
        except Exception:
            pass
        print("[+] Done. Simulator exited.")

if __name__ == "__main__":
    main()
