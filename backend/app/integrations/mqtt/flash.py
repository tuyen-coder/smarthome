import os
import sys
import time
import serial
import serial.tools.list_ports

FIRMWARE_FILE = os.path.join(os.path.dirname(__file__), "firmware.py")

def find_board_port():
    """Automatically scans serial ports to find Yolo:bit or Micro:bit."""
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
    return None

def flash_yolobit(firmware_path=FIRMWARE_FILE):
    # 1. Check if firmware file exists
    if not os.path.exists(firmware_path):
        print(f"[-] Error: Firmware file not found at: {firmware_path}")
        return False

    with open(firmware_path, "r", encoding="utf-8") as f:
        firmware_code = f.read()

    # 2. Auto-detect serial port
    port = find_board_port()
    if not port:
        print("[-] Error: No Yolo:Bit or Micro:Bit device detected on USB ports.")
        print("    Please check that the USB data cable is plugged in.")
        return False

    print(f"[*] Found device on port: {port}")
    print(f"[*] Flashing file: {os.path.basename(firmware_path)}")
    print(f"[*] Opening serial connection at 115200 baud...")

    try:
        s = serial.Serial(port, 115200, timeout=1)
    except Exception as e:
        print(f"[-] Could not open {port}: {e}")
        print("    Tip: Make sure no background gateway is locking the port.")
        return False

    try:
        # Step 1: Interrupt current execution
        print("[*] Interrupting running board program...")
        s.write(b"\x03\x03")
        time.sleep(0.5)

        # Step 2: Enter MicroPython Raw REPL
        print("[*] Entering MicroPython Raw REPL mode...")
        s.write(b"\x01")
        time.sleep(0.5)
        s.read(s.in_waiting)

        # Step 3: Write firmware to main.py line by line
        print("[*] Writing firmware code to main.py on board flash storage...")
        s.write(b"f = open('main.py', 'w')\r\n\x04")
        time.sleep(0.3)
        s.read(s.in_waiting)

        lines = firmware_code.strip().split("\n")
        for line in lines:
            cmd = f"f.write({repr(line + chr(10))})\r\n"
            s.write(cmd.encode("utf-8") + b"\x04")
            time.sleep(0.03)
            s.read(s.in_waiting)

        s.write(b"f.close()\r\n\x04")
        time.sleep(0.3)
        s.read(s.in_waiting)

        # Step 4: Exit Raw REPL & Soft Reboot
        print("[*] Exiting Raw REPL and soft-rebooting board...")
        s.write(b"\x02\x04")
        time.sleep(1)

        print("[+] Flash successful! Listening for board startup output (5s)...")
        print("-" * 60)
        start = time.time()
        while time.time() - start < 5:
            if s.in_waiting > 0:
                data = s.read(s.in_waiting).decode("utf-8", "ignore")
                print(data, end="", flush=True)
            time.sleep(0.1)
        print("\n" + "-" * 60)
        print("[+] Done! Board is running the new firmware.")
        return True

    except Exception as e:
        print(f"[-] Error during flash: {e}")
        return False
    finally:
        s.close()

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else FIRMWARE_FILE
    flash_yolobit(target)