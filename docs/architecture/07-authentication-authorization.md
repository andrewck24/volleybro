# 🔐 身份認證與授權

## NextAuth.js v5 架構

### 認證流程
```typescript
// src/auth.config.ts - 核心配置
interface User {
  id: string;
  teams: UserEntity["teams"];  // 直接關聯球隊
}

// src/middleware.ts - 路由保護
export const middleware = auth((req) => {
  const isSignedIn = !!req.auth;
  // 路由保護邏輯
});
```

### 權限系統設計
```typescript
// 三層權限架構
enum Role {
  OWNER = "OWNER",     // 球隊擁有者
  ADMIN = "ADMIN",     // 管理員  
  MEMBER = "MEMBER"    // 一般成員
}

// Infrastructure Layer 實作
class AuthorizationService {
  canAccessTeam(userId: string, teamId: string): boolean
  canModifyLineup(userId: string, teamId: string): boolean
  canDeleteMember(userId: string, targetMemberId: string): boolean
}
```

### 重構重點 (Epic 2)
- **Session 管理**: 優化 JWT 與資料庫同步
- **權限檢查**: 統一授權邏輯的實作位置
- **安全性**: Google OAuth 流程的安全強化

---
