# DECIDE Mode - Default Mode

**Command:** `do des` (default mode)

## Purpose
Analyze incoming request and automatically selects the most appropriate workflow mode based on task characteristics.

### Auto-Selection Logic (evaluated in order):

1. **🐞 Error Fixing** → `fix`
   - Contains: "error", "fix", "broken", stack traces, linter errors
   
2. **🧪 Testing** → `do test`
   - Contains: "test", "run tests", "check if works", "verify functionality"
   
3. **⚡ Quick Iteration** → `do builditer`
   - Simple changes: ≤30 LOC, ≤2 files, >95% confidence
   
4. **🔍 Research Needed** → `do res`
   - Everything else: complex, unclear, new features

## Mode Transitions

After DECIDE selects a mode, the typical progressions are:

### New Feature Path
`do res` → (`do inn`) → `do planpoc` → `do buildpoc` → `do reviewpoc` → `do planmvp` → `do buildmvp` → `do test` → `do reviewmvp`

### Enhancement Path  
`do res` → `do planmvp` → `do buildmvp` → `do test` → `do reviewmvp`

### Quick Fix Path
`do builditer` → `do test`



## Reference
- **Quick Reference:** `.claude/quick-reference.md`
- **Technical Rules:** `Cursor Rules/convex/` (always check if writing Convex code)