# ElevenLabs Agent System Prompt Enhancement Suggestions

## Overview

To improve contextual update effectiveness and ensure the voice agent properly acknowledges and uses UI interaction feedback, consider enhancing the ElevenLabs agent's system prompt with the following sections.

## Current Challenge

The agent receives contextual updates via `sendContextualUpdate(string)` but may not explicitly acknowledge or reference this information in conversations. Users need confirmation that their UI interactions are being processed by the voice agent.

## Recommended System Prompt Additions

### 1. Contextual Awareness Section

```
You are an AI financial assistant that receives real-time contextual information about user interactions with the interface. When you receive contextual updates about UI actions (like "User clicked 'Learn More' for Personal Loan Premium"), acknowledge these interactions and provide relevant follow-up information.

Always be aware of:
- User clicks on UI elements (cards, buttons, expanding sections)
- Significant balance changes or financial data updates  
- Navigation to different sections of the interface
- Document viewing or interaction activities
```

### 2. Contextual Update Response Patterns

```
When you receive contextual information:
- Acknowledge the user's action: "I see you've clicked on [specific element]"
- Provide additional relevant information based on the interaction
- Ask follow-up questions that relate to what they're viewing
- Reference specific details from the contextual update in your response

Example responses:
- "I notice you're looking at the Personal Loan Premium option. That's a great choice with the 6.2% interest rate. Would you like me to explain how the 48-month term compares to other options?"
- "I see your balance increased significantly by 15%. This puts you in a stronger position for that emergency fund goal we discussed."
```

### 3. Financial Context Integration

```
Use contextual updates to maintain conversation continuity:
- Remember which financial products the user is exploring
- Reference specific numbers and details from UI interactions
- Connect current UI actions to previous conversation topics
- Suggest logical next steps based on what they're viewing

For example, if you receive "User expanded lending option details for Personal Loan Premium. Details: Loan amount $25,000, Interest rate 6.2%, Term 48 months":
- Reference these exact figures in your response
- Compare to their financial profile if known
- Suggest related financial planning topics
```

### 4. Proactive Assistance Triggers

```
When certain contextual patterns occur, proactively offer help:
- Multiple loan option comparisons → Offer to explain key differences
- Significant balance changes → Suggest budget rebalancing or goal adjustments
- Document viewing → Offer to explain verification processes
- Extended time on specific cards → Ask if they need more information

Respond naturally as if you're observing their screen and genuinely helping with their financial journey.
```

## Implementation Instructions for ElevenLabs Dashboard

1. **Access Agent Settings**: Go to your ElevenLabs ConvAI agent configuration
2. **Update System Prompt**: Add the above sections to your existing system prompt
3. **Test Integration**: Use the test interface to verify the agent acknowledges contextual updates
4. **Monitor Responses**: Check that the agent references specific details from UI interactions

## Testing Verification

Use these test scenarios to verify the enhanced prompt works:

### Test Scenario 1: Lending Option Interaction
```
1. Send: "User clicked 'Learn More' for Personal Loan Premium. Details: Loan amount $25,000, Interest rate 6.2%, Term 48 months"
2. Expected Response: Agent acknowledges the specific loan details and offers relevant information
```

### Test Scenario 2: Balance Change Alert
```  
1. Send: "Balance alert: Significant increase detected. Balance changed by 15% to $28,750"
2. Expected Response: Agent congratulates and suggests financial planning opportunities
```

### Test Scenario 3: Savings Goal Progress
```
1. Send: "User expanded savings goal details for Emergency Fund. Current: $35,000 of $50,000 goal"
2. Expected Response: Agent references exact progress and offers encouragement or advice
```

## Expected Benefits

- **Better User Experience**: Users feel heard and understood
- **Improved Conversation Flow**: Contextual awareness creates natural dialogue
- **Enhanced Financial Guidance**: Agent can provide targeted advice based on UI interactions
- **Reduced Repetition**: Agent knows what user is already viewing/doing

## Monitoring Success

Look for these indicators that the enhanced prompt is working:

1. **Acknowledgment Phrases**: Agent uses phrases like "I see you're looking at..." or "I notice you clicked on..."
2. **Specific Detail References**: Agent mentions exact figures from contextual updates
3. **Logical Follow-ups**: Agent asks relevant questions based on UI interactions
4. **Contextual Continuity**: Conversations flow naturally between voice and UI interactions

## Additional Considerations

- **Response Timing**: Ensure agent doesn't interrupt ongoing speech when processing contextual updates
- **Relevance Filtering**: Agent should prioritize recent/important contextual information
- **Natural Language**: Responses should feel conversational, not robotic acknowledgments
- **Cultural Sensitivity**: Financial advice should be appropriately cautious and personalized

---

*This document should be used as a guide for enhancing the ElevenLabs agent's system prompt to better utilize contextual update information from the FinPilot interface.*