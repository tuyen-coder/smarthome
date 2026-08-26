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
    print("  🚀 ADAFRUIT IO DASHBOARD SIMULATOR CLI")
    print(f"  Account: {AIO_USERNAME}")
    print("  Connecting to Adafruit IO MQTT Cloud...")
    print("=" * 65)

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
    print("  • L1       --> Toggle bbc-led1 on Adafruit IO (ON <-> OFF)")
    print("  • L2       --> Toggle bbc-led2 on Adafruit IO (ON <-> OFF)")
    print("  • L3       --> Toggle bbc-led3 on Adafruit IO (ON <-> OFF)")
    print("  • L4       --> Toggle bbc-led4 on Adafruit IO (ON <-> OFF)")
    print("  • OFF / 0  --> Turn OFF all feeds on Adafruit IO")
    print("  • ON       --> Turn ON all feeds on Adafruit IO")
    print("  • STATUS   --> Show current toggle states")
    print("  • EXIT / Q --> Quit simulator\n")
    print("-" * 65)

    try:
        while True:
            try:
                user_input = input("Adafruit-Simulator> ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue

            cmd = user_input.upper()

            if cmd in ["Q", "QUIT", "EXIT"]:
                break

            if cmd in ["L1", "L2", "L3", "L4"]:
                # Toggle local state
                led_states[cmd] = not led_states[cmd]
                val_to_send = "1" if led_states[cmd] else "0"
                feed_name = FEED_MAP[cmd]

                # Publish to Adafruit IO Feed
                try:
                    client.publish(feed_name, val_to_send)
                    state_label = "ON (1)" if led_states[cmd] else "OFF (0)"
                    print(f"  [➔ Published] Feed '{feed_name}' = {val_to_send} | {cmd} is now {state_label}")
                except Exception as err:
                    print(f"  [!] Error publishing: {err}")

            elif cmd in ["PUMP", "P", "PUMP ON", "PUMP OFF"]:
                if cmd == "PUMP ON":
                    pump_state = True
                elif cmd == "PUMP OFF":
                    pump_state = False
                else:
                    pump_state = not led_states.get("PUMP", False)
                led_states["PUMP"] = pump_state
                val_to_send = "1" if pump_state else "0"
                try:
                    client.publish("bbc-pump", val_to_send)
                    print(f"  [➔ Published] Feed 'bbc-pump' = {val_to_send} | PUMP is now {'ON (1)' if pump_state else 'OFF (0)'}")
                except Exception as err:
                    print(f"  [!] Error publishing pump: {err}")

            elif cmd in ["OFF", "0", "ALL OFF"]:
                for key, feed_name in FEED_MAP.items():
                    led_states[key] = False
                    client.publish(feed_name, "0")
                client.publish("bbc-led", "0")
                client.publish("bbc-pump", "0")
                led_states["PUMP"] = False
                print("  [➔ Published] All feeds set to 0 (OFF).")

            elif cmd in ["ON", "1", "ALL ON"]:
                for key, feed_name in FEED_MAP.items():
                    led_states[key] = True
                    client.publish(feed_name, "1")
                client.publish("bbc-led", "1")
                client.publish("bbc-pump", "1")
                led_states["PUMP"] = True
                print("  [➔ Published] All feeds set to 1 (ON).")

            elif cmd == "STATUS":
                print("  Current Dashboard States:")
                for k, v in led_states.items():
                    feed = FEED_MAP.get(k, "bbc-pump" if k == "PUMP" else k)
                    print(f"    • {k} ({feed}): {'ON' if v else 'OFF'}")

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
