# Technology Stack

> **Last Updated**: 2025-08-26
> **Version**: 2.0  
> **Maintainer**: Andrew

## Overview

This document provides a comprehensive overview of the technology stack used in VolleyBro, a volleyball team management and match recording web application.

## Core Technology Stack

### Frontend Framework

| Technology     | Version | Purpose              | Notes                           |
| -------------- | ------- | -------------------- | ------------------------------- |
| **Next.js**    | 15.4.6  | React Meta-framework | App Router, SSR/SSG support     |
| **React**      | 19.1.1  | UI Framework         | Latest with concurrent features |
| **TypeScript** | 5.8.3   | Type Safety          | Strict typing with decorators   |

### Styling & UI Components

| Technology                   | Version | Purpose             | Notes                     |
| ---------------------------- | ------- | ------------------- | ------------------------- |
| **Tailwind CSS**             | 4.1.3   | Utility-first CSS   | Custom design system      |
| **Radix UI**                 | Various | Headless Components | Accessible primitives     |
| **Shadcn/UI**                | Custom  | Component Library   | Built on Radix + Tailwind |
| **Motion**                   | 12.6.3  | Animation Library   | Framer Motion successor   |
| **Class Variance Authority** | 0.7.1   | Component Variants  | Type-safe styling API     |

### State Management

| Technology          | Version | Purpose           | Notes                                |
| ------------------- | ------- | ----------------- | ------------------------------------ |
| **Redux Toolkit**   | 2.6.1   | Global State      | Complex app state (records, lineups) |
| **SWR**             | 2.3.4   | Server State      | Data fetching and caching            |
| **React Hook Form** | 7.55.0  | Form State        | Form validation with Zod             |
| **Zod**             | 3.24.2  | Schema Validation | Type-safe validation                 |

### Backend & Database

| Technology          | Version       | Purpose           | Notes                            |
| ------------------- | ------------- | ----------------- | -------------------------------- |
| **MongoDB**         | 6.15.0        | Document Database | Primary data store               |
| **Mongoose**        | 8.13.2        | ODM               | Schema definition and validation |
| **NextAuth.js**     | 5.0.0-beta.25 | Authentication    | OAuth integration                |
| **MongoDB Adapter** | 3.8.0         | Auth Persistence  | NextAuth session storage         |

### Architecture Patterns

| Technology           | Version | Purpose              | Notes                      |
| -------------------- | ------- | -------------------- | -------------------------- |
| **InversifyJS**      | 7.5.0   | Dependency Injection | Clean Architecture support |
| **Reflect Metadata** | 0.2.2   | Decorator Metadata   | Required for InversifyJS   |

### Development Tools

| Technology          | Version | Purpose               | Notes                            |
| ------------------- | ------- | --------------------- | -------------------------------- |
| **Jest**            | 30.0.5  | Testing Framework     | Unit and integration tests       |
| **Testing Library** | 16.3.0  | React Testing         | Component testing utilities      |
| **Storybook**       | 9.1.1   | Component Development | UI component workbench           |
| **ESLint**          | 9.24.0  | Code Linting          | Next.js config with custom rules |
| **Prettier**        | 3.5.3   | Code Formatting       | Airbnb style guide compliance    |

### PWA & Performance

| Technology           | Version | Purpose         | Notes                    |
| -------------------- | ------- | --------------- | ------------------------ |
| **Serwist**          | 9.1.1   | Service Worker  | PWA functionality        |
| **Bundle Analyzer**  | 15.4.6  | Bundle Analysis | Performance optimization |
| **Vercel Analytics** | 1.5.0   | Web Analytics   | Performance monitoring   |
| **Speed Insights**   | 1.2.0   | Core Web Vitals | Performance metrics      |

### Data Visualization

| Technology           | Version | Purpose        | Notes                       |
| -------------------- | ------- | -------------- | --------------------------- |
| **TanStack Table**   | 8.21.2  | Data Tables    | Advanced table features     |
| **React Day Picker** | 9.6.7   | Date Selection | Calendar component          |
| **React Icons**      | 5.5.0   | Icon Library   | SVG icon collection         |
| **Recharts**         | 2.9.0   | Charting       | Responsive charts for stats |

### Security & Utilities

| Technology   | Version | Purpose             | Notes                         |
| ------------ | ------- | ------------------- | ----------------------------- |
| **bcryptjs** | 3.0.2   | Password Hashing    | Security for user passwords   |
| **date-fns** | 4.1.0   | Date Utilities      | Date manipulation library     |
| **clsx**     | 2.1.1   | Conditional Classes | Dynamic class name generation |

## Architecture Overview

### Clean Architecture Implementation

VolleyBro follows Clean Architecture principles with clear separation of concerns:

VolleyBro 遵循乾淨架構原則，明確分離關注點：

1. **Entities** (`src/entities/`) - Core business logic (核心業務邏輯)
2. **Applications** (`src/applications/`) - Use cases and interfaces (使用案例與介面)
3. **Infrastructure** (`src/infrastructure/`) - External integrations (外部整合)
4. **Interface** (`src/interface/`) - API controllers (API 控制器)
5. **Presentation** (`src/app/`, `src/components/`) - UI layer (UI 層)

### Key Design Decisions

#### Why Next.js 15?

- **App Router**: Modern routing with layouts and nested routes (支援佈局與嵌套路由)
- **React 19**: Latest features including concurrent rendering (最新功能，包含並發渲染)
- **SSR/SSG**: Optimal performance for volleyball match data (排球比賽資料的最佳效能)
- **API Routes**: Integrated backend for team management (整合後端，用於團隊管理)

#### Why MongoDB + Mongoose?

- **Document Model**: Natural fit for volleyball match records (自然適合排球比賽記錄)
- **Embedded Documents**: Efficient storage of sets, rallies, and stats (高效存儲局數、回合和統計)
- **Flexible Schema**: Adaptable to evolving match recording needs (適應不斷演化的比賽記錄需求)
- **Atlas Integration**: Managed cloud database service (雲端資料庫服務)

#### Why InversifyJS?

- **Dependency Injection**: Testable and maintainable code (可測試與可維護的程式碼)
- **Clean Architecture**: Proper separation of layers (適當的層次分離)
- **TypeScript Support**: Type-safe dependency resolution (型別安全的依賴解析)
- **Interface Segregation**: Modular service design (模組化服務設計)

### Environment Configuration

#### Required Environment Variables

```bash
# Authentication
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
AUTH_SECRET=your_nextauth_secret

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/volleybro

# Optional
NEXTAUTH_URL=http://localhost:3000  # For development
```

#### TypeScript Configuration

- **BaseURL**: `src/` for clean imports (用於乾淨匯入)
- **Path Mapping**: `@/*` for absolute imports (用於絕對匯入)
- **Decorators**: Enabled for InversifyJS
- **Strict Mode**: Disabled for gradual migration

## Performance Considerations

### Bundle Optimization

- **Tree Shaking**: Automatic dead code elimination
- **Code Splitting**: Route-based and component-based
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Google Fonts integration

- **Tree Shaking**: 自動死程式碼消除
- **程式碼分割**: 基於路由與元件
- **圖片優化**: Next.js Image 元件
- **字型優化**: Google Fonts 整合

### Runtime Performance

- **React 19**: Concurrent features for better UX
- **SWR**: Intelligent caching and revalidation
- **PWA**: Offline capability with Serwist
- **Motion**: Optimized animations for smooth interactions

- **React 19**: 並發功能提升用戶體驗
- **SWR**: 智慧快取與重新驗證
- **PWA**: Serwist 提供離線能力
- **Motion**: 優化動畫提供流暢互動

## Migration & Updates

### Current Status

- **Next.js**: Latest version (15.4.6)
- **React**: Latest version (19.1.1)
- **TypeScript**: Modern version (5.8.3)
- **Dependencies**: All actively maintained

### Planned Upgrades

- **Database**: Explore Prisma and PostgreSQL as alternatives to MongoDB
