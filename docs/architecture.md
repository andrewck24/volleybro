# VolleyBro 棕地架構文檔

## 文檔資訊

**版本**: 1.0  
**建立日期**: 2025-08-14  
**架構師**: Winston  
**範圍**: 現有系統完整架構分析，專注於 Epic 2-6 重構參考

### 變更日誌

| 日期       | 版本 | 描述                   | 作者    |
| ---------- | ---- | ---------------------- | ------- |
| 2025-08-14 | 1.0  | 初始棕地架構分析文檔   | Winston |

---

## 🎯 執行摘要

### 專案狀態概覽

VolleyBro 是一個**架構成熟的排球隊伍管理平台**，採用現代化技術棧和 Clean Architecture 設計模式。專案目前處於 **Beta 階段**，具備完整的核心功能，正準備進行系統現代化重構。

### 關鍵架構決策

1. **Clean Architecture 五層分離**: 實現業務邏輯與技術實作的完全分離
2. **混合狀態管理**: Redux Toolkit (複雜狀態) + SWR (服務端狀態)
3. **MongoDB Embedded Documents**: 針對排球賽事數據的效能優化策略
4. **InversifyJS 依賴注入**: 實現可測試性和模組化
5. **NextAuth.js v5**: 現代化身份認證與授權

### 技術債務重點 (Epic 6)

- **TypeScript 嚴格模式**: 目前 `strict: false`，需漸進式啟用
- **Zod Schema 分散**: 需要集中化管理和重用策略  
- **檔案格式不統一**: `.jsx` 檔案需遷移至 `.tsx`
- **隱性 any 型別**: Props 型別定義需要完善

---

## 🏗️ 架構概覽

### Clean Architecture 五層分離

```text
┌─────────────────────────────────────────────────┐
│                Presentation Layer                │
│   src/app/ (Pages) + src/components/ (UI)       │
├─────────────────────────────────────────────────┤
│                Interface Layer                   │  
│              src/app/api/ (Controllers)         │
├─────────────────────────────────────────────────┤
│               Application Layer                  │
│  src/applications/usecases/ + repositories/     │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer                │
│   src/infrastructure/ (DB, Services, DI)       │
├─────────────────────────────────────────────────┤
│                 Domain Layer                     │
│           src/entities/ (Business Logic)        │
└─────────────────────────────────────────────────┘
```

### 技術棧架構圖

```text
Frontend Stack:
┌─────────────┬─────────────┬─────────────────────┐
│  React 19   │  Next.js 15 │    TypeScript      │
├─────────────┼─────────────┼─────────────────────┤
│ Tailwind CSS│ Shadcn/UI   │    Motion/React    │
├─────────────┼─────────────┼─────────────────────┤
│Redux Toolkit│     SWR     │   React Hook Form  │
└─────────────┴─────────────┴─────────────────────┘

Backend Stack:
┌─────────────┬─────────────┬─────────────────────┐
│  MongoDB    │  Mongoose   │    NextAuth.js v5   │
├─────────────┼─────────────┼─────────────────────┤
│ InversifyJS │  Clean Arch │      Google OAuth   │
├─────────────┼─────────────┼─────────────────────┤
│    Jest     │   Serwist   │    Bundle Analyzer  │
└─────────────┴─────────────┴─────────────────────┘
```

---

## 📂 關鍵文件和進入點

### 🔑 關鍵配置文件

| 文件                 | 用途                                           | Epic 影響     |
| -------------------- | ---------------------------------------------- | ------------- |
| `src/auth.config.ts` | NextAuth.js v5 配置與型別擴展                  | Epic 2        |
| `src/middleware.ts`  | 路由保護與身份驗證中介軟體                     | Epic 2        |
| `next.config.js`     | Serwist PWA 配置與 Bundle Analyzer             | Epic 6        |
| `tsconfig.json`      | TypeScript 設定 (`strict: false` 需檢討)      | **Epic 6 🔥** |

### 🏢 業務邏輯核心

| 模組路徑                                  | 責任                   | Clean Architecture 層 |
| ----------------------------------------- | ---------------------- | --------------------- |
| `src/entities/`                           | 業務實體定義           | Domain                |
| `src/applications/usecases/record/`       | 賽事紀錄業務邏輯       | Application           |
| `src/infrastructure/di/inversify.config`  | 依賴注入容器配置       | Infrastructure        |
| `src/infrastructure/db/repositories/`     | 資料存取實作           | Infrastructure        |

### 🎨 前端架構重點

| 路徑                       | 用途                           | 狀態管理策略          |
| -------------------------- | ------------------------------ | --------------------- |
| `src/lib/redux/`           | Redux Toolkit 設定             | 複雜業務狀態          |
| `src/lib/features/record/` | 賽事紀錄狀態管理 (Redux)       | 即時比賽數據          |
| `src/lib/features/team/`   | 球隊陣容管理 (Redux)           | 複雜陣容邏輯          |
| `src/components/landing/`  | 產品介紹頁元件                 | **Epic 1 目標 🎯**    |

---

## 💾 資料架構與決策

### MongoDB 資料模型設計

#### 設計原則：Embedded Documents Strategy

```javascript
// Record Collection - 核心設計
{
  _id: ObjectId,
  matchInfo: {
    title: String,
    date: Date,
    location: String
  },
  teams: {
    ours: {
      name: String,
      members: [MemberSchema]  // 嵌入文檔
    },
    opponents: { ... }
  },
  sets: [{
    rallies: [RallySchema],      // 嵌入陣列
    substitutions: [SubSchema]   // 嵌入陣列
  }]
}
```

#### 🔍 MongoDB vs PostgreSQL 檢討要點

**MongoDB 優勢 (目前架構)**:
- ✅ **排球數據特性匹配**: 比賽紀錄天然的層次結構
- ✅ **讀取效能**: 單一查詢獲取完整比賽數據
- ✅ **開發速度**: Mongoose ODM 與 TypeScript 整合良好
- ✅ **彈性 Schema**: 適合排球規則變化

**PostgreSQL 考量點**:
- ⚠️ **ACID 特性**: 更強的數據一致性
- ⚠️ **複雜查詢**: SQL 在統計分析上的優勢  
- ⚠️ **生態系統**: 更豐富的分析工具
- ⚠️ **水平擴展**: 需要更多架構考量

**決策建議時機**: Epic 5 (數據分析系統重構) 完成後，基於實際查詢模式和效能數據做評估。

### 核心實體關係

```text
User (1) -----> (*) Team -----> (*) Member
 │                │                 │
 └─── teams       └─── members      └─── team_id
     (embedded)       (embedded)         (reference)
     
Record (1) -----> (*) Set -----> (*) Rally
   │                 │              │
   └─── sets         └─── rallies   └─── player stats
       (embedded)        (embedded)      (embedded)
```

---

## 🔄 狀態管理策略

### 混合狀態管理架構

#### Redux Toolkit 使用場景
```typescript
// 複雜業務邏輯狀態
- record-slice.ts     // 即時比賽紀錄狀態
- lineup-slice.ts     // 球隊陣容配置
- global-slice.ts     // 全域應用狀態
```

#### SWR 使用場景  
```typescript
// 服務端狀態管理
- 用戶資料同步
- 球隊列表獲取  
- 歷史比賽查詢
- API 快取策略
```

#### 設計理由與整合

**為什麼採用混合策略？**
1. **複雜度分離**: Redux 處理需要複雜邏輯的狀態
2. **效能最佳化**: SWR 自動處理快取和重新驗證
3. **開發體驗**: 各自在適合的場景發揮優勢

**未來重構考量 (Epic 4)**:
- 評估 Redux 使用複雜度是否合理
- 考慮 SWR mutations 替代部分 Redux actions
- 統一錯誤處理機制

---

## 🔐 身份認證與授權

### NextAuth.js v5 架構

#### 認證流程
```typescript
// src/auth.config.ts - 核心配置
interface User {
  id: string;
  teams: UserEntity["teams"];  // 直接關聯球隊
}

// src/middleware.ts - 路由保護
export const middleware = auth((req) => {
  const isSignedIn = !!req.auth;
  // 路由保護邏輯
});
```

#### 權限系統設計
```typescript
// 三層權限架構
enum Role {
  OWNER = "OWNER",     // 球隊擁有者
  ADMIN = "ADMIN",     // 管理員  
  MEMBER = "MEMBER"    // 一般成員
}

// Infrastructure Layer 實作
class AuthorizationService {
  canAccessTeam(userId: string, teamId: string): boolean
  canModifyLineup(userId: string, teamId: string): boolean
  canDeleteMember(userId: string, targetMemberId: string): boolean
}
```

#### 重構重點 (Epic 2)
- **Session 管理**: 優化 JWT 與資料庫同步
- **權限檢查**: 統一授權邏輯的實作位置
- **安全性**: Google OAuth 流程的安全強化

---

## 🧪 測試策略現況

### 當前測試架構

#### ✅ 已建立的測試環境
```javascript
// jest.config.js - 統一 jsdom 環境
testEnvironment: 'jsdom',
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']

// 測試覆蓋率狀況
- Landing Page: 95%+ 覆蓋率 ✅
- Helper Functions: 完整單元測試 ✅  
- Repository Layer: MongoDB 模擬測試 ✅
```

#### ⚠️ 技術債務與改善方向
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
```

---

## 🛠️ 技術債務詳細分析 (Epic 6 重點)

### TypeScript 遷移策略

#### 當前狀況評估
```json
// tsconfig.json - 問題分析
{
  "strict": false,          // 🔥 需要漸進式啟用
  "experimentalDecorators": true,  // InversifyJS 需求
  "emitDecoratorMetadata": true    // DI 容器支援
}
```

#### 檔案格式標準化 (Story 6.1)
```bash
# 需要遷移的 .jsx 檔案
src/components/team/form.jsx                    → .tsx
src/components/team/members/*/**.jsx          → .tsx  
src/app/(protected)/team/**/**.jsx            → .tsx

# 影響評估
- 14 個檔案需要重命名
- Git 歷史保留 (使用 git mv)
- IDE TypeScript 支援啟用
```

#### Props 型別定義缺口 (Story 6.2)
```typescript
// 問題範例
function TeamForm({ team, onSubmit, className }) {
  // ❌ 隱性 any 型別，缺乏型別安全
}

// 目標實作
interface TeamFormProps {
  team?: Partial<TeamFormValues>;
  onSubmit: (values: TeamFormValues) => void;
  className?: string;
}
function TeamForm({ team, onSubmit, className }: TeamFormProps) {
  // ✅ 完整型別安全
}
```

### Zod Schema 重構策略

#### 當前 Schema 分散問題
```typescript
// 問題：Schema 散落各處
src/components/team/form.jsx        // inline schema
src/lib/features/team/types.ts      // 部分 schema
src/components/record/form.tsx      // 重複邏輯

// 目標：集中化管理  
src/lib/features/team/schemas.ts    // 團隊相關 schemas
src/lib/features/record/schemas.ts  // 紀錄相關 schemas
src/lib/zod-schemas.ts              // 通用 schemas
```

#### 通用 Schema 設計 (Story 6.4)
```typescript
// src/lib/zod-schemas.ts - 設計目標
export const zCoerceOptionalNumber = z.preprocess(
  (val) => val === "" ? undefined : val,
  z.coerce.number().optional()
);

// 解決問題
1. 表單數字欄位處理不一致
2. 錯誤訊息重複定義
3. Schema 邏輯重複實作
4. 型別推斷不準確
```

### 漸進式遷移計劃
```text
Phase 1: 基礎建設 (Story 6.1-6.3)
├── 檔案格式標準化 (.jsx → .tsx)
├── Props 型別定義補強  
└── 表單型別安全 (z.infer)

Phase 2: Schema 重構 (Story 6.4-6.5)  
├── 通用 Schema 模組建立
├── 業務 Schema 集中化
└── Import 路徑更新

Phase 3: 整合應用 (Story 6.6)
├── 通用 Schema 套用
├── 重複邏輯移除
└── 測試驗證與修正
```

---

## 🔧 依賴注入架構

### InversifyJS 容器設計

#### 當前 DI 容器結構
```typescript
// src/infrastructure/di/inversify.config.ts
container.bind<IUserRepository>(TYPES.UserRepository)
  .to(UserRepositoryImpl);

container.bind<FindRecordUseCase>(TYPES.FindRecordUseCase)  
  .to(FindRecordUseCase);
```

#### DI 使用場景分析
```text
✅ 已實現 DI 的模組:
- Repository Layer (User, Team, Record)
- Authentication/Authorization Services  
- Record-related Use Cases (7 個 use cases)

🤔 未使用 DI 的區域:
- Frontend Components (直接 import)
- API Controllers (部分使用)
- Utility Functions (無狀態函數)
```

#### 重構考量 (Epic 2-5)
1. **DI 使用一致性**: 是否所有 Use Cases 都需要 DI？
2. **容器生命週期**: 是否需要 scoped 生命週期管理？
3. **測試友善性**: Mock 策略與 DI 的整合

---

## 🎨 UI/UX 架構

### 設計系統架構

#### Shadcn/UI + Tailwind CSS
```text
src/components/ui/          # 基礎 UI 元件庫
├── button.tsx             # 按鈕系統
├── form.tsx               # 表單元件
├── card.tsx               # 卡片系統
└── toast.tsx              # 通知系統

src/components/custom/      # 專案客製元件  
├── logo.tsx               # 品牌識別
├── court/                 # 排球場地元件
└── loading/               # 載入狀態

src/components/landing/     # Epic 1 目標區域 🎯
├── hero.tsx               # 主視覺區塊
├── features.tsx           # 功能展示
├── benefits.tsx           # 產品優勢  
└── footer/                # 頁尾區塊
```

#### 動畫系統 (Motion/React)
```typescript
// src/components/landing/features.tsx
import { motion, useTransform, useScroll } from "motion/react";

// 技術債務: React Motion 警告
// ❌ <div whileHover={...}>  
// ✅ <motion.div whileHover={...}>
```

#### PWA 架構 (Serwist)
```javascript
// next.config.js - PWA 設定
const withSerwist = (await import("@serwist/next")).default({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js"
});

// 功能特色
- 離線功能支援
- 應用安裝提示
- 快取策略管理
```

---

## 📊 效能與最佳化

### Bundle 分析與最佳化

#### 當前效能配置
```javascript
// next.config.js - 效能配置
experimental: {
  optimizePackageImports: ["react-icons"]
},

// Bundle Analyzer 整合
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true"
});
```

#### 資料查詢效能策略
```typescript
// MongoDB 效能最佳化
1. Embedded Documents - 減少 JOIN 查詢
2. 索引策略 - 基於查詢模式設計
3. 分頁機制 - 大量數據的處理

// SWR 快取策略  
1. 智能重新驗證
2. 背景更新機制
3. 離線快取支援
```

### Epic 5 效能重構重點
- **MongoDB 查詢最佳化**: 基於實際使用模式調整
- **統計計算效能**: 大量比賽數據的處理策略
- **記憶體使用最佳化**: 長時間比賽紀錄的記憶體管理

---

## 🔮 未來架構演進

### Epic 執行後的架構演進

#### Epic 1 (產品介紹頁優化) 架構影響
```typescript
// 新增模組預期
src/components/landing/
├── waitlist-form.tsx      // Waitlist 功能
├── beta-badge.tsx         // Beta 標示元件  
└── tech-advantages.tsx    // 技術優勢展示

// 整合點
- SWR: Waitlist 狀態管理
- Zod: Email 驗證 schema
- API: /api/waitlist endpoints
```

#### Epic 2-5 (系統重構) 架構提升
```text
重構成果預期:
✅ 文件完整性 - 每個模組都有清晰的架構文件
✅ 測試覆蓋率 - 95%+ 的測試覆蓋率
✅ 程式碼品質 - TypeScript 嚴格模式 + ESLint
✅ 效能改善 - 查詢最佳化 + 記憶體管理
```

#### 技術選型檢討時機
```text
資料庫選型檢討 (Epic 5 後):
├── 查詢模式分析
├── 效能指標評估  
├── 擴展性需求評估
└── 遷移成本評估

前端狀態管理檢討 (Epic 3-4 後):
├── Redux 複雜度評估
├── SWR 使用效果分析
├── 新興解決方案調研
└── 開發體驗改善評估
```

---

## 📋 架構檢查清單

### Epic 執行前置檢查

#### Epic 2 (使用者管理) 準備度
- [ ] NextAuth.js v5 配置文檔化
- [ ] 權限系統邊界定義
- [ ] Session 管理策略確認
- [ ] Google OAuth 安全檢查

#### Epic 3 (球隊管理) 準備度  
- [ ] 陣容配置邏輯文檔化
- [ ] 成員權限規則確認
- [ ] 資料關係圖更新
- [ ] 業務邏輯測試策略

#### Epic 4 (賽事紀錄) 準備度
- [ ] Redux 狀態流程圖
- [ ] 即時計算邏輯文檔
- [ ] 效能瓶頸識別
- [ ] 資料一致性策略

#### Epic 5 (數據分析) 準備度
- [ ] MongoDB 查詢模式分析
- [ ] 統計演算法文檔化  
- [ ] 大數據處理策略
- [ ] PostgreSQL 遷移評估準備

#### Epic 6 (TypeScript 重構) 準備度
- [x] 技術債務詳細盤點
- [x] 遷移策略規劃完成
- [x] 風險評估與緩解計劃  
- [x] 階段性執行計劃

### 架構一致性檢查
- [ ] Clean Architecture 分層是否清晰
- [ ] 依賴方向是否正確 (內向依賴)
- [ ] 介面抽象是否充分
- [ ] 業務邏輯是否獨立於技術實作

---

## 🎓 結論與建議

### 架構強項
1. **Clean Architecture 實作良好**: 分層清晰，業務邏輯獨立
2. **現代化技術棧**: Next.js 15, React 19 等最新技術
3. **完整的 PWA 支援**: 行動端體驗優秀
4. **測試基礎建設**: Jest 統一環境，高覆蓋率

### 主要改善機會
1. **TypeScript 嚴格模式**: Epic 6 的首要目標
2. **資料庫策略檢討**: MongoDB vs PostgreSQL 評估
3. **狀態管理最佳化**: Redux 使用複雜度檢討
4. **效能監控強化**: 更詳細的效能指標

### 執行建議
1. **Epic 6 絕對優先**: 為所有後續重構奠定技術基礎
2. **漸進式改善**: 避免大規模重構風險
3. **數據驅動決策**: 基於實際使用數據做技術選型
4. **文檔同步更新**: 重構過程中保持文檔最新

這個架構文檔將為 Epic 2-6 的執行提供完整的技術參考和決策依據。建議在每個 Epic 執行前重新檢視相關章節，確保重構方向與整體架構目標一致。