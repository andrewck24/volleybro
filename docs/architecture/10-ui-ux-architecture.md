# 🎨 UI/UX 架構

## 設計系統架構

### Shadcn/UI + Tailwind CSS
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

### 動畫系統 (Motion/React)
```typescript
// src/components/landing/features.tsx
import { motion, useTransform, useScroll } from "motion/react";

// 技術債務: React Motion 警告
// ❌ <div whileHover={...}>  
// ✅ <motion.div whileHover={...}>
```

### PWA 架構 (Serwist)
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
