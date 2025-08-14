# 📂 關鍵文件和進入點

## 🔑 關鍵配置文件

| 文件                 | 用途                                           | Epic 影響     |
| -------------------- | ---------------------------------------------- | ------------- |
| `src/auth.config.ts` | NextAuth.js v5 配置與型別擴展                  | Epic 2        |
| `src/middleware.ts`  | 路由保護與身份驗證中介軟體                     | Epic 2        |
| `next.config.js`     | Serwist PWA 配置與 Bundle Analyzer             | Epic 6        |
| `tsconfig.json`      | TypeScript 設定 (`strict: false` 需檢討)      | **Epic 6 🔥** |

## 🏢 業務邏輯核心

| 模組路徑                                  | 責任                   | Clean Architecture 層 |
| ----------------------------------------- | ---------------------- | --------------------- |
| `src/entities/`                           | 業務實體定義           | Domain                |
| `src/applications/usecases/record/`       | 賽事紀錄業務邏輯       | Application           |
| `src/infrastructure/di/inversify.config`  | 依賴注入容器配置       | Infrastructure        |
| `src/infrastructure/db/repositories/`     | 資料存取實作           | Infrastructure        |

## 🎨 前端架構重點

| 路徑                       | 用途                           | 狀態管理策略          |
| -------------------------- | ------------------------------ | --------------------- |
| `src/lib/redux/`           | Redux Toolkit 設定             | 複雜業務狀態          |
| `src/lib/features/record/` | 賽事紀錄狀態管理 (Redux)       | 即時比賽數據          |
| `src/lib/features/team/`   | 球隊陣容管理 (Redux)           | 複雜陣容邏輯          |
| `src/components/landing/`  | 產品介紹頁元件                 | **Epic 1 目標 🎯**    |

---
