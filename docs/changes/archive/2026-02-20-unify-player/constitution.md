<!--
Sync Impact Report:
- Version Change: N/A → 1.0.0 (Initial ratification)
- Modified Principles: N/A (New constitution)
- Added Sections: All core principles, Development Standards, Governance
- Removed Sections: N/A
- Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section aligned
  ✅ spec-template.md - User scenarios and requirements aligned
  ✅ tasks-template.md - Testing discipline and MVP focus aligned
- Follow-up TODOs: None
-->

# VolleyBro 專案憲章

## 核心原則 Core Principles

### I. 最小可行產品優先 (MVP First)

**原則聲明**：
每個功能開發必須以最小可行產品(MVP)為目標。功能設計應聚焦於核心價值交付，避免過度設計和不必要的複雜性。

**實施規範**：

- 功能規格必須明確定義 MVP 範圍，並以優先級標記用戶故事 (P1, P2, P3)
- P1 優先級的用戶故事構成 MVP，必須獨立可測試且可交付
- 在 MVP 完成並驗證前，禁止開發 P2/P3 優先級功能
- 拒絕「以防萬一」的功能 - 僅實現當前明確需求
- 每個用戶故事必須能獨立交付價值，不依賴其他故事完成

**理由**：
MVP 方法論確保團隊快速交付價值，及早獲得用戶反饋，避免在未經驗證的假設上浪費資源。

### II. 測試驅動開發 (Test-Driven Development)

**原則聲明**：
所有功能開發必須遵循測試驅動開發 (TDD) 流程：先寫測試 → 測試失敗 → 實現功能 → 測試通過 → 重構。

**實施規範**：

- 每個用戶故事必須定義可測試的驗收標準
- 測試必須在功能實現前編寫並驗證失敗
- 遵循 Red-Green-Refactor 循環
- 測試覆蓋率目標：核心業務邏輯 95%+，UI 組件 80%+
- 提交前檢查清單：`npm test`、`npm run lint`、`npm run build` 必須全部通過

**理由**：
TDD 確保代碼可測試性，減少回歸錯誤，提供重構信心，並作為功能實現的活文件。

### III. 高品質優先 (Quality First)

**原則聲明**：
代碼品質和用戶體驗品質不可妥協。所有交付物必須符合既定的品質標準。

**實施規範**：

- **代碼品質**：
  - 遵循 Airbnb JavaScript/TypeScript 風格指南
  - ESLint 無錯誤，TypeScript 嚴格模式
  - 遵循 Clean Architecture 分層原則
  - 適當的錯誤處理和日誌記錄

- **用戶體驗品質**：
  - 遵循 Vercel Web Interface Guidelines
  - 所有流程支援鍵盤操作，符合 WAI-ARIA 規範
  - 尊重 `prefers-reduced-motion` 用戶偏好
  - 響應式設計支援移動端、筆記型電腦、超寬螢幕
  - 性能預算：網路請求 < 500ms

- **無障礙性**：
  - 視覺焦點環使用 `:focus-visible`
  - 狀態提示不僅依賴顏色
  - 準確的頁面標題和 ARIA 標籤

**理由**：
高品質標準確保長期可維護性、用戶滿意度和專業形象，減少技術債務累積。

### IV. 文件繁體中文、介面多語系 (Chinese Docs, Multilingual UI)

**原則聲明**：
專案文件使用台灣繁體中文 (zh-TW)，用戶介面支援多語系（開發中）。

**實施規範**：

- **專案文件** (繁體中文)：
  - 規格文件 (`spec.md`)、計畫文件 (`plan.md`)、任務列表 (`tasks.md`)
  - 專案 README、CLAUDE.md 等開發文件
  - Pull Request 內文必須包含繁體中文摘要

- **用戶介面** (多語系)：
  - 系統設計為支援多語系 (i18n)
  - 目前開發中，預設語言為繁體中文
  - 使用標準 i18n 框架和鍵值對管理翻譯

- **代碼層面** (英文)：
  - Git commit message 使用英文 (遵循 Angular 規範)
  - Pull Request 標題使用英文
  - 代碼註解和變數命名使用英文 (國際慣例)
  - 禁止在 commit/PR 中添加 AI 相關署名

**理由**：
專案文件使用繁體中文確保團隊溝通清晰；用戶介面多語系支援擴大用戶覆蓋範圍；代碼英文化維持國際開發標準。

### V. Clean Architecture 遵循 (Clean Architecture Adherence)

**原則聲明**：
代碼組織必須遵循 Clean Architecture 原則和領域驅動設計 (DDD)，確保依賴方向正確和關注點分離。

**實施規範**：

- **領域層** (`src/entities/`)：純業務邏輯，無外部依賴
- **應用層** (`src/applications/`)：用例、存儲庫介面、服務介面
- **基礎設施層** (`src/infrastructure/`)：資料庫實現、外部服務、依賴注入
- **介面層** (`src/interface/controllers/`)：API 控制器
- **展示層** (`src/app/`, `src/components/`)：Next.js 路由和 React 組件

**依賴規則**：

- 外層可依賴內層，內層不可依賴外層
- 業務邏輯不依賴框架或資料庫
- 使用 InversifyJS 實現依賴注入

**理由**：
Clean Architecture 確保代碼可測試性、可維護性和業務邏輯獨立性，便於技術棧替換和單元測試。

## 開發標準 Development Standards

### 版本控制規範 (Version Control)

**Git Workflow**：

- 主分支：`main` (生產環境)
- 開發分支：`dev` (開發環境)
- 功能分支：`feature/###-feature-name` 或 `fix/###-bug-name`
- 所有 feature/fix 分支預設合併到 `dev`，除非特別指定

**Commit 規範**：

- 遵循 [Angular Commit Convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format)
- 格式：`type(scope): subject`
- 常用類型：`feat`, `fix`, `docs`, `refactor`, `test`, `style`, `build`, `ci`
- 禁止在 commit message 中添加 AI 相關署名

**Pull Request 規範**：

- 標題使用英文，遵循 commit convention
- 內文使用英文，結尾附繁體中文摘要
- 必須通過 CI 檢查：測試、linting、build
- 禁止添加 AI 相關署名或 Co-Authored-By 標記

### 技術棧標準 (Technology Stack)

**必要技術**：

- **Frontend**: Next.js 15+ (React 19), TypeScript
- **UI**: Shadcn/UI + Tailwind CSS (符合 Vercel Design Guidelines)
- **State**: Redux Toolkit + SWR
- **Database**: MongoDB + Mongoose ODM
- **Auth**: Better Auth (Google OAuth)
- **DI**: InversifyJS
- **Testing**: Jest (未來考慮遷移至 Vitest)

**禁止事項**：

- 不可引入與既定技術棧衝突的框架
- 不可繞過 Clean Architecture 直接訪問資料庫
- 不可跳過依賴注入直接實例化服務

### 效能標準 (Performance Standards)

**Web Vitals 目標**：

- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1

**資源預算**：

- 初始載入 JavaScript: < 200KB (gzipped)
- 首次內容繪製 (FCP): < 1.8s
- 網路請求響應時間: < 500ms (p95)

**最佳化要求**：

- 使用 `transform` 和 `opacity` 進行動畫 (GPU 加速)
- 圖片使用 Next.js Image 組件優化
- 路由使用 Next.js 預取和代碼分割
- 實現 PWA 離線功能 (@serwist/next)

## Governance 治理規範

### 憲章權威性 (Constitution Authority)

本憲章是 VolleyBro 專案的最高開發治理文件，優先於所有其他開發實踐和慣例。

### 合規性要求 (Compliance Requirements)

**強制檢查點**：

1. **規格階段** (`/speckit.specify`)：驗證用戶故事符合 MVP 原則和測試要求
2. **計畫階段** (`/speckit.plan`)：執行 Constitution Check，驗證技術方案符合原則
3. **實施階段** (`/speckit.implement`)：確保代碼符合品質標準和架構原則
4. **Pull Request**：審查者必須驗證 PR 符合所有相關原則

**違規處理**：

- 任何偏離憲章原則的設計必須在 `plan.md` 的 Complexity Tracking 區塊記錄並充分說明理由
- 無正當理由的違規將不被接受

### 修訂程序 (Amendment Procedure)

**修訂觸發條件**：

- 核心原則增刪或重新定義
- 技術棧重大變更
- 開發流程重大調整

**修訂流程**：

1. 提出修訂提案並說明理由
2. 更新 `.specify/memory/constitution.md`
3. 更新版本號：
   - **MAJOR**: 向後不兼容的原則移除或重新定義
   - **MINOR**: 新增原則或重大擴充
   - **PATCH**: 澄清、用詞修正、非語義精修
4. 傳播修訂到所有依賴模板 (plan, spec, tasks)
5. 提交 PR 並標註 `docs: amend constitution to vX.Y.Z`

**一致性維護**：
憲章修訂後必須同步更新以下文件：

- `.specify/templates/plan-template.md` (Constitution Check 區塊)
- `.specify/templates/spec-template.md` (需求和驗收標準)
- `.specify/templates/tasks-template.md` (任務分類和測試要求)
- 專案 `CLAUDE.md` 和 `README.md` (如相關原則變更)

### 版本歷史 (Version History)

**Version**: 1.0.0 | **Ratified**: 2025-12-17 | **Last Amended**: 2025-12-17

**變更記錄**：

- v1.0.0 (2025-12-17): 初始憲章建立，確立五大核心原則和治理規範
