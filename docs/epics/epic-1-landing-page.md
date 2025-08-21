# Epic 1: Preview 階段 Landing Page 重構

**Epic目標**: 重新設計 VolleyBro landing page 內容策略，移除虛構數據，將核心功能分區詳細介紹，強化 Preview 階段用戶招募，並優化頁面進入動畫效果。

**功能範圍**:

- Hero 區塊背景動畫整合（浮動模糊背景球）、元素拆分與模組化重構
- Motion.js 動態導入優化，移除 LazySection 依賴
- 核心功能分區展示（即時記錄、數據分析、團隊管理）
- 虛構數據替換為真實技術優勢展示
- Preview 階段定位與用戶招募優化
- 父層背景色彩統一管理策略、Dark/Light Mode 主題配色方案重新評估
- Header glassmorphism 效果實現（參考 KIRO 設計模式）
- Preview Badge 視覺簡化與動畫清理

**整合需求**:

- 保持現有 Motion.js + React 19 + TypeScript 技術架構
- 維持 Shadcn UI + Tailwind CSS 設計語言一致性
- 確保現有動畫效果和響應式設計不受影響
- Bundle size 優化，效能維持現有標準

## Story 1.1: Hero 區塊升級與背景動畫整合

作為 **訪問網站的排球教練**，
我想要 **一眼就看出 VolleyBro 是專為排球設計的數位管理工具**，
所以 **我能快速了解產品定位並決定是否繼續深入了解**。

### 1.1.1 技術實作

- 整合 claude/hero 的 `animate-float` 背景球動畫
- 整合 `animate-pulse-glow` 的 Preview Badge 效果
- 整合 AnimatePresence 文字輪播（「簡單、快速、專業」）
- 保持「開始使用」CTA 文案，導向 Preview 註冊

### 1.1.2 產品介紹內容

1. **主標題**：「讓排球賽事紀錄更加簡單、快速、專業」- 明確傳達產品核心價值
2. **副標題**：「專為排球教練與管理者設計的數位化解決方案，告別紙筆記錄，擁抱智慧化團隊管理」
3. **Preview 標示**：清楚標示目前為 Preview 版本，設定用戶合理期待
4. **核心特色**：即時同步、跨平台支援、開源免費 - 三大關鍵賣點
5. **行動呼籲**：「開始使用」- 直接引導用戶體驗

### 1.1.3 接受條件

1. Hero 具有吸引人的背景動畫效果
2. Preview Badge 有明顯的視覺提示
3. 主標題包含動態文字展示產品特色
4. CTA 按鈕維持「開始使用」文案，引導 Preview 體驗
5. 底部快速展示三大核心優勢

### 1.1.4 整合驗證

IV1: 新背景動畫元素正確渲染並與整體頁面效果協調
IV2: 文字輪播動畫與現有 FlipWords 元件整合
IV3: 響應式設計和滾動視差效果保持正常

## Story 1.2: HighlightsSection 四大核心特色展示

作為 **瀏覽網站的排球教練**，
我想要 **快速了解 VolleyBro 的四大核心特色和優勢**，
所以 **我能立即判斷這個工具能為我的球隊帶來什麼幫助**。

### 1.2.1 技術實作

- 創建 HighlightsSection 元件替代現有 Features 元件
- 沿用現有 Features 元件的動態效果與動畫設計
- 使用 `motion.div` 實作四個特色卡片的進入動畫
- 保持現有 grid 佈局與響應式設計模式

### 1.2.2 四大核心特色內容

**即時記錄**:

- 標題：提供簡單易用的賽事記錄工具
- 描述：讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業

**視覺化數據分析**:

- 標題：透過強大的數據分析功能
- 描述：深入了解球隊表現，以數據驅動戰術改進

**團隊管理**:

- 標題：有效掌握球員資訊與表現變化
- 描述：協助陣容安排，讓每場比賽都有最佳配置

**跨平台支援**:

- 標題：無論是手機、平板或電腦
- 描述：隨時隨地輕鬆使用，不受設備限制

### 1.2.3 接受條件

1. HighlightsSection 元件具有四個特色展示卡片
2. 沿用現有 Features 元件的動畫效果與視覺設計
3. 響應式設計在所有斷點正確顯示
4. 與現有設計系統和色彩主題一致
5. 卡片內容清晰傳達產品核心價值

### 1.2.4 整合驗證

IV1: 新 HighlightsSection 與現有頁面動畫效果協調
IV2: 四大特色內容準確傳達產品價值
IV3: 響應式佈局在各種設備上顯示正常

## Story 1.3: CTASection 行動呼籲區塊

作為 **對 VolleyBro 感興趣的排球教練**，
我想要 **在了解完所有功能後有明確的下一步行動指引**，
所以 **我能輕鬆開始使用這個工具來改善我的球隊管理**。

### 1.3.1 技術實作

**CTASection 區塊設計**:

- 創建獨立的 CTASection 元件
- 使用垂直佈局設計，適合行動呼籲的聚焦效果
- 整合與 Hero 相同的形象圖片，保持視覺一致性
- 包含 slogan、CTAButton、背景圖片三個核心元素

### 1.3.2 行動呼籲內容設計

**Slogan 選項評估**:

1. 「準備好革新你的排球管理方式了嗎？」
2. 「讓數據驅動你的每一個戰術決策」
3. 「現在就開始，讓 VolleyBro 成為你的最佳教練夥伴」
4. 「加入 VolleyBro Preview，體驗排球管理的未來」

**區塊內容結構**:

- 主要 Slogan：吸引注意並傳達核心價值
- CTA Button：「立即開始使用」或「加入 Preview 體驗」
- 背景圖片：與 Hero 相同的排球主題圖片
- 視覺效果：適度的背景效果和動畫

### 1.3.3 接受條件

1. CTASection 包含 slogan、CTA button、形象圖片
2. 使用垂直佈局，突出行動呼籲焦點
3. 與 Hero 形象圖片保持一致性
4. CTA button 與其他區塊的按鈕設計統一
5. 適當的視覺效果增強吸引力

### 1.3.4 整合驗證

IV1: CTASection 有效引導用戶採取行動
IV2: 與整體 Landing Page 設計風格協調
IV3: CTA button 功能與現有註冊流程整合

## Story 1.4: Header Glassmorphism 效果與主題適配

作為 **網站訪問者**，
我想要 **看到專業且現代的導航體驗**，
所以 **我能感受到產品的品質和技術水準**。

### 1.4.1 設計需求 (參考 KIRO 模式)

**滾動前狀態**:

- 完全透明背景，融入頁面背景色
- 文字顏色自動適配 dark/light mode
- 最小化 padding，保持簡潔感

**滾動後狀態**:

- Glassmorphism 毛玻璃效果
- 圓角邊框與陰影增強層次
- 背景模糊與半透明效果
- 平滑過渡動畫

### 1.4.2 技術實作

- 使用 `backdrop-filter: blur()` 實現毛玻璃效果
- `useScroll` hook 監測滾動狀態
- Tailwind CSS 主題變數適配
- 確保跨瀏覽器相容性

### 1.4.3 接受條件

1. Header 初始狀態完全透明，不設定背景色
2. 滾動觸發 glassmorphism 效果轉換
3. Dark/Light mode 自動適配文字顏色
4. 平滑的進入/退出動畫效果
5. 保持現有導航功能完整性
6. Mobile 響應式優化與跨設備相容性
7. 完整測試覆蓋與品質保證

## Story 1.5: Hero 元件模組化重構與主題統一

作為 **開發維護者**，
我想要 **Hero 元件具有清晰的架構和統一的主題管理**，
所以 **代碼更易於維護和擴展**。

### 1.5.1 元件拆分策略

**核心子元件**:

- `HeroBadge`: Preview badge 獨立元件
- `HeroTitle`: 主標題與文字輪播
- `HeroDescription`: 描述文字元件
- `HeroCTA`: 行動召喚按鈕區域
- `HeroFeatures`: 三大特色標籤
- `HeroImage`: 右側圖片展示

### 1.5.2 主題管理改進

- Hero 移除固定背景色，使用父層背景
- 統一 dark/light mode 色彩變數
- Preview Badge 簡化為 outline 風格
- 移除未使用的 `animate-pulse-glow` 動畫

### 1.5.3 接受條件

1. Hero 主元件程式碼行數減少 50%
2. 各子元件職責單一，可獨立測試
3. Preview Badge 使用適當的 outline 顏色
4. 背景色彩統一由父層管理
5. 清理未使用的動畫設定和 CSS

## Story 1.6: Header 佈局重構與 Preview Badge 重新定位

作為 **網站訪問者**，
我想要 **看到更簡潔且平衡的 Header 佈局設計**，
所以 **我能有更好的導航體驗且視覺焦點更清楚**。

### 1.6.1 Header 佈局最適化

- header-glassmorphism-container 統一使用 `p-3`, `rounded-2xl`
- 改採用 `justify-between` 佈局取代 `justify-start`
- logo-container 移除 `flex-1` 並新增 `pl-4` 視覺平衡
- Preview badge 從 Hero 移至 Header logo 右側
- Logo 與 preview badge 垂直置中對齊
- Logo 高度限制不超過 CTA 按鈕高度

### 1.6.2 接受條件

1. Header 佈局採用 justify-between 與統一 padding
2. Preview badge 整合至 Header logo-container 中
3. Logo 與 badge 垂直置中且視覺平衡
4. 現有 glassmorphism 效果與響應式設計保持不變
5. Header 相關測試更新完成

### 1.6.3 整合驗證

IV1: 新 Header 佈局在所有斷點正確顯示
IV2: Preview badge 位置與現有設計系統一致
IV3: Glassmorphism 效果與滾動行為無迴歸

## Story 1.7: CTA Button 重構與相依關係解耦

作為 **開發維護者**，
我想要 **CTA Button 元件具有統一設計且不依賴元件間耦合**，
所以 **程式碼更易於維護且視覺呈現更一致**。

### 1.7.1 架構解耦重構

- 移除 Header CTA 的 scroll-to-reveal 功能
- 解除 Header 與 Hero 元件的 observerRef 相依關係
- Header 從 Hero 中移出，直接在 Landing Page 使用
- 統一所有 Landing Page CTA 的顏色配置
- 取消 CTA 邊框（一般與 hover 狀態）

### 1.7.2 元件最適化重構

- 使用原生 Button, Link 元件降低樣式覆蓋複雜度
- Light/Dark mode 背景對比色最適化
- 重新評估並撰寫 CTA 元件測試

### 1.7.3 接受條件

1. Header 與 Hero 元件完全解耦
2. CTA Button 顏色配置在 Light/Dark mode 都有鮮明對比
3. 所有 CTA 按鈕設計統一且無邊框
4. PWA 安裝功能保持完整
5. 新的 CTA 元件測試涵蓋重構後的功能

### 1.7.4 整合驗證

IV1: Landing Page 直接整合 Header 與 Hero 無相依關係
IV2: CTA 按鈕在不同主題下都有最佳對比效果
IV3: 現有 CTA 功能（PWA 安裝等）無迴歸問題

## Story 1.8: CTA Button 與 Hero RWD 程式碼品質改善

作為 **開發維護者**，
我想要 **CTA Button 具有更嚴格的 type safety 並移除 console logging，同時 Hero section 在中等斷點有適當的垂直 RWD 佈局**，
所以 **程式碼品質更高、生產環境更乾淨，且使用者在不同裝置上都有最佳的視覺體驗**。

### 1.8.1 Type Safety 與 Code Quality 改善

**CTA Button 類型安全強化**:
此需求源自於 PR #250 的 [code review](https://github.com/andrewck24/volleybro/pull/250#issuecomment-3201032530)

- 在 `cta-button.tsx:58-70` 中將 `any` 類型替換為 `BeforeInstallPromptEvent` 類型
- 移除第 63-66 行的 `console.log` 語句，改用環境變數控制或完全移除
- 為 PWA 安裝失敗場景新增適當的錯誤處理機制

**Hero Section RWD 最佳化**:

- 在 `md` 斷點時，hero-content 與 hero-image 改用垂直佈局
- 保留適當的 padding 以維持視覺平衡
- 確保動畫效果在不同佈局下都能正常運作

### 1.8.2 技術實作重點

- 定義或匯入 `BeforeInstallPromptEvent` interface
- 使用 `process.env.NODE_ENV !== 'production'` 控制 logging 行為
- 在 Hero section 使用 Tailwind CSS 的 `md:flex-col` 調整佈局
- 使用 try-catch 包裝 PWA 相關操作

### 1.8.3 接受條件

1. **Type Safety**: 移除所有 `any` 類型，使用具體的 `BeforeInstallPromptEvent` 類型
2. **Production Clean**: 生產環境無任何 console.log 輸出
3. **RWD Layout**: Hero section 在 `md` 斷點正確使用垂直佈局且視覺平衡
4. **Error Handling**: PWA 安裝失敗有優雅的降級體驗
5. **Functionality**: 現有 PWA 安裝功能在所有平台正常運作
6. **Code Quality**: TypeScript 編譯通過，ESLint 檢查無錯誤

### 1.8.4 整合驗證

IV1: PWA 安裝功能在各種瀏覽器與平台上無迴歸
IV2: Hero section RWD 佈局在所有斷點都有良好的視覺呈現
IV3: 類型安全改善後編譯與執行時都無錯誤

## Story 1.9: Features 元件與 RecordingSection 功能展示

作為 **想了解 VolleyBro 三大核心功能的排球教練**，
我想要 **透過統一的 Features 元件架構深入了解每個功能區塊**，
所以 **我能全面評估這個工具是否符合我的球隊管理需求**。

### 1.9.1 技術實作

**Features 元件架構設計**:

- 創建 `Features` 元件使用 React Fragment 包裝三大功能區塊
- 創建 `FeatureCard` 共用元件，支援統一的圖文佈局
- 使用 Tailwind CSS 控制佈局：桌面端 `md:flex-row`，行動端 `flex-col`
- 圖片區域固定 1:1 比例，使用漸層背景，卡片高度 70vh，寬度 w-full

**TDD 開發流程**:

- 創建 `features.test.tsx` 進行測試驅動開發
- 測試 Features 元件正確渲染三個功能區塊
- 測試 FeatureCard 響應式佈局和圖片位置控制
- 測試各功能區塊內容正確顯示

**RecordingSection 實作**:

- RecordingSection: 兩個卡片都使用圖右文左佈局（`md:flex-row`）

### 1.9.2 即時記錄功能內容

**卡片 1 - 簡單易用的賽事記錄工具**:

- 標題：「簡單易用的賽事記錄工具」
- 描述：讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業
- 展示：記錄介面截圖或功能演示

**卡片 2 - 即時瀏覽每筆賽事紀錄**:

- 標題：「即時瀏覽每筆賽事紀錄」
- 描述：所有記錄即時同步，隨時查看歷史數據和比賽分析
- 展示：記錄清單或詳細檢視畫面

### 1.9.3 接受條件

1. Features 元件使用 React Fragment 包裝三個功能區塊
2. FeatureCard 元件可在三個 Section 中重用
3. features.test.tsx 涵蓋 TDD 測試用例
4. RecordingSection 兩個卡片均使用圖右文左佈局
5. 卡片高度 70vh，展示區域 1:1 比例漸層背景
6. 行動裝置自動切換為圖上文下垂直佈局

注意：撰寫測試時，應注重實際行為而非實現細節，確保測試覆蓋功能正確性。若非 RWD 等與樣式相關的功能，不要以樣式進行測試。

### 1.9.4 整合驗證

IV1: Features 元件架構支援統一的功能區塊管理
IV2: FeatureCard 元件在各種佈局下正常運作
IV3: TDD 測試確保元件功能正確性

## Story 1.10: AnalyticsSection 數據分析功能展示

作為 **重視數據分析的排球教練**，
我想要 **深入了解 VolleyBro 如何將比賽數據轉化為有價值的分析洞察**，
所以 **我能判斷這個工具是否能幫助我做出更好的戰術決策**。

### 1.10.1 技術實作

**可重用圖卡元件應用**:

- 使用相同的 `FeatureCard` 共用元件
- AnalyticsSection: 兩個卡片都使用圖左文右佈局（`md:flex-row-reverse`）
- 創造與 RecordingSection 的視覺差異，增加頁面豐富性
- 保持相同的卡片高度 70vh 和 1:1 展示區域

### 1.10.2 數據分析功能內容

**卡片 1 - 賽事表現比較**:

- 標題：「賽事表現比較分析」
- 描述：透過視覺化圖表比較不同場次的團隊表現，找出進步趨勢
- 展示：使用現有 Points 元件 (`@src/components/match/stats/team-stats`)
- 重點：數據視覺化、趨勢分析、團隊對比

**卡片 2 - 深入分析球員表現**:

- 標題：「深入分析球員表現（開發中）」
- 描述：運用雷達圖深入分析個別球員的技能表現和成長軌跡
- 展示：使用 shadcn radar charts 展示球員數據
- 重點：個人分析、技能評估、成長追蹤

### 1.10.3 接受條件

1. 重用 `FeatureCard` 元件，展示數據分析兩大功能
2. AnalyticsSection 兩個卡片均使用圖左文右佈局
3. 整合現有 Points 元件和 shadcn radar charts
4. 「開發中」標示讓用戶了解功能狀態
5. 與其他功能區塊保持設計一致性

### 1.10.4 整合驗證

IV1: FeatureCard 元件在不同佈局方向下正常運作
IV2: Points 元件和 radar charts 正確整合到展示區域
IV3: 圖左文右佈局與 RecordingSection 形成視覺對比

## Story 1.11: TeamManagementSection 團隊管理功能展示

作為 **需要管理球員和陣容的排球教練**，
我想要 **了解 VolleyBro 如何協助我進行有效的團隊管理**，
所以 **我能評估這個工具是否能簡化我的球隊管理工作**。

### 1.11.1 技術實作

**可重用圖卡元件應用**:

- 繼續使用 `FeatureCard` 共用元件
- TeamManagementSection: 兩個卡片都使用圖右文左佈局（`md:flex-row`）
- 與 RecordingSection 保持一致的佈局方向
- 維持統一的視覺設計和動畫效果

### 1.11.2 團隊管理功能內容

**卡片 1 - 建立隊伍名單**:

- 標題：「建立完整隊伍名單」
- 描述：輕鬆建立和管理球員資料，掌握每位成員的基本信息和聯絡方式
- 展示：球員名單管理界面或成員資料卡片
- 重點：成員管理、資料建檔、聯絡管理

**卡片 2 - 陣容安排**:

- 標題：「智慧陣容安排」
- 描述：根據球員特色和比賽需求，快速安排最適合的先發陣容
- 展示：陣容配置界面或位置安排視覺化
- 重點：戰術配置、位置安排、陣容優化

### 1.11.3 接受條件

1. 重用 `FeatureCard` 元件展示團隊管理功能
2. TeamManagementSection 兩個卡片均使用圖右文左佈局
3. 功能展示清晰傳達團隊管理的核心價值
4. 與 RecordingSection 保持一致的視覺風格
5. 響應式佈局在各設備正確顯示

### 1.11.4 整合驗證

IV1: 團隊管理功能展示符合實際使用場景
IV2: 圖右文左佈局與整體設計協調
IV3: FeatureCard 元件在三個區塊中保持一致性

---

## 技術架構更新

**新頁面結構**:

```plaintext
Header (logo + preview badge + CTA)
Hero (移除 Header 依賴，專注內容展示)
HighlightsSection (四大特色展示，暫名)
Features (React Fragment 包裝三大功能區塊)
├── RecordingSection (即時記錄詳細介紹)
├── AnalyticsSection (數據分析功能展示)
└── TeamManagementSection (團隊管理特色)
CTASection (行動呼籲區塊)
Footer (Preview 版本聲明)
```

**Features 元件架構**:

- `Features` 元件使用 React Fragment 包裝三個功能區塊
- `FeatureCard` 共用元件支援統一的圖文佈局
- `features.test.tsx` 進行 TDD 測試驅動開發
- 佈局控制：RecordingSection & TeamManagementSection 圖右文左，AnalyticsSection 圖左文右

**Bundle 優化策略**:

- 使用 Motion.js 動態導入替代 LazySection
- 實作統一的進入動畫 hook
- 保持現有 Header 和整體架構
- 預期 bundle size 維持或減少 15-20%

---

**Epic 1 執行優先級**: 立即執行（Brownfield Enhancement）
**預估時程**: 1-2 週
**成功指標**: 用戶信任度提升、真實價值傳達、Preview 註冊轉換率
**對應功能**: FR1 - 產品介紹頁功能（🟡 已部分實現 → 🟢 Preview 階段完善）
