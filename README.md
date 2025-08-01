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

- **賽事紀錄：** 詳細記錄比賽數據，包括得分、替換、拉力等資訊。
- **隊伍管理：** 管理球隊資訊、成員資料、陣容設定與替補名單。
- **用戶認證：** 透過 NextAuth 與 Google 驗證進行安全登入。
- **現代化 UI：** 使用 Tailwind CSS 及自訂元件打造流暢的使用者介面。
- **即時通知：** [**開發中**] 提供比賽狀態更新與即時通知功能。

- **Match Recording:** Detailed recording of match data, including scores, substitutions, rallies, etc.
- **Team Management:** Manage team information, member data, lineup settings, and substitutes.
- **User Authentication:** Secure login using NextAuth with Google authentication.
- **Modern UI:** Built with Tailwind CSS and custom components for a smooth user experience.
- **Real-time Notifications:** [**In Development**] Provides match status updates and real-time notifications.

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

4. **啟動開發伺服器 / Run the development server**

   ```bash
   npm run dev
   # 或使用 yarn:
   yarn dev
   ```

   開啟 [http://localhost:3000](http://localhost:3000) 以檢視專案運行狀態。

## 貢獻指南 / Contribution Guidelines

歡迎所有開發者參與貢獻，請遵循以下流程：

1. Fork 此專案至您的 GitHub 帳戶。
2. 建立新分支（例如：`feature/your-feature`）。
3. 開發完成後，提交 Pull Request，並清楚說明修改內容。

Contributions are welcome! Please follow these steps:

1. Fork the repository to your GitHub account.
2. Create a new branch (e.g., `feature/your-feature`).
3. After development, submit a pull request with a clear description of your changes.

### Git Commit 規範 / Git Commit Convention

所有 commit 訊息必須遵循 [Angular Commit Message 規範](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format)。常見類型包括：

- `build:` 用於變更建置系統或外部依賴
- `ci:` 用於變更 CI 設定
- `docs:` 用於變更文件
- `feat:` 用於新增功能
- `fix:` 用於修正 bug
- `style:` 用於格式修正，不影響程式邏輯
- `refactor:` 用於重構程式碼
- `test:` 用於新增或修正測試

commit 訊息格式範例：

```txt
feat(core): implement dependency injection with InversifyJS
fix(ui): correct team selection dropdown behavior
docs(readme): update installation instructions
```

All commit messages must follow the [Angular Commit Message Convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-format). Common types include:

- `build:` Changes that affect the build system or external dependencies
- `ci:` Changes to our CI configuration files and scripts
- `docs:` Documentation only changes
- `feat:` A new feature
- `fix:` A bug fix
- `style:` Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `test:` Adding missing tests or correcting existing tests

Example commit message format:

```txt
feat(core): implement dependency injection with InversifyJS
fix(ui): correct team selection dropdown behavior
docs(readme): update installation instructions
```

### 程式碼風格 / Code Style

本專案的程式碼風格採用 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) 為基礎。提交前請確保您的程式碼：

- 符合 Airbnb JavaScript/TypeScript 風格指南
- 通過 ESLint 檢查 (`npm run lint`)
- 使用適當的型別定義（TypeScript）
- 包含必要的測試（如適用）

The project follows the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) as its coding standard. Before submitting, please ensure your code:

- Complies with the Airbnb JavaScript/TypeScript style guide
- Passes ESLint checks (`npm run lint`)
- Uses proper type definitions (TypeScript)
- Includes necessary tests (if applicable)

## 授權條款 / License

請至 [LICENSE](./LICENSE) 查看完整授權條款。

See [LICENSE](./LICENSE) for the full license.

## 聯絡方式 / Contact

如有任何疑問或建議，請透過 GitHub Issue 與我們聯絡。

If you have any questions or suggestions, please contact us via GitHub Issues.
