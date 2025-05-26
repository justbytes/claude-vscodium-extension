# VsCodium Claude Extension

AI-powered coding assistant using Anthropic's Claude.

## Features
- Chat with Claude directly in VS Codium
- File attachment support
- Chat history
- Syntax highlighting

## Setup
1. Install the extension
2. Get a Claude API key from Anthropic
3. Fund the API via the Anthropic console
3. Open the editors settings `CMD+,` and search for "claude" then enter your API key in "Claude AI: Api Key" input

## Usage
- Press `Ctrl+Shift+P` | `CMD+Shift+P` and search "Ask Claude"
- Start chatting with Claude about your code!


## Steps to run locally

1. Clone the repo

2. Install dependencies:  ```npm install```

3. Build the extension: ```npm run compile```

4. Open the `/out/extension.js` and press f5 to run the extension

5. In the extension open the settings `CMD+,`, search for "claude", and enter your Anthropic API key in the input

6. Press `Ctrl+Shift+P` | `CMD+Shift+P` and search "Ask Claude"


## VSX Site

https://open-vsx.org/extension/bytes/claude-vscodium


## API Settings

These are the current API options:

```
const response = await this._anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        messages: previousMessages,
        system: systemPrompt,
        temperature: 1,
        thinking: { type: 'enabled', budget_tokens: 2000 },
})
```