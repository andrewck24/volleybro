# Feature Specification: 統一 Player 實體重構

**Feature Branch**: `001-unify-player`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "實作隊伍邀請功能重構計畫並統一 Player 實體，不需要保留舊有的 route（因為目前是 0.x.x 階段，不需考慮向後相容），_id → id 轉換將於下一個 spec 進行"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 隊伍管理者邀請成員 (Priority: P1)

隊伍管理者（OWNER 或 ADMIN）可以透過 email 邀請其他使用者加入隊伍，並指定角色（MEMBER 或 ADMIN）。系統會建立一個帶有 email 但無 userId 的 Player 記錄，並通知被邀請者。

**Why this priority**: 邀請功能是團隊協作的核心入口，沒有此功能則無法擴展隊伍成員。

**Independent Test**: 可透過建立隊伍後發送邀請，驗證邀請記錄是否正確建立且被邀請者能看到邀請通知。

**Acceptance Scenarios**:

1. **Given** 使用者 A 是隊伍 X 的 OWNER，**When** A 輸入 B 的 email 並選擇角色 MEMBER 送出邀請，**Then** 系統建立 Player 記錄（teamId=X, email=B, role=MEMBER, userId=null）
2. **Given** 使用者 A 是隊伍 X 的 ADMIN，**When** A 嘗試邀請 B，**Then** 系統成功建立邀請
3. **Given** 使用者 A 是隊伍 X 的 MEMBER，**When** A 嘗試邀請 B，**Then** 系統拒絕並顯示權限不足
4. **Given** B 已經是隊伍 X 的成員（userId 已存在），**When** A 嘗試邀請 B，**Then** 系統顯示該使用者已是成員
5. **Given** B 已有待處理邀請在隊伍 X（email 存在但無 userId），**When** A 嘗試再次邀請 B，**Then** 系統顯示已存在待處理邀請

---

### User Story 2 - 使用者接受或拒絕邀請 (Priority: P1)

被邀請的使用者可以查看所有待處理的邀請（email 存在但無 userId 的 Player），並選擇接受或拒絕。接受後，Player 記錄關聯 userId。

**Why this priority**: 與邀請功能互補，完成邀請流程的閉環。

**Independent Test**: 可透過接受一個邀請，驗證 Player 記錄狀態正確更新且使用者能存取隊伍資源。

**Acceptance Scenarios**:

1. **Given** 使用者 B 有一個來自隊伍 X 的待處理邀請（email=B, userId=null），**When** B 選擇接受，**Then** Player 記錄設定 userId=B（role 維持不變）
2. **Given** 使用者 B 有一個來自隊伍 X 的待處理邀請，**When** B 選擇拒絕，**Then** Player 記錄的 email 欄位清空（role 維持不變）
3. **Given** 使用者 B 沒有任何邀請，**When** B 查看邀請列表，**Then** 系統顯示空列表
4. **Given** 使用者 B 有多個隊伍的邀請，**When** B 查看邀請列表，**Then** 系統顯示所有待處理邀請（email=B 且 userId=null）

---

### User Story 3 - 查看隊伍成員列表 (Priority: P1)

隊伍成員可以查看隊伍中所有球員和成員的列表，包括其角色（OWNER/ADMIN/MEMBER）和球員資訊（姓名、背號、位置）。

**Why this priority**: 成員列表是隊伍管理的基礎視圖，支援後續的角色管理和陣容安排。

**Independent Test**: 可透過查看隊伍成員頁面，驗證所有成員和球員資訊正確顯示。

**Acceptance Scenarios**:

1. **Given** 使用者是隊伍成員，**When** 查看成員列表，**Then** 系統顯示所有 Player（已加入成員、待處理邀請、純球員）
2. **Given** 隊伍有待處理邀請（email 存在但無 userId），**When** OWNER 查看邀請中成員頁面，**Then** 系統顯示待處理邀請（可選擇取消）
3. **Given** 隊伍有不同角色的成員，**When** 查看成員列表，**Then** 系統正確顯示每個成員的角色

---

### User Story 4 - 新增純球員（非系統使用者）(Priority: P2)

隊伍管理者可以新增不需要系統帳號的球員（如對手球員、借將），這些球員只有基本資訊（姓名、背號、位置）和角色，沒有 userId 和 email。

**Why this priority**: 支援比賽紀錄中的對手球員和臨時球員，但不影響核心邀請流程。

**Independent Test**: 可透過新增一個純球員，驗證 Player 記錄正確建立且可在陣容中使用。

**Acceptance Scenarios**:

1. **Given** 使用者是隊伍 OWNER 或 ADMIN，**When** 新增球員（name, number, position, role=MEMBER），**Then** 系統建立 Player 記錄（teamId 設定，無 userId、無 email）
2. **Given** 隊伍已有背號 10 的球員，**When** 嘗試新增另一個背號 10 的球員，**Then** 系統允許（背號可重複）
3. **Given** 新增的純球員，**When** 該球員被加入陣容，**Then** 陣容正確引用該 Player

---

### User Story 5 - 管理成員角色與資訊 (Priority: P2)

OWNER 和 ADMIN 可以調整成員的角色（MEMBER ↔ ADMIN）和基本資訊。OWNER 不能降級自己，但 ADMIN 可以。角色選擇畫面中不會有 OWNER 選項（需使用獨立的權限移轉功能）。

**Why this priority**: 角色管理是進階功能，核心流程不依賴此功能。

**Independent Test**: 可透過將 MEMBER 升級為 ADMIN，驗證角色更新正確且權限生效。

**Acceptance Scenarios**:

1. **Given** 使用者 A 是 OWNER 或 ADMIN，**When** A 將成員 B 從 MEMBER 升為 ADMIN，**Then** B 的 role 更新為 ADMIN
2. **Given** 使用者 A 是 OWNER 或 ADMIN，**When** A 查看成員的角色選項，**Then** 系統只顯示 MEMBER 和 ADMIN 選項（不顯示 OWNER）
3. **Given** 使用者 A 是 OWNER，**When** A 嘗試將自己降級，**Then** 系統拒絕（OWNER 不能降級自己）
4. **Given** 使用者 A 是 ADMIN，**When** A 將自己降級為 MEMBER，**Then** A 的 role 更新為 MEMBER
5. **Given** 使用者 A 是 OWNER 或 ADMIN，**When** A 修改成員 B 的球員資訊（name、number、position），**Then** 系統更新 Player 記錄

---

### User Story 6 - 解除成員連結與權限移轉 (Priority: P2)

成員可以主動「離開隊伍」（解除 userId 與 Player 的連結），但 Player 記錄本身會保留（除非該 Player 無任何關聯的 userId 且無比賽紀錄）。OWNER 可以隨時將 OWNER 權限移轉給其他 ADMIN 或 MEMBER，此功能可獨立於離隊使用。

**Why this priority**: 成員流動管理，非核心但必要。

**Independent Test**: 可透過解除成員連結，驗證該使用者無法再存取隊伍管理功能，但 Player 資料保留。

**Acceptance Scenarios**:

1. **Given** 使用者 A 是 OWNER，**When** A 選擇移轉 OWNER 權限給成員 B，**Then** B 的 role 更新為 OWNER，A 的 role 更新為 ADMIN
2. **Given** 使用者 B 是 MEMBER，**When** B 選擇離開隊伍，**Then** B 的 Player.userId 被清空（role 維持不變，Player 記錄保留）
3. **Given** 使用者 A 是 OWNER 且隊伍有其他成員，**When** A 嘗試離開，**Then** 系統要求先轉移 OWNER 權限
4. **Given** 使用者 A 是隊伍唯一成員（OWNER），**When** A 選擇離開，**Then** 系統將該隊伍的比賽紀錄遷移至 A 的臨打球員（建立無 teamId 的 Player），並刪除 Team 和相關 Player
5. **Given** Player X 沒有任何比賽紀錄，**When** OWNER 或 ADMIN 查看 Player X，**Then** 系統顯示刪除選項
6. **Given** Player X 有比賽紀錄，**When** OWNER 或 ADMIN 查看 Player X，**Then** 系統不顯示刪除選項

---

### User Story 7 - 取消邀請 (Priority: P3)

OWNER 或 ADMIN 可以取消尚未被接受的邀請（email 存在但無 userId 的 Player）。取消邀請會清空 Player 的 email 資訊。

**Why this priority**: 輔助功能，處理錯誤邀請的情況。

**Independent Test**: 可透過取消一個待處理邀請，驗證 Player 的邀請狀態被清除且被邀請者不再看到該邀請。

**Acceptance Scenarios**:

1. **Given** 隊伍 X 有一個待處理邀請給 B（email=B, userId=null），**When** OWNER 取消邀請，**Then** Player 記錄的 email 欄位清空（role 維持不變，Player 記錄保留）
2. **Given** B 已接受邀請（userId 已存在），**When** OWNER 查看成員 B，**Then** 系統不顯示「取消邀請」選項（僅待處理邀請才顯示）

---

### UX Feedback

- 邀請發送成功、接受、拒絕等操作完成後，使用 Toast 通知回饋（desktop 右上角；mobile 正上方）
- 成員角色調整與權限移轉操作入口位於成員詳情頁的次級操作區（下拉選單或底部操作列），僅 OWNER 和 ADMIN 可見

### Edge Cases

- 使用者同時收到多個隊伍的邀請時，每個邀請獨立處理
- 被邀請者的 email 對應的使用者尚未註冊時，邀請記錄保留 email，待使用者註冊後自動關聯
- 一個使用者可同時在多個隊伍擔任不同角色（每個隊伍有獨立的 Player 記錄）
- 隊伍被刪除時，所有相關 Player 記錄應一併刪除
- 使用者帳號被刪除時，其 Player 記錄的 userId 應清空（保留球員資料但解除關聯）
- Player 記錄只有在「無比賽紀錄」時才能被刪除
- 邀請被拒絕或取消時，Player 記錄保留，僅清除 email（role 維持不變，轉為純球員狀態）
- OWNER 可在不離隊的情況下將權限移轉給其他成員
- 唯一成員（OWNER）離開隊伍時，系統會將比賽紀錄遷移至該使用者的臨打球員（無 teamId 的 Player），並刪除 Team 和相關 Player

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 支援建立統一的 Player 實體，包含 name（必填）、number、position、teamId、userId、email、role 欄位（除 name 外皆可選）
- **FR-002**: 系統 MUST 支援三種 PlayerRole：MEMBER（一般成員）、ADMIN（管理員）、OWNER（擁有者）
- **FR-003**: 系統 MUST 允許 OWNER 和 ADMIN 透過 email 邀請使用者加入隊伍，並指定角色（MEMBER 或 ADMIN）
- **FR-004**: 系統 MUST 允許被邀請者接受或拒絕邀請
- **FR-005**: 系統 MUST 在邀請被接受時，關聯 userId（role 維持不變）
- **FR-006**: 系統 MUST 在邀請被拒絕或取消時，清空 email（role 維持不變，保留 Player 記錄）
- **FR-007**: 系統 MUST 允許新增純球員（無 userId、無 email，有 role）供比賽紀錄使用
- **FR-008**: 系統 MUST 允許 OWNER 和 ADMIN 修改成員的角色與資訊
- **FR-009**: 系統 MUST 確保每個隊伍只有一個 OWNER
- **FR-010**: 系統 MUST 允許 OWNER 獨立移轉 OWNER 權限給其他成員（不需要離隊）
- **FR-011**: 系統 MUST 允許成員主動離開隊伍（解除 userId 與 Player 的連結，role 維持不變，保留 Player 記錄）
- **FR-012**: 系統 MUST 只在 Player「無比賽紀錄」時才允許刪除
- **FR-013**: 系統 MUST 只對待處理邀請（email 存在但無 userId）的 Player 顯示「取消邀請」選項
- **FR-014**: 系統 MUST 在移除 Team.members[] 和 Profile.teams 後，透過 Player 實體查詢使用者的隊伍和邀請
- **FR-015**: 系統 MUST 保持現有陣容（Lineup）和比賽紀錄（Record）功能正常運作
- **FR-016**: 系統 MUST 提供資料遷移腳本，將舊資料結構轉換為新的 Player 實體
- **FR-017**: 系統 MUST 在唯一成員（OWNER）離開隊伍時，將比賽紀錄遷移至該使用者的臨打球員（無 teamId 的 Player），並刪除 Team 和相關 Player

### Key Entities

- **Player**: 統一實體，代表隊伍中的球員或成員。關鍵屬性：
  - name（姓名，必填）
  - number（背號，可選）
  - position（位置，可選，預定義值：S/OH/OP/MB/L）
  - teamId（所屬隊伍，可選，無 teamId 表示臨打球員）
  - userId（關聯使用者，可選，已加入成員才有）
  - email（邀請/聯絡 email，可選，邀請時設定，接受後保留）
  - role（隊伍角色：MEMBER/ADMIN/OWNER，可選，臨打球員為 null）
  - 成員狀態推斷：邀請中 = `email 存在 && userId 不存在`；已加入 = `userId 存在`；純球員 = `email 不存在 && userId 不存在`
- **Team**: 代表一個排球隊伍。移除 members[] 嵌入陣列，透過 Player 查詢成員
- **Profile**: 代表使用者的業務資料。移除 teams 欄位，透過 Player 查詢所屬隊伍和邀請
- **Record**: 比賽紀錄，內嵌 RecordPlayer（Player 的快照，包含比賽統計）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可在 5 秒內完成發送邀請流程
- **SC-002**: 使用者可在 3 秒內查看並響應所有待處理邀請
- **SC-003**: 隊伍成員列表載入時間不超過 2 秒
- **SC-004**: 資料遷移完成後，所有現有隊伍的成員關係保持完整，無資料遺失
- **SC-005**: 現有的陣容安排和比賽紀錄功能在重構後正常運作，無功能退化
- **SC-006**: 移除舊的 API endpoints 後，所有相關功能透過新 API 正常運作
- **SC-007**: 系統正確處理一個使用者同時在多個隊伍的場景

## Clarifications

### Session 2025-12-20

- Q: Player 的 `position` 欄位應採用何種定義方式？ → A: 預定義排球位置清單（S/OH/OP/MB/L）
- Q: 邀請發送成功後，系統應如何通知發送者？ → A: Toast 通知（desktop 右上角；mobile 正上方）
- Q: 被邀請者登入後，如何得知有待處理的邀請？ → A: 僅在「我的邀請」頁面顯示，無主動提示（待通知功能開發後改為底部導航欄顯示徽章）
- Q: 資料遷移腳本的執行策略為何？ → A: 單次執行腳本，完整遷移所有資料
- Q: 成員角色調整與權限移轉的操作入口應放置於何處？ → A: 成員詳情頁的次級操作區（下拉/底部），僅 OWNER 和 ADMIN 可見編輯選項

## Assumptions

- 本次重構不處理 `_id` → `id` 的全域轉換，將在下一個 spec 中進行
- 不需要保留舊有的 API routes，因為目前是 0.x.x 版本階段
- 邀請不設過期機制，邀請將永久有效直到被接受或拒絕
- 背號（number）允許重複，系統不強制唯一性
- 純球員（無 userId 且無 email）不會出現在「邀請列表」或「成員列表」中，只在「球員名單」中顯示
- 邀請被接受後，email 欄位保留供聯絡使用
- role 只會受到權限調整而改變，不會因邀請拒絕/取消或離隊而改變
