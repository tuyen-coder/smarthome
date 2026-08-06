# Cấu trúc dự án Smart Home

- **BE:** FastAPI
- **FE:** React Native + Expo Go

```text
smarthome/
├── backend/
│   ├── app/
│   │   ├── api/             # Các API endpoint
│   │   ├── core/            # Cấu hình và bảo mật
│   │   ├── db/              # Kết nối cơ sở dữ liệu
│   │   ├── models/          # Model cơ sở dữ liệu
│   │   ├── repositories/    # Truy vấn cơ sở dữ liệu
│   │   ├── schemas/         # Request/response
│   │   ├── services/        # Xử lý nghiệp vụ
│   │   ├── integrations/    # Tích hợp hệ thống ngoài
│   │   ├── realtime/        # WebSocket
│   │   └── main.py
├── frontend/
│   ├── app/                 # Màn hình và Expo Router
│   ├── components/          # Component dùng lại
│   │   └── navigation/      # Thanh điều hướng mobile
│   ├── src/
│   │   ├── config/
│   │   ├── data/            # Dữ liệu hiển thị dự phòng
│   │   ├── services/        # REST API và WebSocket
│   │   ├── theme/           # Màu giao diện dùng chung
│   │   └── types/           # Kiểu dữ liệu dùng chung
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
```
