#!/bin/bash
# Hook to append "use ultrathink" to user prompts ending with -u flag

# Read input from stdin
input=$(cat)

# Extract prompt from JSON using jq
prompt=$(echo "$input" | jq -r '.prompt // empty')

# Only append if prompt ends with -u flag
if [[ "$prompt" =~ -u$ ]]; then
    # Append ultrathink instruction to the prompt
    echo "$input" | jq '.prompt += "\n\nuse the maximum amount of ultrathink. Take all the time you need. It'\''s much better if you do too much research and thinking than not enough."'
else
    # Pass through unchanged if no -u flag
    echo "$input"
fi