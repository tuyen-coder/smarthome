# 🏡 Smart Home & Smart Farm AIoT System (Yolo:Bit & Adafruit IO)

Hệ thống IoT Nhà thông minh & Nông nghiệp thông minh tích hợp vi điều khiển **Yolo:Bit (ESP32-S3)**, cảm biến môi trường (DHT20, HC-SR04), cơ cấu chấp hành (Đèn LED RGB 4 bóng, Máy bơm nước), màn hình LCD1602, Remote hồng ngoại (IR) và kết nối Cloud hai chiều với **Adafruit IO qua giao thức MQTT** cùng hệ thống **Backend / API**.

---

## 🏛️ Kiến Trúc Tổng Quan (System Architecture)

```text
┌────────────────────────────────────────────────────────┐
│               ADAFRUIT IO CLOUD (MQTT)                 │
│  Feeds: bbc-temp, bbc-humi, bbc-led1..4, bbc-pump      │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
  (Live Data / Controls)         (Remote Sim Actions)
                │                        │
┌───────────────▼──────────────┐  ┌──────┴──────────────────────┐
│          GATEWAY.PY          │  │    SIMULATE_ADAFRUIT.PY     │
│   (Serial <-> MQTT Bridge)   │  │   (Virtual CLI Dashboard)   │
└───────────────▲──────────────┘  └─────────────────────────────┘
                │ USB Cable (COM4, 115200 Baud)
                │ Serial Packet Protocol: !ID:KEY:VALUE#
┌───────────────▼────────────────────────────────────────┐
│            YOLO:BIT MICROCONTROLLER (FIRMWARE)         │
│  • P0: 4-LED RGB Module         • P14/15: Distance HC-SR04│
│  • P1: IR Remote Receiver       • P2/P3: Dual-Channel Pump│
│  • I2C (P19/P20): DHT20 (0x38) + LCD1602 (0x27/0x3F)   │
└────────────────────────────────────────────────────────┘
```

---

## 🔌 Sơ Đồ Cắm Dây Phần Cứng (Hardware Wiring & Pinout)

Cắm các module vào các cổng mở rộng trên mạch Yolo:Bit theo bảng sau:

| Module / Cảm Biến | Cổng Cắm (Port) | Chân GPIO Yolo:Bit | Mô Tả & Lưu Ý Cắm Dây |
| :--- | :---: | :---: | :--- |
| **4-LED RGB NeoPixel** | **`P0`** | `GPIO 6` | 4 Đèn LED RGB chiếu sáng độc lập (`L1`, `L2`, `L3`, `L4`). |
| **Mắt Thu IR Remote** | **`P1`** | `GPIO 4` | Nhận tín hiệu điều khiển từ remote hồng ngoại (phím 1-4, 0). |
| **Máy Bơm Nước (Dual-Channel)** | **`P2 / P3`** | `GPIO 5` & `GPIO 4` | Cắm module đóng ngắt vào cổng **`P2`**. Cắm đầu USB máy bơm vào **USB Output 1** (hoặc Output 2). Firmware điều khiển cả 2 cổng đồng thời. |
| **Cảm Biến Khoảng Cách (HC-SR04)** | **`P14 / P15`** | `P14` (Trig - GPIO 44)<br>`P15` (Echo - GPIO 43) | Đo khoảng cách vật cản (ngưỡng kích hoạt $\le 20\text{ cm}$). |
| **Cảm Biến Nhiệt/Ẩm DHT20** | **`I2C (P19/P20)`** | SCL (`P19`), SDA (`P20`) | Đo nhiệt độ phòng (°C) và độ ẩm không khí (%). Địa chỉ: `0x38`. |
| **Màn Hình LCD1602 (I2C)** | **`I2C (P19/P20)`** | SCL (`P19`), SDA (`P20`) | Hiển thị thông số thời gian thực và trạng thái thiết bị. Địa chỉ: `0x27` hoặc `0x3F`. |

### 🔄 Tính Năng Hoán Đổi Cổng I2C (I2C Interchangeability):
* **LCD1602** (`0x27`/`0x3F`) và **DHT20** (`0x38`) dùng chung một bus I2C duy nhất (`SoftI2C` trên `P19`/`P20`).
* **Hoàn toàn hoán đổi được (Interchangeable):** Bạn có thể cắm LCD và DHT20 vào bất kỳ cổng I2C nào hoặc qua I2C Hub theo bất kỳ thứ tự nào. Nếu một trong hai thiết bị bị rút ra, thiết bị còn lại vẫn hoạt động bình thường mà không gây treo mạch.

---

## ☁️ Cấu Hình Feeds Trên Adafruit IO (Dashboard Feeds)

Tạo các feeds sau trên tài khoản Adafruit IO:

| Feed Name | Chiều Dữ Liệu | Giá Trị Hợp Lệ | Hành Động Trên Mạch Thật |
| :--- | :---: | :---: | :--- |
| **`bbc-temp`** | Cloud ◄── Board | Số thực (VD: `28.2`) | Dữ liệu nhiệt độ môi trường đo từ DHT20 (°C). |
| **`bbc-humi`** | Cloud ◄── Board | Số thực (VD: `59.2`) | Dữ liệu độ ẩm môi trường đo từ DHT20 (%). |
| **`bbc-led1`** | Cloud ──► Board | `1` / `0` | Bật / Tắt **LED 1**. |
| **`bbc-led2`** | Cloud ──► Board | `1` / `0` | Bật / Tắt **LED 2**. |
| **`bbc-led3`** | Cloud ──► Board | `1` / `0` | Bật / Tắt **LED 3**. |
| **`bbc-led4`** | Cloud ──► Board | `1` / `0` | `1` = Bật giữ sáng LED 4 (Forced ON).<br>`0` = Tắt & trả về chế độ tự động cảm biến khoảng cách. |
| **`bbc-led`** | Cloud ──► Board | `1` / `0` | Master: Bật tất cả LED (`1`) / Tắt tất cả LED (`0`). |
| **`bbc-pump`** | Cloud ──► Board | `1` / `0` | `1` = Bật máy bơm nước.<br>`0` = Tắt máy bơm nước. |

---

## 🧠 Logic Hoạt Động & Quy Luật Tự Động Hóa (Smart Rules)

1. **Điều khiển Đèn LED 1, 2, 3:**
   * Bật/tắt thủ công độc lập từ Adafruit IO hoặc bấm phím `1`, `2`, `3` trên Remote IR.
2. **Quy luật Đèn LED 4 (Chiếu sáng tự động & Ưu tiên):**
   * **Chế độ tự động (Auto Proximity):** Khi có người/vật cản lại gần $\le 20\text{ cm}$, LED 4 tự động bật sáng trong **1.0 giây** rồi tự tắt.
   * **Chế độ cưỡng bức (Forced ON):** Khi bật LED 4 từ Dashboard (`bbc-led4 = 1`) hoặc Remote phím `4`, LED 4 sẽ **sáng liên tục** (bỏ qua hẹn giờ tắt).
   * **Khôi phục tự động:** Khi tắt LED 4 (`bbc-led4 = 0`), đèn tắt và **tự động kích hoạt lại chế độ cảm biến khoảng cách**.
3. **Điều khiển Máy Bơm Nước (Port `P2/P3`):**
   * Bật/tắt tức thì qua feed `bbc-pump` (`1` = Chạy, `0` = Dừng) hoặc gõ `PUMP` trong terminal.
4. **Màn hình LCD1602:**
   * Dòng 1: `T: <Nhiệt độ>C  H: <Độ ẩm>%`
   * Dòng 2: `D: <Khoảng cách>cm` hoặc hiển thị trạng thái thao tác (`L1: ON`, `PUMP: ON`, v.v.).

---

## 📁 Cấu Trúc Dự Án (Project Structure)

```text
├── backend/                  # Backend API, FastAPI/Flask services & database models
│   └── app/
│       └── models/           # Database schema & ORM models
├── firmware.py               # MicroPython OOP firmware nạp vào Yolo:Bit
├── gateway.py                # Bridge trung tâm kết nối Serial COM4 <-> Adafruit IO MQTT
├── simulate_adafruit.py      # Công cụ CLI giả lập thao tác người dùng trên Adafruit IO
├── backend_simulator.py      # Giả lập Serial offline không qua Internet
├── flash.py                  # Script nạp firmware tự động qua cổng Serial
├── requirements.txt          # Danh sách thư viện Python cần cài đặt
├── .env.example              # Mẫu cấu hình biến môi trường và khóa API
└── README.md                 # Tài liệu hướng dẫn sử dụng chi tiết
```

---

## 🚀 Hướng Dẫn Chạy Hệ Thống (How to Run)

### 1. Cấu hình biến môi trường & Cài đặt thư viện
Tạo file `.env` từ file mẫu `.env.example`:
```powershell
cp .env.example .env
```
Điền tài khoản và khóa Adafruit IO vào `.env`:
```env
AIO_USERNAME=your_username
AIO_KEY=your_adafruit_key
```

Cài đặt thư viện phụ thuộc:
```powershell
pip install -r requirements.txt
```

---

### 2. Nạp Firmware vào Board Yolo:Bit
Cắm cáp USB nối Yolo:Bit với máy tính, sau đó chạy:
```powershell
python flash.py
```
> Script sẽ tự nhận diện cổng COM (ví dụ: `COM4`), nạp `firmware.py` vào `main.py` trên bộ nhớ flash của board và soft-reboot.

---

### 3. Khởi Chạy Gateway (Cầu Nối Chính)
Mở **Terminal 1** và chạy:
```powershell
python gateway.py
```
* Gateway sẽ tự động kết nối với cổng Serial `COM4` và Broker Adafruit IO MQTT.
* Nhận dữ liệu nhiệt độ/độ ẩm gửi lên Adafruit IO mỗi 5 giây.
* Nhận lệnh điều khiển từ Adafruit IO gửi xuống mạch theo thời gian thực.

---

### 4. Chạy Giả Lập Dashboard / Remote Control (Tùy Chọn)
Mở **Terminal 2** và chạy:
```powershell
python simulate_adafruit.py
```
Dùng các lệnh sau trong Terminal 2 để tương tác:
* `L1` ➔ Bật/Tắt LED 1
* `L2` ➔ Bật/Tắt LED 2
* `L3` ➔ Bật/Tắt LED 3
* `L4` ➔ Bật/Tắt LED 4 (Giữ sáng / Trả về tự động)
* `PUMP` / `P` ➔ Bật/Tắt Máy Bơm
* `ON` ➔ Bật tất cả thiết bị
* `OFF` ➔ Tắt tất cả thiết bị
* `STATUS` ➔ Xem trạng thái hiện tại
