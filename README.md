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
│   │   ├── schemas/         # Request/response
│   │   ├── services/        # Xử lý nghiệp vụ
│   │   ├── integrations/    # Tích hợp hệ thống ngoài
│   │   ├── realtime/        # WebSocket
│   │   └── main.py
├── frontend/
│   ├── app/                 # Màn hình và Expo Router
│   ├── components/          # Component dùng lại
│   ├── src/
│   │   ├── config/
│   │   ├── services/        # REST API và WebSocket
│   │   └── types/           # Kiểu dữ liệu dùng chung
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
```
