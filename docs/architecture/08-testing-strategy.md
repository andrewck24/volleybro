# 🧪 測試策略現況

## 當前測試架構

### ✅ 已建立的測試環境

```javascript
// jest.config.js - 統一 jsdom 環境
testEnvironment: 'jsdom',
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']

// 測試覆蓋率狀況
- Landing Page: 100% 覆蓋率 (含 mobile 優化測試) ✅
- Helper Functions: 完整單元測試 ✅
- Repository Layer: MongoDB 模擬測試 ✅
```

### 📋 開發規則與程式碼品質要求

#### 🔄 Test-Driven Development (TDD)

```typescript
// TDD 開發流程
1. 紅燈階段 (Red)
   - 先寫測試案例，確保測試失敗
   - 明確定義預期行為

2. 綠燈階段 (Green)
   - 實作最小可行代碼讓測試通過
   - 專注於功能實現，不考慮最佳化

3. 重構階段 (Refactor)
   - 優化代碼結構和性能
   - 確保測試持續通過

// 實施原則
- 每個新功能必須遵循 TDD 流程
- 測試案例須涵蓋正常情況、邊界情況、錯誤情況
- 重構時保持測試覆蓋率不下降
```

#### 🏷️ 測試標識符規範

```typescript
// data-testid 使用規範
1. 元件標記要求
   - 所有可測試元件必須加上 data-testid 屬性
   - 測試 ID 使用 kebab-case 命名規則
   - 命名應該具有語義意義，便於理解元件功能

2. 命名慣例
   // ✅ 推薦用法
   <section data-testid="hero-section">
   <button data-testid="cta-button">
   <div data-testid="status-indicators">

   // ❌ 避免用法
   <div data-testid="div1">
   <span data-testid="text">

3. 測試檔案配合
   // 使用 Testing Library 查詢
   const heroSection = screen.getByTestId("hero-section");
   const ctaButton = screen.getByTestId("cta-button");
```

#### 📦 生產環境最佳化

```javascript
// next.config.js 設定
// 注意: 已在 next.config.js 檔案中設定
// 於 production 環境自動移除 data-testid 屬性
// 確保生產版本 HTML 乾淨且檔案大小最佳化

experimental: {
  optimizePackageImports: ["lucide-react"],
  // 自動移除測試屬性，減少生產環境 bundle 大小
  removeDataTestIds: true
}
```

### 🎯 分層 Mock 策略 (已優化)

#### 策略架構設計

第一層：jest.setup.ts - 基礎元件 Mock

```typescript
jest.mock("motion/react", () => {
  const filterMotionProps = (props: any) => {
    const {
      initial, animate, exit, whileInView, transition, variants,
      // 過濾掉所有 motion 專屬屬性，避免 DOM 警告
      ...rest
    } = props;
    return rest;
  };

  return {
    __esModule: true,
    motion: {
      section: ({ children, ...props }: any) =>
        React.createElement("section", filterMotionProps(props), children),
      div: ({ children, ...props }: any) =>
        React.createElement("div", filterMotionProps(props), children),
      h1: ({ children, ...props }: any) =>
        React.createElement("h1", filterMotionProps(props), children),
      p: ({ children, ...props }: any) =>
        React.createElement("p", filterMotionProps(props), children),
      span: ({ children, ...props }: any) =>
        React.createElement("span", filterMotionProps(props), children),
    },
    // 注意：hooks 由個別測試檔案處理，避免衝突
  };
});
```

第二層：個別測試檔案 - 特定 Hook Mock

```typescript
// src/components/landing/__tests__/header.test.tsx
const mockScrollY = {
  get: jest.fn(() => 0),
  on: jest.fn((_event: string, _handler: () => void) => jest.fn()),
};

jest.mock("motion/react", () => ({
  ...jest.requireActual("motion/react"),
  useScroll: jest.fn(() => ({
    scrollX: mockScrollY,
    scrollY: mockScrollY,
    scrollXProgress: mockScrollY,
    scrollYProgress: mockScrollY,
  })),
}));
```

#### 🔧 核心設計原則

1. **分層責任分離**：
   - `jest.setup.ts`：處理共用 motion 元件，過濾 DOM 不支援的屬性
   - 個別測試檔：處理特定功能的 hooks 模擬

2. **型別安全優先**：
   - 提供明確的 TypeScript 型別定義
   - 避免 `as any` 斷言，通過 `npx tsc --noEmit` 檢查

3. **衝突避免機制**：
   - setup 檔案不模擬 hooks，交由個別檔案處理
   - 使用 `jest.requireActual()` 保留原始功能

#### ✅ 解決的技術挑戰

```typescript
// ❌ 問題：DOM 元素收到 motion 屬性警告
<div whileHover={{scale: 1.1}} animate={{opacity: 1}}>

// ✅ 解決：filterMotionProps 自動過濾
const filterMotionProps = (props: any) => {
  const { initial, animate, whileHover, ...rest } = props;
  return rest; // 只保留標準 DOM 屬性
};

// ❌ 問題：型別不安全的 mock
const mockValue = jest.fn() as any;

// ✅ 解決：明確型別定義
const mockScrollY = {
  get: jest.fn(() => 0),
  on: jest.fn((_event: string, _handler: () => void) => jest.fn()),
};
```

### ⚠️ 技術債務與改善方向

```typescript
// Epic 6 測試重構重點
1. MongoDB Mock 策略
   - 當前: 簡單 mock，避免 BSON ES modules 問題
   - 未來: 考慮 @shelf/jest-mongodb 整合測試

2. React Motion 警告修正 ✅ [已完成]
   - 解決: 實施分層 mock 策略，filterMotionProps 機制
   - 成果: 消除所有 DOM 屬性警告

3. TypeScript 測試型別安全 ✅ [已完成]
   - 成果: 所有測試通過 npx tsc --noEmit 檢查
   - 實施: 完整的型別安全測試覆蓋

4. TDD 流程整合
   - 目標: 將 TDD 規範整合到開發工作流程
   - 培訓: 確保團隊成員熟悉 TDD 最佳實踐
```

### 📚 Mock 最佳實踐指南

#### 決策流程

```plaintext
// 新增測試時的 Mock 選擇決策樹
需要測試 motion 功能？
├── 僅使用 motion 元件 → 無需額外 mock，使用 setup 預設
├── 需要 hooks (useScroll, useInView) → 個別檔案實施 hook mock
└── 複雜動畫邏輯 → 考慮整合測試

// Mock 實施檢查清單
✅ 確認不與 jest.setup.ts 衝突
✅ 提供完整 TypeScript 型別定義
✅ 執行 npx tsc --noEmit 驗證
✅ 測試 mock 函數行為正確性
```

---
