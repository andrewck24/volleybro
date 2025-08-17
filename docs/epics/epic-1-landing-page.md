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

---

## 技術架構更新

**新頁面結構**:

```plaintext
Header (保持現有)
Hero (整合 claude/hero 背景動畫 + Beta 標示)
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
