# Coding Standards

## Language & Framework Standards

### TypeScript Configuration

- **Strict Mode**: Currently disabled (`"strict": false`) for gradual migration
- **Decorators**: Enabled for InversifyJS dependency injection
- **Module Resolution**: Node.js style with path mapping
- **Base URL**: `src/` with `@/*` path alias

- **嚴格模式**: 目前禁用以支援漸進式遷移
- **裝飾器**: 為 InversifyJS 依賴注入啟用
- **模組解析**: Node.js 風格，支援路徑映射
- **基礎 URL**: `src/` 搭配 `@/*` 路徑別名

```typescript
// ✅ Good - Use path alias
import { Button } from "@/components/ui/button";
import { UserService } from "@/applications/services/user.service";

// ❌ Bad - Relative imports for cross-module references
import { Button } from "../../../components/ui/button";
```

### Code Formatting

#### ESLint Configuration

Current ESLint extends:

- `next/core-web-vitals` - Next.js optimizations
- `plugin:storybook/recommended` - Storybook integration
- `plugin:testing-library/react` - Testing best practices
- `plugin:jest-dom/recommended` - Jest DOM testing

- `next/core-web-vitals` - Next.js 優化
- `plugin:storybook/recommended` - Storybook 整合
- `plugin:testing-library/react` - 測試最佳實踐
- `plugin:jest-dom/recommended` - Jest DOM 測試

#### Prettier Configuration

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/app/globals.css",
  "tailwindFunctions": ["clsx", "cn", "cva"]
}
```

**Key Rules:**

- **Tailwind CSS**: Automatic class sorting via prettier-plugin-tailwindcss
- **Class Utilities**: Support for `clsx`, `cn`, and `cva` functions
- **Tailwind Config**: References globals.css for class definitions

- **Tailwind CSS**: 透過 prettier-plugin-tailwindcss 自動排序類別
- **類別工具**: 支援 `clsx`、`cn` 與 `cva` 函數
- **Tailwind 配置**: 參考 globals.css 進行類別定義

## Clean Architecture Patterns

### Layer Conventions

#### 1. Entities Layer (`src/entities/`)

```typescript
// ✅ Good - Pure business logic, no external dependencies
export enum Position {
  NONE = "",
  OH = "OH",
  MB = "MB",
  OP = "OP",
  S = "S",
  L = "L",
}

export type LineupPlayer = {
  _id: string;
  position?: Position;
  sub?: { _id: string; entryIndex: { in?: number; out?: number } };
};
```

**Best Practices:**

- No external dependencies (database, frameworks)
- Pure TypeScript types and enums
- Business logic only
- Immutable data structures preferred

- 無外部依賴（資料庫、框架）
- 純 TypeScript 型別與列舉
- 僅包含業務邏輯
- 偏好不可變資料結構

#### 2. Applications Layer (`src/applications/`)

```typescript
// ✅ Good - Use dependency injection with interfaces
@injectable()
export class FindRecordUseCase {
  constructor(
    @inject(TYPES.RecordRepository) private recordRepository: IRecordRepository,
    @inject(TYPES.AuthenticationService)
    private authenticationService: IAuthenticationService,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute(
    input: IFindRecordInput,
  ): Promise<IFindRecordOutput | undefined> {
    // Implementation
  }
}
```

**Best Practices:**

- Use `@injectable()` decorator for all use cases
- Inject dependencies via constructor with `@inject(TYPES.X)`
- Define clear input/output interfaces
- Handle business logic orchestration

- 所有用例使用 `@injectable()` 裝飾器
- 透過建構子使用 `@inject(TYPES.X)` 注入依賴
- 定義清楚的輸入/輸出介面
- 處理業務邏輯編排

#### 3. Infrastructure Layer (`src/infrastructure/`)

```typescript
// ✅ Good - Implement repository interfaces
@injectable()
export class RecordRepositoryMongo implements IRecordRepository {
  async findById(id: string): Promise<Record | null> {
    return await RecordModel.findById(id).lean();
  }
}
```

**Best Practices:**

- Implement application layer interfaces
- Use `@injectable()` decorator
- Handle external system integrations
- Convert between domain and persistence models

- 實作應用層介面
- 使用 `@injectable()` 裝飾器
- 處理外部系統整合
- 在領域模型與持久化模型間轉換

### Dependency Injection Patterns

#### Container Configuration

```typescript
// src/infrastructure/di/types.ts
export const TYPES = {
  // Repositories
  UserRepository: Symbol.for("UserRepository"),
  RecordRepository: Symbol.for("RecordRepository"),
  TeamRepository: Symbol.for("TeamRepository"),

  // Services
  AuthenticationService: Symbol.for("AuthenticationService"),
  AuthorizationService: Symbol.for("AuthorizationService"),
};
```

**Best Practices:**

- Use Symbol.for() for type definitions
- Group by layer (repositories, services, use cases)
- Clear, descriptive naming conventions
- Export centralized TYPES object

- 使用 Symbol.for() 定義型別
- 按層次分組（儲存庫、服務、用例）
- 清楚的描述性命名慣例
- 匯出集中的 TYPES 物件

## React Component Standards

### Component Structure

#### UI Components (`src/components/ui/`)

```typescript
// ✅ Good - Shadcn/UI pattern with CVA
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-md font-medium transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
      },
      size: {
        default: "h-9 rounded-md px-2 py-2 text-sm [&>svg]:size-5",
        sm: "h-8 rounded-md p-0 md:px-3 text-xs [&>svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = ({ className, variant, size, asChild = false, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};
```

**Best Practices:**

- Use Class Variance Authority (CVA) for variants
- Extend native HTML element props
- Support `asChild` prop with Radix Slot
- Use `cn()` utility for class merging
- Export both component and props interface

- 使用 Class Variance Authority (CVA) 處理變體
- 擴展原生 HTML 元素屬性
- 支援 Radix Slot 的 `asChild` 屬性
- 使用 `cn()` 工具合併類別
- 匯出元件與屬性介面

#### Feature Components

```typescript
// ✅ Good - Feature-specific components
interface TeamMemberTableProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onRemove: (memberId: string) => void;
}

export const TeamMemberTable = ({ members, onEdit, onRemove }: TeamMemberTableProps) => {
  return (
    <div className="space-y-4">
      {/* Implementation */}
    </div>
  );
};
```

**Best Practices:**

- Clear prop interfaces with TypeScript
- Event handlers as props (onEdit, onRemove)
- Descriptive component names
- Single responsibility principle

- 清楚的 TypeScript 屬性介面
- 事件處理器作為屬性（onEdit、onRemove）
- 描述性的元件名稱
- 單一職責原則

### State Management Patterns

#### Redux Toolkit Slices

```typescript
// ✅ Good - RTK slice with proper typing
interface RecordState {
  currentRecord: Record | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RecordState = {
  currentRecord: null,
  isLoading: false,
  error: null,
};

export const recordSlice = createSlice({
  name: "record",
  initialState,
  reducers: {
    setRecord: (state, action: PayloadAction<Record>) => {
      state.currentRecord = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});
```

**Best Practices:**

- Define clear state interfaces
- Use `PayloadAction<T>` for type safety
- Immer-style mutations in reducers
- Descriptive action names

- 定義清楚的狀態介面
- 使用 `PayloadAction<T>` 確保型別安全
- 在 reducer 中使用 Immer 風格變更
- 描述性的動作名稱

#### SWR Data Fetching

```typescript
// ✅ Good - Custom hooks with SWR
export const useTeamMembers = (teamId: string) => {
  const { data, error, mutate } = useSWR(
    teamId ? `/api/teams/${teamId}/members` : null,
    fetcher,
  );

  return {
    members: data?.members || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
};
```

**Best Practices:**

- Create custom hooks for data fetching
- Conditional fetching with null key
- Return consistent object interface
- Include loading and error states

- 為資料獲取建立自訂 hook
- 使用 null key 進行條件式獲取
- 返回一致的物件介面
- 包含載入與錯誤狀態

## API Route Standards

### Next.js API Routes

```typescript
// ✅ Good - API route with proper error handling
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Business logic here
    const result = await teamController.getTeam({ teamId: params.teamId });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**Best Practices:**

- Use proper TypeScript types for handlers
- Implement authentication checks
- Consistent error response format
- Proper HTTP status codes
- Error logging for debugging

- 使用適當的 TypeScript 型別處理器
- 實作身份驗證檢查
- 一致的錯誤回應格式
- 適當的 HTTP 狀態碼
- 除錯用的錯誤日誌

## Styling Standards

### Tailwind CSS Conventions

```tsx
// ✅ Good - Proper Tailwind class usage
<div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-card-foreground">Team Settings</h2>
  <Button variant="outline" size="sm">
    Edit
  </Button>
</div>

// ✅ Good - Using cn() for conditional classes
<Button
  className={cn(
    "w-full",
    isLoading && "cursor-not-allowed opacity-50",
    variant === "destructive" && "hover:bg-red-600"
  )}
>
  Submit
</Button>
```

**Best Practices:**

- Use design system tokens (bg-card, text-card-foreground)
- Logical class grouping (layout, spacing, colors, typography)
- Use `cn()` utility for conditional styling
- Prefer Tailwind classes over custom CSS
- Mobile-first responsive design

- 使用設計系統代幣（bg-card、text-card-foreground）
- 邏輯類別分組（佈局、間距、顏色、排版）
- 使用 `cn()` 工具進行條件式樣式
- 偏好 Tailwind 類別而非自訂 CSS
- 行動優先的響應式設計

### CSS-in-JS (Motion)

```tsx
// ✅ Good - Motion component usage
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="bg-background rounded-lg p-6"
>
  Content
</motion.div>;
```

**Best Practices:**

- Prefer Tailwind animation to Motion components
- Keep animations subtle and purposeful
- Use consistent timing functions
- Combine with Tailwind for static styles

## File Organization Standards

### Naming Conventions

#### Files and Directories

```plaintext
✅ Good
src/
├── components/
│   ├── ui/button.tsx              # kebab-case for UI components
│   ├── team/member-table.tsx      # kebab-case for feature components
│   └── layout/header.tsx          # kebab-case for layout components
├── entities/
│   ├── team.ts                    # lowercase for entities
│   └── record.ts
├── applications/
│   └── usecases/
│       └── record/
│           └── record.usecase.ts  # dot notation for use cases
└── infrastructure/
    └── repositories/
        └── team.repository.mongo.ts # descriptive implementation files
```

**Best Practices:**

- **Components (元件)**: kebab-case (button.tsx, member-table.tsx)
- **Entities (實體)**: lowercase (team.ts, record.ts)
- **Use Cases (用例)**: dot notation (record.usecase.ts)
- **Repositories (儲存庫)**: implementation suffix (.mongo.ts)
- **Tests (測試)**: same name with .test.tsx/.spec.tsx

#### Variables and Functions

```typescript
// ✅ Good - Consistent naming
const teamMembers = []; // camelCase for variables
const isLoading = false; // boolean with is/has prefix
const hasPermission = true;

function calculateMatchStats() {} // camelCase for functions
const handleSubmit = () => {}; // event handlers with handle prefix

// Interfaces and Types
interface TeamMemberProps {} // PascalCase with descriptive suffix
type UserRole = "admin" | "member"; // PascalCase for types

// Constants
const MAX_TEAM_SIZE = 12; // UPPER_SNAKE_CASE for constants
const API_ENDPOINTS = {};
```

**Best Practices:**

- **Variables (變數)**: camelCase
- **Functions (函數)**: camelCase with descriptive verbs
- **Booleans (布林值)**: `is`/`has`/`can` prefix
- **Event Handlers (事件處理器)**: `handle` prefix
- **Interfaces/Types (介面/型別)**: PascalCase
- **Constants (常數)**: UPPER_SNAKE_CASE

## Git Commit Standards

### Conventional Commits

Following Angular commit convention as specified in README.md:

```bash
# ✅ Good examples
feat(landing): implement hero section optimization with CSS code splitting
fix(tests): update CTA button text in hero component tests
docs: archive legacy Traditional Chinese documentation
feat: upgrade BMad framework to v4.39.0

# Commit types
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style (formatting, missing semicolons, etc)
refactor: # Code refactoring
test:     # Adding or updating tests
chore:    # Maintenance tasks
```

**Best Practices:**

- Use lowercase for type and scope
- Limit first line to 72 characters
- Use imperative mood ("add" not "added")
- Include scope when relevant (landing, tests, auth)
- Body should explain "what" and "why", not "how"

- 型別與範圍使用小寫
- 首行限制在 72 字元內
- 使用祈使語氣（"add" 而非 "added"）
- 相關時包含範圍（landing、tests、auth）
- 內文應解釋「什麼」與「為什麼」，而非「如何」

## Performance Standards

### Bundle Optimization

```typescript
// ✅ Good - Proper imports for tree shaking
import { Button } from "@/components/ui/button"; // Named import
import { motion } from "motion/react"; // Specific module import

// ❌ Bad - Prevents tree shaking
import * as UI from "@/components/ui"; // Namespace import
import * as Motion from "motion"; // Full library import
```

### Code Splitting

```typescript
// ✅ Good - Lazy loading for routes
const RecordPage = lazy(() => import("@/app/record/[recordId]/page"));

// ✅ Good - Dynamic imports for heavy components
const ChartComponent = dynamic(() => import("@/components/charts/match-stats"), {
  loading: () => <div>Loading chart...</div>,
  ssr: false,
});
```

**Best Practices:**

- Use dynamic imports for large dependencies
- Implement loading states for lazy components
- Disable SSR for client-only components
- Bundle analyze regularly (`npm run build && npm run analyze`)

- 對大型依賴使用動態匯入
- 為懶載入元件實作載入狀態
- 對僅客戶端元件禁用 SSR
- 定期進行包分析（`npm run build && npm run analyze`）

## Security Standards

### Authentication Patterns

```typescript
// ✅ Good - Proper session verification
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Additional authorization checks
  const hasPermission = await authService.hasPermission(
    session.user.id,
    "read:teams",
  );
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Proceed with logic
}
```

### Data Validation

```typescript
// ✅ Good - Zod schema validation
import { z } from "zod";

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  members: z.array(z.string()).max(12),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateTeamSchema.parse(body);
    // Proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
  }
}
```

**Best Practices:**

- Always validate input data with Zod (總是使用 Zod 驗證輸入資料)
- Implement proper authentication for all protected routes (為所有受保護路由實作適當身份驗證)
- Use authorization checks for resource access (使用授權檢查進行資源存取)
- Never expose sensitive data in client-side code (永不在客戶端程式碼中暴露敏感資料)
- Sanitize user inputs (淨化使用者輸入)
