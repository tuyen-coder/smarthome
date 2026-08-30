"""
Smart Home Simulated Backend CLI
Allows manual interactive control of L1, L2, L3, L4 LEDs over Serial COM port.
"""
import sys
import time
import serial
import serial.tools.list_ports

SERIAL_BAUDRATE = 115200

def find_serial_port():
    ports = list(serial.tools.list_ports.comports())
    KNOWN_VIDS = [0x303a, 0x0d28, 0x10c4, 0x1a86]
    for p in ports:
        if p.vid in KNOWN_VIDS:
            return p.device
    for p in ports:
        desc = p.description.lower()
        if any(k in desc for k in ["micro:bit", "yolo", "mbed", "daplink", "usb serial", "ch340", "cp210"]):
            return p.device
    if len(ports) == 1:
        return ports[0].device
    return "COM4"

def main():
    port = find_serial_port()
    print("=" * 65)
    print("  [+] SMART HOME SIMULATED BACKEND CLI")
    print(f"  Connecting to device on {port} at {SERIAL_BAUDRATE} baud...")
    print("=" * 65)

    try:
        ser = serial.Serial(port, baudrate=SERIAL_BAUDRATE, timeout=0.1)
        print(f"[+] Connected to {port} successfully!\n")
    except Exception as e:
        print(f"[-] Failed to open {port}: {e}")
        return

    print("COMMAND LIST:")
    print("  * L1       --> Toggle LED 1 (ON <-> OFF)")
    print("  * L2       --> Toggle LED 2 (ON <-> OFF)")
    print("  * L3       --> Toggle LED 3 (ON <-> OFF)")
    print("  * L4       --> Toggle LED 4 (ON <-> OFF)")
    print("  * OFF / 0  --> Turn OFF all LEDs (Restore Auto Mode)")
    print("  * ON       --> Turn ON all 4 LEDs")
    print("  * EXIT / Q --> Exit simulator\n")
    print("-" * 65)

    try:
        while True:
            # Print any incoming telemetry from device
            if ser.in_waiting > 0:
                incoming = ser.read(ser.in_waiting).decode('utf-8', errors='ignore')
                for line in incoming.splitlines():
                    if line.strip():
                        print(f"  [Device Telemetry] {line.strip()}")

            try:
                user_input = input("Enter Command (L1/L2/L3/L4/OFF): ").strip()
            except (EOFError, KeyboardInterrupt):
                break

            if not user_input:
                continue

            cmd = user_input.upper()
            if cmd in ["Q", "QUIT", "EXIT"]:
                break

            # Send command down to board
            ser.write((cmd + "\n").encode('utf-8'))
            print(f"[*] Sent -> '{cmd}' to board.")
            time.sleep(0.1)

    except KeyboardInterrupt:
        pass
    finally:
        ser.close()
        print("\n[+] Serial connection closed. Backend Simulator stopped.")

if __name__ == "__main__":
    main()
