# 使用者介面增強目標

## 與現有UI的整合

VolleyBro目前採用完整的設計系統，包含：

- **設計框架**: Shadcn UI + Tailwind CSS，提供一致的設計語言
- **動畫系統**: Motion/React (原Framer Motion)，實現流暢的互動體驗
- **PWA支援**: Serwist實現，支援應用安裝和離線功能
- **響應式設計**: 完整的桌面和行動裝置適配
- **主題系統**: 支援深色/淺色模式切換

新增UI元素將完全遵循現有的設計系統：

- 使用現有的UI組件庫(components/ui/)
- 保持一致的色彩配置(primary、destructive、muted等)
- 遵循現有的動畫模式和轉場效果
- 維持響應式設計原則

## 修改/新增的畫面和視圖

基於需求分析，以下畫面需要修改或新增：

### Beta階段 Landing Page 重構 (進行中 - Brownfield Enhancement)

**現有架構**:

```plaintext
Header + Hero + Features + Benefits + Stats + Testimonials + Footer
```

**重構後新架構**:

```plaintext
Header → Hero → RecordingSection → AnalyticsSection → TeamManagementSection → TechAdvantages → ProductMilestones → Footer
```

**重構內容**:

- 🟠 **Hero 區塊升級**：整合 claude/hero 背景動畫 + Beta 標示 + 文字輪播「簡單、快速、專業」
  - 主標題：「讓排球賽事紀錄更加簡單、快速、專業」
  - 副標題：「專為排球教練與管理者設計的數位化解決方案，告別紙筆記錄，擁抱智慧化團隊管理」
  - Beta 標示：明確標示產品階段
  - CTA：保持「開始使用」文案

- 🟠 **核心功能分區展示**：替代原 Features 區塊
  - RecordingSection：即時記錄功能詳細介紹
  - AnalyticsSection：數據分析功能展示
  - TeamManagementSection：團隊管理特色說明

- 🟠 **真實價值展示**：替代虛構數據
  - TechAdvantages：技術優勢替代 Stats 組件的虛構統計
  - ProductMilestones：開發成果替代 Testimonials 組件的虛構推薦

- 🟡 **技術優化**：
  - Motion.js 動態導入替代 LazySection
  - WhatsApp 風格進入動畫（useInView + bottomRootMargin）
  - 預期 bundle size 減少 15-20%

**可選需求**:

- 🟡 Waitlist註冊功能：email註冊表單（低優先級）
- 🟡 意見回饋功能：用戶反饋收集（低優先級）

### 未來功能的新增畫面

**Beta功能管理介面**:

- Feature flag控制面板
- Beta功能使用統計儀表板

## UI一致性需求

**設計語言一致性**:

- 所有新增元件必須使用現有的Tailwind CSS類別和設計token
- 保持與現有頁面相同的視覺層次和間距規則
- 遵循現有的圓角、陰影和邊框樣式

**互動模式一致性**:

- 按鈕、表單、導航等互動元素必須與現有模式一致
- 載入狀態、錯誤處理、成功反饋的視覺呈現保持統一
- 動畫timing和easing與現有Motion/React實現保持一致

**響應式行為一致性**:

- 新增頁面必須在所有裝置尺寸下正常顯示
- 觸控互動支援與現有行動端體驗保持一致
- PWA功能整合不得影響現有的應用安裝和離線體驗

**無障礙性要求**:

- 遵循WCAG 2.1 AA標準
- 保持與現有頁面相同的鍵盤導航支援
- 色彩對比度符合現有設計系統標準

---
