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

        f1 = self.format_line(line1)
        f2 = self.format_line(line2)

        # Anti-flicker cache: only write over I2C if text actually changed!
        if hasattr(self, '_last_f1') and self._last_f1 == f1 and self._last_f2 == f2:
            return

        try:
            self.move_to(0, 0)
            self.putstr(f1)
            self.move_to(0, 1)
            self.putstr(f2)
            self._last_f1 = f1
            self._last_f2 = f2
        except Exception:
            pass

    def render_page(self, page, temp=28.0, humi=50.0, dist=0.0, led_states=None, pump_on=False, power=1.0, energy=0.0):
        """Renders the selected LCD page (0: Temp/Humi, 1: LEDs, 2: Pump, 3: Dist, 4: Power)."""
        if not self.addr:
            self._initialize()
        if not self.addr:
            return
        if led_states is None:
            led_states = [False, False, False, False]

        if page == 0:
            # 1. TEMP and HUMIDITY
            line1 = "Temp: " + str(temp) + " C"
            line2 = "Humi: " + str(humi) + " %"
        elif page == 1:
            # 2. 4 LEDs STATUS
            s1 = "1" if led_states[0] else "0"
            s2 = "1" if led_states[1] else "0"
            s3 = "1" if led_states[2] else "0"
            s4 = "1" if led_states[3] else "0"
            line1 = "LED 1:" + s1 + "  2:" + s2
            line2 = "LED 3:" + s3 + "  4:" + s4
        elif page == 2:
            # 3. PUMP STATUS
            p_str = "ON" if pump_on else "OFF"
            line1 = "Water Pump State"
            line2 = "Pump: " + p_str
        elif page == 3:
            # 4. DISTANCE SENSOR
            line1 = "Distance Sensor"
            line2 = "Dist: " + str(round(dist, 1)) + " cm"
        elif page == 4:
            # 5. POWER & ENERGY
            line1 = "Power: " + str(round(power, 2)) + " W"
            line2 = "Energy: " + str(round(energy, 3)) + " Wh"
        else:
            line1 = "Temp: " + str(temp) + " C"
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
    """Controls the 4-LED RGB module with full RGB color support, independent L1-L3 control, and L4 distance automation."""
    def __init__(self, data_pin=pin0, num_leds=4):
        self.num_leds = num_leds
        self.np = neopixel.NeoPixel(Pin(data_pin.pin if hasattr(data_pin, 'pin') else data_pin), num_leds)
        self.led_colors = [(0, 0, 0)] * num_leds
        self.led_states = [False] * num_leds
        self.l4_forced_on = False
        self.l4_auto_timer = 0
        self.turn_off()

    def _sync_hardware(self):
        for i in range(self.num_leds):
            self.np[i] = self.led_colors[i]
        self.np.write()

    def set_led_rgb(self, led_idx, r, g, b):
        """Sets a specific LED to an RGB color tuple (r, g, b)."""
        if 0 <= led_idx < self.num_leds:
            r = max(0, min(255, int(r)))
            g = max(0, min(255, int(g)))
            b = max(0, min(255, int(b)))
            self.led_colors[led_idx] = (r, g, b)
            self.led_states[led_idx] = (r > 0 or g > 0 or b > 0)
            if led_idx == 3:
                self.l4_forced_on = self.led_states[3]
                self.l4_auto_timer = 0
            self._sync_hardware()

    def set_led(self, led_idx, val):
        """Sets LED state or color. val can be bool, 0/1, or 'r,g,b' string."""
        if not (0 <= led_idx < self.num_leds):
            return
        if isinstance(val, str) and (',' in val or ' ' in val):
            parts = val.replace(',', ' ').split()
            if len(parts) >= 3:
                try:
                    self.set_led_rgb(led_idx, int(parts[0]), int(parts[1]), int(parts[2]))
                    return
                except Exception:
                    pass
        st = val in [1, True, "1", "ON", "TRUE"]
        if st:
            self.set_led_rgb(led_idx, 255, 255, 255)
        else:
            self.set_led_rgb(led_idx, 0, 0, 0)

    def toggle_led(self, led_idx):
        if 0 <= led_idx < self.num_leds:
            if self.led_states[led_idx]:
                self.set_led_rgb(led_idx, 0, 0, 0)
                return False
            else:
                self.set_led_rgb(led_idx, 255, 255, 255)
                return True
        return False

    def set_all(self, r=255, g=255, b=255):
        for i in range(self.num_leds):
            self.led_colors[i] = (r, g, b)
            self.led_states[i] = (r > 0 or g > 0 or b > 0)
        self.l4_forced_on = self.led_states[3]
        self.l4_auto_timer = 0
        self._sync_hardware()

    def turn_off(self):
        self.set_all(0, 0, 0)
        self.l4_forced_on = False
        self.l4_auto_timer = 0

    def trigger_l4_temporary(self, duration_sec=1.0):
        if not self.l4_forced_on:
            self.led_colors[3] = (255, 255, 255)
            self.led_states[3] = True
            self.l4_auto_timer = time.time() + duration_sec
            self._sync_hardware()

    def update_l4_auto(self, current_time):
        if not self.l4_forced_on and self.l4_auto_timer > 0 and current_time >= self.l4_auto_timer:
            self.led_colors[3] = (0, 0, 0)
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
        self.telemetry_interval = 10.0  # seconds (Prevents Adafruit IO 429 Rate Limit Throttling)
        self.last_telemetry_time = 0
        self.proximity_threshold_cm = 20.0
        self.lcd_page = 0  # 0: Temp/Humi, 1: LED/Pump, 2: Dist, 3: Power
        self.btn_a_prev = False
        self.btn_b_prev = False
        self.cached_temp = 28.0
        self.cached_humi = 50.0
        self.cached_dist = 0.0
        self.total_energy_wh = 0.0
        self.last_energy_calc_time = time.time()

    def get_power_energy(self):
        """Calculates instantaneous power (W) and accumulated energy (Wh)."""
        num_on = sum(1 for s in self.lighting.led_states if s)
        power_w = round(1.0 + (num_on * 0.06) + (3.5 if self.pump.is_on else 0.0), 2)
        now = time.time()
        dt = max(0, now - self.last_energy_calc_time)
        self.last_energy_calc_time = now
        self.total_energy_wh += power_w * (dt / 3600.0)
        return power_w, round(self.total_energy_wh, 4)

    def _refresh_lcd(self):
        """Refreshes the current LCD page with latest device and sensor states."""
        power_w, energy_wh = self.get_power_energy()
        self.display.render_page(
            self.lcd_page,
            self.cached_temp,
            self.cached_humi,
            self.cached_dist,
            self.lighting.led_states,
            self.pump.is_on,
            power_w,
            energy_wh
        )

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

        # Explicit LED command e.g. LED:1:1, LED:1:0, LED:1:200,200,200
        if cmd.startswith("LED:") or cmd.startswith("COLOR:"):
            parts = cmd.split(":")
            if len(parts) >= 3:
                try:
                    idx = int(parts[1]) - 1
                    raw_val = parts[2]
                    self.lighting.set_led(idx, raw_val)
                    print("!ACK:L" + str(idx+1) + ":" + raw_val + "#")
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
        print("SmartHomeNode with Button-Controlled LCD Pages (Sensors, LEDs, Pump)...")
        self._refresh_lcd()

        while True:
            now = time.time()

            # --- 1. Physical Button A / B Page Swapping (Edge-Triggered) ---
            btn_a_now = False
            btn_b_now = False
            try:
                btn_a_now = button_a.is_pressed()
            except Exception:
                pass
            try:
                btn_b_now = button_b.is_pressed()
            except Exception:
                pass

            if btn_a_now and not self.btn_a_prev:
                self.lcd_page = (self.lcd_page + 1) % 5
                self._refresh_lcd()

            if btn_b_now and not self.btn_b_prev:
                self.lcd_page = (self.lcd_page - 1) % 5
                self._refresh_lcd()

            self.btn_a_prev = btn_a_now
            self.btn_b_prev = btn_b_now

            # --- 2. Serial Command Polling ---
            if self.spoll and self.spoll.poll(0):
                try:
                    line = sys.stdin.readline()
                    if line:
                        self._handle_command(line)
                        self._refresh_lcd()
                except Exception:
                    pass

            # --- 3. IR Remote Control ---
            ir_key = self.ir_receiver.scan_key()
            if ir_key:
                print("IR Remote Key Pressed:", ir_key)
                if ir_key in ['1', '2', '3', '4']:
                    idx = int(ir_key) - 1
                    self.lighting.toggle_led(idx)
                    self._refresh_lcd()
                elif ir_key in ['0', 'A', 'B', 'C', 'D', 'OK', 'F']:
                    self.lighting.turn_off()
                    self._refresh_lcd()

            # --- 4. Proximity Distance Sensing (Auto Trigger for L4 when not forced ON) ---
            dist = self.proximity_sensor.read_distance_cm()
            self.cached_dist = dist
            if not self.lighting.l4_forced_on:
                if 0 < dist <= self.proximity_threshold_cm:
                    self.lighting.trigger_l4_temporary(duration_sec=1.0)
                # Auto-off timer after 1 sec
                self.lighting.update_l4_auto(now)

            # --- 5. Periodic Telemetry & LCD Display Update ---
            if now - self.last_telemetry_time >= self.telemetry_interval:
                self.last_telemetry_time = now

                # Read environmental telemetry
                temp, humi = self.env_sensor.read()
                self.cached_temp = temp
                self.cached_humi = humi
                power_w, energy_wh = self.get_power_energy()

                # Publish serial telemetry packets to Gateway
                self.telemetry.send_packet(1, "TEMP", temp)
                time.sleep(0.04)
                self.telemetry.send_packet(2, "HUMI", humi)
                time.sleep(0.04)
                self.telemetry.send_packet(3, "POWER", power_w)
                time.sleep(0.04)
                self.telemetry.send_packet(4, "ENERGY", energy_wh)

                # Update LCD with current page
                self._refresh_lcd()

            time.sleep(0.02)


# ==============================================================================
# ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    node = SmartHomeNode()
    node.run()
