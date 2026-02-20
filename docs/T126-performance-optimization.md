# T126: Performance Optimization

**Status**: Completed ✓
**Task**: Reduce API requests, optimize SWR cache strategy

---

## Overview

This task focused on optimizing the data fetching strategy by:
1. Consolidating SWR configuration into reusable presets
2. Implementing differentiated cache strategies based on data volatility
3. Improving API URL readability
4. Reducing redundant API requests through better deduplication

---

## Changes Implemented

### 1. Centralized SWR Configuration Presets
**File**: `src/hooks/use-data.ts`

**Added**: `SWR_CONFIG` object with three configuration presets

```typescript
const SWR_CONFIG = {
  DEFAULT: {
    dedupingInterval: 5 * 60 * 1000,      // 5 minutes
    focusThrottleInterval: 5 * 60 * 1000, // 5 minutes
    errorRetryInterval: 5000,              // 5 seconds
  },
  LIST: {
    dedupingInterval: 2 * 60 * 1000,      // 2 minutes
    focusThrottleInterval: 3 * 60 * 1000, // 3 minutes
    errorRetryInterval: 5000,
  },
  INFINITE: {
    dedupingInterval: 2 * 60 * 1000,
    focusThrottleInterval: 3 * 60 * 1000,
    errorRetryInterval: 5000,
  },
};
```

**Benefits**:
- **DEFAULT**: For single-resource queries (user, team, record) - 5 min dedup prevents concurrent requests
- **LIST**: For collection queries - 2 min dedup for more responsive updates on frequently-changing data
- **INFINITE**: For paginated queries - similar to LIST but optimized for infinite scroll scenarios

---

### 2. Applied Presets to All Data Hooks

Updated 7 hooks to use the new presets:

| Hook | Config Type | Rationale |
|------|-------------|-----------|
| `useUser()` | DEFAULT | Single user resource, stable |
| `useProfile()` | DEFAULT | Single profile resource, stable |
| `useUserTeams()` | LIST | User may belong to multiple teams, changes less frequently |
| `useTeam()` | DEFAULT | Single team resource, stable |
| `useTeamMembers()` | LIST | Members list, may change when users join/leave |
| `useRecord()` | DEFAULT | Single record resource, stable |
| `useMatches()` | INFINITE | Paginated matches, use infinite scroll optimizations |

**Benefits**:
- Consistent configuration across all hooks
- Appropriate cache strategies per data type
- Easier to adjust performance globally (update SWR_CONFIG)

---

### 3. Improved API URL Readability
**File**: `src/hooks/use-data.ts` (useMatches function)

**Changed**:
```typescript
// Before (abbreviated, unclear)
return `/api/matches?ti=${teamId}&li=${previousPageData!.lastId}`;

// After (clear parameter names)
return `/api/matches?teamId=${teamId}&lastId=${previousPageData!.lastId}`;
```

**Benefits**:
- More readable API URLs in network tab
- Easier debugging
- Better alignment with REST conventions

---

## Performance Impact

### Reduced API Requests
1. **Deduplication Intervals**: Prevent concurrent requests when multiple components mount
   - `DEFAULT`: Requests within 5 minutes are deduplicated
   - `LIST`: Requests within 2 minutes are deduplicated
   - Reduces network traffic for initial page loads

2. **Focus Throttling**: Prevent unnecessary refetches when window regains focus
   - `DEFAULT`: 5 minute throttle interval
   - `LIST`: 3 minute throttle interval
   - Reduces background API calls

3. **Cache Strategy**: Differentiated timeouts based on data volatility
   - Static data (user, team) cached longer (5 min)
   - Dynamic data (members list) cached shorter (2 min)
   - Balances freshness vs. network efficiency

### Example Scenario
**User visits team page with multiple components**:
1. TeamHero component mounts → fetches `/api/teams/{teamId}` (cache miss)
2. TeamMembers component mounts → (deduplicated, uses cache from step 1)
3. TeamInfo component mounts → (deduplicated, uses cache from step 1)
4. All three components share same cached data (no extra requests)

**Result**: 1 API request instead of 3

---

## Testing

All 451 tests pass with no regressions:
- SWR configuration doesn't affect component behavior
- All hooks return same data structure
- Error handling remains unchanged
- Cache strategies are transparent to consuming components

---

## Best Practices Applied

### 1. Deduplication Strategy
Prevents thundering herd problem when multiple components request same data simultaneously

```typescript
dedupingInterval: 5 * 60 * 1000 // Multiple requests within this window are combined
```

### 2. Focus Throttling
Reduces unnecessary API calls when user returns to the tab

```typescript
focusThrottleInterval: 5 * 60 * 1000 // Don't refetch on focus if recently fetched
```

### 3. Error Retry Strategy
Graceful handling of transient failures

```typescript
errorRetryInterval: 5000 // Wait 5 seconds before retrying failed requests
```

### 4. Differentiated Cache Strategies
Not all data changes at the same rate - optimize accordingly

```typescript
// User profile is stable - longer dedup interval
useUser() → SWR_CONFIG.DEFAULT (5 min)

// Team members list changes frequently - shorter dedup interval
useTeamMembers() → SWR_CONFIG.LIST (2 min)
```

---

## Configuration Explanation

### dedupingInterval
**What**: Request deduplication interval
**Why**: Prevent multiple concurrent requests for the same URL
**Effect**: Multiple requests for the same URL within the interval are combined into one

Example:
- Component A requests `/api/teams/123` at 0ms
- Component B requests `/api/teams/123` at 100ms
- Both get the same response (single network request)

### focusThrottleInterval
**What**: Minimum time between refetches on window focus
**Why**: Prevent excessive API calls when user returns to tab
**Effect**: If data was fetched recently, won't refetch on window focus

Example:
- User fetches `/api/users` at 0ms
- User switches to another tab
- User returns after 2 minutes
- Data is refetched (because > 5 min interval)

### errorRetryInterval
**What**: Delay before retrying failed requests
**Why**: Give server time to recover from transient failures
**Effect**: Failed requests are retried after specified delay

---

## Future Optimizations

### Phase 1 (Medium Priority)
1. **Request Batching**: Combine multiple requests into single API call
2. **Selective Revalidation**: Only refetch data that changed
3. **Prefetching**: Fetch predictable data proactively

### Phase 2 (Lower Priority)
4. **Request Prioritization**: Prioritize critical data fetches
5. **Conditional Requests**: Use ETags for conditional updates
6. **Compression**: Enable gzip compression for large responses

---

## Metrics to Monitor

1. **Network Requests**: Track number of API requests per page load
2. **Cache Hit Rate**: Monitor SWR cache effectiveness
3. **Response Time**: Measure time to first data display
4. **User Perceived Performance**: Measure Time to Interactive (TTI)

---

## Documentation

- Configuration presets: See `SWR_CONFIG` in `src/hooks/use-data.ts`
- Hook implementation: All hooks in `src/hooks/use-data.ts`
- SWR documentation: https://swr.vercel.app/

---

## Success Metrics

✓ Centralized SWR configuration (single source of truth)
✓ Differentiated cache strategies (7 hooks optimized)
✓ Improved URL readability (teamId, lastId instead of ti, li)
✓ Reduced API requests through better deduplication
✓ 451 tests passing (no regressions)
✓ Consistent error handling across all hooks

---

## Related Tasks

- **T121**: SWR Optimistic Updates (complements this optimization)
- **T120**: MongoDB Index Optimization (backend performance)
- **T125**: Code Refactoring (code organization improvements)

---

## Conclusion

T126 successfully optimized the SWR caching strategy by introducing configuration presets tailored to different data types. The deduplication intervals prevent concurrent requests, while differentiated cache strategies balance data freshness with network efficiency. This foundation enables future optimizations like request batching and prefetching.

**Key Achievement**: Reduced redundant API requests through intelligent caching without changing component behavior.
