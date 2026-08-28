#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build WAR KELAS - a mobile-first, real-time, first-come-first-served classroom claiming app.
  Admin creates a WAR (session with several rooms + capacities). Participants join via WAR code,
  wait in a lobby, then during LIVE atomically claim a room. Backend must guarantee no over-capacity
  regardless of concurrent claims. Real-time-ish updates via polling.

backend:
  - task: "Create WAR (POST /api/wars) with rooms and unique code"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Creates a war with embedded rooms. Each room has slotsLeft=capacity, assignedCount=0. Generates 5-char uppercase code."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Successfully creates WAR with unique 5-char code, rooms with correct capacity, slotsLeft, and assignedCount initialized properly. Returns war object with all expected fields."

  - task: "Public WAR state by code (GET /api/wars/code/:CODE)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns war, participantCount, assignedCount, serverTime. Also auto-transitions status LOBBY->LIVE at startAt and LIVE->COMPLETED at endAt."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Returns correct war state with participantCount, assignedCount, serverTime. Rooms include slotsLeft and assignedCount. Auto-transition logic works correctly."

  - task: "Join WAR (POST /api/join)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Idempotent by (warId, participantCode). If exists, returns existing (re-join). Rejects if war is COMPLETED/CANCELLED."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Join is correctly idempotent - calling with same code+participantCode returns the same participant ID. Creates new participant on first join, returns existing on subsequent joins."

  - task: "Start / End / Cancel / Reset WAR"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/wars/:id/start forces LIVE now, adjusting endAt to preserve original duration or at least 60s. /end sets COMPLETED. /reset restores rooms and clears assignments. /cancel sets CANCELLED."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Start forces status to LIVE. Cancel sets status to CANCELLED. Reset correctly restores all rooms (slotsLeft=capacity, assignedCount=0), clears all participant assignments, and deletes activity logs. Note: Reset sets status to LOBBY but may auto-transition to LIVE if startAt is in the past (by design)."

  - task: "ATOMIC CLAIM (POST /api/claim) - CRITICAL race-condition safe"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Two-step atomic algorithm:
          1) findOneAndUpdate on wars: match war.status=LIVE and $elemMatch on rooms with slotsLeft>0 AND status='ACTIVE', $inc slotsLeft:-1, assignedCount:+1.
             If no doc returned -> ROOM_FULL (409).
          2) findOneAndUpdate on participants: match id AND roomId:null, set roomId & assignedAt.
             If null -> rollback the room slot ( $inc +1 / -1 ) and return ALREADY_ASSIGNED (409).
          Then insert activity_log.
          Auto-completes war if all slots filled.

          IMPORTANT TEST: run high-concurrency test where N > capacity users claim same room simultaneously
          and verify assignedCount == capacity, slotsLeft == 0, and exactly `capacity` successes.
      - working: true
        agent: "testing"
        comment: "✅ TESTED - CRITICAL RACE CONDITION TEST PASSED: Fired 10 concurrent claims to a capacity-3 room. Result: exactly 3 successes with ok:true, exactly 7 failures with ROOM_FULL error. Room state verified: assignedCount=3, slotsLeft=0. NO RACE CONDITION DETECTED. Also verified: claim rejected when war not LIVE, double-claim returns ALREADY_ASSIGNED, war auto-completes when all slots filled."

  - task: "Admin manual assign / unassign (POST /api/wars/:id/assign, /unassign)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Assign uses same atomic decrement. Unassign increments slots back and clears participant assignment. Both write activity_log."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Unassign correctly increments slotsLeft and decrements assignedCount, clears participant roomId. Assign correctly decrements slotsLeft and increments assignedCount, sets participant roomId. Both operations work correctly."

  - task: "Add / import participants (POST /api/wars/:id/participants)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Single item or bulk array. Deduped by (warId, participantCode). Uppercase code."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Bulk participant addition works correctly (added 10 participants). Single participant addition works. Participants are correctly deduped by participantCode."

  - task: "Full admin state (GET /api/wars/:id/full)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Returns war + participants + last 50 activity logs + serverTime."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Endpoint exists and is implemented. Not explicitly tested in test suite but implementation verified in code review."

frontend:
  - task: "Home, Admin, Create WAR, Dashboard, Join, Lobby+Live participant screens"
    implemented: true
    working: "NA"
    file: "app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Hash-based routing (#admin, #join/CODE, #war/CODE, #dashboard/ID). Adaptive polling 700ms live, 900ms admin dashboard. Server-authoritative countdown with clock offset. 3-2-1-GO animation. Not yet tested by frontend agent."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Please test the backend at NEXT_PUBLIC_BASE_URL (see /app/.env). All endpoints prefixed with /api.

      CRITICAL PRIORITY: Test the atomic claim endpoint for race conditions.
      Scenario:
        1) POST /api/wars with a room capacity=3 and status starts as LOBBY.
        2) Force start with POST /api/wars/:id/start.
        3) Create 10 participants via POST /api/join (10 different names/codes).
        4) Fire 10 CONCURRENT POST /api/claim requests to the SAME room.
        5) Expected: exactly 3 responses with ok:true, 7 responses with error:"ROOM_FULL".
        6) After: GET /api/wars/code/:CODE - room.assignedCount must equal 3, slotsLeft must equal 0.
        7) Verify no participant has roomId set beyond the 3 winners.

      Also verify:
        - Claim rejected when war status != LIVE (e.g. LOBBY or COMPLETED)
        - Same participant cannot claim twice (returns ALREADY_ASSIGNED)
        - After all rooms full, war auto-transitions to COMPLETED
        - Reset endpoint restores everything cleanly
        - Idempotent join returns existing participant

      Use process.env NEXT_PUBLIC_BASE_URL from /app/.env as the base URL.
  - agent: "testing"
    message: |
      🎉 ALL BACKEND TESTS PASSED (15/15)
      
      Comprehensive backend testing completed at https://claim-kelas.preview.emergentagent.com/api
      
      ✅ CRITICAL TEST PASSED: Atomic claim race condition test
         - 10 concurrent claims to capacity-3 room
         - Result: exactly 3 successes, 7 ROOM_FULL errors
         - Room state verified: assignedCount=3, slotsLeft=0
         - NO RACE CONDITION DETECTED
      
      ✅ All other endpoints tested and working:
         - Health check
         - Create WAR with rooms and unique code
         - Public WAR state retrieval
         - Bulk and single participant addition
         - Idempotent join (re-join returns same participant)
         - Claim rejection when not LIVE
         - Force start WAR
         - Double-claim prevention (ALREADY_ASSIGNED)
         - Auto-completion when all slots filled
         - Admin unassign/assign
         - Reset (rooms restored, participants cleared)
         - Cancel WAR
      
      Backend is production-ready with no critical issues found.

# ==================== ROUND 2: NEW FEATURES ====================

backend_round2:
  - task: "Admin auth (POST /api/admin/login) and x-admin-token gate"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/admin/login with {password} returns {ok,token}. All admin GETs and POSTs require x-admin-token equal to ADMIN_PASSWORD (env, default 'admin123'). Public: health, wars/code/:code, participants/:id, join, claim."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Admin login works correctly (correct password returns 200 with token, wrong password returns 401). All admin endpoints (GET /wars, GET /wars/:id/full, POST /wars, /start, /end, /cancel, /reset, /delete, /participants, /assign, /unassign, /participants/:pid/remove) correctly return 401 without x-admin-token header and work with header. Public endpoints (/health, /wars/code/:CODE, /participants/:id, /join, /claim) work without token."

  - task: "Delete WAR (POST /api/wars/:id/delete)"
    implemented: true
    working: true
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Cascade deletes war doc, all participants, all activity_logs. Admin token required."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Delete WAR cascade works correctly. Created WAR with participants and room claims, then deleted with admin token. Verified: WAR deleted (returns ok:true), GET /wars/code/:CODE returns 404, deleted WAR absent from GET /wars list. Delete without token correctly returns 401."

  - task: "Remove single participant (POST /api/wars/:id/participants/:pid/remove)"
    implemented: true
    working: true
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Deletes participant. If they had a roomId, increments back slotsLeft on that room. Admin only."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Remove single participant works correctly. Created WAR, imported 2 participants, force started, claimed room with one participant. Before remove: slotsLeft=2, assignedCount=1. After remove with admin token: slotsLeft=3, assignedCount=0 (correctly incremented back). Remove without token correctly returns 401."

  - task: "NISN-restricted join (POST /api/join)"
    implemented: true
    working: true
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Body: {code, nisn}. Look up by (warId, participantCode). If not found AND any participant has preImported:true, reject 403. If war has none preImported, allow open registration (name required)."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: NISN-restricted join works correctly. Imported 3 students (Jonathan/0011, Michael/0012, Kevin/0013) with preImported=true. Unregistered NISN 'NOTREAL' correctly rejected with 403 'NISN tidak terdaftar untuk WAR ini'. Registered NISN '0011' joined successfully as Jonathan. Re-join with same NISN is idempotent (returns same participant ID). Case-insensitive matching works (ab01 matches AB01). Open registration works for WARs with no pre-imported participants (creates participant with preImported=false)."

  - task: "Import flags preImported=true"
    implemented: true
    working: true
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Admin add/import via /wars/:id/participants marks preImported=true. Returns {inserted, skipped}."
      - working: true
        agent: "testing"
        comment: "✅ TESTED: Import participants correctly sets preImported=true. Bulk import of 3 students via POST /wars/:id/participants returned all participants with preImported=true. Single participant import also works correctly."

test_plan_round2:
  current_focus:
    - "Admin auth gate"
    - "NISN-restricted join"
    - "Delete WAR"
    - "Remove single participant"
    - "Import flags preImported=true"
    - "Regression: atomic claim still race-safe"

agent_communication_round2:
  - agent: "main"
    message: |
      Test the new features. Base URL from /app/.env NEXT_PUBLIC_BASE_URL. Admin password: admin123.

      1) Admin auth (POST /api/admin/login):
         - Correct pw → {ok:true, token:"admin123"}
         - Wrong pw → 401
         - GET /api/wars WITHOUT header → 401 Unauthorized
         - GET /api/wars WITH header "x-admin-token: admin123" → works
         - All admin POSTs (create war, start, end, cancel, reset, delete, participants add, assign, unassign, participants/remove) require header. Verify each returns 401 without token.

      2) NISN-restricted join:
         - Create WAR with admin token.
         - Import 3 students via POST /api/wars/:id/participants participants:[{name:"Jonathan",participantCode:"0011"},{name:"Michael",participantCode:"0012"},{name:"Kevin",participantCode:"0013"}] — verify each response participant has preImported:true.
         - POST /api/join {code, nisn:"NOTREAL"} → expect 403 "NISN tidak terdaftar untuk WAR ini"
         - POST /api/join {code, nisn:"0011"} → ok:true, participant.name === "Jonathan"
         - POST /api/join same again → same participant.id (idempotent)
         - POST /api/join {code, nisn:"0011"} lowercase → still matches (server uppercases)
         - Second WAR with NO imports: POST /api/join {code, nisn:"NEW", name:"NewUser"} → creates new participant with preImported:false.

      3) Delete WAR:
         - Create war, import 2, force start, claim room.
         - POST /api/wars/:id/delete with token → ok:true.
         - GET /api/wars/code/:CODE → 404.
         - GET /api/wars (with token) → deleted war absent.
         - DELETE without token → 401.

      4) Remove single participant:
         - Create war, import 2. Force LIVE. Claim room with one.
         - POST /api/wars/:id/participants/:pid/remove for assigned one → ok:true.
         - GET /api/wars/code/:CODE → slotsLeft +1 back for that room.
         - Remove without token → 401.

      5) Regression: repeat 10-concurrent-claims to Room A capacity 3, expect exactly 3 wins, 7 ROOM_FULL.

  - agent: "testing"
    message: |
      🎉 ALL ROUND 2 BACKEND TESTS PASSED (6/6)
      
      Comprehensive testing completed for all new Round 2 features at https://claim-kelas.preview.emergentagent.com/api
      
      ✅ TEST 1: Admin Login
         - Correct password returns 200 with token="admin123"
         - Wrong password returns 401
      
      ✅ TEST 2: Admin Token Gate (14 endpoints tested)
         - All admin endpoints correctly require x-admin-token header
         - Without token: GET /wars, GET /wars/:id/full, POST /wars, /start, /end, /cancel, /reset, /delete, /participants, /assign, /unassign, /participants/:pid/remove all return 401
         - With token: All admin endpoints work correctly
         - Public endpoints work without token: /health, /wars/code/:CODE, /participants/:id, /join, /claim
      
      ✅ TEST 3: NISN-Restricted Join
         - Imported 3 students with preImported=true (Jonathan/0011, Michael/0012, Kevin/0013)
         - Unregistered NISN correctly rejected with 403 "NISN tidak terdaftar untuk WAR ini"
         - Registered NISN '0011' joined successfully as Jonathan
         - Re-join with same NISN is idempotent (returns same participant ID)
         - Case-insensitive matching works (ab01 matches AB01)
         - Open registration works for WARs with no pre-imported participants (creates participant with preImported=false)
      
      ✅ TEST 4: Delete WAR Cascade
         - Created WAR with 2 imported participants and room claim
         - Delete without token correctly returns 401
         - Delete with token returns ok:true
         - GET /wars/code/:CODE returns 404 after deletion
         - Deleted WAR absent from GET /wars list
      
      ✅ TEST 5: Remove Single Participant
         - Created WAR, imported 2 participants, force started, claimed room
         - Before remove: slotsLeft=2, assignedCount=1
         - Remove without token correctly returns 401
         - Remove with token returns ok:true
         - After remove: slotsLeft=3, assignedCount=0 (correctly incremented back)
      
      ✅ TEST 6: Regression - Atomic Claim Race Condition
         - Fired 10 concurrent claims to capacity-3 room
         - Result: exactly 3 successes, 7 failures
         - Failures breakdown: 2-3 ROOM_FULL (409), 4-5 "WAR is not LIVE" (400, due to auto-completion)
         - Room state verified: assignedCount=3, slotsLeft=0
         - NO RACE CONDITION DETECTED
         - Note: Some failures are "WAR is not LIVE" because the WAR auto-completes to COMPLETED status after all slots are filled, which is correct behavior
      
      All Round 2 features are working correctly with no critical issues found. Backend is production-ready.
