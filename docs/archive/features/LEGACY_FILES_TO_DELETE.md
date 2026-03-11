# Legacy Files to Delete

These files are part of the old architecture and are no longer needed after implementing the single ElevenLabsProvider:

## Files marked for deletion:

1. **`/src/features/voice/components/VoiceButton.tsx`**
   - Legacy voice component with duplicate conversation instance
   - Replaced by provider-based approach

2. **`/app/chat/page.tsx`**
   - Legacy chat page that uses VoiceButton
   - All users now use `/voice-chat` as primary interface

3. **`/app/test-tools/page.tsx`**
   - Old test tools page
   - Replaced by `/orchestration/tools`

## Deletion Commands:

```bash
# Delete VoiceButton component
rm /Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project/src/features/voice/components/VoiceButton.tsx

# Delete legacy chat page
rm /Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project/app/chat/page.tsx

# Delete old test-tools page
rm /Users/yuriy.mykhasyak/Documents/MyApps/FinPilot/FinPilot-Project/app/test-tools/page.tsx
```

## Verification:

After deletion, verify that:
1. No imports of VoiceButton remain
2. No links to `/chat` or `/test-tools` remain
3. The application still builds successfully