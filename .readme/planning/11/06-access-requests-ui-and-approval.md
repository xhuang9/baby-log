# 06 Access Requests UI and Approval

## Goal
Expose access request creation for invitees and approval for owners.

## Steps
1. Bootstrap no baby:
   - Add a request access form (target email, access level, message).
   - Use `createAccessRequest` and show `BootstrapPendingRequest` state.
2. Owner view:
   - List incoming requests in the sharing section.
   - Approve or reject using existing actions.
3. After approval:
   - Requester sees new access on next bootstrap.
   - Set `defaultBabyId` if this is their first access.
4. Guard rails:
   - Prevent requests to self.
   - Allow cancel of outgoing requests. (Should be done in Baby Edit Page)
