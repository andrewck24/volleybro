# Epic 9: Dynamic Header Context with Contextual Actions

## Epic Goal

實現統一的動態 Header Context 系統，管理頁面標題和情境式操作按鈕，提供符合行動優先設計的一致性用戶體驗和適應性界面功能。

## Status

🔴 **未實現** - 計劃中的新功能開發

## Existing System Context

### Current State

- **Header 結構**: 固定「VolleyBro」標題 + 返回按鈕 + 通知按鈕
- **標題管理**: 靜態標題，無動態變更機制
- **操作按鈕**: 僅有通知按鈕，無情境式功能
- **狀態管理**: 使用 Redux Toolkit (已有 global-slice 處理 UI 狀態)

### Architecture Integration Points

- Header 組件位於 `src/components/layout/header.tsx`
- 需要與 Next.js App Router metadata 整合
- 與現有 navigation 組件協調避免功能重複
- 整合現有 Redux Toolkit 狀態管理架構

## Enhancement Details

### Proposed Header Architecture

```txt
┌─────────────────────────────────────────────────────┐
│ [← Back]     [Dynamic Title]     [Context Action]   │
│   固定位置        動態內容           情境功能鍵         │
└─────────────────────────────────────────────────────┘

Context Actions by Page Type:
├── Home Page → 無動作 (Empty Space)
├── Edit Pages → Save/Done Button (✓)
├── Match Record Pages → Settings Button (⚙️)
├── Future: Search Button (🔍) - 複雜功能，待未來開發
└── Default → No Action (Empty Space)
```

### Core Components

1. **Redux Header Slice**
   - 擴展現有 global-slice 或創建獨立 header-slice
   - 管理標題和動作狀態，符合現有狀態管理模式
   - TypeScript 介面定義 HeaderAction 類型

2. **Contextual Action System**
   - **Phase 1**: SaveAction, SettingsAction (實際需求)
   - **Future**: SearchAction (複雜功能，需要獨立設計)
   - 支援載入狀態和禁用狀態
   - 無障礙設計和鍵盤導航支援

3. **Enhanced Metadata Management**
   - 整合 Next.js App Router metadata API
   - 支援 UI 標題和 SEO 元資料分離
   - 與 Epic 8 (i18n) SEO 配置協調

### Technical Implementation

- **狀態管理**: Redux Toolkit (擴展現有 global-slice 或新增 header-slice)
- **組件結構**: Header 組件重構 + 新增 Actions 組件
- **類型定義**: 完整的 TypeScript 介面和工廠函數
- **Hook 整合**: useAppSelector/useAppDispatch 使用現有模式

## Stories

### Story 9.1: 建立 Header Redux Slice 和狀態管理

**Goal**: 擴展現有 Redux 架構支援 Header 狀態管理

- 在 global-slice 中新增 header 相關狀態和 reducers
- 或創建獨立的 header-slice 並整合到 store
- 定義 HeaderAction 介面和相關 TypeScript 類型
- 建立 Redux selectors 和 action creators

**Acceptance Criteria**:

- [ ] Header 狀態正確整合到 Redux store
- [ ] 支援標題和動作的獨立管理
- [ ] Redux DevTools 可正確追蹤狀態變更
- [ ] TypeScript 類型安全完整

### Story 9.2: Header 組件重構與基礎動作系統

**Goal**: 重構現有 Header 組件並實現動作按鈕系統

- 整合 useAppSelector/useAppDispatch 到現有 Header
- 實現動態標題顯示
- 替換通知按鈕為情境動作按鈕
- 建立 SaveAction, SettingsAction 組件 (排除複雜的 SearchAction)

**Acceptance Criteria**:

- [ ] Header 組件支援動態標題
- [ ] Save 和 Settings 動作按鈕正確顯示和運作
- [ ] 保持現有返回按鈕功能
- [ ] 動作按鈕支援載入和禁用狀態

### Story 9.3: 頁面整合與實際使用場景

**Goal**: 實現頁面級整合和實際業務場景

- 建立 useHeaderDispatch 自訂 hook 簡化頁面使用
- 編輯頁面實現 Save 動作 (團隊編輯、陣容編輯)
- 比賽記錄頁面實現 Settings 動作
- 首頁維持簡潔 (無動作按鈕)

**Acceptance Criteria**:

- [ ] useHeaderDispatch hook 正確運作
- [ ] 團隊/陣容編輯頁面展示 Save 動作
- [ ] 比賽記錄頁面展示 Settings 動作
- [ ] 首頁保持簡潔設計 (無動作按鈕)
- [ ] 頁面間導航時動作正確切換

## Compatibility Requirements

### Backward Compatibility

- 現有返回按鈕功能完全保持
- 現有頁面標題在未設定時顯示預設值
- Navigation 組件通知功能不受影響
- Redux store 架構向下相容

### Forward Compatibility

- 支援未來新增動作類型 (包含 SearchAction)
- 動作系統具擴展性設計
- 與 Epic 8 (i18n) SEO 整合準備
- Redux 狀態結構支援擴展

### Integration Compatibility

- 與現有 Redux 狀態管理完全整合
- NextAuth.js 驗證狀態整合
- 響應式設計維持行動優先原則

## Risk Mitigation

### High Priority Risks

1. **使用者體驗改變**: 移除通知按鈕可能造成困擾
   - **緩解**: 漸進式部署，保留 Navigation 通知功能
   - **驗證**: A/B 測試和使用者回饋收集

2. **功能範圍控制**: 避免過度工程化
   - **緩解**: Phase 1 僅實現 Save/Settings 動作，Search 留待未來
   - **驗證**: 實際使用場景驗證功能必要性

3. **Redux 狀態污染**: Header 狀態可能影響其他功能
   - **緩解**: 清楚的 state 命名空間和 selector 設計
   - **驗證**: Redux DevTools 監控和單元測試

### Technical Risks

- **狀態結構設計**: 不當設計可能影響維護性
- **TypeScript 複雜性**: 類型定義過於複雜
- **測試覆蓋率**: 新功能需要完整測試覆蓋

## Definition of Done

### Functionality

- [ ] Header 狀態正確整合到 Redux store
- [ ] 動態標題在所有頁面正確顯示
- [ ] Save 和 Settings 動作按鈕依頁面類型正確顯示
- [ ] useHeaderDispatch hook 提供統一 API

### Quality Assurance

- [ ] 無障礙設計通過 WCAG 2.1 AA 標準
- [ ] 效能測試無回歸 (渲染時間 < 16ms)
- [ ] Redux state 變更正確追蹤
- [ ] 測試覆蓋率 > 90%

### Documentation

- [ ] Redux slice 和 action 文檔完整
- [ ] 範例使用模式文檔 (Save/Settings 動作)
- [ ] 開發者整合指南完整

### Rollback Plan

- Redux state 變更可以獨立回滾
- Header slice 可以安全移除而不影響其他功能
- 保留原始 Header 組件作為後備

---

## Future Enhancements

### 未來功能規劃

- **Search Button (🔍)**: 全域搜尋功能
  - 需要搜尋 API 設計
  - 搜尋結果頁面和 UI 設計
  - 複雜的使用者互動邏輯
  - 建議作為獨立 Epic 處理

## Dependencies

- **Related**: Epic 8 (i18n Support) - SEO metadata 協調整合
- **Integration**: 現有 Redux Toolkit 架構和 Navigation 系統

## Additional Considerations

- 動畫和轉場效果
- 動作權限和角色管控
- Header 主題化和自定義樣式
- 更多實用動作類型 (分享、匯出等)

**Labels**: `enhancement`, `ux`, `redux-toolkit`, `brownfield`, `mobile-first`, `accessibility`
