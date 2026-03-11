# Spec Skill Changelog

## v1.2.0 (2025-10-26)

### Major: Progressive Disclosure Architecture
**Problem**: Previous versions embedded verbose validation templates inline, resulting in:
- ~7000 tokens (exceeding 5000 token budget)
- Context window overload for agents
- Reduced focus on critical rules

**Solution**: Progressive disclosure pattern
- **Core skill** (skill.md): ~4600-5000 tokens
  - Automatic tier detection (trigger keywords)
  - 7 mandatory rules (compact: ~20 lines)
  - Reference to external workflow
- **External workflow** (validation-workflow.md): Loaded only when Tier ≥2 detected
  - Detailed lane templates (7 validation lanes)
  - Step-by-step matrices and traces
  - Examples and common pitfalls

### Key Changes

#### Added
- Automatic tier detection based on trigger keywords (retry, session, callbacks)
- 7 mandatory rules for Tier ≥2 session lifecycles:
  1. Attempt guards (prevent stale events)
  2. Mode demotion ban (during retry)
  3. Two-trace execution (prove guards work)
  4. Retry reassertion (clean slate)
  5. Phase-resource invariants (coherence)
  6. Terminal hygiene (no leaks)
  7. Observability (attemptId logging)
- External validation workflow reference
- Example spec: voice-session-retry.example.spec

#### Changed
- Compacted self-check to reference 7 rules
- Moved detailed lane templates to external file
- Reduced main skill from ~1015 to ~986 lines
- Reduced token count from ~7000 to ~4600-5000

#### Design Principles
- **Context budget is precious**: Keep skill concise
- **Load details on-demand**: External references for deep validation
- **Enforce rigor mechanically**: Triggers activate mandatory rules
- **Focus agent thinking**: Narrow validation lanes vs. monolithic review

### Migration Guide
- **No breaking changes**: Existing specs remain valid
- **New process specs**: Will auto-detect tier if triggers present
- **Agent workflow**: Loads validation-workflow.md when Tier ≥2 detected

### Files
- `skill.md`: Main skill definition (~25KB, ~4600-5000 tokens)
- `validation-workflow.md`: Detailed validation templates (~6.4KB, loaded on-demand)
- `examples/voice-session-retry.example.spec`: Reference implementation

---

## v1.1.0 (previous)
- Initial process workflow support
- GEM and trace documentation
- Universal authoring guide

## v1.0.0 (initial)
- Core DSL and vocabulary
- Component/Query/Mutation templates
- Basic patterns
