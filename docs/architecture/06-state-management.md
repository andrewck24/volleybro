# 🔄 狀態管理策略

## 混合狀態管理架構

### Redux Toolkit 使用場景
```typescript
// 複雜業務邏輯狀態
- record-slice.ts     // 即時比賽紀錄狀態
- lineup-slice.ts     // 球隊陣容配置
- global-slice.ts     // 全域應用狀態
```

### SWR 使用場景  
```typescript
// 服務端狀態管理
- 用戶資料同步
- 球隊列表獲取  
- 歷史比賽查詢
- API 快取策略
```

### 設計理由與整合

**為什麼採用混合策略？**
1. **複雜度分離**: Redux 處理需要複雜邏輯的狀態
2. **效能最佳化**: SWR 自動處理快取和重新驗證
3. **開發體驗**: 各自在適合的場景發揮優勢

**未來重構考量 (Epic 4)**:
- 評估 Redux 使用複雜度是否合理
- 考慮 SWR mutations 替代部分 Redux actions
- 統一錯誤處理機制

---
