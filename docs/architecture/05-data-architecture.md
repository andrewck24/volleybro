# 💾 資料架構與決策

## MongoDB 資料模型設計

### 設計原則：Embedded Documents Strategy

```javascript
// Record Collection - 核心設計
{
  _id: ObjectId,
  matchInfo: {
    title: String,
    date: Date,
    location: String
  },
  teams: {
    ours: {
      name: String,
      members: [MemberSchema]  // 嵌入文檔
    },
    opponents: { ... }
  },
  sets: [{
    rallies: [RallySchema],      // 嵌入陣列
    substitutions: [SubSchema]   // 嵌入陣列
  }]
}
```

### 🔍 MongoDB vs PostgreSQL 檢討要點

**MongoDB 優勢 (目前架構)**:
- ✅ **排球數據特性匹配**: 比賽紀錄天然的層次結構
- ✅ **讀取效能**: 單一查詢獲取完整比賽數據
- ✅ **開發速度**: Mongoose ODM 與 TypeScript 整合良好
- ✅ **彈性 Schema**: 適合排球規則變化

**PostgreSQL 考量點**:
- ⚠️ **ACID 特性**: 更強的數據一致性
- ⚠️ **複雜查詢**: SQL 在統計分析上的優勢  
- ⚠️ **生態系統**: 更豐富的分析工具
- ⚠️ **水平擴展**: 需要更多架構考量

**決策建議時機**: Epic 5 (數據分析系統重構) 完成後，基於實際查詢模式和效能數據做評估。

## 核心實體關係

```text
User (1) -----> (*) Team -----> (*) Member
 │                │                 │
 └─── teams       └─── members      └─── team_id
     (embedded)       (embedded)         (reference)
     
Record (1) -----> (*) Set -----> (*) Rally
   │                 │              │
   └─── sets         └─── rallies   └─── player stats
       (embedded)        (embedded)      (embedded)
```

---
