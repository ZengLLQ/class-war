#!/usr/bin/env python3
"""
Diagnostic script to investigate test failures
"""
import asyncio
import httpx
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv('/app/.env')
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://claim-kelas.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

async def investigate_fill_room_b():
    """Investigate why Fill Room B test failed"""
    print("\n=== INVESTIGATING FILL ROOM B ISSUE ===")
    
    # Create a fresh war
    now = datetime.utcnow()
    start_at = (now + timedelta(seconds=60)).isoformat() + 'Z'
    end_at = (now + timedelta(minutes=15)).isoformat() + 'Z'
    
    war_data = {
        "name": "Diagnostic WAR",
        "startAt": start_at,
        "endAt": end_at,
        "rooms": [
            {"name": "ROOM A", "capacity": 3},
            {"name": "ROOM B", "capacity": 2}
        ]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create war
        response = await client.post(f"{API_BASE}/wars", json=war_data)
        war = response.json()['war']
        war_id = war['id']
        war_code = war['code']
        room_a_id = war['rooms'][0]['id']
        room_b_id = war['rooms'][1]['id']
        
        print(f"Created WAR: {war_code}")
        
        # Add 10 participants
        participants_data = {
            "participants": [
                {"name": f"P{i}", "participantCode": f"P{i:03d}"}
                for i in range(1, 11)
            ]
        }
        response = await client.post(f"{API_BASE}/wars/{war_id}/participants", json=participants_data)
        participants = response.json()['inserted']
        print(f"Added {len(participants)} participants")
        
        # Start war
        await client.post(f"{API_BASE}/wars/{war_id}/start")
        print("War started")
        
        # Claim Room A with first 3 participants
        for i in range(3):
            await client.post(f"{API_BASE}/claim", json={
                "participantId": participants[i]['id'],
                "roomId": room_a_id
            })
        print("Room A filled (3/3)")
        
        # Get war state
        response = await client.get(f"{API_BASE}/wars/code/{war_code}")
        data = response.json()
        print(f"\nWar status after Room A filled: {data['war']['status']}")
        print(f"Total assigned: {data['assignedCount']}")
        
        # Now try to fill Room B with 3 unassigned participants (capacity 2)
        unassigned = participants[3:6]  # P4, P5, P6
        print(f"\nAttempting to claim Room B with 3 participants (capacity 2)...")
        
        tasks = []
        for p in unassigned:
            tasks.append(client.post(f"{API_BASE}/claim", json={
                "participantId": p['id'],
                "roomId": room_b_id
            }))
        
        responses = await asyncio.gather(*tasks)
        
        successes = 0
        room_full = 0
        for r in responses:
            data = r.json()
            if data.get('ok'):
                successes += 1
                print(f"  ✅ Success")
            elif data.get('error') == 'ROOM_FULL':
                room_full += 1
                print(f"  ❌ ROOM_FULL")
            else:
                print(f"  ❌ Other error: {data.get('error')}")
        
        print(f"\nResults: {successes} successes, {room_full} ROOM_FULL")
        
        # Check final war state
        response = await client.get(f"{API_BASE}/wars/code/{war_code}")
        data = response.json()
        print(f"\nFinal war status: {data['war']['status']}")
        print(f"Total assigned: {data['assignedCount']}")
        
        room_b = next(r for r in data['war']['rooms'] if r['id'] == room_b_id)
        print(f"Room B: assignedCount={room_b['assignedCount']}, slotsLeft={room_b['slotsLeft']}")

async def investigate_reset():
    """Investigate reset issue"""
    print("\n\n=== INVESTIGATING RESET ISSUE ===")
    
    # Create a war that starts in the past
    now = datetime.utcnow()
    start_at = (now - timedelta(minutes=5)).isoformat() + 'Z'  # Started 5 min ago
    end_at = (now + timedelta(minutes=10)).isoformat() + 'Z'
    
    war_data = {
        "name": "Reset Test WAR",
        "startAt": start_at,
        "endAt": end_at,
        "rooms": [{"name": "Room", "capacity": 2}]
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create war
        response = await client.post(f"{API_BASE}/wars", json=war_data)
        war = response.json()['war']
        war_id = war['id']
        war_code = war['code']
        
        print(f"Created WAR: {war_code}")
        print(f"Initial status: {war['status']}")
        
        # Check status (should auto-transition to LIVE)
        response = await client.get(f"{API_BASE}/wars/code/{war_code}")
        data = response.json()
        print(f"Status after fetch: {data['war']['status']}")
        
        # Reset
        await client.post(f"{API_BASE}/wars/{war_id}/reset")
        print("Reset called")
        
        # Check status immediately after reset
        response = await client.get(f"{API_BASE}/wars/code/{war_code}")
        data = response.json()
        print(f"Status after reset: {data['war']['status']}")
        print(f"StartAt: {data['war']['startAt']}")
        print(f"EndAt: {data['war']['endAt']}")
        
        # The issue: if startAt is in the past, refreshWarStatus will auto-transition to LIVE
        print("\nDiagnosis: Reset sets status to LOBBY, but if startAt is in the past,")
        print("refreshWarStatus() auto-transitions it back to LIVE on next fetch.")

async def main():
    await investigate_fill_room_b()
    await investigate_reset()

if __name__ == "__main__":
    asyncio.run(main())
