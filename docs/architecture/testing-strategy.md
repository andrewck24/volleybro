# Testing Standards & Strategy

## 🧪 Current Testing Architecture

### ✅ Established Testing Environment

```javascript
// jest.config.ts - Unified jsdom environment
testEnvironment: 'jsdom',
setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
```

### Testing Coverage Status

- Landing Page: 95%+ coverage ✅
- Helper Functions: Complete unit tests ✅
- Repository Layer: MongoDB mock tests ✅

## 📋 Development Rules & Code Quality Requirements

### 🔄 Test-Driven Development (TDD) Flow

1. Red Phase (紅燈階段)
   - Write test cases first, ensure tests fail
   - Clearly define expected behavior

2. Green Phase (綠燈階段)
   - Implement minimal viable code to pass tests
   - Focus on functionality, not optimization

3. Refactor Phase (重構階段)
   - Optimize code structure and performance
   - Ensure tests continue to pass

#### Implementation Principles

- Every new feature must follow TDD process
- Test cases must cover normal, boundary, and error cases
- Maintain test coverage during refactoring

### 🏷️ Test Identifier (data-testid) Standards

- Component Marking Requirements
  - All testable components must have `data-testid` attributes
  - Test IDs use `kebab-case` naming convention
  - Names should be semantic and descriptive of component function

- Naming Conventions

```typescript
   // ✅ Recommended usage
   <section data-testid="hero-section">
   <button data-testid="cta-button">
   <div data-testid="status-indicators">

   // ❌ Avoid usage
   <div data-testid="div1">
   <span data-testid="text">
```

- Test File Integration

```typescript
// Use Testing Library queries
const heroSection = screen.getByTestId("hero-section");
const ctaButton = screen.getByTestId("cta-button");
```

### 📦 Production Environment Optimization

Production optimization in `next.config.js`:

```javascript
const removeProperties =
  phase === PHASE_PRODUCTION_BUILD ? { properties: ["^data-testid$"] } : false;

const nextConfig = {
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
  compiler: {
    removeConsole: phase === PHASE_PRODUCTION_BUILD,
    reactRemoveProperties: removeProperties, // Removes data-testid in production
  },
};
```

- Automatically removes `data-testid` attributes in production
- Ensures clean HTML and optimized bundle size

## Jest Configuration

Current testing setup:

- **Environment**: jsdom for React components
- **Setup**: `jest.setup.ts` for global test configuration
- **Coverage**: v8 provider with comprehensive coverage collection
- **Path Mapping**: Supports `@/*` imports

- **環境**: jsdom 用於 React 元件
- **設定**: `jest.setup.ts` 用於全域測試配置
- **覆蓋率**: v8 提供者，完整覆蓋率收集
- **路徑映射**: 支援 `@/*` 匯入

## Testing Patterns

### Mock Strategy & Best Practices

**Philosophy: Layered Mocking Strategy** (分層 Mock 策略)

```typescript
// ✅ Good - Layered approach
// 1. jest.setup.ts - 基礎 motion components mock
jest.mock("motion/react", () => ({
  motion: {
    section: ({ children, ...props }) =>
      React.createElement("section", filterMotionProps(props), children),
    div: ({ children, ...props }) =>
      React.createElement("div", filterMotionProps(props), children),
  },
  // 不包含 hooks mock - 由個別測試檔案處理
}));

// 2. 個別測試檔案 - 針對性 hooks mock
// header.test.tsx
jest.mock("motion/react", () => ({
  ...jest.requireActual("motion/react"),
  useScroll: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(useScroll).mockReturnValue({
    scrollY: mockScrollY,
  });
});
```

**Mock 原則與最佳實踐：**

1. **基礎設定集中，特定邏輯分散**
   - `jest.setup.ts`: 通用的 component mocks
   - 測試檔案: 特定的 hook mocks

2. **避免 `as any` 的型別安全策略**

   ```typescript
   // ✅ Good - 建立完整的 mock 物件
   const createMockMotionValue = (value: number = 0) => ({
     current: value,
     prev: value,
     get: jest.fn(() => value),
     on: jest.fn(() => jest.fn()),
     // ... 其他必要屬性
   });

   // ❌ Bad - 使用 as any 失去型別檢查
   const mockValue = { get: () => 0 } as any;
   ```

3. **測試隔離與清理**

   ```typescript
   // ✅ Good - 確保每個測試獨立
   beforeEach(() => {
     jest.clearAllMocks();
     jest.mocked(useScroll).mockReturnValue(defaultMockBehavior);
   });
   ```

4. **使用 `jest.mocked()` 提供型別安全**

   ```typescript
   // ✅ Good - 型別安全的 mock 操作
   import { useScroll } from "motion/react";
   jest.mock("motion/react", () => ({
     ...jest.requireActual("motion/react"),
     useScroll: jest.fn(),
   }));

   beforeEach(() => {
     jest.mocked(useScroll).mockReturnValue({
       scrollY: mockScrollY,
     });
   });

   // ❌ Bad - 無型別檢查
   require("motion/react").useScroll.mockReturnValue(...);
   ```

5. **避免全域 mock 污染**

   ```typescript
   // ✅ Good - 測試檔案內的 mock 明確可見
   jest.mock("motion/react", () => ({
     ...jest.requireActual("motion/react"),
     useScroll: jest.fn(),
   }));

   // ❌ Bad - 隱式依賴全域設定
   // 測試看起來沒有依賴，但實際上依賴 setup 中的 mock
   ```

**Mock 複雜第三方庫的策略：**

當遇到如 MotionValue 等複雜介面時：

```typescript
// 方案一：最小實現策略
const createMinimalMockMotionValue = (value: number) => ({
  get: jest.fn(() => value),
  on: jest.fn(() => jest.fn()),
  // 只實現測試中實際使用的方法
});

// 方案二：使用 Partial<T> 型別
const mockMotionValue: Partial<MotionValue<number>> = {
  get: jest.fn(() => 0),
  on: jest.fn(() => jest.fn()),
};

// 方案三：必要時使用型別斷言（最後選擇）
const mockValue = createMinimalMock() as MotionValue<number>;
```

**Mock 決策流程圖：**

```plaintext
是否為共用的基礎功能？
├─ 是 → jest.setup.ts 中 mock
└─ 否 → 個別測試檔案中 mock
        ├─ 需要特定行為？
        │  ├─ 是 → beforeEach 中設定
        │  └─ 否 → 使用預設 mock
        └─ 需要複雜型別？
           ├─ 建立最小實現
           └─ 必要時使用型別斷言
```

### Component Testing

```typescript
// ✅ Good - Component test with Testing Library
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("renders with correct text", () => {
    render(<Button data-testid="test-button">Click me</Button>);
    expect(screen.getByTestId("test-button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} data-testid="test-button">
        Click me
      </Button>
    );

    fireEvent.click(screen.getByTestId("test-button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Best Practices:**

- Use `@testing-library/react` for component testing
- Always include `data-testid` for reliable element selection
- Test user interactions, not implementation details
- Use `getByTestId` queries as primary selectors
- Mock external dependencies

### Use Case Testing

```typescript
// ✅ Good - Use case test with mocked dependencies
describe("FindRecordUseCase", () => {
  let useCase: FindRecordUseCase;
  let mockRecordRepository: jest.Mocked<IRecordRepository>;
  let mockAuthService: jest.Mocked<IAuthenticationService>;

  beforeEach(() => {
    mockRecordRepository = {
      findById: jest.fn(),
    } as any;

    mockAuthService = {
      verifySession: jest.fn(),
    } as any;

    useCase = new FindRecordUseCase(mockRecordRepository, mockAuthService);
  });

  it("returns record when user is authorized", async () => {
    const mockRecord = { _id: "123", title: "Test Record" };
    mockAuthService.verifySession.mockResolvedValue({ userId: "user1" });
    mockRecordRepository.findById.mockResolvedValue(mockRecord);

    const result = await useCase.execute({ params: { _id: "123" } });

    expect(result).toEqual(mockRecord);
    expect(mockRecordRepository.findById).toHaveBeenCalledWith("123");
  });
});
```

**Best Practices:**

- Mock all external dependencies (模擬所有外部依賴)
- Test business logic scenarios (測試業務邏輯場景)
- Use descriptive test scenarios (使用描述性的測試場景)
- Setup common mocks in beforeEach (在 beforeEach 中設定共同模擬)
- Assert on both return values and method calls (對返回值與方法呼叫進行斷言)

## ⚠️ Technical Debt & Improvement Directions

// Epic 6 Testing Refactoring Focus

1. MongoDB Mock Strategy
   - Current: Simple mock, avoiding BSON ES modules issues
   - Future: Consider @shelf/jest-mongodb integration testing
   - 當前: 簡單 mock，避免 BSON ES modules 問題
   - 未來: 考慮 @shelf/jest-mongodb 整合測試

2. TypeScript Test Type Safety
   - Current: Some tests lack type checking
   - Goal: Complete type test coverage
   - 目前: 部分測試缺乏型別檢查
   - 目標: 完整的型別測試覆蓋
