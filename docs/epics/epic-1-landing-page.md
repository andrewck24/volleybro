# Epic 1: Beta階段Landing Page重構 - Brownfield Enhancement

**Epic目標**: 重新設計 VolleyBro landing page 內容策略，移除虛構數據，將核心功能分區詳細介紹，強化 beta 階段用戶招募，並優化頁面進入動畫效果。

**功能範圍**:

- Hero 區塊背景動畫整合（浮動模糊背景球）、元素拆分與模組化重構
- Motion.js 動態導入優化，移除 LazySection 依賴
- 核心功能分區展示（即時記錄、數據分析、團隊管理）
- 虛構數據替換為真實技術優勢展示
- Beta 階段定位與用戶招募優化
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
- 整合 `animate-pulse-glow` 的 Beta Badge 效果
- 整合 AnimatePresence 文字輪播（「簡單、快速、專業」）
- 保持「開始使用」CTA 文案，導向 Beta 註冊

### 1.1.2 產品介紹內容

1. **主標題**：「讓排球賽事紀錄更加簡單、快速、專業」- 明確傳達產品核心價值
2. **副標題**：「專為排球教練與管理者設計的數位化解決方案，告別紙筆記錄，擁抱智慧化團隊管理」
3. **Beta 標示**：清楚標示目前為 Beta 版本，設定用戶合理期待
4. **核心特色**：即時同步、跨平台支援、開源免費 - 三大關鍵賣點
5. **行動呼籲**：「開始使用」- 直接引導用戶體驗

### 1.1.3 接受條件

1. Hero 具有吸引人的背景動畫效果
2. Beta Badge 有明顯的視覺提示
3. 主標題包含動態文字展示產品特色
4. CTA 按鈕維持「開始使用」文案，引導 Beta 體驗
5. 底部快速展示三大核心優勢

### 1.1.4 整合驗證

IV1: 新背景動畫元素正確渲染並與整體頁面效果協調
IV2: 文字輪播動畫與現有 FlipWords 元件整合
IV3: 響應式設計和滾動視差效果保持正常

## Story 1.2: 核心功能詳細展示區塊

作為 **想深入了解功能的排球教練**，
我想要 **詳細了解 VolleyBro 的三大核心功能如何解決我的管理痛點**，
所以 **我能判斷這個工具是否符合我的球隊管理需求**。

### 1.2.1 技術實作

- 移除現有 LazySection 依賴
- 使用 `dynamic(() => import('motion/react'))` 動態導入
- 創建三個新元件：RecordingSection, AnalyticsSection, TeamManagementSection
- 實作 WhatsApp 風格的進入動畫（`useInView` + `bottomRootMargin`）

### 1.2.2 接受條件

1. 三個功能區塊各自詳細介紹（即時記錄、數據分析、團隊管理）
2. 使用 Motion.js 動態導入，不依賴 LazySection
3. 每個區塊有漸進式進入動畫（fade + slide）
4. Bundle size 比現有實作更小或相等
5. 保持響應式設計和現有視覺品質

### 1.2.3 整合驗證

IV1: 動態導入不影響首屏載入效能
IV2: 新功能區塊與現有設計系統一致
IV3: 進入動畫與整體頁面動畫協調

## Story 1.3: 展示真實產品價值與 Beta 階段成果

作為 **排球教練**，
我想要 **看到產品的真實能力和開發進度**，
所以 **我能了解這個工具真正能為我的球隊帶來什麼幫助**。

### 1.3.1 接受條件

1. 移除虛構的使用統計，改為展示產品核心優勢
2. 用真實的技術特色說明產品如何解決排球管理痛點
3. 展示 Beta 階段的開發成果和功能亮點
4. 清楚標示產品目前的 Beta 狀態，設定合理期待
5. 簡化描述，聚焦於「對教練和球隊有什麼好處」

### 1.3.2 整合驗證

IV1: 內容真實性提升用戶信任度
IV2: Beta 標示讓用戶有正確期待
IV3: 產品價值表達清晰易懂

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

## Story 1.5: Hero 組件模組化重構與主題統一

作為 **開發維護者**，
我想要 **Hero 組件具有清晰的架構和統一的主題管理**，
所以 **代碼更易於維護和擴展**。

### 1.5.1 組件拆分策略

**核心子組件**:

- `HeroBadge`: Preview badge 獨立組件
- `HeroTitle`: 主標題與文字輪播
- `HeroDescription`: 描述文字組件
- `HeroCTA`: 行動召喚按鈕區域
- `HeroFeatures`: 三大特色標籤
- `HeroImage`: 右側圖片展示

### 1.5.2 主題管理改進

- Hero 移除固定背景色，使用父層背景
- 統一 dark/light mode 色彩變數
- Preview Badge 簡化為 outline 風格
- 移除未使用的 `animate-pulse-glow` 動畫

### 1.5.3 接受條件

1. Hero 主組件程式碼行數減少 50%
2. 各子組件職責單一，可獨立測試
3. Preview Badge 使用適當的 outline 顏色
4. 背景色彩統一由父層管理
5. 清理未使用的動畫設定和CSS

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
我想要 **CTA Button 組件具有統一設計且不依賴組件間耦合**，
所以 **程式碼更易於維護且視覺呈現更一致**。

### 1.7.1 架構解耦重構

- 移除 Header CTA 的 scroll-to-reveal 功能
- 解除 Header 與 Hero 組件的 observerRef 相依關係
- Header 從 Hero 中移出，直接在 Landing Page 使用
- 統一所有 Landing Page CTA 的顏色配置
- 取消 CTA 邊框（一般與 hover 狀態）

### 1.7.2 元件最適化重構

- 使用原生 Button, Link 元件降低樣式覆蓋複雜度
- Light/Dark mode 背景對比色最適化
- 重新評估並撰寫 CTA 元件測試

### 1.7.3 接受條件

1. Header 與 Hero 組件完全解耦
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

---

## 技術架構更新

**新頁面結構**:

```plaintext
Header (獨立組件，包含 logo + preview badge + CTA)
Hero (移除 Header 依賴，專注內容展示)
RecordingSection (即時記錄詳細介紹)
AnalyticsSection (數據分析功能展示)
TeamManagementSection (團隊管理特色)
TechAdvantages (產品優勢替代虛構統計)
ProductMilestones (開發成果替代虛構推薦)
Footer (Beta 版本聲明)
```

**Bundle 優化策略**:

- 使用 Motion.js 動態導入替代 LazySection
- 實作統一的進入動畫 hook
- 保持現有 Header 和整體架構
- 預期 bundle size 維持或減少 15-20%

---

**Epic 1 執行優先級**: 立即執行（Brownfield Enhancement）
**預估時程**: 1-2 週
**成功指標**: 用戶信任度提升、真實價值傳達、Beta 註冊轉換率
**對應功能**: FR1 - 產品介紹頁功能（🟡 已部分實現 → 🟢 Beta 階段完善）
