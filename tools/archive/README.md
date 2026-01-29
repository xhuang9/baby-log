# Archived Tools

This directory contains tools that were useful for one-time audits but are not recommended for ongoing maintenance.

## Code Snippet Verification Tool

**Files:**
- `check-snippets.py` - Python script for validating code snippets in `.readme/` documentation
- `CODE_SNIPPET_VERIFICATION_REPORT.md` - Results from January 2026 audit

**What it does:**
- Scans all markdown files in `.readme/`
- Extracts code blocks with explicit file references
- Compares snippets against actual source code
- Reports mismatches using 80% fuzzy matching

**Why it's archived:**
The tool successfully identified 4 legitimate documentation drift issues and applied correct fixes:
1. ESLint config - incomplete Tailwind path
2. Test fixtures - abbreviated TEST_USERS object
3. E2E seed fixture - missing function implementation
4. Palette page - missing OKLCH color migration notes

However, the tool has limitations that make it less valuable for ongoing use:
- Hardcoded absolute paths (not portable)
- Can't distinguish intentional simplifications from drift
- High false positive rate on pedagogical examples
- Arbitrary fuzzy matching threshold
- High maintenance overhead

**Better alternatives:**
- Use `docs-architect` agent for proactive doc updates
- Periodic manual reviews of high-traffic sections
- User feedback to surface confusing documentation
- Clear markers for simplified examples (`// Simplified example`, `// Pseudo-code`)

**Validation date:** January 30, 2026
**Status:** One-time audit completed, tool preserved for reference
