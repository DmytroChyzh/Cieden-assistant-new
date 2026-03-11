# CamelCase Tool Schema Rollout Plan
## Zero-Risk, Research-First Implementation Plan

**Goal**: Standardize all ElevenLabs agent tools and client handlers to use camelCase exclusively, eliminating schema drift and preventing regressions.

**Scope**:
- Agent tool configs: `tool_configs/*.json`, `tools.json`
- Client handlers: `app/voice-chat/page.tsx`, `src/utils/toolBridge.ts`
- Quiz state management: `src/components/quiz/QuizProvider.tsx`
- Push mechanism: ElevenLabs Agent CLI skill (`agents tools push`)

**Assumptions**:
- `ELEVENLABS_API_KEY` and `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` are configured
- Dev server runs at `localhost:3000`
- Convex dev is running in separate terminal
- We have access to `/orchestration/tools` test page

---

## Phase 0: Complete Research & Baseline Catalog

### 0.1 Current State Verification ✅ COMPLETED

**Tools Requiring Fixes (4):**

1. **show_savings_goal.json**
   - ❌ Required: `["deadline", "currentSavings", "monthlyTarget", "goalAmount", "goalName"]` (camelCase)
   - ❌ Properties: `current_savings, monthly_target, goal_amount, goal_name, deadline` (snake_case)
   - **Fix**: Change all properties to camelCase

2. **show_loans.json**
   - ❌ Required: `["totalLoans"]` (camelCase)
   - ❌ Properties: `total_loans` (snake_case)
   - **Fix**: Change property to `totalLoans`

3. **show_lending_options.json**
   - ❌ Required: `["loanAmount"]` (camelCase)
   - ❌ Properties: `loan_amount` (snake_case)
   - **Fix**: Change to `loanAmount` OR remove from required (handler generates demo data)

4. **show_document_id.json**
   - ✅ Required: `[]` (empty - correct)
   - ❌ Properties: `"1"` (numeric key - invalid)
   - **Fix**: Change to `documentId` (string, optional)

**Tools Already Correct (7):**
- ✅ update_quiz.json: `selectedValue, questionId, action`
- ✅ start_quiz.json: `quizId`
- ✅ show_balance.json: `balance`
- ✅ show_credit_score.json: `score`
- ✅ show_emi_info.json: empty params (correct)
- ✅ create_pie_chart.json: `title, data`
- ✅ create_bar_chart.json: `title, data`

**Chart Tools Decision:**
- `create_pie_chart` and `create_bar_chart` are used via CopilotKit actions (not ActionHandlers)
- ✅ KEEP them in agent tools
- ⚠️ They won't have ActionHandlers (this is expected and correct)

### 0.2 Client Handler Verification ✅ COMPLETED

**toolBridge.ts interfaces:**
- All interfaces use camelCase (BalanceParams, SavingsGoalParams, LoansParams, etc.)
- All validators expect camelCase

**app/voice-chat/page.tsx handlers:**
- All handlers read camelCase params
- ⚠️ `update_quiz` handler has backwards compatibility: `(params as any).questionId ?? (params as any).question_id`
- ⚠️ `start_quiz` handler has backwards compatibility: `(params as any).quiz_id || (params as any).quizId`

**QuizProvider.tsx:**
- ⚠️ Line 193: `const questionId = data.questionId || data.question_id;`
- ⚠️ Line 194: `const selectedValue = data.selectedValue || data.selected_value;`
- Has deduplication logic to prevent message replays

### 0.3 Risk Assessment

**High Risk:**
1. ❌ Existing Convex messages with snake_case params might break UI rendering
   - **Mitigation**: Keep backwards compatibility until Phase 7
2. ❌ In-flight sessions during deployment could send snake_case
   - **Mitigation**: Deploy during low-traffic window, test thoroughly first
3. ❌ Agent and client out of sync during rollout
   - **Mitigation**: Test locally before pushing to agent

**Medium Risk:**
1. ⚠️ Quiz auto-advance might break if params change
   - **Mitigation**: Test quiz flow end-to-end before removing compatibility
2. ⚠️ Chart tools might fail if agent calls them
   - **Mitigation**: Document that chart tools are CopilotKit-only

**Low Risk:**
1. ✓ Most tools already use camelCase
2. ✓ TypeScript interfaces will catch type errors at compile time

### 0.4 Backup Strategy

**Files to backup:**
```bash
# Create backup directory
mkdir -p backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)

# Backup tool configs
cp tools.json backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)/
cp -r tool_configs backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)/

# Backup client files (for safety)
cp app/voice-chat/page.tsx backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)/
cp src/components/quiz/QuizProvider.tsx backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)/
```

**Rollback procedure:**
```bash
# Restore from backup
BACKUP_DIR="backups/camelcase-rollout-TIMESTAMP"
cp $BACKUP_DIR/tools.json .
cp -r $BACKUP_DIR/tool_configs .

# Re-push original configs to agent
agents tools push --agent "Support agent" --tools-file ./tools.json --config-dir ./tool_configs
```

---

## Phase 1: Create Baseline Snapshot

### 1.1 Backup Current State

**Actions:**
```bash
# Create timestamped backup directory
BACKUP_DIR="backups/camelcase-rollout-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup all tool configs
cp tools.json $BACKUP_DIR/
cp -r tool_configs $BACKUP_DIR/

# Create baseline report
echo "Baseline Snapshot - $(date)" > $BACKUP_DIR/BASELINE_REPORT.md
echo "## Tool Configs" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_savings_goal: NEEDS FIX (snake_case properties)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_loans: NEEDS FIX (snake_case properties)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_lending_options: NEEDS FIX (snake_case properties)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_document_id: NEEDS FIX (invalid numeric key)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- update_quiz: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- start_quiz: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_balance: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_credit_score: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- show_emi_info: OK (empty params)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- create_pie_chart: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
echo "- create_bar_chart: OK (already camelCase)" >> $BACKUP_DIR/BASELINE_REPORT.md
```

**Validation Checkpoint:**
- [ ] Backup directory created with timestamp
- [ ] tools.json backed up
- [ ] tool_configs/ directory backed up
- [ ] BASELINE_REPORT.md created
- [ ] Backup path saved for rollback reference

---

## Phase 2: Update Agent Tool Configs to CamelCase

### 2.1 Fix show_savings_goal.json

**Current (INCORRECT):**
```json
{
  "required": ["deadline", "currentSavings", "monthlyTarget", "goalAmount", "goalName"],
  "properties": {
    "deadline": { "type": "string", "description": "Target completion date" },
    "current_savings": { "type": "number", "description": "Current amount saved" },
    "monthly_target": { "type": "number", "description": "Monthly savings target" },
    "goal_amount": { "type": "number", "description": "Target amount" },
    "goal_name": { "type": "string", "description": "Name of the savings goal" }
  }
}
```

**Fixed (CORRECT):**
```json
{
  "required": ["goalName", "goalAmount", "currentSavings", "monthlyTarget"],
  "properties": {
    "goalName": { "type": "string", "description": "Name of the savings goal (e.g., 'Buy Tractor')" },
    "goalAmount": { "type": "number", "description": "Target amount for the savings goal in USD (e.g., 10000 for $10,000)" },
    "currentSavings": { "type": "number", "description": "Current amount saved towards the goal in USD (e.g., 3500 for $3,500)" },
    "monthlyTarget": { "type": "number", "description": "Monthly savings target in USD (e.g., 500 for $500 per month)" },
    "deadline": { "type": "string", "description": "Target completion date (optional)" }
  }
}
```

**Changes:**
- ✅ Renamed `current_savings` → `currentSavings`
- ✅ Renamed `monthly_target` → `monthlyTarget`
- ✅ Renamed `goal_amount` → `goalAmount`
- ✅ Renamed `goal_name` → `goalName`
- ✅ Made `deadline` optional (removed from required)

### 2.2 Fix show_loans.json

**Current (INCORRECT):**
```json
{
  "required": ["totalLoans"],
  "properties": {
    "total_loans": { "type": "number", "description": "Total number of loans" }
  }
}
```

**Fixed (CORRECT):**
```json
{
  "required": ["totalLoans"],
  "properties": {
    "totalLoans": { "type": "number", "description": "Total number of loans the user has. This is a count, not an amount (e.g., 3 loans)." }
  }
}
```

**Changes:**
- ✅ Renamed `total_loans` → `totalLoans`

### 2.3 Fix show_lending_options.json

**Current (INCORRECT):**
```json
{
  "required": ["loanAmount"],
  "properties": {
    "loan_amount": { "type": "number", "description": "Loan amount in USD" }
  }
}
```

**Fixed (CORRECT - Make Optional):**
```json
{
  "required": [],
  "properties": {
    "loanAmount": { "type": "number", "description": "Loan amount in USD (optional - demo options generated if not provided)" },
    "currency": { "type": "string", "description": "Currency code (e.g., USD). Defaults to USD." },
    "userProfile": {
      "type": "object",
      "description": "User financial profile (optional)",
      "properties": {
        "monthlyIncome": { "type": "number", "description": "Monthly income in USD" },
        "creditScore": { "type": "number", "description": "Credit score (300-850)" }
      }
    }
  }
}
```

**Changes:**
- ✅ Renamed `loan_amount` → `loanAmount`
- ✅ Removed from required (handler generates demo data)
- ✅ Added optional `currency` and `userProfile` fields to match handler

### 2.4 Fix show_document_id.json

**Current (INCORRECT):**
```json
{
  "required": [],
  "properties": {
    "1": { "type": "number", "description": "Document ID" }
  }
}
```

**Fixed (CORRECT):**
```json
{
  "required": [],
  "properties": {
    "documentId": { "type": "string", "description": "Document ID (optional - shows default if not provided)" }
  }
}
```

**Changes:**
- ✅ Removed invalid numeric key `"1"`
- ✅ Added `documentId` as string (optional)

### 2.5 Add Missing Optional Fields to Other Tools

**update_quiz.json** - Add guidance note to description:
```json
{
  "description": "Use this tool to update a quiz... IMPORTANT: Always use camelCase for all parameters (questionId, selectedValue, action). Do NOT use snake_case variants."
}
```

**Validation Checkpoint:**
- [ ] show_savings_goal.json updated and saved
- [ ] show_loans.json updated and saved
- [ ] show_lending_options.json updated and saved
- [ ] show_document_id.json updated and saved
- [ ] All JSON files validate (no syntax errors)
- [ ] All property names are camelCase
- [ ] No snake_case property names remain

---

## Phase 3: Local Validation (Before Agent Push)

### 3.1 JSON Schema Validation

**Actions:**
```bash
# Validate JSON syntax for all configs
for file in tool_configs/*.json; do
  echo "Validating $file..."
  cat $file | jq . > /dev/null && echo "✅ Valid" || echo "❌ INVALID"
done

# Validate tools.json
cat tools.json | jq . > /dev/null && echo "✅ tools.json valid" || echo "❌ tools.json INVALID"
```

**Validation Checkpoint:**
- [ ] All tool_configs/*.json files are valid JSON
- [ ] tools.json is valid JSON
- [ ] No syntax errors reported

### 3.2 Check for Snake_Case Patterns

**Actions:**
```bash
# Search for any remaining snake_case property names
echo "Searching for snake_case in tool configs..."
grep -r "\"[a-z_]*_[a-z_]*\":" tool_configs/ || echo "✅ No snake_case found"

# Check required arrays
echo "Checking required arrays for snake_case..."
grep -r "\"required\":" tool_configs/ -A 10 | grep "_" || echo "✅ No snake_case in required arrays"
```

**Validation Checkpoint:**
- [ ] No snake_case property names in tool_configs/
- [ ] No snake_case in required arrays
- [ ] All property names match required array names

### 3.3 Client Handler Compatibility Check

**Manual verification:**
```typescript
// Verify these interfaces in toolBridge.ts match new schemas:

// ✅ SavingsGoalParams
interface SavingsGoalParams {
  goalName?: string;
  goalAmount: number;
  currentSavings: number;
  monthlyTarget?: number;
  deadline?: string;
  currency?: string;
}

// ✅ LoansParams
interface LoansParams {
  totalLoans: number;
  paidAmount: number;
  currency?: string;
  monthlyData?: Array<...>;
}

// ✅ LendingOptionsParams
interface LendingOptionsParams {
  loanAmount?: number;  // OPTIONAL NOW
  currency?: string;
  userProfile?: {...};
}

// ✅ DocumentIdParams
interface DocumentIdParams {
  documentId?: string;  // STRING, OPTIONAL
}
```

**Validation Checkpoint:**
- [ ] All TypeScript interfaces match new schemas
- [ ] No compilation errors
- [ ] Required vs optional fields match

---

## Phase 4: Test Client Handlers (Local Test Page)

### 4.1 Test via /orchestration/tools Page

**Test Cases:**

1. **show_savings_goal** (camelCase):
```json
{
  "goalName": "Emergency Fund",
  "goalAmount": 50000,
  "currentSavings": 35000,
  "monthlyTarget": 1200,
  "deadline": "2025-12-31"
}
```

2. **show_loans** (camelCase):
```json
{
  "totalLoans": 5,
  "paidAmount": 15000,
  "currency": "USD"
}
```

3. **show_lending_options** (optional params):
```json
{
  "currency": "USD",
  "userProfile": {
    "monthlyIncome": 4500
  }
}
```

4. **show_document_id** (optional string):
```json
{
  "documentId": "ABC-12345"
}
```

5. **update_quiz** (camelCase):
```json
{
  "questionId": "loanAmount",
  "action": "selectOption",
  "selectedValue": "3000-5000"
}
```

**Validation Checkpoint:**
- [ ] show_savings_goal renders correctly with camelCase
- [ ] show_loans renders correctly with camelCase
- [ ] show_lending_options works with optional params
- [ ] show_document_id works with optional documentId
- [ ] update_quiz works with camelCase (no snake_case)
- [ ] All UI components render without errors
- [ ] Console shows no "handler not registered" errors

### 4.2 Test Backwards Compatibility (Should Still Work)

**Test snake_case still works (during transition):**

1. **update_quiz** (snake_case - should still work):
```json
{
  "question_id": "loanPurpose",
  "action": "selectOption",
  "selected_value": "medical"
}
```

**Expected:** Should work due to backwards compatibility in QuizProvider

**Validation Checkpoint:**
- [ ] snake_case update_quiz still works (backwards compatibility)
- [ ] Logs show "Duplicate update ignored" for replays

---

## Phase 5: Push Updated Configs to ElevenLabs Agent

### 5.1 Pre-Push Checklist

**Verify:**
- [ ] All Phase 1-4 validation checkpoints passed
- [ ] Dev server running at localhost:3000
- [ ] Convex dev running
- [ ] No active voice sessions
- [ ] Backup directory created and verified
- [ ] ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID set

### 5.2 Push to Agent

**Actions:**
```bash
# Option 1: Using agents CLI directly
agents tools push --agent "Support agent" --tools-file ./tools.json --config-dir ./tool_configs

# Option 2: Using ElevenLabs skill script
bash ~/.claude/skills/elevenlabs-agent-cli/scripts/tools.sh push --agent "Support agent" --tools-file ./tools.json --config-dir ./tool_configs

# Option 3: Using TypeScript script
bun ~/.claude/skills/elevenlabs-agent-cli/scripts/push-tools.ts --agent "Support agent" --tools-file ./tools.json --config-dir ./tool_configs
```

**Expected Output:**
```
✅ Successfully pushed 11 tools to agent "Support agent"
- show_balance
- show_savings_goal
- show_document_id
- create_pie_chart
- create_bar_chart
- show_loans
- show_lending_options
- show_credit_score
- show_emi_info
- start_quiz
- update_quiz
```

**Validation Checkpoint:**
- [ ] Push command succeeded (exit code 0)
- [ ] All 11 tools pushed successfully
- [ ] No errors in output
- [ ] Agent ID matches NEXT_PUBLIC_ELEVENLABS_AGENT_ID

### 5.3 Verify Agent Received Updates

**Actions:**
```bash
# Fetch current agent config
agents tools list --agent "Support agent"

# Or use API endpoint
curl -X GET "https://api.elevenlabs.io/v1/convai/agents/{AGENT_ID}/tools" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | jq .
```

**Validation Checkpoint:**
- [ ] Agent tools list shows 11 tools
- [ ] show_savings_goal shows camelCase properties
- [ ] show_loans shows camelCase properties
- [ ] show_lending_options shows camelCase properties
- [ ] show_document_id shows documentId (not "1")

---

## Phase 6: End-to-End Testing (Agent + Client)

### 6.1 Voice Mode Testing

**Test Prompts:**

1. **Show savings goal:**
   - User: "Show me my savings goal"
   - Expected: Agent calls show_savings_goal with camelCase params
   - Verify: UI renders savings goal card correctly

2. **Show loans:**
   - User: "Show me my loans"
   - Expected: Agent calls show_loans with totalLoans (camelCase)
   - Verify: UI renders loans card correctly

3. **Show lending options:**
   - User: "I need a loan for a laptop"
   - Expected: Agent calls show_lending_options
   - Verify: UI shows 3 lending options with demo data

4. **Show document:**
   - User: "Show my ID"
   - Expected: Agent calls show_document_id (no params or with documentId)
   - Verify: UI renders document card

5. **Start quiz:**
   - User: "Help me choose a loan option"
   - Expected: Agent calls start_quiz with quizId: "loan_eligibility"
   - Verify: Quiz overlay appears

6. **Update quiz (voice navigation):**
   - User: "Option two" (during quiz)
   - Expected: Agent calls update_quiz with camelCase params
   - Verify: Quiz advances automatically after 1.5s

**Validation Checkpoint:**
- [ ] All voice prompts work correctly
- [ ] Agent sends camelCase params to client
- [ ] UI renders all tools correctly
- [ ] Quiz auto-advance works
- [ ] No console errors
- [ ] No "handler not registered" errors

### 6.2 Text Mode Testing

**Test Messages:**

1. Send: "show me my balance"
2. Send: "show my savings goal"
3. Send: "show my loans"
4. Send: "I need a loan"

**Validation Checkpoint:**
- [ ] Text mode works with camelCase
- [ ] WebSocket sends camelCase params
- [ ] UI renders correctly in text mode
- [ ] No duplicate messages

### 6.3 Cross-Tab Testing

**Test Scenario:**
1. Open /voice-chat in Tab 1
2. Start voice session
3. Trigger show_savings_goal
4. Open /voice-chat in Tab 2
5. Verify Tab 2 shows "Active in another tab"
6. Close Tab 1
7. Verify Tab 2 can now start session

**Validation Checkpoint:**
- [ ] Cross-tab coordination works
- [ ] Session lock prevents duplicates
- [ ] Messages sync across tabs via Convex

---

## Phase 7: Remove Backwards Compatibility (Hard Cutover)

⚠️ **CRITICAL**: Only proceed if ALL Phase 6 tests pass

### 7.1 Remove Snake_Case Support from QuizProvider

**File:** `src/components/quiz/QuizProvider.tsx`

**Before:**
```typescript
const questionId = data.questionId || data.question_id;
const selectedValue = data.selectedValue || data.selected_value;
```

**After:**
```typescript
const questionId = data.questionId;
const selectedValue = data.selectedValue;

// Add validation
if (!questionId || !selectedValue) {
  console.warn('⚠️ update_quiz missing required camelCase fields', data);
  return false;
}
```

### 7.2 Remove Snake_Case Support from update_quiz Handler

**File:** `app/voice-chat/page.tsx`

**Before:**
```typescript
const questionId = (params as any).questionId ?? (params as any).question_id;
const selectedValue = (params as any).selectedValue ?? (params as any).selected_value;
```

**After:**
```typescript
const questionId = (params as any).questionId;
const selectedValue = (params as any).selectedValue;
```

### 7.3 Remove Snake_Case Support from start_quiz Handler

**File:** `app/voice-chat/page.tsx`

**Before:**
```typescript
const quizId = (params as any).quiz_id || (params as any).quizId;
```

**After:**
```typescript
const quizId = (params as any).quizId;
```

### 7.4 Update Convex Message Format

**Verify:** All new messages saved to Convex use camelCase:
```typescript
// In update_quiz handler (app/voice-chat/page.tsx)
const messageContent = `TOOL_CALL:update_quiz:${JSON.stringify({
  questionId,  // ✅ camelCase
  action,
  selectedValue  // ✅ camelCase
})}`;
```

**Validation Checkpoint:**
- [ ] QuizProvider only accepts camelCase
- [ ] update_quiz handler only accepts camelCase
- [ ] start_quiz handler only accepts camelCase
- [ ] New Convex messages use camelCase only
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors

---

## Phase 8: Final Regression Testing

### 8.1 Full Flow Testing

**Test Complete User Journey:**

1. **Loan Discovery Flow:**
   - User: "I need a loan"
   - Agent: Shows lending options
   - User: "Help me choose"
   - Agent: Starts quiz
   - User: Answers all questions via voice
   - Expected: Quiz completes, lending options shown

2. **Financial Overview Flow:**
   - User: "Show my balance"
   - User: "Show my savings goal"
   - User: "Show my loans"
   - User: "Show my credit score"
   - Expected: All cards render correctly

3. **Quiz Edge Cases:**
   - Start quiz
   - User: "Go back" (test prevQuestion)
   - User: "Next" (test nextQuestion)
   - User: "Option 1" (test selectOption)
   - Expected: All navigation works

**Validation Checkpoint:**
- [ ] All complete flows work end-to-end
- [ ] Quiz navigation works correctly
- [ ] Auto-advance still works
- [ ] Lending options appear after quiz
- [ ] No console errors
- [ ] No "handler not registered"
- [ ] No schema mismatches

### 8.2 Performance Testing

**Metrics to Monitor:**
- [ ] Tool call latency < 500ms
- [ ] UI render time < 200ms
- [ ] No memory leaks in long sessions
- [ ] No duplicate messages
- [ ] Session lock/unlock < 100ms

### 8.3 Backwards Compatibility Testing (Old Messages)

**Test:** Load conversation with old snake_case messages

**Actions:**
1. Check Convex dashboard for messages with `question_id, selected_value`
2. Reload /voice-chat page
3. Verify old messages don't crash UI

**Expected:** Old messages in Convex won't re-trigger handlers (they're historical)

**Validation Checkpoint:**
- [ ] Old messages don't break UI
- [ ] No console errors for historical data
- [ ] New messages use camelCase only

---

## Phase 9: Documentation & Cleanup

### 9.1 Update Documentation

**Files to update:**
- [ ] `CLAUDE.md`: Update tool registration section
- [ ] `docs/active/voice-diagnostics.md`: Note camelCase requirement
- [ ] `tool_configs/update_quiz.json`: Add note about camelCase

### 9.2 Create Migration Summary

**File:** `docs/migrations/2025-01-camelcase-schema-rollout.md`

**Content:**
```markdown
# CamelCase Schema Rollout - January 2025

## Summary
Standardized all ElevenLabs tool schemas to camelCase, eliminating snake_case drift.

## Changes
- show_savings_goal: snake_case → camelCase
- show_loans: snake_case → camelCase
- show_lending_options: snake_case → camelCase, made optional
- show_document_id: fixed numeric key → documentId

## Impact
- ✅ Schema consistency across agent and client
- ✅ No more dual snake_case/camelCase support needed
- ✅ Better TypeScript type safety

## Rollback
See `backups/camelcase-rollout-TIMESTAMP/` for original configs
```

### 9.3 Clean Up Backup Directory (After 7 Days)

**After confirming no issues for 7 days:**
```bash
# Archive backup (don't delete immediately)
tar -czf backups/camelcase-rollout-TIMESTAMP.tar.gz backups/camelcase-rollout-TIMESTAMP/
rm -rf backups/camelcase-rollout-TIMESTAMP/
```

---

## Rollback Plan (If Issues Detected)

### Emergency Rollback Steps

1. **Stop all active sessions:**
   ```bash
   # Clear localStorage in browser
   window.localStorage.removeItem('elevenlabs_session_lock');
   ```

2. **Restore backup configs:**
   ```bash
   BACKUP_DIR="backups/camelcase-rollout-TIMESTAMP"
   cp $BACKUP_DIR/tools.json .
   cp -r $BACKUP_DIR/tool_configs/* tool_configs/
   ```

3. **Re-push to agent:**
   ```bash
   agents tools push --agent "Support agent" --tools-file ./tools.json --config-dir ./tool_configs
   ```

4. **Restore backwards compatibility in code:**
   ```bash
   git checkout HEAD -- src/components/quiz/QuizProvider.tsx
   git checkout HEAD -- app/voice-chat/page.tsx
   ```

5. **Verify rollback:**
   - [ ] Test voice mode
   - [ ] Test quiz flow
   - [ ] Check console for errors

---

## Test Inputs Reference

### CamelCase Test Payloads (Phase 4 & 6)

```json
// show_savings_goal
{ "goalName": "Emergency Fund", "goalAmount": 50000, "currentSavings": 35000, "monthlyTarget": 1200 }

// show_loans
{ "totalLoans": 5, "paidAmount": 15000, "currency": "USD" }

// show_lending_options
{ "currency": "USD", "userProfile": { "monthlyIncome": 4500 } }

// show_document_id
{ "documentId": "ABC-12345" }

// show_balance
{ "balance": 12500, "previousBalance": 11000, "currency": "USD" }

// show_credit_score
{ "score": 780, "provider": "Credit Bureau" }

// show_emi_info
{ "loanAmount": 2500, "termMonths": 10, "emi": 250, "currency": "USD" }

// start_quiz
{ "quizId": "loan_eligibility" }

// update_quiz (select)
{ "questionId": "loanPurpose", "action": "selectOption", "selectedValue": "medical" }

// update_quiz (next)
{ "questionId": "current", "action": "nextQuestion" }
```

---

## Success Criteria

**Deployment is successful when:**
- [ ] All 11 tools use camelCase schemas on agent
- [ ] All client handlers accept camelCase only
- [ ] All Phase 6 tests pass (voice, text, cross-tab)
- [ ] No backwards compatibility code remains
- [ ] No console errors in production
- [ ] Documentation updated
- [ ] Migration summary created
- [ ] Backup archived for 7 days

**Timeline:**
- Phase 0-3: 30 minutes (research & config updates)
- Phase 4: 20 minutes (local testing)
- Phase 5: 5 minutes (agent push)
- Phase 6: 30 minutes (end-to-end testing)
- Phase 7: 15 minutes (remove backwards compatibility)
- Phase 8: 20 minutes (regression testing)
- Phase 9: 10 minutes (documentation)
- **Total: ~2.5 hours**

---

## Notes for Execution Agent

1. **Execute phases sequentially** - do NOT skip validation checkpoints
2. **Stop immediately** if any validation fails
3. **Create backup** before making ANY changes
4. **Test locally** before pushing to agent
5. **Keep backwards compatibility** until Phase 7
6. **Monitor console logs** during all tests
7. **Verify TypeScript compilation** after each code change
8. **Save this plan** for future schema migrations
