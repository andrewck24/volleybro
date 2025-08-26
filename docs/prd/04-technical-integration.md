# 技術限制和整合需求

## 現有技術棧

**語言**: TypeScript (嚴格模式), JavaScript (ES2022+)
**框架**: Next.js 15+ (React 19), App Router 架構  
**資料庫**: MongoDB with Mongoose ODM, embedded documents 設計
**基礎設施**: Vercel 部署平台
**外部依賴**: Google OAuth (NextAuth.js v5), Serwist PWA

## 整合策略

### 資料庫整合策略

- 維持現有 embedded documents 的效能優勢
- 新功能採用向後相容的 schema 擴展
- 避免破壞性變更，使用選擇性欄位
- 新增 WaitlistEntry 集合用於 Preview 階段用戶註冊

### API整合策略

- 新增端點遵循現有的 `/api/[resource]` RESTful 模式
- 維持現有的 NextAuth.js v5 驗證流程
- 沿用現有的錯誤處理和回應格式
- Preview 功能 API 使用版本控制 /api/v1/preview/[feature]

### 前端整合策略

- 狀態管理：Redux Toolkit + SWR 架構保持不變
- UI 元件：完全使用 Shadcn UI + Tailwind CSS 設計系統
- 動畫系統：Motion.js 動態導入優化
- Bundle 優化：減少 15-20% bundle size

### 測試整合策略

- 使用現有的 Jest + jsdom 統一環境
- 維持 95%+ 測試覆蓋率標準
- 沿用現有的 MongoDB mock 策略

## 程式碼組織和標準

**Clean Architecture一致性**:

- 新功能必須遵循五層架構 (Domain/Application/Infrastructure/Interface/Presentation)
- 使用現有的 InversifyJS 依賴注入模式
- 遵循現有的 repository pattern

**編碼標準**:

- TypeScript 嚴格模式，ESLint Airbnb 規則
- Angular commit convention
- 檔案命名：kebab-case，元件命名：PascalCase

## 部署和營運

- 沿用現有的 Vercel 自動部署流程
- 維持現有的 build 最佳化和 CDN 快取策略
- 使用 feature flag 進行漸進式功能發布
- 新增環境變數：WAITLIST_ENABLED, PREVIEW_FEATURES_FLAG

## 風險評估和緩解

**技術風險**: 新功能影響現有穩定性
**緩解策略**: 階段性部署、完整測試覆蓋、快速回滾機制
