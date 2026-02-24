# Requirements Checklist: 統一 Player 實體重構

**Purpose**: 驗證規格文件品質，確保所有必要元素完整且可實作
**Created**: 2025-12-18
**Feature**: [spec.md](../spec.md)

## Completeness

- [x] CHK001 包含所有必要章節（User Scenarios、Requirements、Success Criteria）
- [x] CHK002 每個 User Story 都有優先級標記（P1-P3）
- [x] CHK003 每個 User Story 都有獨立測試說明
- [x] CHK004 每個 User Story 都有 Acceptance Scenarios（Given/When/Then）
- [x] CHK005 包含 Edge Cases 區段
- [x] CHK006 包含 Key Entities 定義
- [x] CHK007 包含 Assumptions 區段

## User Stories Quality

- [x] CHK008 P1 故事可獨立交付價值（邀請成員、接受/拒絕邀請、查看成員列表）
- [x] CHK009 故事優先級排序合理（核心功能 P1 > 輔助功能 P2 > 次要功能 P3）
- [x] CHK010 每個故事都清楚說明 "Why this priority"
- [x] CHK011 Acceptance Scenarios 涵蓋正常流程和異常處理
- [x] CHK012 User Story 1-3 為 P1，可組成最小可行產品

## Requirements Quality

- [x] CHK013 功能需求使用 MUST/SHOULD 明確表達
- [x] CHK014 需求可追溯至對應的 User Story
- [x] CHK015 需求無內部矛盾
- [x] CHK016 需求技術中立（不指定實作細節）
- [x] CHK017 FR-001 至 FR-016 涵蓋所有核心功能

## Success Criteria Quality

- [x] CHK018 成功標準可量化測量（時間、完整性）
- [x] CHK019 成功標準涵蓋效能（SC-001 至 SC-003）
- [x] CHK020 成功標準涵蓋資料完整性（SC-004）
- [x] CHK021 成功標準涵蓋功能退化檢查（SC-005）
- [x] CHK022 成功標準涵蓋 API 遷移驗證（SC-006）

## Entity Design Quality

- [x] CHK023 Player 實體屬性定義完整（name, number, position, teamId, userId, email, role）
- [x] CHK024 PlayerRole 狀態機清晰（PENDING → MEMBER/ADMIN/OWNER 或 null）
- [x] CHK025 實體間關係明確（Player ↔ Team, Player ↔ User/Profile）
- [x] CHK026 與現有 Record 實體整合方案清晰（RecordPlayer 快照）

## Assumptions & Constraints

- [x] CHK027 明確聲明 _id → id 轉換延後處理
- [x] CHK028 明確聲明無需向後相容（0.x.x 版本）
- [x] CHK029 明確聲明邀請無過期機制
- [x] CHK030 明確聲明背號可重複
- [x] CHK031 明確區分純球員與系統成員的顯示邏輯

## Edge Cases Coverage

- [x] CHK032 多隊伍邀請場景
- [x] CHK033 未註冊使用者邀請場景
- [x] CHK034 使用者多隊伍成員資格場景
- [x] CHK035 隊伍刪除級聯處理
- [x] CHK036 使用者刪除關聯處理
- [x] CHK037 Player 刪除條件（無比賽紀錄）
- [x] CHK038 邀請拒絕/取消時保留 Player 記錄
- [x] CHK039 OWNER 權限獨立移轉

## Business Logic Validation

- [x] CHK040 US2 AS2: 拒絕邀請時保留 Player，僅清除 email（role 維持不變）
- [x] CHK041 US5: OWNER 和 ADMIN 都可修改成員角色與資訊
- [x] CHK042 US5: 角色選項不顯示 OWNER（需使用權限移轉功能）
- [x] CHK043 US5: ADMIN 可降級自己，OWNER 不可
- [x] CHK044 US6: OWNER 權限移轉可獨立於離隊使用
- [x] CHK045 US6: Player 只需無比賽紀錄即可刪除
- [x] CHK046 US6: 唯一成員（OWNER）離開時，比賽紀錄遷移至臨打球員，Team 和 Player 被刪除
- [x] CHK047 US7: 只對待處理邀請（email 存在但無 userId）的 Player 顯示取消邀請選項
- [x] CHK048 PlayerRole 不包含 PENDING，邀請狀態由 email/userId 欄位組合推斷
- [x] CHK049 role 只會受到權限調整而改變，不會因邀請拒絕/取消或離隊而改變
- [x] CHK050 邀請被接受後，email 欄位保留供聯絡使用

## Notes

- 所有檢查項目均通過驗證
- 規格文件品質符合實作標準
- 可進入下一階段：`/speckit.plan` 或 `/speckit.clarify`
