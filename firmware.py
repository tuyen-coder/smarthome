import time
import sys
import machine
from machine import Pin, SoftI2C
from yolobit import *
import neopixel

# ==============================================================================
# 1. LCD1602 DISPLAY COMPONENT (I2C / PCF8574 + HD44780)
# ==============================================================================
class LCDDisplay:
    """Manages the 16x2 Character LCD Display over I2C."""
    def __init__(self, i2c_bus, addresses=(0x21, 0x27, 0x3F, 0x20)):
        self.i2c = i2c_bus
        self.addr = None
        self.backlight = 0x08
        self._initialize(addresses)

    def _initialize(self, addresses=(0x21, 0x27, 0x3F, 0x20)):
        if not self.i2c:
            return
        try:
            time.sleep_ms(50)
            detected = self.i2c.scan()
            for a in addresses:
                if a in detected:
                    self.addr = a
                    break
            if not self.addr:
                return

            time.sleep_ms(50)
            self._write_nibble(0x03 << 4)
            time.sleep_ms(5)
            self._write_nibble(0x03 << 4)
            time.sleep_ms(5)
            self._write_nibble(0x03 << 4)
            time.sleep_ms(1)
            self._write_nibble(0x02 << 4)
            self.command(0x28)  # 2-line, 5x8 font
            self.command(0x0C)  # Display ON, Cursor OFF
            self.clear()
            self.command(0x06)  # Entry mode increment
            self.show_message("Smart Home IoT", "System Ready")
        except Exception:
            self.addr = None

    def _write_byte(self, data):
        if self.addr:
            try:
                self.i2c.writeto(self.addr, bytes([data | self.backlight]))
            except Exception:
                pass

    def _write_nibble(self, nibble):
        self._write_byte(nibble | 0x04)
        time.sleep_us(1)
        self._write_byte(nibble & ~0x04)
        time.sleep_us(50)

    def _send(self, data, mode):
        self._write_nibble((data & 0xF0) | mode)
        self._write_nibble(((data << 4) & 0xF0) | mode)

    def command(self, cmd):
        self._send(cmd, 0x00)

    def write_char(self, char):
        self._send(char, 0x01)

    def clear(self):
        self.command(0x01)
        time.sleep_ms(2)

    def move_to(self, col, row):
        row_offsets = [0x00, 0x40, 0x14, 0x54]
        self.command(0x80 | (col + row_offsets[row]))

    def putstr(self, string):
        for char in string:
            self.write_char(ord(char))

    @staticmethod
    def format_line(text):
        s = str(text)
        while len(s) < 16:
            s += " "
        return s[:16]

    def show_message(self, line1="", line2=""):
        if not self.addr:
            self._initialize()
        if not self.addr:
            return
        try:
            self.move_to(0, 0)
            self.putstr(self.format_line(line1))
            self.move_to(0, 1)
            self.putstr(self.format_line(line2))
        except Exception:
            pass

    def update_telemetry(self, temp, humi, dist=None, status_msg=None):
        if not self.addr:
            self._initialize()
        line1 = "Temp: " + str(temp) + " C"
        if status_msg:
            line2 = status_msg
        elif dist is not None and 0 < dist <= 50:
            line2 = "H:" + str(round(humi)) + "% Dist:" + str(round(dist)) + "cm"
        else:
            line2 = "Humi: " + str(humi) + " %"
        self.show_message(line1, line2)


# ==============================================================================
# 2. ENVIRONMENTAL SENSOR COMPONENT (DHT20 + ONBOARD FALLBACK)
# ==============================================================================
class EnvironmentalSensor:
    """Reads environmental temperature and relative humidity directly from DHT20 over shared I2C (0x38)."""
    def __init__(self, i2c=None):
        self.i2c = i2c
        self._init_dht20()

    def _init_dht20(self):
        if not self.i2c:
            return
        try:
            time.sleep_ms(100)
            # Check initialization status
            self.i2c.writeto(0x38, bytearray([0x71]))
            status = self.i2c.readfrom(0x38, 1)[0]
            if (status & 0x18) != 0x18:
                self.i2c.writeto(0x38, bytearray([0x1B, 0x00, 0x00]))
                self.i2c.writeto(0x38, bytearray([0x1C, 0x00, 0x00]))
                self.i2c.writeto(0x38, bytearray([0x1E, 0x00, 0x00]))
                time.sleep_ms(10)
        except Exception:
            pass

    def read(self):
        """Returns tuple (temperature, humidity)."""
        if self.i2c:
            try:
                # Trigger measurement
                self.i2c.writeto(0x38, bytearray([0xAC, 0x33, 0x00]))
                time.sleep_ms(80)
                data = self.i2c.readfrom(0x38, 7)
                if len(data) == 7 and (data[0] & 0x80) == 0:
                    raw_humi = (data[1] << 12) | (data[2] << 4) | (data[3] >> 4)
                    humidity = round((raw_humi * 100.0) / 1048576.0, 1)

                    raw_temp = ((data[3] & 0x0F) << 16) | (data[4] << 8) | data[5]
                    temperature_val = round((raw_temp * 200.0 / 1048576.0) - 50.0, 1)

                    if 0 <= humidity <= 100 and -40 <= temperature_val <= 85:
                        return temperature_val, humidity
            except Exception:
                pass

        # Fallback to internal temperature sensor if DHT20 not ready
        temp = 28.0
        try:
            temp = round(temperature(), 1)
        except Exception:
            pass
        return temp, 54.0


# ==============================================================================
# 3. PROXIMITY DISTANCE SENSOR COMPONENT (HC-SR04 ULTRASONIC)
# ==============================================================================
class ProximitySensor:
    """Measures distance in centimeters using HC-SR04 ultrasonic pulses on Port P14/P15."""
    def __init__(self, trig_pin=pin14, echo_pin=pin15):
        self.trig = Pin(trig_pin.pin if hasattr(trig_pin, 'pin') else trig_pin, Pin.OUT)
        self.echo = Pin(echo_pin.pin if hasattr(echo_pin, 'pin') else echo_pin, Pin.IN)
        self.trig.value(0)

    def read_distance_cm(self):
        try:
            self.trig.value(0)
            time.sleep_us(2)
            self.trig.value(1)
            time.sleep_us(10)
            self.trig.value(0)

            timeout = 30000
            start_wait = time.ticks_us()
            while self.echo.value() == 0 and time.ticks_diff(time.ticks_us(), start_wait) < timeout:
                pass
            t1 = time.ticks_us()

            while self.echo.value() == 1 and time.ticks_diff(time.ticks_us(), t1) < timeout:
                pass
            t2 = time.ticks_us()

            duration = time.ticks_diff(t2, t1)
            if duration <= 0 or duration >= timeout:
                return 999
            return round((duration * 0.0343) / 2, 1)
        except Exception:
            return 999


# ==============================================================================
# 4. IR REMOTE RECEIVER COMPONENT (SYNCHRONOUS NEC ON PORT P1)
# ==============================================================================
class IRRemoteReceiver:
    """Non-blocking, synchronous NEC Infrared Remote Control decoder on Port P1."""
    KEY_MAP = {
        0x45: 'A',   0x46: 'B',   0x47: 'C',
        0x44: 'D',   0x40: '+',   0x43: 'E',
        0x07: 'LEFT',0x15: 'OK',  0x09: 'RIGHT',
        0x16: '0',   0x19: '-',   0x0D: 'F',
        0x0C: '1',   0x18: '2',   0x5E: '3',
        0x08: '4',   0x1C: '5',   0x5A: '6',
        0x42: '7',   0x52: '8',   0x4A: '9',
    }

    def __init__(self, pin_obj=pin1):
        self.pin = Pin(pin_obj.pin if hasattr(pin_obj, 'pin') else pin_obj, Pin.IN)

    def scan_key(self):
        """Polls for an incoming NEC IR frame without blocking interrupts."""
        # Idle line is HIGH (1). When active transmission begins, it pulls LOW (0).
        if self.pin.value() == 1:
            return None
        try:
            # 1. Lead pulse: ~9ms LOW, ~4.5ms HIGH
            lead_low = machine.time_pulse_us(self.pin, 0, 15000)
            if lead_low < 7000 or lead_low > 11000:
                return None
            lead_high = machine.time_pulse_us(self.pin, 1, 6000)
            if lead_high < 3000 or lead_high > 6000:
                return None

            # 2. Read 32 bit payload
            bits = 0
            for _ in range(32):
                bit_low = machine.time_pulse_us(self.pin, 0, 1000)
                if bit_low < 300 or bit_low > 800:
                    return None
                bit_high = machine.time_pulse_us(self.pin, 1, 2500)
                if bit_high < 300 or bit_high > 2200:
                    return None
                val = 1 if bit_high > 1000 else 0
                bits = (bits << 1) | val

            # 3. Decode Command Byte (Byte 3)
            cmd = (bits >> 8) & 0xFF
            cmd_rev = 0
            for i in range(8):
                if cmd & (1 << i):
                    cmd_rev |= (1 << (7 - i))

            return self.KEY_MAP.get(cmd_rev, str(cmd_rev))
        except Exception:
            return None


# ==============================================================================
# 5. LIGHTING CONTROLLER COMPONENT (NEOPIXEL 4-LED RGB ON P0)
# ==============================================================================
class LightingController:
    """Controls the 4-LED RGB module with independent L1-L3 manual control and L4 distance automation."""
    def __init__(self, data_pin=pin0, num_leds=4):
        self.num_leds = num_leds
        self.np = neopixel.NeoPixel(Pin(data_pin.pin if hasattr(data_pin, 'pin') else data_pin), num_leds)
        self.led_states = [False] * num_leds
        self.l4_forced_on = False
        self.l4_auto_timer = 0
        self.turn_off()

    def _sync_hardware(self):
        for i in range(self.num_leds):
            if self.led_states[i]:
                self.np[i] = (255, 255, 255)
            else:
                self.np[i] = (0, 0, 0)
        self.np.write()

    def toggle_led(self, led_idx):
        """Toggles LED (0=L1, 1=L2, 2=L3, 3=L4)."""
        if 0 <= led_idx < self.num_leds:
            new_state = not self.led_states[led_idx]
            self.set_led(led_idx, new_state)
            return new_state
        return False

    def set_led(self, led_idx, state):
        """Explicitly sets LED state with L4 override management."""
        if 0 <= led_idx < self.num_leds:
            st = bool(state)
            self.led_states[led_idx] = st
            if led_idx == 3:
                # If L4 is explicitly commanded, set forced_on state
                self.l4_forced_on = st
                self.l4_auto_timer = 0
            self._sync_hardware()

    def set_all(self, r, g, b):
        for i in range(self.num_leds):
            self.led_states[i] = (r > 0 or g > 0 or b > 0)
            self.np[i] = (r, g, b)
        self.l4_forced_on = self.led_states[3]
        self.l4_auto_timer = 0
        self.np.write()

    def turn_off(self):
        """Turns off all 4 LEDs and resets L4 forced override."""
        self.led_states = [False] * self.num_leds
        self.l4_forced_on = False
        self.l4_auto_timer = 0
        self._sync_hardware()

    def trigger_l4_temporary(self, duration_sec=1.0):
        """Turns ON L4 temporarily for distance proximity trigger."""
        if not self.l4_forced_on:
            self.led_states[3] = True
            self.l4_auto_timer = time.time() + duration_sec
            self._sync_hardware()

    def update_l4_auto(self, current_time):
        """Turns OFF L4 after proximity timeout if not forced ON."""
        if not self.l4_forced_on and self.l4_auto_timer > 0 and current_time >= self.l4_auto_timer:
            self.led_states[3] = False
            self.l4_auto_timer = 0
            self._sync_hardware()


# ==============================================================================
# 6. PUMP / RELAY CONTROLLER COMPONENT (ON P2 / P3)
# ==============================================================================
class PumpController:
    """Controls the water pump / dual-channel module on Port P2/P3."""
    def __init__(self, pin=None):
        self.is_on = False
        self.turn_off()

    def turn_on(self):
        self.is_on = True
        try:
            pin2.write_digital(1)
        except Exception:
            pass
        try:
            pin3.write_digital(1)
        except Exception:
            pass
        try:
            p2 = Pin(pin2.pin if hasattr(pin2, 'pin') else 5, Pin.OUT)
            p2.value(1)
        except Exception:
            pass
        try:
            p3 = Pin(pin3.pin if hasattr(pin3, 'pin') else 4, Pin.OUT)
            p3.value(1)
        except Exception:
            pass

    def turn_off(self):
        self.is_on = False
        try:
            pin2.write_digital(0)
        except Exception:
            pass
        try:
            pin3.write_digital(0)
        except Exception:
            pass
        try:
            p2 = Pin(pin2.pin if hasattr(pin2, 'pin') else 5, Pin.OUT)
            p2.value(0)
        except Exception:
            pass
        try:
            p3 = Pin(pin3.pin if hasattr(pin3, 'pin') else 4, Pin.OUT)
            p3.value(0)
        except Exception:
            pass

    def toggle(self):
        if self.is_on:
            self.turn_off()
        else:
            self.turn_on()
        return self.is_on

    def set_state(self, state):
        if state:
            self.turn_on()
        else:
            self.turn_off()
        return self.is_on


# ==============================================================================
# 7. TELEMETRY BRIDGE (SERIAL PACKET PROTOCOL)
# ==============================================================================
class TelemetryBridge:
    """Handles serial communication formatted as !ID:KEY:VALUE# packets."""
    @staticmethod
    def send_packet(sensor_id, key, value):
        packet = "!" + str(sensor_id) + ":" + str(key) + ":" + str(value) + "#\n"
        sys.stdout.write(packet)


# ==============================================================================
# 8. APPLICATION NODE ORCHESTRATOR
# ==============================================================================
class SmartHomeNode:
    """Main application orchestrator coordinating Console CLI, IR Remote, Distance, Pump, Sensors, and LCD."""
    def __init__(self):
        # 1. Initialize I2C Bus
        try:
            self.i2c = SoftI2C(scl=Pin(pin19.pin), sda=Pin(pin20.pin), freq=100000)
        except Exception:
            self.i2c = None

        # 2. Instantiate Device Components
        self.display = LCDDisplay(self.i2c)
        self.env_sensor = EnvironmentalSensor(self.i2c)
        self.proximity_sensor = ProximitySensor(pin14, pin15)
        self.ir_receiver = IRRemoteReceiver(pin1)
        self.lighting = LightingController(pin0, num_leds=4)
        self.pump = PumpController(pin2)
        self.telemetry = TelemetryBridge()

        # 3. State & Control Modes
        self.telemetry_interval = 5.0  # seconds
        self.last_telemetry_time = 0
        self.proximity_threshold_cm = 20.0
        self.active_status_text = None

        # 4. Serial Command Receiver (Non-blocking)
        try:
            import uselect
            self.spoll = uselect.poll()
            self.spoll.register(sys.stdin, uselect.POLLIN)
        except Exception:
            self.spoll = None

    def _handle_command(self, cmd_str):
        cmd = cmd_str.strip().upper().replace("!", "").replace("#", "")
        if not cmd:
            return

        # Explicit LED command e.g. LED:1:1, LED:4:0
        if cmd.startswith("LED:"):
            parts = cmd.split(":")
            if len(parts) >= 3:
                try:
                    idx = int(parts[1]) - 1
                    state = (parts[2] in ["1", "ON", "TRUE"])
                    self.lighting.set_led(idx, state)
                    self.active_status_text = "L" + str(idx+1) + ": " + ("ON" if state else "OFF")
                    print("!ACK:L" + str(idx+1) + ":" + ("1" if state else "0") + "#")
                    return
                except Exception:
                    pass

        # Pump Control Commands (from bbc-pump feed or CLI)
        if cmd.startswith("PUMP:"):
            parts = cmd.split(":")
            if len(parts) >= 2:
                st = (parts[1] in ["1", "ON", "TRUE"])
                self.pump.set_state(st)
                self.active_status_text = "PUMP: " + ("ON" if st else "OFF")
                print("!ACK:PUMP:" + ("1" if st else "0") + "#")
                return

        elif cmd in ["PUMP", "TOGGLE_PUMP"]:
            st = self.pump.toggle()
            self.active_status_text = "PUMP: " + ("ON" if st else "OFF")
            print("!ACK:PUMP:" + ("1" if st else "0") + "#")

        elif cmd == "PUMP ON":
            self.pump.turn_on()
            self.active_status_text = "PUMP: ON"
            print("!ACK:PUMP:1#")

        elif cmd == "PUMP OFF":
            self.pump.turn_off()
            self.active_status_text = "PUMP: OFF"
            print("!ACK:PUMP:0#")

        if cmd in ["L1", "LED1"]:
            st = self.lighting.toggle_led(0)
            self.active_status_text = "L1: " + ("ON" if st else "OFF")
            print("!ACK:L1:" + ("1" if st else "0") + "#")

        elif cmd in ["L2", "LED2"]:
            st = self.lighting.toggle_led(1)
            self.active_status_text = "L2: " + ("ON" if st else "OFF")
            print("!ACK:L2:" + ("1" if st else "0") + "#")

        elif cmd in ["L3", "LED3"]:
            st = self.lighting.toggle_led(2)
            self.active_status_text = "L3: " + ("ON" if st else "OFF")
            print("!ACK:L3:" + ("1" if st else "0") + "#")

        elif cmd in ["L4", "LED4"]:
            st = self.lighting.toggle_led(3)
            self.active_status_text = "L4: " + ("FORCE ON" if st else "AUTO DIST")
            print("!ACK:L4:" + ("1" if st else "0") + "#")

        elif cmd in ["OFF", "ALL OFF", "0", "CLEAR"]:
            self.lighting.turn_off()
            self.active_status_text = "All LEDs OFF"
            print("!ACK:ALL:0#")

        elif cmd in ["ON", "ALL ON", "1"]:
            self.lighting.set_all(255, 255, 255)
            self.active_status_text = "All LEDs ON"
            print("!ACK:ALL:1#")

    def run(self):
        print("SmartHomeNode with Dedicated L4 Distance & Override Ready...")

        while True:
            now = time.time()

            # --- 1. Serial Command Polling ---
            if self.spoll and self.spoll.poll(0):
                try:
                    line = sys.stdin.readline()
                    if line:
                        self._handle_command(line)
                except Exception:
                    pass

            # --- 2. IR Remote Control ---
            ir_key = self.ir_receiver.scan_key()
            if ir_key:
                print("IR Remote Key Pressed:", ir_key)
                if ir_key in ['1', '2', '3', '4']:
                    idx = int(ir_key) - 1
                    st = self.lighting.toggle_led(idx)
                    self.active_status_text = "Remote L" + ir_key + ":" + ("ON" if st else "OFF")
                elif ir_key in ['0', 'A', 'B', 'C', 'D', 'OK', 'F']:
                    self.lighting.turn_off()
                    self.active_status_text = "Auto Mode Ready"

            # --- 3. Proximity Distance Sensing (Auto Trigger for L4 when not forced ON) ---
            dist = self.proximity_sensor.read_distance_cm()
            if not self.lighting.l4_forced_on:
                if 0 < dist <= self.proximity_threshold_cm:
                    self.lighting.trigger_l4_temporary(duration_sec=1.0)
                # Auto-off timer after 1 sec
                self.lighting.update_l4_auto(now)

            # --- 4. Periodic Telemetry & LCD Display Update ---
            if now - self.last_telemetry_time >= self.telemetry_interval:
                self.last_telemetry_time = now

                # Read environmental telemetry
                temp, humi = self.env_sensor.read()

                # Publish serial telemetry packets to Gateway
                self.telemetry.send_packet(1, "TEMP", temp)
                time.sleep(0.04)
                self.telemetry.send_packet(2, "HUMI", humi)

                # Format status text if manual control active
                status_to_show = self.active_status_text
                if not status_to_show and any(self.lighting.led_states):
                    states_str = "".join(["1" if s else "0" for s in self.lighting.led_states])
                    status_to_show = "LEDs: " + states_str

                # Update LCD
                self.display.update_telemetry(temp, humi, dist, status_to_show)
                self.active_status_text = None

            time.sleep(0.02)


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    node = SmartHomeNode()
    node.run()
