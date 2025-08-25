# Source Tree Structure

## Overview

This document provides a comprehensive overview of the VolleyBro project's source code organization, following Clean Architecture principles and Domain-Driven Design patterns.

## Root Directory Structure

```txt
volleybro/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json            # TypeScript configuration
│   ├── next.config.js           # Next.js configuration
│   ├── jest.config.ts           # Jest testing configuration
│   ├── jest.setup.ts            # Global test setup
│   ├── .eslintrc.json          # ESLint configuration
│   ├── .prettierrc             # Prettier configuration
│   └── middleware.ts            # Next.js middleware for auth
│
├── 📁 docs/                     # Project documentation
├── 📁 public/                   # Static assets
├── 📁 src/                      # Main source code
├── 📁 e2e/                      # End-to-end tests
├── 📁 .github/workflows/        # GitHub Actions CI/CD
└── 📁 node_modules/             # Dependencies
```

## Source Code Organization (`src/`)

The `src/` directory follows **Clean Architecture** layering:

```txt
src/
├── 🏛️ Clean Architecture Layers
│   ├── entities/                # Domain entities (innermost layer)
│   ├── applications/            # Application business logic
│   ├── infrastructure/          # External integrations
│   └── interface/              # API controllers
│
├── 🎨 Presentation Layer
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   └── stories/               # Storybook stories
│
├── 🔧 Supporting Infrastructure
│   ├── lib/                   # Utilities and shared logic
│   ├── hooks/                 # Custom React hooks
│   ├── styles/                # Global styles
│   └── middleware.ts          # Route protection
```

## Clean Architecture Layers

### 1. Entities Layer (`src/entities/`)

The innermost layer containing pure business logic:
最內層，包含純業務邏輯：

```txt
entities/
├── __tests__/                  # Entity unit tests
│   └── record.test.ts
├── account.ts                  # User account entity
├── member.ts                   # Team member entity
├── record.ts                   # Match record entity
├── sessions.ts                 # Session entity
├── team.ts                     # Team entity
└── user.ts                     # User entity
```

**Key Characteristics:**

- No external dependencies (無外部依賴)
- Pure TypeScript types and business rules (純 TypeScript 型別與業務規則)
- Domain-specific enums and constants (領域特定的列舉與常數)
- Immutable data structures (不可變資料結構)

### 2. Applications Layer (`src/applications/`)

Business logic coordination and abstract interfaces:
業務邏輯協調與抽象介面：

```txt
applications/
├── repositories/               # Abstract repository interfaces
│   ├── base.repository.interface.ts
│   ├── record.repository.interface.ts
│   ├── team.repository.interface.ts
│   └── user.repository.interface.ts
├── services/                   # Abstract service interfaces
│   └── auth/
│       ├── authentication.service.interface.ts
│       └── authorization.service.interface.ts
└── usecases/                   # Business use cases
    └── record/
        ├── matches.usecase.ts
        ├── rally.usecase.ts
        ├── record.usecase.ts
        ├── set.usecase.ts
        └── substitution.usecase.ts
```

**Purpose:**

- Define abstract interfaces for external dependencies (定義外部依賴的抽象介面)
- Implement business use cases (實作業務用例)
- Coordinate between entities and infrastructure (協調實體與基礎設施間的互動)
- Dependency injection points (依賴注入點)

### 3. Infrastructure Layer (`src/infrastructure/`)

External system implementations and integrations:

```txt
infrastructure/
├── db/                         # Database implementations
│   ├── mongoose/               # MongoDB connection and schemas
│   │   ├── connect-to-mongodb.ts
│   │   └── schemas/
│   │       ├── account.ts
│   │       ├── member.ts
│   │       ├── record.ts
│   │       ├── session.ts
│   │       ├── team.ts
│   │       ├── user.ts
│   │       └── verification-token.ts
│   └── repositories/           # Repository implementations
│       ├── base.repository.mongo.ts
│       ├── record.repository.mongo.ts
│       ├── team.repository.mongo.ts
│       ├── user.repository.mongo.ts
│       ├── index.ts
│       └── tests/              # Repository tests
├── di/                         # Dependency injection container
│   ├── inversify.config.ts
│   └── types.ts
└── services/                   # Service implementations
    └── auth/
        ├── authentication.service.ts
        └── authorization.service.ts
```

**Responsibilities:**

- Implement application layer interfaces (實作應用層介面)
- Handle external dependencies (database, APIs) (處理外部依賴（資料庫、API）)
- Provide dependency injection configuration (提供依賴注入配置)
- Convert between domain and persistence models (在領域模型與持久化模型間轉換)

### 4. Interface Layer (`src/interface/`)

API controllers that orchestrate use cases:

```txt
interface/
└── controllers/
    └── record/
        ├── match.controller.ts
        ├── rally.controller.ts
        ├── record.controller.ts
        ├── set.controller.ts
        └── substitution.controller.ts
```

**Purpose:**

- Handle HTTP requests and responses (處理 HTTP 請求與回應)
- Validate input data (驗證輸入資料)
- Coordinate use case execution (協調用例執行)
- Transform data for API responses (為 API 回應轉換資料)

## Presentation Layer

### Next.js App Router (`src/app/`)

Modern file-based routing with layouts:

```txt
app/
├── (protected)/                # Protected route group
│   ├── layout.tsx             # Protected layout wrapper
│   ├── home/                  # Dashboard
│   ├── team/                  # Team management
│   │   ├── [teamId]/         # Dynamic team routes
│   │   │   ├── edit/
│   │   │   ├── lineup/
│   │   │   ├── members/
│   │   │   └── page.tsx
│   │   ├── new/
│   │   └── page.tsx
│   ├── user/                  # User profile and settings
│   └── notifications/
├── api/                       # API routes
│   ├── auth/                  # Authentication endpoints
│   ├── teams/                 # Team CRUD operations
│   ├── records/               # Match record operations
│   ├── members/               # Team member operations
│   ├── matches/               # Match data endpoints
│   └── users/                 # User management
├── auth/                      # Authentication pages
│   ├── error/
│   ├── sign-in/
│   └── layout.tsx
├── match/                     # Match viewing pages
│   └── [recordId]/
├── record/                    # Match recording pages
│   └── [recordId]/
├── claude/                    # Claude integration demo
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page
├── globals.css                # Global styles
└── sw.ts                      # Service worker for PWA
```

**Key Features:**

- **Route Groups**: `(protected)` for authenticated routes
- **Dynamic Routes**: `[teamId]`, `[recordId]` for parameterized pages
- **Nested Layouts**: Shared UI across route hierarchies
- **API Routes**: Backend functionality integrated with frontend

### React Components (`src/components/`)

Organized by domain and purpose:

```txt
components/
├── ui/                        # Reusable UI components (Shadcn/UI)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── ... (30+ UI components)
├── custom/                    # Project-specific reusables
│   ├── court/                 # Volleyball court visualization
│   ├── guides/                # User onboarding
│   ├── loading/               # Loading states
│   ├── logo.tsx
│   └── stats/                 # Statistics displays
├── auth/                      # Authentication components
│   ├── error.tsx
│   └── sign-in/
├── home/                      # Dashboard components
├── landing/                   # Landing page sections
│   ├── __tests__/            # Component tests
│   ├── claude/               # Claude integration demo
│   ├── benefits.tsx
│   ├── features.tsx
│   ├── footer/
│   ├── header.tsx
│   ├── hero.tsx
│   ├── lazy-section.tsx
│   ├── stats.tsx
│   └── testimonials.tsx
├── layout/                    # Application layout
│   ├── bg-handler.tsx
│   ├── header.tsx
│   ├── main.tsx
│   ├── nav/
│   └── theme-provider.tsx
├── match/                     # Match viewing components
├── record/                    # Match recording components
├── team/                      # Team management components
├── notifications/             # Notification components
└── user/                      # User profile components
```

**Component Organization Principles:**

- **ui/**: Generic, reusable UI primitives (通用、可重用的 UI 原語)
- **custom/**: Project-specific but reusable components (專案特定但可重用的元件)
- **Feature folders**: Domain-specific components (領域特定元件)
- **Co-location**: Tests alongside components (測試與元件並列)

## Supporting Infrastructure

### Libraries and Utilities (`src/lib/`)

```txt
lib/
├── constants/                 # Application constants
│   └── match.ts
├── data/                      # Data utilities
│   ├── mongodb.ts
│   └── verification-token.js
├── features/                  # Feature-specific logic
│   ├── auth/                  # Authentication helpers
│   ├── global-slice.ts        # Global Redux state
│   ├── record/                # Match recording logic
│   │   ├── actions/           # Redux actions
│   │   ├── helpers/           # Business logic helpers
│   │   │   ├── optimistic/    # Optimistic UI updates
│   │   │   ├── queries/       # Data query helpers
│   │   │   └── tests/         # Helper function tests
│   │   ├── hooks/             # Record-specific hooks
│   │   ├── record-slice.ts    # Redux slice
│   │   └── types.ts
│   └── team/                  # Team management logic
├── hooks/                     # Global custom hooks
│   ├── useMediaQuery.ts
│   └── usePullToRefresh.ts
├── redux/                     # Redux store configuration
│   ├── hooks.ts
│   ├── provider.tsx
│   └── store.ts
├── scoring-moves.ts           # Volleyball scoring logic
└── utils.ts                   # General utilities
```

### Custom Hooks (`src/hooks/`)

```txt
hooks/
├── use-data.ts                # Generic data fetching
└── use-on-leave-page.js       # Page navigation guard
```

### Storybook Stories (`src/stories/`)

Component documentation and development:

```txt
stories/
├── Configure.mdx              # Storybook configuration docs
├── assets/                    # Story assets
├── *.stories.tsx              # Component stories
└── *.css                      # Story-specific styles
```

## Testing Organization

Tests are co-located with their respective modules:

```txt
Testing Structure:
├── src/components/landing/__tests__/     # Component tests
├── src/entities/__tests__/               # Entity tests
├── src/infrastructure/repositories/tests/ # Repository tests
├── src/lib/features/*/helpers/tests/     # Helper function tests
└── e2e/                                  # End-to-end tests
```

**Testing Strategy:**

- **Unit Tests**: For pure functions and business logic
- **Component Tests**: Using React Testing Library
- **Integration Tests**: For repository and service layers
- **E2E Tests**: For critical user workflows

- **單元測試**: 用於純函數與業務邏輯
- **元件測試**: 使用 React Testing Library
- **整合測試**: 用於儲存庫與服務層
- **E2E 測試**: 用於關鍵使用者工作流程

## Documentation Structure (`docs/`)

```txt
docs/
├── CHANGELOG.md               # Version history
├── architecture/              # Architecture documentation
│   ├── coding-standards.md   # This document's companion
│   ├── tech-stack.md         # Technology stack overview
│   ├── source-tree.md        # This document
│   └── index.md
├── archive/                   # Legacy documentation
├── prd/                       # Product requirements
├── epics/                     # Epic planning documents
└── stories/                   # Story documentation
```

## Key Navigation Points

### Entry Points

- **Application Entry**: `src/app/layout.tsx` - Root layout (應用入口)
- **API Entry**: `src/app/api/` - Backend endpoints (API 入口)
- **Component Entry**: `src/components/` - UI components (元件入口)
- **Business Logic Entry**: `src/applications/usecases/` - Use cases (業務邏輯入口)

### Configuration Files

- **TypeScript**: `tsconfig.json` - Compiler options
- **Next.js**: `next.config.js` - Framework configuration
- **Testing**: `jest.config.ts` + `jest.setup.ts`
- **Linting**: `.eslintrc.json` + `.prettierrc`
- **Dependencies**: `package.json`

### Critical Dependencies

- **DI Container**: `src/infrastructure/di/inversify.config.ts`
- **Redux Store**: `src/lib/redux/store.ts`
- **Database**: `src/infrastructure/db/mongoose/connect-to-mongodb.ts`
- **Authentication**: `src/auth.config.ts` + `src/auth.ts`

## Development Workflow Integration

### Import Paths

The project uses `@` alias path mapping for clean imports:

```typescript
// ✅ Preferred - Absolute imports with @ alias
import { Button } from "@/components/ui/button";
import { UserService } from "@/applications/services/user.service";
import { Team } from "@/entities/team";

// ❌ Avoid - Relative imports across directories
import { Button } from "../../../components/ui/button";
```

### Module Boundaries

Clean Architecture enforces module dependencies:

```txt
✅ Allowed Dependencies:
entities ← applications ← infrastructure
entities ← applications ← interface
app → components → lib

❌ Forbidden Dependencies:
entities → applications
entities → infrastructure
infrastructure → applications (except through DI)
```

## File Naming Conventions

- **Components**: `kebab-case.tsx` (button.tsx, hero-section.tsx)
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Entities**: `lowercase.ts` (team.ts, record.ts)
- **Use Cases**: `name.usecase.ts` (record.usecase.ts)
- **Repositories**: `name.repository.implementation.ts`
- **Tests**: `name.test.ts` or `name.spec.ts`
- **Types**: `types.ts` or `name.types.ts`

## Conclusion

This source tree structure supports:

- **Clean Architecture**: Clear separation of concerns (清楚的關注點分離)
- **Domain-Driven Design**: Business logic organization (業務邏輯架構)
- **Scalability**: Modular structure for team development (可擴展的模組化架構)
- **Maintainability**: Consistent organization patterns (一致的架構模式)
- **Testability**: Co-located tests and dependency injection (就近測試與依賴注入)

For detailed implementation patterns, refer to the companion documents:

- [Tech Stack](./tech-stack.md) - Technology decisions and configurations
- [Coding Standards](./coding-standards.md) - Development guidelines and patterns
