# 🔧 依賴注入架構

## InversifyJS 容器設計

### 當前 DI 容器結構
```typescript
// src/infrastructure/di/inversify.config.ts
container.bind<IUserRepository>(TYPES.UserRepository)
  .to(UserRepositoryImpl);

container.bind<FindRecordUseCase>(TYPES.FindRecordUseCase)  
  .to(FindRecordUseCase);
```

### DI 使用場景分析
```text
✅ 已實現 DI 的模組:
- Repository Layer (User, Team, Record)
- Authentication/Authorization Services  
- Record-related Use Cases (7 個 use cases)

🤔 未使用 DI 的區域:
- Frontend Components (直接 import)
- API Controllers (部分使用)
- Utility Functions (無狀態函數)
```

### 重構考量 (Epic 2-5)
1. **DI 使用一致性**: 是否所有 Use Cases 都需要 DI？
2. **容器生命週期**: 是否需要 scoped 生命週期管理？
3. **測試友善性**: Mock 策略與 DI 的整合

---
