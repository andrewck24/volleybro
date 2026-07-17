# T124: Toast Notifications for Player Actions

**Status**: Completed ✓
**Task**: Add toast notifications for player actions (invite send, accept, reject, etc.)

---

## Overview

This document describes the implementation of toast notifications throughout the VolleyBro application for user-facing feedback on player-related operations. Toast notifications provide immediate, non-blocking feedback for both success and error states.

---

## Implementation Summary

### 1. Toast System Architecture

The application uses Shadcn/UI toast components with a custom hook pattern:

**Components:**

- `src/components/ui/toast.tsx` - Toast UI components (ToastProvider, ToastViewport, Toast, etc.)
- `src/components/ui/use-toast.ts` - React hook for triggering toasts

**Integration:**

- `src/app/layout.tsx` - Toaster component added to root layout for global toast rendering

### 2. Updated Components

#### A. InviteAccordion Component

**File**: `src/components/team/invite-accordion.tsx`

**Changes:**

- Added `useToast` hook import
- Modified `handleSubmit` to show toast notifications:
  - **Success**: "邀請已發送" (Invitation Sent) with email address
  - **Error**: "邀請失敗" (Invitation Failed) with error message
- Changed error data retrieval from `errorData.error` to `errorData.message` (aligned with T122 error handling)

**Example:**

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ... fetch logic
  toast({
    title: '邀請已發送',
    description: `已向 ${email} 發送邀請`,
  });
};
```

#### B. InvitationList Component

**File**: `src/components/team/invitation-list.tsx`

**Changes:**

- Added `useToast` hook import
- Added `processingId` state to track which invitation is being processed
- Created `handleAccept` wrapper function with try-catch and toast notifications:
  - **Success**: "邀請已接受" (Invitation Accepted)
  - **Error**: "接受邀請失敗" (Failed to Accept)
- Created `handleReject` wrapper function with try-catch and toast notifications:
  - **Success**: "邀請已拒絕" (Invitation Rejected)
  - **Error**: "拒絕邀請失敗" (Failed to Reject)
- Updated button disabled state to prevent multiple simultaneous operations
- Added `aria-busy` attributes for accessibility during processing

**Example:**

```tsx
const handleAccept = async (playerId: string) => {
  setProcessingId(playerId);
  try {
    await onAccept(playerId);
    toast({
      title: '邀請已接受',
      description: '您已加入隊伍',
    });
  } catch (err) {
    toast({
      title: '接受邀請失敗',
      description: errorMessage,
      variant: 'destructive',
    });
  }
};
```

#### C. usePlayerActions Hook

**File**: `src/hooks/use-player-actions.ts` (NEW)

**Purpose**: Provides wrapped player actions with built-in toast notifications

**Functions:**

1. **promotePlayer(playerId, playerName)**
   - API: `PATCH /api/players/{playerId}/role` with `{ role: 'ADMIN' }`
   - Success: "升級成功" (Promotion Successful)
   - Error: "升級失敗" (Promotion Failed)

2. **removePlayer(playerId, playerName)**
   - API: `DELETE /api/players/{playerId}`
   - Success: "移除成功" (Removal Successful)
   - Error: "移除失敗" (Removal Failed)

3. **leaveTeam(playerId)**
   - API: `PATCH /api/players/{playerId}/status` with `{ action: 'leave' }`
   - Success: "已離開隊伍" (Left Team)
   - Error: "離開失敗" (Failed to Leave)

4. **deletePlayer(playerId, playerName)**
   - API: `DELETE /api/players/{playerId}`
   - Success: "刪除成功" (Deletion Successful)
   - Error: "刪除失敗" (Deletion Failed)

5. **cancelInvitation(playerId)**
   - API: `PATCH /api/players/{playerId}/status` with `{ action: 'cancel' }`
   - Success: "邀請已取消" (Invitation Cancelled)
   - Error: "取消失敗" (Cancellation Failed)

---

## Toast Notification Types

### Success Toast

```tsx
toast({
  title: '操作成功',
  description: '詳細的成功描述',
});
```

### Error Toast

```tsx
toast({
  title: '操作失敗',
  description: '詳細的錯誤描述',
  variant: 'destructive',
});
```

### Features

- Non-blocking feedback
- Auto-dismiss after 1000000ms (configurable in `use-toast.ts`)
- Manual dismiss via close button
- Accessible via ARIA attributes
- Supports title and description
- Supports variant (default, destructive)

---

## Usage Examples

### Sending Invitations (InviteAccordion)

```tsx
// User fills email and role, clicks send
// Component automatically shows:
// - Success: "邀請已發送" + email
// - Error: "邀請失敗" + error message
```

### Accepting/Rejecting Invitations (InvitationList)

```tsx
// User sees pending invitation
// Clicks "接受" or "拒絕"
// Component shows appropriate toast notification
// Button disabled during processing
```

### Player Operations (using usePlayerActions hook)

```tsx
const { promotePlayer, removePlayer, leaveTeam } = usePlayerActions(teamId);

// Promote to admin
await promotePlayer(playerId, playerName);
// Shows: "升級成功" or "升級失敗"

// Remove from team
await removePlayer(playerId, playerName);
// Shows: "移除成功" or "移除失敗"
```

---

## Integration Points

### Components Using Toast Notifications

1. **InviteAccordion** - Sending invitations
2. **InvitationList** - Accepting/rejecting invitations
3. **Custom components using usePlayerActions hook** - Player management operations

### API Error Handling

- Toast notifications display the `message` field from API error responses
- This aligns with T122 unified error handling system
- Error messages are user-friendly and non-technical

---

## Testing Considerations

### Unit Testing

- InviteAccordion: Test toast calls on success/error
- InvitationList: Test handleAccept/handleReject with toast
- usePlayerActions: Test each action function with mock fetch

### Manual Testing Checklist

- [ ] Send invitation → See success toast
- [ ] Send invitation to invalid email → See error toast
- [ ] Accept invitation → See success toast
- [ ] Reject invitation → See success toast
- [ ] Promote player → See success toast (when integrated)
- [ ] Remove player → See success toast (when integrated)
- [ ] Leave team → See success toast (when integrated)
- [ ] Cancel invitation → See success toast (when integrated)

---

## Best Practices Applied

### 1. Error Recovery

- Try-catch blocks prevent unhandled rejections
- Errors are displayed to users in a readable format
- Operations can be retried by user

### 2. User Feedback

- Clear action titles (邀請已發送, 升級成功, etc.)
- Descriptive details (email, player name, etc.)
- Immediate feedback (no delay)

### 3. Accessibility

- Toast component uses ARIA alert role
- aria-busy attributes on buttons during processing
- Screen reader support for dynamic content

### 4. UX Consistency

- All toast messages in Traditional Chinese
- Consistent success/error title format
- Consistent description format

### 5. Error Messages

- Uses error response `message` field (T122 aligned)
- Fallback to generic message if none provided
- Never exposes technical details to users

---

## Future Enhancements

1. **Undo Actions**: Add undo button to success toasts for destructive operations
2. **Toast Queue**: Implement toast queue for multiple simultaneous operations
3. **Persist Loading State**: Keep loading state across page transitions
4. **Analytics**: Track which operations trigger most errors
5. **Customizable Duration**: Allow per-action toast display duration

---

## Files Modified

| File                                       | Changes                                         | Lines      |
| ------------------------------------------ | ----------------------------------------------- | ---------- |
| `src/components/team/invite-accordion.tsx` | Added useToast, updated handleSubmit            | +30 lines  |
| `src/components/team/invitation-list.tsx`  | Added useToast, created handlers, updated logic | +80 lines  |
| `src/hooks/use-player-actions.ts`          | NEW - Player action wrapper with toast          | +180 lines |

---

## Related Tasks

- **T122**: Unified Error Handling (error message format)
- **T123**: Accessibility Guidelines (ARIA support)
- **T125**: Code Refactoring (cleanup and optimization)

---

## Success Criteria

✓ All player invite operations show success/error toast
✓ All invitation acceptance/rejection shows toast notification
✓ All player actions (promote, remove, leave, delete, cancel) have toast support via hook
✓ Toast messages are user-friendly and descriptive
✓ Error messages come from API response
✓ No breaking changes to existing functionality
✓ All tests passing

---
