# 專案總覽 (Project Overview)

VolleyBro
是一款專為排球隊伍設計的賽事紀錄與隊伍管理網頁應用程式。旨在取代傳統的紙筆記錄，為教練、球隊管理者和球員提供一個高效、數位化的平台。

## 核心目標

- 高效賽事紀錄: 提供直觀的介面，即時記錄比賽得分、球員表現（如發球、攻擊、攔網）等詳細數據。
- 全面球隊管理: 支援球隊創建、成員管理、權限分配及賽前陣容設定。
- 數據驅動分析: 將比賽數據轉化為視覺化圖表與統計報告，幫助球隊分析表現。
- 跨平台體驗: 支援桌面與行動裝置，並具備 PWA (Progressive Web App) 功能，可安裝至主畫面。

## 核心技術棧 (Core Technology Stack)

- 框架 (Framework): Next.js 14+ (React)
- 語言 (Language): TypeScript
- 後端 API: Next.js API Routes
- 資料庫 (Database): MongoDB
- ORM: Mongoose
- 身份驗證 (Authentication): NextAuth.js (Auth.js)，支援 Email 和 Google 登入。
- UI 組件庫: Shadcn/UI 搭配 Tailwind CSS
- 狀態管理 (State Management): Redux Toolkit (用於複雜狀態) + SWR (用於資料獲取與快取)
- 依賴注入 (DI): InversifyJS
- 測試 (Testing): Jest (統一 jsdom 環境) & Storybook (UI 組件開發與測試)
- PWA: @serwist/next
- 程式碼品質: ESLint (語法檢查) & Prettier (程式碼格式化)
- 版本與發布: Semantic Release (自動化版本管理與日誌生成)
- 後端服務: Vercel (部署與托管)
- 資料庫服務: MongoDB Atlas (雲端資料庫)

## 專案架構 (Project Architecture)

本專案採用受乾淨架構 (Clean Architecture) 或 領域驅動設計 (DDD) 啟發的分層架構，確保關注點分離、高內聚、低耦合。

依賴關係流向: Infrastructure -> Application -> Entities

1. `src/entities` - 領域層 (Domain Layer)
   - 職責: 包含最核心的業務邏輯、規則和資料結構（實體），如 User, Team, Record。
   - 特性: 完全獨立，不依賴任何外部框架或資料庫。

2. `src/applications` - 應用層 (Application Layer)
   - 職責: 編排領域層的實體來完成具體的使用案例 (Use Cases)，例如「創建一場比賽」。
   - 包含: usecases/ (業務流程), repositories/ (資料儲存的抽象介面)。

3. `src/infrastructure` - 基礎設施層 (Infrastructure Layer)
   - 職責: 實作應用層定義的介面，處理所有與外部世界的互動。
   - 包含: db/ (MongoDB 連線與 Schema), services/ (外部服務的具體實作), di/ (依賴注入容器設定)。

4. `src/app` & `src/components` - 展現層 (Presentation Layer)
   - 職責: 處理 UI 渲染、使用者互動和 HTTP 請求。
   - `src/app`: Next.js App Router，負責路由 (page.tsx)、佈局 (layout.tsx) 和後端 API 端點 (api/)。
   - `src/components`: 可重用的 React 組件，按 ui/ (通用), custom/ (專案特有), 及功能模組 (如 home, match) 組織。

## 主要功能模組 (Key Feature Modules)

- 使用者管理: 註冊、登入/登出、個人資料編輯、球隊邀請處理。
- 球隊管理: 創建/編輯球隊、成員管理（新增、邀請、權限設定）、陣容配置。
- 賽事紀錄: 創建比賽、設定規則、逐球記錄（得分、失分、球員表現）、球員替換、暫停/挑戰等事件記錄。
- 數據分析: 提供賽後統計數據、視覺化圖表和歷史紀錄查詢。

## 資料模型 (Data Models)

- `User`: 儲存使用者基本資料及與球隊的關聯 (teams.joined, teams.inviting)。
- `Team`: 儲存球隊資訊，包含成員列表 (members) 和多個陣容 (lineups)。
- `Member`: 代表一位球隊成員，包含姓名、背號等。
- `Record`: 核心模型，代表一場完整的賽事紀錄，內嵌比賽資訊 (info)、雙方隊伍資料 (teams) 和所有局的紀錄 (sets)。
- `Set`: 代表比賽中的一局，包含該局的陣容、逐球紀錄 (entries) 等。
- `Entry`: 代表一局中的單一事件，如 Rally (回合), Substitution (替換) 等。

## 開發與維運指令 (Development & Operational Scripts)

```bash
  1 # 安裝專案依賴
  2 npm install
  3
  4 # 啟動本地開發伺服器 (http://localhost:3000)
  5 npm run dev
  6
  7 # 執行 ESLint 進行程式碼檢查
  8 npm run lint
  9
  10 # 執行 Prettier 進行程式碼格式化
  11 npm run format
  12
  13 # 執行 Jest 進行單元測試
  14 npm run test
  15
  16 # 啟動 Storybook UI 組件工作台
  17 npm run storybook
  18
  19 # 為生產環境建置專案
  20 npm run build
  21
  22 # 啟動生產模式伺服器
  23 npm run start
```

## 程式碼風格與慣例 (Coding Style & Conventions)

1. 格式化與風格: 嚴格遵守 .prettierrc 和 .eslintrc.json 的設定。提交前請確保已執行 npm run format 和 npm run lint。
2. 架構: 新增功能時，必須遵循現有的分層架構。業務邏輯應放在 applications 和 entities 層，UI 相關程式碼放在 components 和 app 層。
3. TypeScript: 所有新程式碼都應使用 TypeScript 並提供適當的型別定義。避免使用 any 型別。
4. 組件: 盡可能創建可重用的組件。通用、無狀態的 UI 組件應放在 src/components/ui。

## 版本控制與提交訊息 (Version Control & Commit Messages)

本專案使用 Conventional Commits 規範來撰寫提交訊息，這有助於 semantic-release 自動產生 CHANGELOG.md 並管理版本號。

提交格式: `<type>(<scope>): <subject>`

- `feat`: 新增功能 (A new feature)
- `fix`: 修復錯誤 (A bug fix)
- `docs`: 只修改文件 (Documentation only changes)
- `style`: 不影響程式碼意義的修改 (e.g., white-space, formatting)
- `refactor`: 重構程式碼，既不是新增功能也不是修復錯誤
- `perf`: 提升效能的修改 (A code change that improves performance)
- `test`: 新增或修改測試
- `build`: 影響建置系統或外部依賴的修改 (e.g., gulp, npm)
- `ci`: CI 設定檔與腳本的修改 (e.g., Travis, Circle)
- `chore`: 其他不修改 src 或 test 檔案的變動

範例:
1 feat(record): add set and match completion detection
2 fix(auth): resolve type conflicts by consolidating auth type declarations
3 docs(readme): update project architecture diagram

## 測試策略與配置 (Testing Strategy & Configuration)

### 當前測試環境 (Current Testing Environment)

**狀態**: ✅ **已更新** - 統一測試環境已建立 (2024-08-11)

- **測試環境**: 統一的 `jsdom` 環境（適用於所有測試）
- **測試框架**: Jest + Next.js 整合 (`next/jest`)
- **覆蓋率**: Landing page 元件達到 95%+ 測試覆蓋率
- **設定檔**: 單一 `jest.setup.ts` 統一配置

### 關鍵技術決策 (Key Technical Decisions)

#### 1. 統一 jsdom 環境 vs 分離前後端測試環境

**選擇**: 統一使用 `jsdom` 環境

**理由**:
- 符合 Next.js 官方最佳實踐建議
- 簡化配置維護，避免 ES 模組與 CommonJS 語法衝突
- 通用元件測試更貼近實際運行環境
- Clean Architecture 各層級與環境無關

#### 2. MongoDB Mock 策略（短期方案）

**問題**: BSON ES 模組導致 Jest 解析錯誤

**解決方案**: 在 `jest.setup.ts` 中 mock `mongodb`、`mongoose` 和 `bson` 模組

**優點**:
- 避免 `transformIgnorePatterns` 複雜配置
- 測試執行速度更快
- 真正的單元測試隔離

**未來考慮**:
- 中期：評估 `@shelf/jest-mongodb` 用於整合測試
- 長期：考慮遷移至 Vitest 以獲得更好的 ES 模組支援

#### 3. 替代方案評估

- ❌ `transformIgnorePatterns`: Next.js 覆寫複雜，維護負擔重
- ✅ `@shelf/jest-mongodb`: Jest 官方預設（未來考慮）
- ✅ Vitest 遷移: 更好的 ES 模組支援（長期選項）

### 測試結構 (Test Structure)

```
src/
├── components/landing/__tests__/     # 元件單元測試
├── infrastructure/__tests__/         # 基礎設施層測試（已 mock）
├── applications/__tests__/           # 用例測試
├── entities/__tests__/               # 領域邏輯測試
└── lib/features/*/test/             # 功能特定輔助測試
```

### 測試指令 (Testing Commands)

- `npm test` - 執行所有測試
- `npm run test:watch` - 監控模式執行測試
- `npm run test:coverage` - 生成覆蓋率報告

### 測試類型與工具 (Test Types & Tools)

1. **單元測試 (Unit Tests)**: Jest + React Testing Library
2. **整合測試 (Integration Tests)**: Jest（元件間互動測試）
3. **E2E 測試 (End-to-End Tests)**: Playwright（跨瀏覽器測試）
4. **視覺測試 (Visual Tests)**: Storybook + Chromatic
5. **無障礙測試 (Accessibility Tests)**: jest-axe

### CI/CD 整合 (CI/CD Integration)

GitHub Actions 工作流程確保：
- 所有元件測試通過後才執行 E2E 測試
- 測試覆蓋率維持在 95% 以上
- 自動生成測試報告和覆蓋率徽章
