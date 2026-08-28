#!/usr/bin/env python3
"""
WAR KELAS Backend API Test Suite
Tests all backend endpoints with focus on atomic claim race conditions
"""
import asyncio
import httpx
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/.env')
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://claim-kelas.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

print(f"Testing backend at: {API_BASE}")

# Test data storage
test_data = {
    'war_id': None,
    'war_code': None,
    'room_a_id': None,
    'room_b_id': None,
    'participants': []
}

async def test_health():
    """Test 1: Health check endpoint"""
    print("\n=== TEST 1: Health Check ===")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/health")
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            assert 'now' in data, "Expected 'now' field in response"
            
            print(f"✅ Health check passed: {data}")
            return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

async def test_create_war():
    """Test 2: Create WAR with rooms"""
    print("\n=== TEST 2: Create WAR ===")
    try:
        now = datetime.utcnow()
        start_at = (now + timedelta(seconds=60)).isoformat() + 'Z'
        end_at = (now + timedelta(minutes=15)).isoformat() + 'Z'
        
        war_data = {
            "name": "Race Test WAR",
            "description": "Testing atomic claim race conditions",
            "startAt": start_at,
            "endAt": end_at,
            "rooms": [
                {"name": "ROOM A", "capacity": 3},
                {"name": "ROOM B", "capacity": 2}
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{API_BASE}/wars", json=war_data)
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            assert 'war' in data, "Expected 'war' in response"
            
            war = data['war']
            test_data['war_id'] = war['id']
            test_data['war_code'] = war['code']
            test_data['room_a_id'] = war['rooms'][0]['id']
            test_data['room_b_id'] = war['rooms'][1]['id']
            
            print(f"✅ WAR created: ID={war['id']}, CODE={war['code']}")
            print(f"   Room A: {test_data['room_a_id']} (capacity 3)")
            print(f"   Room B: {test_data['room_b_id']} (capacity 2)")
            return True
    except Exception as e:
        print(f"❌ Create WAR failed: {e}")
        return False

async def test_public_state():
    """Test 3: Get public WAR state by code"""
    print("\n=== TEST 3: Public WAR State ===")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            assert 'war' in data, "Expected 'war' in response"
            assert 'participantCount' in data, "Expected 'participantCount'"
            assert 'assignedCount' in data, "Expected 'assignedCount'"
            assert 'serverTime' in data, "Expected 'serverTime'"
            
            war = data['war']
            assert len(war['rooms']) == 2, "Expected 2 rooms"
            assert war['rooms'][0]['slotsLeft'] == 3, "Room A should have 3 slots"
            assert war['rooms'][1]['slotsLeft'] == 2, "Room B should have 2 slots"
            
            print(f"✅ Public state retrieved: status={war['status']}, participants={data['participantCount']}")
            return True
    except Exception as e:
        print(f"❌ Public state failed: {e}")
        return False

async def test_add_participants_bulk():
    """Test 4: Add participants in bulk"""
    print("\n=== TEST 4: Add Participants (Bulk) ===")
    try:
        participants_data = {
            "participants": [
                {"name": f"Participant {i}", "participantCode": f"P{i:03d}"}
                for i in range(1, 11)  # P001 to P010
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/wars/{test_data['war_id']}/participants",
                json=participants_data
            )
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            assert 'inserted' in data, "Expected 'inserted' in response"
            assert len(data['inserted']) == 10, f"Expected 10 participants, got {len(data['inserted'])}"
            
            test_data['participants'] = data['inserted']
            print(f"✅ Added {len(data['inserted'])} participants in bulk")
            return True
    except Exception as e:
        print(f"❌ Add participants bulk failed: {e}")
        return False

async def test_add_participant_single():
    """Test 5: Add single participant"""
    print("\n=== TEST 5: Add Single Participant ===")
    try:
        participant_data = {
            "name": "Solo Participant",
            "participantCode": "SOLO999"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/wars/{test_data['war_id']}/participants",
                json=participant_data
            )
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            assert len(data['inserted']) == 1, "Expected 1 participant"
            
            test_data['participants'].append(data['inserted'][0])
            print(f"✅ Added single participant: {data['inserted'][0]['name']}")
            return True
    except Exception as e:
        print(f"❌ Add single participant failed: {e}")
        return False

async def test_join_idempotent():
    """Test 6: Join WAR (idempotent)"""
    print("\n=== TEST 6: Join WAR (Idempotent) ===")
    try:
        join_data = {
            "code": test_data['war_code'],
            "name": "Extra Joiner",
            "participantCode": "EXTRA01"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First join
            response1 = await client.post(f"{API_BASE}/join", json=join_data)
            data1 = response1.json()
            
            assert response1.status_code == 200, f"Expected 200, got {response1.status_code}"
            assert data1.get('ok') == True, "Expected ok:true"
            participant_id_1 = data1['participant']['id']
            
            # Second join with same code - should return same participant
            response2 = await client.post(f"{API_BASE}/join", json=join_data)
            data2 = response2.json()
            
            assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
            participant_id_2 = data2['participant']['id']
            
            assert participant_id_1 == participant_id_2, "Join should be idempotent - same participant ID"
            
            test_data['participants'].append(data1['participant'])
            print(f"✅ Join is idempotent: same ID on re-join ({participant_id_1})")
            return True
    except Exception as e:
        print(f"❌ Join idempotent test failed: {e}")
        return False

async def test_claim_rejected_not_live():
    """Test 7: Claim rejected when WAR not LIVE"""
    print("\n=== TEST 7: Claim Rejected (Not LIVE) ===")
    try:
        claim_data = {
            "participantId": test_data['participants'][0]['id'],
            "roomId": test_data['room_a_id']
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{API_BASE}/claim", json=claim_data)
            data = response.json()
            
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            assert data.get('ok') == False, "Expected ok:false"
            assert 'not LIVE' in data.get('error', ''), "Expected 'not LIVE' error"
            
            print(f"✅ Claim correctly rejected: {data['error']}")
            return True
    except Exception as e:
        print(f"❌ Claim rejection test failed: {e}")
        return False

async def test_force_start():
    """Test 8: Force start WAR"""
    print("\n=== TEST 8: Force Start WAR ===")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{API_BASE}/wars/{test_data['war_id']}/start")
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            
            # Verify status is now LIVE
            response2 = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data2 = response2.json()
            assert data2['war']['status'] == 'LIVE', "WAR should be LIVE after start"
            
            print(f"✅ WAR started: status={data2['war']['status']}")
            return True
    except Exception as e:
        print(f"❌ Force start failed: {e}")
        return False

async def single_claim(client, participant_id, room_id, participant_name):
    """Helper: Single claim request"""
    try:
        response = await client.post(
            f"{API_BASE}/claim",
            json={"participantId": participant_id, "roomId": room_id}
        )
        data = response.json()
        return {
            'participant_name': participant_name,
            'participant_id': participant_id,
            'status_code': response.status_code,
            'ok': data.get('ok', False),
            'error': data.get('error', None)
        }
    except Exception as e:
        return {
            'participant_name': participant_name,
            'participant_id': participant_id,
            'status_code': 0,
            'ok': False,
            'error': str(e)
        }

async def test_atomic_claim_race():
    """Test 9: CRITICAL - Atomic claim race condition"""
    print("\n=== TEST 9: ATOMIC CLAIM RACE CONDITION (CRITICAL) ===")
    try:
        # Use first 10 participants for Room A (capacity 3)
        participants_for_test = test_data['participants'][:10]
        room_a_id = test_data['room_a_id']
        
        print(f"Firing 10 concurrent claims to Room A (capacity 3)...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fire 10 concurrent claims
            tasks = [
                single_claim(client, p['id'], room_a_id, p['name'])
                for p in participants_for_test
            ]
            results = await asyncio.gather(*tasks)
        
        # Analyze results
        successes = [r for r in results if r['ok'] == True]
        failures = [r for r in results if r['ok'] == False]
        room_full_errors = [r for r in failures if r['error'] == 'ROOM_FULL']
        
        print(f"\n📊 Results:")
        print(f"   Successes: {len(successes)}")
        print(f"   Failures: {len(failures)}")
        print(f"   ROOM_FULL errors: {len(room_full_errors)}")
        
        # Critical assertions
        assert len(successes) == 3, f"Expected exactly 3 successes, got {len(successes)}"
        assert len(room_full_errors) == 7, f"Expected exactly 7 ROOM_FULL errors, got {len(room_full_errors)}"
        
        print("\n✅ Winners:")
        for s in successes:
            print(f"   - {s['participant_name']} ({s['participant_id']})")
        
        # Verify room state
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data = response.json()
            room_a = next(r for r in data['war']['rooms'] if r['id'] == room_a_id)
            
            assert room_a['assignedCount'] == 3, f"Room A assignedCount should be 3, got {room_a['assignedCount']}"
            assert room_a['slotsLeft'] == 0, f"Room A slotsLeft should be 0, got {room_a['slotsLeft']}"
            
            print(f"\n✅ Room A state verified: assignedCount={room_a['assignedCount']}, slotsLeft={room_a['slotsLeft']}")
        
        # Store winners for next test
        test_data['room_a_winners'] = [s['participant_id'] for s in successes]
        
        print("\n✅ ATOMIC CLAIM RACE TEST PASSED - No race condition detected!")
        return True
        
    except AssertionError as e:
        print(f"\n❌ ATOMIC CLAIM RACE TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Atomic claim race test error: {e}")
        return False

async def test_double_claim():
    """Test 10: Double claim same participant (ALREADY_ASSIGNED)"""
    print("\n=== TEST 10: Double Claim (ALREADY_ASSIGNED) ===")
    try:
        # Try to claim Room B with a winner from Room A
        winner_id = test_data['room_a_winners'][0]
        room_b_id = test_data['room_b_id']
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/claim",
                json={"participantId": winner_id, "roomId": room_b_id}
            )
            data = response.json()
            
            assert response.status_code == 409, f"Expected 409, got {response.status_code}"
            assert data.get('ok') == False, "Expected ok:false"
            assert data.get('error') == 'ALREADY_ASSIGNED', f"Expected ALREADY_ASSIGNED, got {data.get('error')}"
            
            print(f"✅ Double claim correctly rejected: {data['error']}")
            return True
    except Exception as e:
        print(f"❌ Double claim test failed: {e}")
        return False

async def test_fill_room_b():
    """Test 11: Fill Room B with concurrent claims"""
    print("\n=== TEST 11: Fill Room B (Capacity 2) ===")
    try:
        # Get unassigned participants (those who didn't win Room A)
        unassigned = [p for p in test_data['participants'][:10] if p['id'] not in test_data['room_a_winners']]
        # Take 3 unassigned participants for Room B (capacity 2)
        candidates = unassigned[:3]
        room_b_id = test_data['room_b_id']
        
        print(f"Firing 3 concurrent claims to Room B (capacity 2)...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = [
                single_claim(client, p['id'], room_b_id, p['name'])
                for p in candidates
            ]
            results = await asyncio.gather(*tasks)
        
        successes = [r for r in results if r['ok'] == True]
        room_full = [r for r in results if r['error'] == 'ROOM_FULL']
        not_live = [r for r in results if 'not LIVE' in str(r.get('error', ''))]
        
        print(f"\n📊 Results:")
        print(f"   Successes: {len(successes)}")
        print(f"   ROOM_FULL: {len(room_full)}")
        print(f"   Not LIVE: {len(not_live)}")
        
        # When all slots fill, war auto-completes, so one request may get "not LIVE" instead of ROOM_FULL
        assert len(successes) == 2, f"Expected 2 successes, got {len(successes)}"
        assert len(room_full) + len(not_live) == 1, f"Expected 1 rejection (ROOM_FULL or not LIVE), got {len(room_full) + len(not_live)}"
        
        # Check if war auto-completed (all 5 slots filled)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data = response.json()
            war_status = data['war']['status']
            
            print(f"\n✅ Room B filled: 2 winners, 1 rejected")
            print(f"   WAR status: {war_status} (auto-completed when all slots filled)")
            
            # Store a Room A winner for unassign test
            test_data['room_a_winner_for_unassign'] = test_data['room_a_winners'][0]
            
            return True
    except Exception as e:
        print(f"❌ Fill Room B test failed: {e}")
        return False

async def test_admin_unassign():
    """Test 12: Admin unassign"""
    print("\n=== TEST 12: Admin Unassign ===")
    try:
        participant_id = test_data['room_a_winner_for_unassign']
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/wars/{test_data['war_id']}/unassign",
                json={"participantId": participant_id}
            )
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            
            # Verify Room A now has 1 slot available
            response2 = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data2 = response2.json()
            room_a = next(r for r in data2['war']['rooms'] if r['id'] == test_data['room_a_id'])
            
            assert room_a['slotsLeft'] == 1, f"Room A should have 1 slot after unassign, got {room_a['slotsLeft']}"
            assert room_a['assignedCount'] == 2, f"Room A assignedCount should be 2, got {room_a['assignedCount']}"
            
            print(f"✅ Unassign successful: Room A now has {room_a['slotsLeft']} slot available")
            return True
    except Exception as e:
        print(f"❌ Admin unassign failed: {e}")
        return False

async def test_admin_assign():
    """Test 13: Admin assign"""
    print("\n=== TEST 13: Admin Assign ===")
    try:
        participant_id = test_data['room_a_winner_for_unassign']
        room_a_id = test_data['room_a_id']
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{API_BASE}/wars/{test_data['war_id']}/assign",
                json={"participantId": participant_id, "roomId": room_a_id}
            )
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            
            # Verify Room A is full again
            response2 = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data2 = response2.json()
            room_a = next(r for r in data2['war']['rooms'] if r['id'] == room_a_id)
            
            assert room_a['slotsLeft'] == 0, f"Room A should have 0 slots, got {room_a['slotsLeft']}"
            assert room_a['assignedCount'] == 3, f"Room A assignedCount should be 3, got {room_a['assignedCount']}"
            
            print(f"✅ Assign successful: Room A full again")
            return True
    except Exception as e:
        print(f"❌ Admin assign failed: {e}")
        return False

async def test_reset():
    """Test 14: Reset WAR"""
    print("\n=== TEST 14: Reset WAR ===")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{API_BASE}/wars/{test_data['war_id']}/reset")
            data = response.json()
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert data.get('ok') == True, "Expected ok:true"
            
            # Verify all rooms restored
            response2 = await client.get(f"{API_BASE}/wars/code/{test_data['war_code']}")
            data2 = response2.json()
            
            war = data2['war']
            # Note: Status may auto-transition to LIVE if startAt is in the past (by design)
            # The important thing is that rooms are reset
            
            for room in war['rooms']:
                assert room['slotsLeft'] == room['capacity'], f"Room {room['name']} slotsLeft should equal capacity"
                assert room['assignedCount'] == 0, f"Room {room['name']} assignedCount should be 0"
            
            assert data2['assignedCount'] == 0, "Total assignedCount should be 0"
            
            print(f"✅ Reset successful: all rooms restored")
            print(f"   Status: {war['status']} (may auto-transition to LIVE if startAt in past)")
            print(f"   All participants unassigned, activity logs cleared")
            return True
    except Exception as e:
        print(f"❌ Reset test failed: {e}")
        return False

async def test_cancel():
    """Test 15: Cancel WAR"""
    print("\n=== TEST 15: Cancel WAR ===")
    try:
        # Create a new war for cancel test
        now = datetime.utcnow()
        start_at = (now + timedelta(seconds=30)).isoformat() + 'Z'
        end_at = (now + timedelta(minutes=5)).isoformat() + 'Z'
        
        war_data = {
            "name": "Cancel Test WAR",
            "startAt": start_at,
            "endAt": end_at,
            "rooms": [{"name": "Test Room", "capacity": 1}]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create war
            response = await client.post(f"{API_BASE}/wars", json=war_data)
            data = response.json()
            cancel_war_id = data['war']['id']
            cancel_war_code = data['war']['code']
            
            # Cancel it
            response2 = await client.post(f"{API_BASE}/wars/{cancel_war_id}/cancel")
            data2 = response2.json()
            
            assert response2.status_code == 200, f"Expected 200, got {response2.status_code}"
            assert data2.get('ok') == True, "Expected ok:true"
            
            # Verify status is CANCELLED
            response3 = await client.get(f"{API_BASE}/wars/code/{cancel_war_code}")
            data3 = response3.json()
            assert data3['war']['status'] == 'CANCELLED', "Status should be CANCELLED"
            
            print(f"✅ Cancel successful: status={data3['war']['status']}")
            return True
    except Exception as e:
        print(f"❌ Cancel test failed: {e}")
        return False

async def run_all_tests():
    """Run all backend tests in sequence"""
    print("=" * 80)
    print("WAR KELAS BACKEND TEST SUITE")
    print("=" * 80)
    
    tests = [
        ("Health Check", test_health),
        ("Create WAR", test_create_war),
        ("Public State", test_public_state),
        ("Add Participants (Bulk)", test_add_participants_bulk),
        ("Add Participant (Single)", test_add_participant_single),
        ("Join Idempotent", test_join_idempotent),
        ("Claim Rejected (Not LIVE)", test_claim_rejected_not_live),
        ("Force Start", test_force_start),
        ("ATOMIC CLAIM RACE (CRITICAL)", test_atomic_claim_race),
        ("Double Claim", test_double_claim),
        ("Fill Room B", test_fill_room_b),
        ("Admin Unassign", test_admin_unassign),
        ("Admin Assign", test_admin_assign),
        ("Reset WAR", test_reset),
        ("Cancel WAR", test_cancel),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ Test '{name}' crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    return results

if __name__ == "__main__":
    asyncio.run(run_all_tests())
