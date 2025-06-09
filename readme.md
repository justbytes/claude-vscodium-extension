![banner_claudevscodium](/assets/banner_claudevscodium.png)

# 🤖 Claude AI Assistant for VSCodium
A powerful VSCode/VSCodium extension that integrates Anthropic's Claude AI directly into your development environment. Chat with Claude about your code, get instant explanations, and receive coding assistance without leaving your editor.

## 🌐 Live Extension
**[Download from Open VSX Registry](https://open-vsx.org/extension/bytes/claude-vscodium)**

*Note: Requires Anthropic API key*

[Watch demo](https://youtu.be/Ymnvga__8i4)

## ✨ Features

**🔧 AI-Powered Code Assistance**<br>
Chat with Claude directly in your editor for real-time coding help and explanations. Ask questions about your project files and get instant assistance without context switching.

**📎 File Attachment Support**<br>
Upload and analyze code files, documents, and assets with drag-and-drop functionality. Supports text files, JavaScript, TypeScript, JSON, HTML, CSS, and more.

**💬 Advanced Chat Management**<br>
Persistent chat history across sessions with multiple conversation threads. Smart context management with relevance filtering ensures meaningful conversations.

**🎨 Syntax Highlighting**<br>
Full code formatting with highlight.js integration supporting 9+ programming languages. Copy-to-clipboard functionality for all code blocks.

**🧠 Intelligent Context Management**<br>
Automatic message relevance filtering and token optimization for better responses. Supports up to 4000-token context windows for detailed conversations.

**📱 Responsive Interface**<br>
Clean, VSCode-themed UI design with auto-resizing text areas, loading indicators, and comprehensive error handling.

## 🛠 Tech Stack

**Frontend & Extension**
- TypeScript
- VSCode Extension API  
- HTML5/CSS3
- JavaScript ES6+

**AI Integration**
- Anthropic AI SDK
- Claude 3.7 Sonnet model
- Custom message processing

**Development Tools**
- Webpack/ESBuild bundling
- Highlight.js for syntax highlighting
- Git version control

## 🏗 Architecture

**Modular Component System**<br>
This extension uses a sophisticated 6-component architecture designed for scalability and maintainability:

**App Controller**<br>
Manages webview lifecycle and message routing. Handles AI API communication and response processing while coordinating between chat storage and UI components.

**ChatArchive Storage**<br>
Persistent chat history using VSCode Memento API with CRUD operations for chat management, message threading, and session organization.

**Webview Renderer**<br>
Dynamic HTML/CSS/JS interface generation with syntax highlighting, code formatting, and file attachment processing and display.

**Context Management**<br>
Intelligent message selection and relevance filtering with token optimization for improved AI responses and conversation threading with automatic cleanup.

This architecture ensures fast user experience while maintaining chat persistence and preventing loss of conversation history.

## 🚀 Quick Start

**Prerequisites**
- VSCode or VSCodium 1.80.0+
- Anthropic API key ([get one here](https://console.anthropic.com))
- API credits on your Anthropic account

### 1. Installation

**From Open VSX Registry** (Recommended)<br>
Search for "Claude AI Assistant" in your editor's extension marketplace.

**Manual Installation**
```bash
# Clone repository
git clone https://github.com/justbytes/claude-vscodium-extension

# Install dependencies
npm install

# Build extension
npm run build
```

### 2. Setup API Key

1. Open VSCode/VSCodium settings (`Cmd+,` or `Ctrl+,`)
2. Search for "claude"  
3. Enter your Anthropic API key in the "Claude AI: Api Key" input field

### 3. Start Chatting

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Search for "Ask Claude"
3. Start chatting with Claude about your code!

### 4. Development Setup (Optional)

For local development and testing:

```bash
# Compile TypeScript
npm run compile
```

1. Open the `/out/extension.js` file in VSCode
2. Press `F5` to launch Extension Development Host
3. Configure your API key in the development instance settings
4. Test your changes in the new window

## 🔧 Chat Management

**Creating New Chats**<br>
Click the "+" button in the navigation bar. Each chat maintains separate conversation history for organized development discussions.

**Managing Chat History**<br>
Click the "🕑" button to view all previous chats. Load any previous conversation to continue where you left off, or delete chats you no longer need.

**File Attachments**<br>
Click the "📎" button to attach files. Supports text-based files for analysis, and Claude will automatically analyze attached files and provide insights.

## 🔮 API Configuration

Current API settings optimized for best performance:

```javascript
const response = await anthropic.messages.create({
    model: 'claude-3-7-sonnet-20250219',
    max_tokens: 4000,
    messages: previousMessages,
    system: systemPrompt,
    temperature: 1
});
```

**Key Features**
- 4000 token response limit for detailed answers
- Intelligent context management for conversation continuity  
- Error handling with user-friendly feedback
- Automatic retry logic for network issues

## 📊 Extension Capabilities

**Code Analysis**<br>
Explain complex code logic and patterns, suggest optimizations and best practices, provide debug assistance and error resolution.

**Project Assistance**<br>
Architecture recommendations, code review and improvements, documentation generation help.

**Learning Support**<br>
Programming concept explanations, framework and library guidance, step-by-step coding tutorials.

## 🤝 Contributing

Contributions welcome! Please fork the repository and submit a pull request with your improvements.

**How to Contribute**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the developer community**
