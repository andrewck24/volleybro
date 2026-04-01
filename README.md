# VolleyBro

VolleyBro 是一個專為排球球隊設計的賽事紀錄與隊伍管理應用程式，幫助教練及管理者方便記錄賽事數據、管理球隊成員以及設定比賽陣容。

獲取最新版本的 [VolleyBro](https://volleybro.vercel.app/)。

VolleyBro is a volleyball team management and match recording application that helps coaches and managers easily record match data, manage team members, and set up game lineups.

Get the latest version of [VolleyBro](https://volleybro.vercel.app/).

## 目錄 / Table of Contents

1. [項目介紹 / Project Overview](#項目介紹--project-overview)
2. [主要功能 / Key Features](#主要功能--key-features)
3. [專案架構 / Project Structure](#專案架構--project-structure)
4. [安裝與執行 / Installation & Setup](#安裝與執行--installation--setup)
5. [貢獻指南 / Contribution Guidelines](#貢獻指南--contribution-guidelines)
6. [授權條款 / License](#授權條款--license)
7. [聯絡方式 / Contact](#聯絡方式--contact)

## 項目介紹 / Project Overview

VolleyBro 是一個基於 [Next.js](https://nextjs.org/) 的現代化應用程式，專注於排球賽事紀錄與球隊管理。系統整合用戶認證、賽事紀錄、陣容管理及即時通知等功能，確保使用者能夠輕鬆掌握比賽數據。

VolleyBro is a modern application built on [Next.js](https://nextjs.org/), designed for volleyball match recording and team management. The system integrates user authentication, match data recording, lineup management, and real-time notifications to help users easily keep track of match data.

## 主要功能 / Key Features

### Core Features (完成 / Completed)

- **球員管理系統** ✅: 完整的球員實體管理、邀請流程、角色管理（隊長、管理員、成員）
  - Player Management System ✅: Complete player entity management, invitation workflow, role management (Team Captain, Admin, Member)

- **隊伍管理** ✅: 建立隊伍、邀請成員、管理球員身份與權限、查看隊伍成員列表
  - Team Management ✅: Create teams, invite members, manage player status and permissions, view team member list

- **賽事紀錄：** 詳細記錄比賽數據，包括得分、替換、拉力等資訊。
  - Match Recording: Detailed recording of match data, including scores, substitutions, rallies, etc.

- **用戶認證：** 使用 Better Auth 與 Google OAuth 進行安全登入。
  - User Authentication: Secure login using Better Auth with Google OAuth.

- **現代化 UI 與無障礙設計** ✅: 使用 Tailwind CSS 及自訂元件打造流暢的使用者介面，完全支援 WCAG 2.1 AA 無障礙標準
  - Modern UI & Accessibility ✅: Built with Tailwind CSS and custom components, full WCAG 2.1 AA accessibility compliance

- **即時通知** ✅: 所有使用者操作提供 Toast 通知反饋（邀請、接受、拒絕、升級、移除等）
  - Real-time Notifications ✅: Toast notifications for all user actions (invitations, accept, reject, promote, remove, etc.)

## 專案架構 / Project Structure

```txt
andrewck24-volleybro/
├── README.md            // 此文件 / This document
├── LICENSE              // 授權條款 / License
├── package.json         // 專案依賴與腳本設定 / Project dependencies and scripts
├── next.config.js       // Next.js 配置 / Next.js configuration
├── public/              // 靜態資源 / Static assets (icons, manifest, splash screens, etc.)
└── src/                 // 源碼目錄 / Source code directory
    ├── app/             // Next.js 頁面與路由 / Pages and routing
    ├── components/      // 可重用 UI 元件 / Reusable UI components
    ├── entities/        // 領域實體定義（如隊伍、賽事紀錄） / Entity definitions (e.g., team, record)
    ├── hooks/           // React hooks
    ├── infrastructure/  // 基礎架構層 / Infrastructure layer
    │   ├── db/          // 資料庫相關（Mongoose 連線、Schema 定義）/ Database related (Mongoose connection, Schema definitions)
    │   │   ├── mongoose/   // Mongoose Schema 定義 / Mongoose Schema definitions
    │   │   └── repositories/ // 資料庫存取實作 / Repository implementations
    │   └── di/          // 依賴注入相關 / Dependency Injection related
    ├── interface/       // 控制器 / Controllers
    └── lib/             // 工具函數及輔助模組 / Utility functions and helpers
```

本專案採用乾淨架構設計，並透過 InversifyJS 實現依賴注入，提供類型安全的依賴解析與管理。

This project uses a clean architecture and implements dependency injection with InversifyJS for type-safe dependency resolution and management.

## 技術棧 / Technology Stack

### Frontend & Framework

- **Next.js 16+** with App Router
- **React 19** with Server Components
- **TypeScript 6.x** with strict mode
- **Shadcn/UI** components library
- **Tailwind CSS** for styling
- **Serwist** for Progressive Web App (PWA) features

### State Management & Data Fetching

- **Redux Toolkit** for complex application state
- **SWR** for server state management and caching
- **React Hook Form** for form state management

### Backend & Database

- **MongoDB Atlas** with Mongoose ODM
- **Better Auth** for authentication with Google OAuth
- **InversifyJS** for dependency injection

### Testing & Quality Assurance

- **Jest** for unit and integration testing
- **React Testing Library** for component testing
- **586 tests passing** with comprehensive coverage
- **ESLint** for code quality
- **TypeScript strict mode** enabled
- **Storybook** for component development and documentation
- **Prettier** for code formatting

> For testing conventions and strategy, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/testing-strategy.md](./docs/testing-strategy.md).

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Storybook 元件庫 / Storybook Component Library

VolleyBro 使用 Storybook 進行元件開發與文件管理。您可以透過以下連結查看我們的元件庫：

This project uses [Storybook](https://storybook.js.org/) for component development and documentation. You can view our component library at the following links:

- [Master Branch](https://master--67bbfeabbc72894ce5eb92db.chromatic.com)
- [Development Branch](https://dev--67bbfeabbc72894ce5eb92db.chromatic.com)

## 安裝與執行 / Installation & Setup

### 前置需求 / Prerequisites

- Node.js（建議使用 v20 以上版本）/ Node.js (v20+ recommended)
- npm 或 yarn 套件管理工具 / npm or yarn

### 設定步驟 / Setup Steps

1. **Clone 專案 / Clone the repository**

   ```bash
   git clone https://github.com/andrewck24/volleybro.git
   cd volleybro
   ```

2. **安裝相依套件 / Install dependencies**

   ```bash
   npm install
   # 或使用 yarn / or using yarn:
   yarn install
   ```

3. **環境變數設定 / Environment Variables**  
   在專案根目錄建立 `.env.local` 檔案，並設定以下變數：

   ```env
   AUTH_GOOGLE_ID=your_google_client_id
   AUTH_GOOGLE_SECRET=your_google_client_secret
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **運行測試 / Run tests**

   ```bash
   npm test
   ```

   確保所有 451 項測試通過 / Ensure all 451 tests pass

5. **啟動開發伺服器 / Run the development server**

   ```bash
   npm run dev
   # 或使用 yarn:
   yarn dev
   ```

   開啟 [http://localhost:3000](http://localhost:3000) 以檢視專案運行狀態。
   Open [http://localhost:3000](http://localhost:3000) to see the application running.

6. **編譯生產版本 / Build for production**

   ```bash
   npm run build
   npm start
   ```

## 貢獻指南 / Contribution Guidelines

請參閱 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解分支規範、commit 規範、程式碼風格與測試要求。

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, commit convention, code style, and testing requirements.

## 授權條款 / License

請至 [LICENSE](./LICENSE) 查看完整授權條款。

See [LICENSE](./LICENSE) for the full license.

## 聯絡方式 / Contact

如有任何疑問或建議，請透過以下方式與我們聯絡：

- 💬 **討論區 (Discussions)**：[一般討論、想法分享或尋求協助](https://github.com/andrewck24/volleybro/discussions)
- 🛡️ **安全漏洞 (Security Vulnerabilities)**：[私下回報安全漏洞（請勿建立公開 issue）](https://github.com/andrewck24/volleybro/security/advisories/new)

If you have any questions or suggestions, please contact us via the following methods:

- 💬 **Discussions**: [General discussions, sharing ideas, or seeking help](https://github.com/andrewck24/volleybro/discussions)
- 🛡️ **Security Vulnerabilities**: [Privately report security vulnerabilities (please do not create public issues)](https://github.com/andrewck24/volleybro/security/advisories/new)

If you have any questions or suggestions, please contact us via GitHub Issues.
