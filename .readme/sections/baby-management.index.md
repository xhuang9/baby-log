---
last_verified_at: 2026-01-08T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/
  - src/actions/babyActions.ts
---

# Baby Management Overview

## Purpose
This section documents the baby management UI system, covering the flattened single-page interface pattern, baby editing functionality, and the unique patterns for multi-baby switching without traditional navigation hierarchies.

## Scope
The baby management system provides a mobile-first, PWA-optimized interface for:

1. **Viewing all accessible babies** in a single view with visual hierarchy
2. **Switching default baby** via inline actions without page navigation
3. **Editing baby profiles** with progressive disclosure (collapsible sections)
4. **Access control** enforcing owner/editor permissions for editing

Key architectural decisions:
- **Flattened UI:** No list-detail pattern; all babies shown on one page with inline actions
- **Dual-table updates:** Baby profile fields and user-specific preferences updated separately
- **Progressive disclosure:** Optional form fields hidden in collapsible sections
- **Inline error handling:** Operation errors displayed above content, no toast notifications

## Chunks

### `baby-management.flattened-ui-pattern.md`
**Content:** Single-page baby management interface with inline switch actions

**Key patterns:**
- Combined list + actions view (no separate detail pages)
- Visual hierarchy for current vs. other babies
- Inline switch action with optimistic UI
- Age formatting utility (colocated with component)
- No intermediate confirmation pages

**Read when:**
- Building or modifying the baby list interface
- Understanding the switch baby workflow
- Working on `/settings/babies` page
- Adding UI features to baby management
- Debugging baby switching or display issues

---

### `baby-management.edit-functionality.md`
**Content:** Baby profile editing with dual-table updates and access control

**Key patterns:**
- Partial update pattern (only provided fields updated)
- Dual-table update: `babies` table + `baby_access` table
- Collapsible optional sections (progressive disclosure)
- Per-user caregiver labels
- Access control: owners/editors only
- Date and number field transformations

**Read when:**
- Implementing or modifying the edit baby form
- Working with `/settings/babies/[babyId]` route
- Understanding caregiver label scoping
- Adding new editable fields to baby profiles
- Debugging form submission or validation
- Understanding partial update patterns

---

## Related Sections
- `.readme/sections/account-management.index.md` - Multi-baby selection and default baby resolution
- `.readme/sections/database.index.md` - Baby schema and access patterns
- `.readme/sections/architecture.index.md` - Route structure and component patterns
