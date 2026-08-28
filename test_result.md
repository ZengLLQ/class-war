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
