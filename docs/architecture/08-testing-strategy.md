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

### ⚠️ 技術債務與改善方向
```typescript
// Epic 6 測試重構重點
1. MongoDB Mock 策略
   - 當前: 簡單 mock，避免 BSON ES modules 問題
   - 未來: 考慮 @shelf/jest-mongodb 整合測試

2. React Motion 警告修正
   - 問題: DOM 元素使用 motion props
   - 解決: <div whileHover> → <motion.div whileHover>

3. TypeScript 測試型別安全
   - 目前: 部分測試缺乏型別檢查
   - 目標: 完整的型別測試覆蓋

4. TDD 流程整合
   - 目標: 將 TDD 規範整合到開發工作流程
   - 培訓: 確保團隊成員熟悉 TDD 最佳實踐
```

---
