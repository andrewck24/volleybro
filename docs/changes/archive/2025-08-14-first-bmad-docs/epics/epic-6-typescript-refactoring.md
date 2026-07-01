# Epic 6: TypeScript重構與Zod Schema最佳化

**Epic目標**: 解決技術債務，提升代碼型別安全性和可維護性，對應GitHub issue #223。

**執行優先級**: 最高（為所有Epic奠定技術基礎）

**功能範圍**:
- 完整 TypeScript 化專案
- 建立統一的 Zod Schema 架構
- 提升程式碼型別安全性和可維護性
- 優化表單數字欄位處理

**技術債務問題**:
- 部分檔案仍使用 `.jsx` 格式，未完全遷移至 TypeScript
- 元件缺乏明確的 Props 型別定義，存在隱性的 `any` 型別
- Zod schemas 散落在各元件中，缺乏重用性和一致性
- 表單數字欄位處理不統一，容易產生型別錯誤

## Story 6.1: 檔案格式標準化（GitHub #225）

作為 **開發團隊成員**，
我想要 **將所有 `.jsx` 檔案更名為 `.tsx`**，
所以 **專案能夠完全符合 TypeScript 標準**。

### 接受條件

1. 重新命名所有 `.jsx` 檔案為 `.tsx`
2. 更新相關的 import 路徑（如果有明確指定副檔名）
3. 確認所有檔案在 IDE 中正確識別為 TypeScript React 檔案
4. 執行 TypeScript 編譯確認無錯誤

**優先級**: High | **Story Points**: 3 | **預估工時**: 1 天

## Story 6.2: 元件 Props 型別定義（GitHub #226）

作為 **開發團隊成員**，
我想要 **為所有 React 元件的 props 加上明確的 TypeScript 型別定義**，
所以 **能夠消除隱性的 `any` 型別並提供更好的開發體驗**。

### 接受條件

1. 為所有元件定義明確的 Props 介面
2. 處理 `children` props 的型別定義
3. 處理事件處理器的型別定義
4. 建立共用的型別定義檔案
5. 執行 `tsc --noEmit` 確認無型別錯誤

**優先級**: High | **Story Points**: 8 | **預估工時**: 3-4 天

## Story 6.3: 表單狀態管理型別安全（GitHub #227）

作為 **開發團隊成員**，
我想要 **使用 `z.infer` 從 Zod schema 生成表單型別**，
所以 **表單資料能夠具備完整的型別安全性**。

### 接受條件

1. 識別所有使用 `useForm` 的元件
2. 為每個表單建立對應的 Zod schema
3. 使用 `z.infer<typeof schema>` 生成型別
4. 更新 `useForm` hook 的型別參數
5. 確認 `onSubmit` 回調函式的型別安全

**優先級**: High | **Story Points**: 5 | **預估工時**: 2-3 天

## Story 6.4: 建立通用 Zod Schema 模組（GitHub #228）

作為 **開發團隊成員**，
我想要 **建立可重用的自訂 Zod Schema 模組**，
所以 **能夠統一處理常見的資料驗證需求**。

### 接受條件

1. 建立 `src/lib/zod-schemas.ts` 檔案
2. 實作 `zCoerceOptionalNumber` schema
3. 實作 `zCoerceRequiredNumber` schema
4. 實作 `zCoerceOptionalInteger` schema
5. 新增完整的 JSDoc 說明和單元測試

**優先級**: Medium | **Story Points**: 3 | **預估工時**: 1 天

## Story 6.5: Schema 檔案架構調整與集中化（GitHub #229）

作為 **開發團隊成員**，
我想要 **將散落的 Zod schemas 根據業務領域集中管理**，
所以 **schema 的重用性和維護性能夠得到提升**。

### 接受條件

1. 將 `src/lib/features/**/types.ts` 重新命名為 `schemas.ts`
2. 遷移 schemas 到對應的 feature 資料夾
3. 為每個 schema 新增適當的 export
4. 使用 `z.infer` 生成對應的型別定義並 export
5. 更新所有 import 路徑

**優先級**: Medium | **Story Points**: 8 | **預估工時**: 3-4 天

## Story 6.6: 應用通用 Schema（GitHub #230）

作為 **開發團隊成員**，
我想要 **在所有表單 schema 中使用新的通用 schema**，
所以 **數字欄位處理能夠標準化並減少重複代碼**。

### 接受條件

1. 檢視所有 schemas.ts 檔案中的數字欄位
2. 替換為適當的通用 schema
3. 確認錯誤訊息的正確性
4. 測試所有受影響的表單功能
5. 確保向後相容性

**優先級**: Medium | **Story Points**: 5 | **預估工時**: 2-3 天

---

## 🚨 風險評估與緩解策略

### 高風險項目
- **Schema 架構調整**: 大範圍的檔案重構
  - **緩解**: 分批進行，每次只處理一個 feature 資料夾
  - **備份**: 建立分支保存重構前的狀態

### 執行建議
1. **按階段執行**: 嚴格按照 Story 6.1 → 6.6 順序進行
2. **頻繁提交**: 每完成一個小任務就提交，方便回滾
3. **同步測試**: 每個 Story 完成後都要進行完整測試

## 📈 成功指標
- **型別安全**: TypeScript 嚴格模式下無錯誤
- **測試覆蓋**: 所有修改的元件通過現有測試
- **開發效率**: IDE 提供完整的型別提示和自動補全

---

**Epic 6 執行優先級**: 最高優先級，所有其他 Epic 的前置作業
**總預估時程**: 2.5-3.5 週
**總 Story Points**: 34
**對應 GitHub Issue**: #223 及子 issues #225-#230