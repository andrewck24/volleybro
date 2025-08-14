# Epic 7: Clean Architecture 資料持久層轉接器實作

**Epic目標**: 實作符合 Clean Architecture 原則的資料持久層轉接器（Persistence Adapter），消除基礎設施洩露問題，並建立健全的 Domain-Database 映射模式，基於 Issue #239 的暫時修復進行架構性改善。

**功能範圍**: 
- Domain-Database 映射層建置（User, Team, Record 實體）
- Repository 實作強化與 Mapper 模式導入
- NextAuth 整合架構改善
- 全面性資料轉換流程建立

**整合需求**:
- 基於現有 InversifyJS DI 容器進行擴展
- 維持現有 API 契約不變，改善內部資料流
- 運用現有 Repository 介面，強化實作品質
- 保留現有 Domain 實體設計，新增適當映射機制

**背景脈絡**: 
Issue #239 揭露關鍵架構缺陷：MongoDB ObjectIds 未正確轉換為 Domain 層適用的字串格式，導致生產環境 CastError 錯誤。雖然 PR #240 在 NextAuth callbacks 中提供緊急修復，但這凸顯了需要建立適當 Persistence Adapters 遵循 Clean Architecture 原則的重要性。

## Story 7.1: 實作 Domain-Database Mappers 與 ObjectId 字串轉換機制

作為 **系統架構師**，
我想要 **為 User、Team、Record 實體建立完整的 Domain-Database 映射器，並實現全面的 ObjectId 字串轉換**，
所以 **可以消除基礎設施洩露問題，確保 Domain 層的純淨性和型別安全**。

### 接受條件

1. **UserMapper 實作**：
   - 實作 `toDomain()` 方法：UserDocument → User 實體轉換
   - 實作 `toDatabase()` 方法：User 實體 → UserDocument 轉換
   - 確保 `teams.joined` 和 `teams.inviting` ObjectId 陣列正確轉換為字串陣列
   - 處理 `_id` 欄位的 ObjectId 到 string 轉換

2. **TeamMapper 實作**：
   - 實作完整的 Team 實體雙向轉換
   - 處理 members 陣列中的 ObjectId 參照
   - 確保所有相關聯 ObjectId 正確序列化

3. **RecordMapper 實作**：
   - 實作 Record 實體與 RecordDocument 的映射
   - 處理巢狀結構中的 ObjectId 轉換
   - 維持現有資料結構完整性

4. **型別安全保證**：
   - 完整的 TypeScript 型別定義
   - 編譯時期型別檢查通過
   - 無任何 `any` 型別使用

5. **單元測試覆蓋**：
   - 每個 Mapper 達到 100% 測試覆蓋率
   - 邊界條件和錯誤處理測試
   - ObjectId 轉換正確性驗證

### 技術規格

```typescript
// src/infrastructure/mappers/user.mapper.ts
export class UserMapper {
  static toDomain(userDoc: UserDocument): User {
    return {
      _id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      teams: {
        joined: userDoc.teams.joined.map(id => id.toString()),
        inviting: userDoc.teams.inviting.map(id => id.toString())
      },
      // ... 其他屬性
    };
  }
  
  static toDatabase(user: User): Partial<UserDocument> {
    return {
      name: user.name,
      email: user.email,
      teams: {
        joined: user.teams.joined.map(id => new ObjectId(id)),
        inviting: user.teams.inviting.map(id => new ObjectId(id))
      }
    };
  }
}
```

## Story 7.2: Repository 實作重構與 Auth Adapter 整合

作為 **後端開發工程師**，
我想要 **重構 Repository 實作以使用 Mappers，並建立 NextAuth 的 Auth Adapter 模式**，
所以 **可以確保所有資料存取都經過適當轉換，且認證系統與 Clean Architecture 原則對齊**。

### 接受條件

1. **Repository 重構**：
   - `UserRepositoryMongo` 使用 `UserMapper` 進行所有資料轉換
   - `TeamRepositoryMongo` 整合 `TeamMapper` 
   - `RecordRepositoryMongo` 實作完整映射機制
   - 所有 Repository 方法回傳正確的 Domain 實體

2. **Auth Adapter 建立**：
   - 建立 `AuthAdapter` 類別封裝認證相關資料存取
   - 透過 Repository 模式存取使用者資料
   - 提供 `getUserForSession()` 等認證專用方法
   - 整合至 InversifyJS DI 容器

3. **NextAuth 整合改善**：
   - 修改 `auth.config.ts` 使用 `AuthAdapter`
   - 移除直接的資料庫存取
   - 確保所有使用者資料都經過 Domain 轉換
   - 保持與 PR #240 的向後相容性

4. **依賴注入配置**：
   - 在 DI 容器中註冊新的 Adapter 和 Mapper
   - 建立適當的依賴關係
   - 確保測試環境可用性

5. **整合測試**：
   - NextAuth 認證流程完整測試
   - Repository 資料轉換驗證
   - Auth Adapter 功能測試

### 技術規格

```typescript
// src/infrastructure/auth/auth-adapter.ts
export class AuthAdapter {
  constructor(private userRepo: UserRepositoryInterface) {}
  
  async getUserForSession(email: string): Promise<User | null> {
    return await this.userRepo.findByEmail(email);
  }
}

// auth.config.ts 整合
const authAdapter = container.get<AuthAdapter>(TYPES.AuthAdapter);

callbacks: {
  async jwt({ token, user }) {
    if (user?.email) {
      const domainUser = await authAdapter.getUserForSession(user.email);
      if (domainUser) {
        token.id = domainUser._id;
        token.teams = domainUser.teams; // 已經是 string[]
      }
    }
    return token;
  }
}
```

## Story 7.3: API 路由遷移與全面性測試建置

作為 **全端開發工程師**，
我想要 **將所有 API 路由遷移至使用強化的 Repository 模式，並建立全面性的測試覆蓋**，
所以 **可以確保整個系統都受益於新的 Persistence Adapter 架構，並永久解決 Issue #239 的根本原因**。

### 接受條件

1. **API 路由遷移**：
   - `/api/users` 路由使用 UserRepository 而非直接資料庫存取
   - `/api/teams/[teamId]` 路由實作完整的 Repository 模式
   - `/api/teams/[teamId]/members` 等相關路由更新
   - 所有路由確保 ObjectId 正確處理

2. **錯誤處理強化**：
   - 統一的錯誤處理機制
   - ObjectId 驗證和轉換錯誤處理
   - 適當的 HTTP 狀態碼回應
   - 錯誤日誌記錄改善

3. **效能最佳化**：
   - Repository 層面的快取策略
   - 資料庫查詢最佳化
   - Mapper 效能基準測試
   - 記憶體使用效率驗證

4. **回歸測試套件**：
   - Issue #239 相關情境的專門測試
   - 所有現有功能的回歸測試
   - 整合測試覆蓋主要使用者流程
   - 效能回歸測試

5. **文件更新**：
   - Repository 使用指南
   - Mapper 模式文件
   - API 路由變更說明
   - 故障排除指南

### 驗證標準

1. **Issue #239 根本解決**：
   - 首頁比賽紀錄正常顯示
   - 隊伍頁面載入無錯誤
   - 生產環境穩定性確認
   - 無 ObjectId 相關 CastError

2. **架構品質提升**：
   - Clean Architecture 合規性 100%
   - 基礎設施洩露完全消除
   - 型別安全性全面保障
   - 測試覆蓋率 ≥ 95%

## 相容性需求

- [x] 現有 API 保持不變（Domain 契約保留）
- [x] 資料庫架構變更向後相容（無架構變更）
- [x] UI 變更遵循現有模式（無需 UI 變更）
- [x] 效能影響最小化（映射操作輕量化）

## 風險緩解

**主要風險**: 資料轉換錯誤可能導致生產故障或資料不一致

**緩解措施**:
- 所有 Mappers 的全面單元測試
- 從非關鍵路徑開始的漸進式推出
- 預備環境的平行測試
- 詳細的錯誤日誌記錄和監控

**回退計畫**:
- 新 Repository 實作的功能標誌
- 原始 Repository 程式碼保留作為備援
- 資料庫保持不變，支援立即回退
- PR #240 修復提供基線穩定性

## 完成定義

- [x] 所有 Stories 完成且滿足接受條件
- [x] 現有功能透過回歸測試驗證
- [x] 整合點正確運作且 ObjectId 處理無誤
- [x] Mapper 模式文件更新
- [x] 現有功能無回歸問題
- [x] Issue #239 根本原因透過架構改善永久解決

## 附加脈絡

**參考 Issues:**
- 解決 Issue #239 暴露的架構債務
- 基於 PR #240 的暫時修復進行改善
- 為未來 Clean Architecture 合規性做準備

**技術階段:**
- Phase 2: Domain-Database 映射基礎建設 (Story 7.1)
- Phase 3: Repository 和 Auth 整合 (Story 7.2)
- Phase 4: API 遷移和測試 (Story 7.3)

**長期效益:**
- 提升系統可維護性和可測試性
- 建立可擴展的資料存取模式
- 為未來功能開發奠定堅實基礎
- 確保 Clean Architecture 原則的完整實踐