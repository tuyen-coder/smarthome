# Nhận diện khuôn mặt — YuNet + SFace

Module này nhận diện khuôn mặt cục bộ bằng OpenCV Zoo:

- **YuNet 2026may:** phát hiện khuôn mặt và các điểm mốc.
- **SFace 2021dec:** căn chỉnh khuôn mặt và tạo vector đặc trưng.
- **FastAPI:** nhận ảnh, kiểm tra dữ liệu và trả kết quả.
- **PostgreSQL:** lưu vector khuôn mặt và lịch sử nhận diện.
- **Expo Camera:** chụp ảnh đăng ký hoặc nhận diện từ frontend.

Ảnh gốc chỉ được xử lý trong bộ nhớ và không được lưu vào database hoặc filesystem của backend.

## Luồng hoạt động

### Đăng ký khuôn mặt

```text
3 ảnh từ camera
      ↓
FastAPI kiểm tra loại file và dung lượng
      ↓
YuNet phát hiện đúng một khuôn mặt
      ↓
Kiểm tra kích thước, độ sáng và độ nét
      ↓
SFace căn chỉnh và tạo vector đặc trưng
      ↓
Repository thay thế vector cũ trong PostgreSQL
```

Frontend yêu cầu 3 góc chụp: nhìn thẳng, hơi quay trái và hơi quay phải. Backend hỗ trợ từ 1 đến 10 ảnh cho mỗi lần đăng ký.

### Nhận diện khuôn mặt

```text
Ảnh cần nhận diện
      ↓
YuNet → SFace → vector mới
      ↓
So sánh cosine similarity với các vector đang hoạt động
      ↓
Chọn kết quả cao nhất
      ↓
similarity >= 0.45 → nhận diện thành công
similarity < 0.45  → không xác định
      ↓
Ghi sự kiện nhận diện vào PostgreSQL
```

## Cấu trúc module

```text
backend/app/
├── ai/
│   ├── models/
│   │   └── .gitignore       # Không đưa model ONNX lên Git
│   ├── __init__.py
│   ├── download_models.py   # Tải model và kiểm tra SHA-256
│   ├── face_engine.py       # YuNet, SFace và cosine similarity
│   └── README.md
├── api/v1/endpoints/faces.py
├── repositories/faces.py
└── services/face_service.py

frontend/
├── app/admin/faces/recognize.tsx
├── app/admin/users/[id]/face.tsx
└── components/face/FaceCapture.tsx
```

## Chuẩn bị PostgreSQL

Backend mặc định dùng:

```text
postgresql+asyncpg://postgres:postgres@localhost:5432/smarthome
```

Tạo database nếu chưa có:

```bash
psql -U postgres -c "CREATE DATABASE smarthome;"
```

Nếu thông tin kết nối khác, truyền `DATABASE_URL` khi chạy backend. Backend tự tạo các bảng khi khởi động:

| Bảng | Dữ liệu |
| --- | --- |
| `face_profiles` | Hồ sơ model của từng người dùng |
| `face_embeddings` | Vector đặc trưng và điểm chất lượng |
| `face_access_events` | Lịch sử nhận diện thành công hoặc thất bại |

## Cài thư viện và tải model

Chạy từ thư mục gốc dự án:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cd backend
python -m app.ai.download_models
```

Script tải hai file:

```text
backend/app/ai/models/face_detection_yunet_2026may.onnx
backend/app/ai/models/face_recognition_sface_2021dec.onnx
```

Mỗi file được kiểm tra SHA-256 trước khi thay thế model đang có. Các file `.onnx` bị Git bỏ qua và mỗi thành viên cần tải model trên máy của mình.

## Chạy backend

Từ thư mục `backend`:

```bash
../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Kiểm tra:

- Health check: `http://localhost:8000/health`
- Swagger API: `http://localhost:8000/docs`

## Chạy frontend

Web:

```bash
cd frontend
npm install
npm run web
```

Expo Go yêu cầu điện thoại và máy tính dùng cùng Wi-Fi:

```bash
EXPO_PUBLIC_API_URL=http://<IP_MAY_TINH>:8000/api/v1 \
EXPO_PUBLIC_WS_URL=ws://<IP_MAY_TINH>:8000/ws \
npm start
```

Không dùng `127.0.0.1` trong URL API của Expo Go vì địa chỉ đó trỏ về chính điện thoại.

## Sử dụng trên giao diện

### Đăng ký khuôn mặt

1. Đăng nhập bằng tài khoản admin.
2. Mở **Quản lý người dùng**.
3. Bấm biểu tượng camera cạnh người dùng.
4. Cho phép quyền camera.
5. Chụp đủ 3 ảnh theo các góc được hướng dẫn.
6. Bấm **Lưu khuôn mặt**.

Nếu người dùng đã có hồ sơ, có thể đăng ký lại để thay toàn bộ mẫu cũ hoặc bấm biểu tượng thùng rác để xóa.

### Nhận diện

1. Trong **Quản lý người dùng**, bấm biểu tượng quét ở góc trên bên phải.
2. Chụp một ảnh có đúng một khuôn mặt.
3. Bấm **Nhận diện**.
4. Màn hình hiển thị tên, độ tương đồng hoặc `Không xác định`.

## API

Prefix: `/api/v1/faces`

| Method | Endpoint | Chức năng | Quyền |
| --- | --- | --- | --- |
| `POST` | `/detect` | Kiểm tra một ảnh và trả thông tin chất lượng | Đã đăng nhập |
| `POST` | `/users/{user_id}/enroll` | Đăng ký từ 1 đến 10 ảnh | Admin |
| `GET` | `/users/{user_id}` | Xem hồ sơ khuôn mặt | Admin |
| `DELETE` | `/users/{user_id}` | Xóa hồ sơ và vector | Admin |
| `POST` | `/recognize` | Nhận diện một ảnh | Đã đăng nhập |
| `GET` | `/events?limit=100` | Xem lịch sử nhận diện | Admin |

Các endpoint nhận ảnh dùng `multipart/form-data`:

- `/detect` và `/recognize`: field `file`.
- `/enroll`: một hoặc nhiều field `files`.
- Dung lượng tối đa: 10 MB mỗi ảnh.
- Mỗi ảnh phải chứa đúng một khuôn mặt.
- Kích thước mặt tối thiểu: 80 px.

## Cấu hình

Các giá trị trong `backend/app/core/config.py` có thể được ghi đè bằng biến môi trường:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `FACE_MATCH_THRESHOLD` | `0.45` | Ngưỡng cosine similarity |
| `FACE_MAX_UPLOAD_BYTES` | `10485760` | Dung lượng tối đa của ảnh |
| `FACE_MIN_SIZE` | `80` | Chiều nhỏ nhất của vùng mặt |
| `FACE_DETECTION_MODEL_PATH` | YuNet trong `ai/models` | Đường dẫn model phát hiện |
| `FACE_RECOGNITION_MODEL_PATH` | SFace trong `ai/models` | Đường dẫn model nhận diện |

Chỉ điều chỉnh ngưỡng nhận diện sau khi đánh giá bằng dữ liệu thực tế của nhóm. Ngưỡng quá thấp làm tăng nhận nhầm; ngưỡng quá cao làm tăng từ chối nhầm.

## Kiểm thử

Kiểm tra backend:

```bash
source .venv/bin/activate
python -m pip install ruff
ruff check backend
python -m pip check
```

Kiểm tra frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npx expo-doctor
```

Kịch bản kiểm thử thủ công:

1. Gửi file không phải ảnh và xác nhận API trả `400`.
2. Gửi ảnh không có mặt và xác nhận API trả `400`.
3. Gửi ảnh có nhiều mặt và xác nhận API trả `400`.
4. Đăng ký một người bằng 3 ảnh độc lập.
5. Nhận diện bằng một ảnh khác của cùng người.
6. Nhận diện một người chưa đăng ký và xác nhận kết quả `Không xác định`.
7. Kiểm tra sự kiện được ghi vào `/events`.
8. Xóa hồ sơ và xác nhận người đó không còn được nhận diện.

## Giới hạn bảo mật

- `liveness_verified` hiện luôn là `false`.
- Chưa phát hiện ảnh in, ảnh trên màn hình hoặc video phát lại.
- Kết quả nhận diện chưa tự gửi lệnh MQTT mở cửa.
- Không nên dùng chức năng này như cơ chế bảo mật duy nhất.

Chỉ nên kết nối với khóa cửa sau khi bổ sung chống giả mạo, giới hạn số lần thử, ghi log bảo mật và một cơ chế xác thực dự phòng.

## Lỗi thường gặp

- **503 — thiếu model:** chạy `cd backend && ../.venv/bin/python -m app.ai.download_models`.
- **Không tìm thấy khuôn mặt:** đưa mặt gần camera hơn và giữ đúng một người trong khung hình.
- **Ảnh quá tối hoặc quá sáng:** đổi vị trí hoặc ánh sáng rồi đăng ký lại.
- **Ảnh bị mờ:** giữ thiết bị ổn định khi chụp.
- **Expo Go không kết nối backend:** kiểm tra cùng Wi-Fi, IP LAN và backend đang chạy với `--host 0.0.0.0`.
- **Database không kết nối:** kiểm tra PostgreSQL đang chạy và `DATABASE_URL` đúng.
