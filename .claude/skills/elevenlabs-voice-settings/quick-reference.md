# Voice Settings Quick Reference

Fast command reference for common voice settings tasks.

## Quick Commands

### Fetch Available Voices
```bash
curl "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```

### Update Agent Speed (via API)
```bash
curl -X PATCH "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"conversation_config": {"tts": {"speed": 1.1}}}'
```

### Update Agent Config (via CLI)
```bash
# Pull latest config
agents pull --update

# Edit agent_configs/prod/support_agent.json
# Modify tts section

# Push changes
agents push
```

### Get Current Agent Config
```bash
agents list
agents status
```

## Voice Settings Cheatsheet

| Setting | Range | Recommended | Effect |
|---------|-------|-------------|--------|
| **stability** | 0-1 | 0.5-0.7 | Lower = emotional, Higher = consistent |
| **similarity_boost** | 0-1 | 0.75 | How closely to match voice |
| **speed** | 0.7-1.2 | 0.9-1.1 | Speech rate multiplier |
| **optimize_streaming_latency** | 0-4 | 3 | Higher = faster, lower quality |

## Restart Decision Tree

```
Setting Changed?
├─ voice_id
│  └─ Use runtime override → No restart needed ✅
├─ speed
│  └─ Update config → Restart required ⚠️
├─ stability
│  └─ Update config → Restart required ⚠️
└─ similarity_boost
   └─ Update config → Restart required ⚠️
```

## Common Tasks

### Task: Change Voice Immediately
```typescript
// In useConversation hook
overrides: {
  tts: {
    voiceId: "new_voice_id_here"
  }
}
```

### Task: Update Multiple Settings
```bash
# Edit agent_configs/prod/support_agent.json
{
  "conversation_config": {
    "tts": {
      "voice_id": "pNInz6obpgDQGcFmaJgB",
      "speed": 1.0,
      "stability": 0.65,
      "similarity_boost": 0.75,
      "model_id": "eleven_turbo_v2_5"
    }
  }
}

# Push and restart
agents push
```

### Task: Create Voice Profile Preset
```typescript
// Store in Convex
const voiceProfiles = {
  professional: {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    speed: 1.0,
    stability: 0.7,
    similarity: 0.8
  },
  casual: {
    voiceId: "AZnzlk1XvdvUeBnXmlld",
    speed: 1.1,
    stability: 0.5,
    similarity: 0.75
  }
};
```

## UI Integration Snippets

### Replace Mock Voices with Real Data
```typescript
// Before (mock)
const VOICES = [
  { id: 'young-female', name: 'Aria', type: 'Young Female' }
];

// After (real)
const [voices, setVoices] = useState<Voice[]>([]);

useEffect(() => {
  fetch('/api/elevenlabs/voices')
    .then(r => r.json())
    .then(data => setVoices(data.voices));
}, []);
```

### Add Stability/Similarity Controls
```tsx
{/* Add to SettingsPanel.tsx after Speed section */}
<div className="space-y-3">
  <label>Stability: {stability.toFixed(2)}</label>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={stability}
    onChange={(e) => onUpdateSettings({
      stability: parseFloat(e.target.value)
    })}
  />
</div>
```

### Show Restart Indicator
```tsx
{needsRestart && (
  <div className="flex items-center gap-2 text-yellow-500">
    <AlertCircle className="w-4 h-4" />
    <span>Restart to apply changes</span>
    <button onClick={handleRestart}>Restart Now</button>
  </div>
)}
```

## Validation Functions

```typescript
// Copy-paste ready validators
const validateVoiceSettings = {
  speed: (v: number) => v >= 0.7 && v <= 1.2,
  stability: (v: number) => v >= 0 && v <= 1,
  similarity: (v: number) => v >= 0 && v <= 1,

  voiceLanguageMatch: (voiceId: string, langCode: string, voices: Voice[]) => {
    const voice = voices.find(v => v.voice_id === voiceId);
    return voice?.labels?.language === langCode.split('-')[0];
  }
};
```

## Troubleshooting

### Voice override not working
```bash
# Check: Is override enabled in agent security settings?
# Fix: ElevenLabs Dashboard → Agent → Security → Enable "Voice ID Override"
```

### Changes not applying
```bash
# Voice changes: Check override is set in startSession()
# Speed/stability: Verify config pushed and session restarted
agents status  # Check if push succeeded
```

### API errors
```bash
# Check API key
echo $ELEVENLABS_API_KEY

# Test connection
curl -I "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```

## Performance Tips

- **Cache voices**: Fetch once per 24 hours
- **Batch config updates**: Change multiple settings at once
- **Use voice_id override**: Faster than full restart
- **Optimize latency**: Set to 3-4 for voice chat

## Links

- **Full Documentation**: [docs-index.md](./docs-index.md)
- **Main Skill**: [skill.md](./skill.md)
- **Session Manager**: [../elevenlabs-session-manager/skill.md](../elevenlabs-session-manager/skill.md)
