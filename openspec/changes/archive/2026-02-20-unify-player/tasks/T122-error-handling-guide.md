# T122: Unified Error Handling Implementation Guide

**Status**: In Progress
**Task**: Add error handling and user-friendly error messages throughout the API layer
**Files Created**:

- `src/lib/errors/api-error.ts` - Custom error class hierarchy
- `src/lib/errors/handle-api-error.ts` - Error handler utility
- `src/lib/errors/index.ts` - Error exports

---

## Overview

This guide provides a unified error handling strategy for all VolleyBro API routes. It ensures consistent error responses, user-friendly messages, and proper HTTP status codes across the entire API surface.

---

## Error Class Hierarchy

### 7 Custom Error Classes

All errors extend `ApiError` and include:

- `statusCode` - HTTP status code
- `message` - Internal message (for logging)
- `userMessage` - User-friendly message (for API response)
- `details` - Additional error details (e.g., validation issues)

```typescript
// 1. ValidationError (400)
new ValidationError(
  "Email is invalid",
  "Please enter a valid email address",
  validationDetails
)

// 2. AuthenticationError (401)
new AuthenticationError("Session expired")

// 3. AuthorizationError (403)
new AuthorizationError(
  "User is not admin",
  "You don't have permission to perform this action"
)

// 4. NotFoundError (404)
new NotFoundError("Player", "The player you're looking for doesn't exist")

// 5. ConflictError (409)
new ConflictError(
  "Email already invited",
  "This email has already been invited to the team"
)

// 6. BusinessRuleError (422)
new BusinessRuleError(
  "Owner cannot be removed",
  "The team owner cannot be removed from the team"
)

// 7. InternalServerError (500)
new InternalServerError("Database connection failed")
```

---

## Usage in API Routes

### Option 1: Using handleApiError in try-catch

```typescript
import { handleApiError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    // Your route logic
    const data = await req.json();
    const validated = MySchema.parse(data);  // May throw ZodError
    const result = await myUseCase.execute(validated);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'POST /api/my-route');
  }
}
```

**What handleApiError does:**

1. Catches `ApiError` instances → Returns with proper statusCode
2. Catches `ZodError` → Returns 400 with validation details
3. Catches generic `Error` → Infers error type from message
4. Logs the error with provided context
5. Returns standardized error response

### Option 2: Using withErrorHandler wrapper

```typescript
import { withErrorHandler } from '@/lib/errors';

const handler = async (req: NextRequest) => {
  const data = await req.json();
  const validated = MySchema.parse(data);
  const result = await myUseCase.execute(validated);
  return NextResponse.json(result, { status: 201 });
};

export const POST = withErrorHandler(handler);
```

**Advantage**: Less boilerplate, automatic error catching

### Option 3: Throwing custom errors in use cases

```typescript
// In src/applications/usecases/player/create-player.usecase.ts
import { ValidationError, ConflictError } from '@/lib/errors';

export class CreatePlayerUseCase {
  async execute(data) {
    // Validation error
    if (!isValidEmail(data.email)) {
      throw new ValidationError(
        "Invalid email format",
        "Please enter a valid email address"
      );
    }

    // Business rule error
    const existingPlayer = await this.playerRepository.findByEmail(data.email);
    if (existingPlayer) {
      throw new ConflictError(
        "Email already invited",
        "This email has already been invited"
      );
    }

    // Success case
    return await this.playerRepository.create(data);
  }
}
```

---

## API Response Format

### Success Response (200)

```json
{
  "name": "Alice",
  "teamId": "507f1f77bcf86cd799439011",
  "role": "MEMBER"
}
```

### Error Response (standardized)

```json
{
  "error": "NotFoundError",
  "message": "The player you're looking for doesn't exist",
  "statusCode": 404
}
```

### Validation Error Response (400)

```json
{
  "error": "ValidationError",
  "message": "Please check your input and try again",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ],
  "statusCode": 400
}
```

---

## HTTP Status Code Mapping

| Code | Error Class         | Example                 | User Message                                            |
| ---- | ------------------- | ----------------------- | ------------------------------------------------------- |
| 400  | ValidationError     | Invalid email format    | "Please check your input and try again"                 |
| 401  | AuthenticationError | Missing session         | "You need to log in to access this resource"            |
| 403  | AuthorizationError  | Not team admin          | "You don't have permission to perform this action"      |
| 404  | NotFoundError       | Player not found        | "The player you're looking for doesn't exist"           |
| 409  | ConflictError       | Email already invited   | "This resource already exists"                          |
| 422  | BusinessRuleError   | Owner cannot be removed | "This action violates business rules"                   |
| 500  | InternalServerError | Database error          | "An unexpected error occurred. Please try again later." |

---

## Error Message Strategy

### Internal Messages (logged)

- Detailed, technical, includes context
- For debugging and monitoring
- May expose internal implementation

```text
"Email 'alice@example.com' is already invited to team 507f1f77"
```

### User Messages (API response)

- Clear, friendly, non-technical
- Actionable and helpful
- Should never expose implementation details

```text
"This email has already been invited to the team. Please use a different email or wait for the user to respond to the invitation."
```

---

## Implementation Checklist for T122

### Phase 1: Foundation (COMPLETE)

- [x] Create ApiError base class with hierarchy
- [x] Create handleApiError utility function
- [x] Create withErrorHandler wrapper
- [x] Add comprehensive tests for error classes
- [x] Export all errors from `src/lib/errors/index.ts`

### Phase 2: API Route Migration

- [ ] Update `/api/players/[playerId]/status/route.ts`
- [ ] Update `/api/players/[playerId]/info/route.ts`
- [ ] Update `/api/players/[playerId]/role/route.ts`
- [ ] Update `/api/players/[playerId]/route.ts`
- [ ] Update `/api/teams/[teamId]/players/route.ts`
- [ ] Update `/api/users/[userId]/players/route.ts`
- [ ] Update `/api/teams/route.ts`
- [ ] Update `/api/teams/[teamId]/route.ts`
- [ ] Update `/api/teams/[teamId]/lineups/route.ts`
- [ ] Update `/api/users/teams/route.ts`
- [ ] Update `/api/profiles/route.ts`

### Phase 3: Use Case Error Handling

- [ ] Review all use cases in `src/applications/usecases/player/`
- [ ] Ensure they throw appropriate ApiError subclasses
- [ ] Add proper error messages (internal + user-friendly)

### Phase 4: Integration Tests

- [ ] Test error responses for each API route
- [ ] Verify status codes are correct
- [ ] Validate error messages are user-friendly
- [ ] Check that sensitive info is not exposed

---

## Example: Migrating a Route

### Before (current pattern)

```typescript
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = RoleSchema.parse(body);  // May throw ZodError
    const result = await useCase.execute(...);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      // ... more if statements
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### After (new pattern)

```typescript
import { handleApiError, AuthenticationError } from '@/lib/errors';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const body = await req.json();
    const validated = RoleSchema.parse(body);  // Throws ZodError (handled automatically)
    const result = await useCase.execute(...);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, 'PATCH /api/players/[playerId]/role');
  }
}
```

**Benefits:**

- Less boilerplate (no if-statements for each error type)
- Consistent error handling across all routes
- Automatic logging with context
- Better error message separation (internal vs. user-friendly)

---

## Type Safety

The error classes are fully typed:

```typescript
// Type guard
if (isApiError(error)) {
  console.log(error.statusCode);  // TypeScript knows this exists
  console.log(error.userMessage);  // TypeScript knows this exists
}

// In routes
try {
  // ...
} catch (error) {
  // error is typed as unknown, handleApiError figures it out
  return handleApiError(error);
}
```

---

## Testing Errors

```typescript
// Test throwing custom errors
it('should throw ValidationError for invalid email', async () => {
  const useCase = new CreatePlayerUseCase(mockRepository);
  await expect(
    useCase.execute({ email: 'invalid' })
  ).rejects.toThrow(ValidationError);
});

// Test API route handles errors
it('should return 400 for validation error', async () => {
  const response = await POST(mockRequest);
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBe('ValidationError');
});
```

---

## Configuration & Customization

### Changing error messages

Each error class accepts custom messages:

```typescript
throw new NotFoundError(
  "Player",
  "The player with ID '507f1f77' was not found in your team"
);
```

### Adding new error types

Create a new subclass:

```typescript
export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests") {
    super(429, message, "You've made too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}
```

Then update `handleApiError` to recognize it if needed.

---

## Performance Considerations

- Error objects are lightweight (small memory footprint)
- Logging is synchronous but non-blocking
- No performance impact on success path
- Error handling is optimized for clarity over speed

---

## Security

- **No sensitive data exposure**: User messages never reveal internal details
- **No SQL injection**: Using TypeScript types prevents most injection attacks
- **No stack traces**: Internal messages logged, not sent to clients
- **Proper status codes**: Standard HTTP codes prevent information leakage

---

## Next Steps

1. **Phase 2-4** of implementation checklist above
2. **Update use cases** to throw custom errors instead of generic Errors
3. **Add integration tests** for each API route
4. **Monitor error logs** in production to find unhandled cases
5. **Iterate** based on user feedback and log analysis

---

## References

- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
- [REST API Error Handling](https://www.rfc-editor.org/rfc/rfc7807)
- [Zod Error Handling](https://zod.dev/?id=error-handling)
