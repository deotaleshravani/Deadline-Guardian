# Firebase Security Specification: Deadline Guardian

This document defines the security boundaries, data invariants, and verification criteria for Firestore access within the Deadline Guardian application.

## 1. Data Invariants

- **User Preferences**: Every user must have a profile under `users/{userId}` containing their name, role, and productivity score. Users can only read and write their own profile.
- **Tasks**: Tasks under `users/{userId}/tasks/{taskId}` must belong to the active user. They must have a valid non-empty title, a valid deadline string, and a status within `['pending', 'in_progress', 'completed']`.
- **Goals**: Goals under `users/{userId}/goals/{goalId}` must have a progress integer between `0` and `100`.
- **Habits**: Habits under `users/{userId}/habits/{habitId}` must track completion frequency ('daily' or 'weekly') and streaks.
- **AI Recommendations**: Recommendations under `users/{userId}/recommendations/{recId}` are primarily system-generated advice. The user can view them or update their status to `'dismissed'` or `'applied'`, but they cannot create or inject arbitrary recommendations.
- **Chat History (AI History)**: Messages under `users/{userId}/chatHistory/{messageId}` store conversational logs with the AI accountability partner. Messages must be strictly owned by the user, and the incoming role must be either `'user'` or `'model'`.

---

## 2. The "Dirty Dozen" Payloads

These payloads represent attempts to violate the security invariants and must be strictly denied by the Firestore security rules.

### Payload 1: Identity Spoofing on Profile Create
An attacker attempts to create/overwrite a profile belonging to a different user.
- **Path**: `/users/victim_user_123`
- **Request Auth**: `{ uid: "attacker_user_789", token: { email: "attacker@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "name": "Attacker Spoof",
    "role": "professional",
    "productivityScore": 99,
    "email": "victim@gmail.com"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Write to Task under other User's subcollection
An attacker tries to create a task in a victim's task list.
- **Path**: `/users/victim_user_123/tasks/task_abc`
- **Request Auth**: `{ uid: "attacker_user_789" }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "title": "Malicious Task",
    "deadline": "2026-12-31",
    "priority": "high",
    "category": "personal",
    "status": "pending",
    "subtasks": []
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Privilege Escalation on Profile Settings (Unverified Email)
A user with an unverified email attempts to register or modify a profile when email verification is required.
- **Path**: `/users/unverified_user_111`
- **Request Auth**: `{ uid: "unverified_user_111", token: { email: "unverified@gmail.com", email_verified: false } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "name": "Unverified User",
    "role": "student",
    "productivityScore": 75,
    "email": "unverified@gmail.com"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED` (Unless the application explicitly supports anonymous or unverified temporary access; we allow verified-only for full operations).

### Payload 4: Invalid Status Enum in Tasks
A user attempts to set a task status to an arbitrary string not in the enum.
- **Path**: `/users/user_abc/tasks/task_123`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "title": "Invalid Task",
    "deadline": "2026-06-30",
    "priority": "medium",
    "category": "professional",
    "status": "hacking_the_status_field",
    "subtasks": []
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Value Poisoning on Goals Progress
A user attempts to set a goal progress value outside the bounds of 0-100.
- **Path**: `/users/user_abc/goals/goal_123`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "title": "My Goal",
    "targetDate": "2026-06-30",
    "progress": 999,
    "linkedTasks": []
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 6: Garbage ID Poisoning (Denial of Wallet)
An attacker attempts to write to a document with a massive ID to bloat index sizes and cause cost issues.
- **Path**: `/users/user_abc/tasks/VERY_LONG_ID_THAT_EXCEEDS_128_CHARACTERS_AND_CONTAINS_ILLEGAL_SYMBOLS_!!!!!!!!!!!_...`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "title": "Legit Title",
    "deadline": "2026-06-30",
    "priority": "low",
    "category": "personal",
    "status": "pending",
    "subtasks": []
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Shadow Update / Extra Field injection
An attacker attempts to inject a ghost field during a task update to store unvalidated payload keys.
- **Path**: `/users/user_abc/tasks/task_123`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `update`
- **Payload**:
  ```json
  {
    "title": "New Title",
    "ghostField": "injected_data"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED` (Unless explicitly allowed in key updates schema).

### Payload 8: Immutable Field Modification (createdAt)
An attacker attempts to modify `createdAt` or `id` fields of a task that are immutable.
- **Path**: `/users/user_abc/tasks/task_123`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `update`
- **Payload**: (Assuming original `createdAt` is `2026-01-01T00:00:00.000Z`)
  ```json
  {
    "createdAt": "2020-01-01T00:00:00.000Z"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 9: Blanket Query / Unauthorized List scraping
An attacker attempts to execute a blanket query to read all users' preferences without matching their own userId.
- **Path**: `/users` (list operation)
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `list`
- **Expected Result**: `PERMISSION_DENIED`

### Payload 10: Injecting Arbitrary AI Recommendations
A user attempts to create their own custom high-priority recommendations.
- **Path**: `/users/user_abc/recommendations/fake_rec`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "type": "risk",
    "title": "Fake System Recommendation",
    "description": "User injected this",
    "status": "active",
    "createdAt": "2026-06-23T17:00:00Z"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED` (System-only fields / creation forbidden for client SDKs).

### Payload 11: Invalid Message Role in Chat History
A user attempts to store a chat message with a role of `"admin"` or `"system"`.
- **Path**: `/users/user_abc/chatHistory/msg_123`
- **Request Auth**: `{ uid: "user_abc", token: { email: "abc@gmail.com", email_verified: true } }`
- **Action**: `create`
- **Payload**:
  ```json
  {
    "role": "hacker",
    "text": "Injected message",
    "timestamp": "2026-06-23T17:00:00Z"
  }
  ```
- **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Terminated Goal Progress Update
Attempting to update progress or details on a Terminated / locked goal without admin overrides (if applicable).
(For simplicity, we prevent non-owners or invalid schema updates on goals).
- **Expected Result**: `PERMISSION_DENIED`

---

## 3. Test Runner & Verification

All of the above payloads will be tested against the generated `firestore.rules`. Any bypass represents an insecure configuration that must be corrected.
