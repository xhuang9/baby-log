# Operations Layer - Debugging & Testing Guide

## Baby Update Issue - Debugging Steps

I've added console logs to help debug why baby updates aren't syncing to PostgreSQL. Here's how to investigate:

### 1. Check Browser Console

When you update a baby name, watch for these log messages:

```
[SYNC] Processing baby mutation: { mutationId, entityId, op, userId }
[SYNC] Applying baby update to DB: { numericId, name }
[SYNC] Baby updated successfully: { id, name }
```

If you see these logs, the mutation reached the server successfully.

### 2. Check Browser DevTools > Application > IndexedDB

1. Open `baby-log-db` database
2. Check the `outbox` table
3. Look for entries with:
   - `entityType: 'baby'`
   - `op: 'update'`
   - `status: 'pending'` or `'syncing'`

### 3. Check Network Tab

1. Filter for `/api/sync/push` requests
2. Check the request payload - should contain:
   ```json
   {
     "mutations": [{
       "mutationId": "...",
       "entityType": "baby",
       "entityId": "1",
       "op": "update",
       "payload": {
         "id": 1,
         "name": "New Name",
         ...
       }
     }]
   }
   ```
3. Check the response - should be:
   ```json
   {
     "results": [{
       "mutationId": "...",
       "status": "success"
     }],
     "newCursor": 123
   }
   ```

### 4. Common Issues & Solutions

#### Issue: Mutation not reaching server
- **Check**: Is `flushOutbox()` being called? (Line 288 in `baby.ts`)
- **Check**: Is the outbox entry created? Look in IndexedDB `outbox` table
- **Solution**: Verify network connectivity, check console for errors

#### Issue: Access Denied Error
- **Check console for**: `[SYNC] Baby mutation access denied`
- **This means**: The user doesn't have owner/editor access to the baby
- **Solution**: Verify `babyAccess` table has correct `accessLevel` for the user

#### Issue: Mutation rejected with "Baby not found"
- **This means**: The baby ID in the mutation doesn't exist in PostgreSQL
- **Possible cause**: Baby was created with a temp ID that hasn't synced yet
- **Solution**: Ensure baby creation sync completed before updating

#### Issue: Conflict detected
- **Check response for**: `"status": "conflict"`
- **This means**: Server has newer data (LWW conflict resolution)
- **Solution**: This is expected behavior - local data will be replaced with server data

### 5. Verify PostgreSQL Directly

If logs show success but PostgreSQL isn't updated:

```sql
-- Check if baby exists
SELECT * FROM babies WHERE id = 1;

-- Check recent updates
SELECT * FROM babies WHERE id = 1 ORDER BY updated_at DESC;

-- Check sync events
SELECT * FROM sync_events
WHERE entity_type = 'baby'
  AND entity_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suite
```bash
# Baby operations tests
pnpm test baby.test.ts

# Feed log operations tests
pnpm test feed-log.test.ts
```

### Run Tests in Watch Mode
```bash
pnpm test --watch
```

### Run Tests with Coverage
```bash
pnpm test --coverage
```

## Test Structure

Tests are organized by operation type:

```
src/services/operations/
├── baby.test.ts           # Tests for baby CRUD operations
│   ├── createBaby()
│   ├── updateBabyProfile()
│   ├── setDefaultBaby()
│   └── deleteBaby()
├── feed-log.test.ts       # Tests for feed log operations
│   └── createFeedLog()
└── ...
```

### What's Tested

Each test suite covers:
- ✅ **Happy path**: Successful operations
- ✅ **Validation**: Input validation failures
- ✅ **Authentication**: User auth checks
- ✅ **Authorization**: Access control checks
- ✅ **Side effects**: IndexedDB writes, outbox enqueues, store updates

### Mocking Strategy

Tests mock:
- `@/lib/local-db` - IndexedDB operations
- `@/services/sync-service` - Background sync
- `@/stores/*` - Zustand stores
- `crypto.randomUUID()` - For consistent test IDs

## Manual Testing Checklist

### Baby Update Flow
1. ✅ Update baby name in UI
2. ✅ Check IndexedDB `babies` table - should update immediately
3. ✅ Check IndexedDB `outbox` table - should have mutation entry
4. ✅ Wait 1-2 seconds for auto-sync
5. ✅ Check Network tab for `/api/sync/push` request
6. ✅ Check PostgreSQL - baby name should be updated
7. ✅ Refresh page - name should persist

### Feed Log Creation Flow
1. ✅ Create feed log in UI
2. ✅ Check IndexedDB `feedLogs` table - should appear immediately
3. ✅ Check IndexedDB `outbox` table - should have mutation entry
4. ✅ Wait 1-2 seconds for auto-sync
5. ✅ Check Network tab for `/api/sync/push` request
6. ✅ Check PostgreSQL - feed log should exist
7. ✅ Refresh page - feed log should persist

## Debugging Tips

### Enable Verbose Logging

Add this to your `localStorage` for more detailed logs:

```javascript
localStorage.setItem('debug', 'sync:*');
```

### Check Outbox Status

Run this in console to see outbox state:

```javascript
// Open IndexedDB
const request = indexedDB.open('baby-log-db');
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction('outbox', 'readonly');
  const store = tx.objectStore('outbox');
  const getAllRequest = store.getAll();

  getAllRequest.onsuccess = () => {
    console.table(getAllRequest.result);
  };
};
```

### Manually Trigger Sync

If auto-sync isn't working, trigger it manually:

```javascript
// In browser console
import { flushOutbox } from '@/services/sync-service';
await flushOutbox();
```

## Next Steps

If baby updates still aren't syncing after checking the above:

1. Check server logs for errors in the `/api/sync/push` handler
2. Verify database connection and permissions
3. Check if Drizzle ORM is configured correctly
4. Verify `babiesSchema` table structure matches expectations
5. Test with a simple curl request to isolate the issue

## Support

If issues persist, provide:
1. Console logs (including `[SYNC]` prefixed messages)
2. Network tab screenshot showing `/api/sync/push` request/response
3. IndexedDB `outbox` table contents
4. PostgreSQL query result for the baby record
