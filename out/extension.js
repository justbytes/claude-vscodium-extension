"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// src/extension.ts
const vscode = require("vscode");
const sdk_1 = require("@anthropic-ai/sdk");
function activate(context) {
    let disposable = vscode.commands.registerCommand("vscodium-claude.askClaude", async () => {
        // Get API key from configuration
        const config = vscode.workspace.getConfiguration("claudeAI");
        const apiKey = config.get("apiKey");
        if (!apiKey) {
            vscode.window.showErrorMessage("Please set your Claude API key in settings");
            return;
        }
        // Create Anthropic client
        const anthropic = new sdk_1.default({
            apiKey: apiKey,
        });
        // Get selected text or current file content
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No editor is active");
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection.isEmpty ? undefined : selection);
        // Create webview panel for chat
        const panel = vscode.window.createWebviewPanel("claudeChat", "Chat with Claude", vscode.ViewColumn.Beside, {
            enableScripts: true,
        });
        // Initialize chat interface
        panel.webview.html = getChatHtml();
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "sendMessage":
                    try {
                        const response = await anthropic.messages.create({
                            model: "claude-3-opus-20240229",
                            max_tokens: 1000,
                            messages: [
                                {
                                    role: "user",
                                    content: message.text,
                                },
                            ],
                            system: "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
                        });
                        // Send response back to webview
                        panel.webview.postMessage({
                            command: "receiveMessage",
                            text: response.content[0].text,
                        });
                    }
                    catch (error) {
                        vscode.window.showErrorMessage("Error communicating with Claude: " + error);
                    }
                    break;
            }
        });
    });
    context.subscriptions.push(disposable);
}
function getChatHtml() {
    // Using a template literal for the entire HTML structure
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <style>
              body {
                  margin: 0;
                  padding: 10px;
                  background: var(--vscode-editor-background);
                  color: var(--vscode-editor-foreground);
                  font-family: var(--vscode-font-family);
              }
              #chat-container {
                  display: flex;
                  flex-direction: column;
                  height: 100vh;
              }
              #messages {
                  flex-grow: 1;
                  overflow-y: auto;
                  margin-bottom: 10px;
              }
              .message {
                  margin: 10px 0;
                  padding: 10px;
                  border-radius: 6px;
                  line-height: 1.5;
              }
              .user-message {
                  background: var(--vscode-editor-selectionBackground);
              }
              .claude-message {
                  background: var(--vscode-editor-inactiveSelectionBackground);
              }
              .code-block {
                  background: var(--vscode-editor-background);
                  border: 1px solid var(--vscode-input-border);
                  border-radius: 4px;
                  padding: 10px;
                  margin: 10px 0;
                  position: relative;
                  font-family: var(--vscode-editor-font-family);
              }
              .code-block pre {
                  margin: 0;
                  white-space: pre-wrap;
              }
              .copy-button {
                  position: absolute;
                  top: 5px;
                  right: 5px;
                  padding: 4px 8px;
                  font-size: 12px;
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 3px;
                  cursor: pointer;
                  opacity: 0;
                  transition: opacity 0.2s;
              }
              .code-block:hover .copy-button {
                  opacity: 1;
              }
              .loading {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
                  color: var(--vscode-descriptionForeground);
              }
              .loading-spinner {
                  width: 20px;
                  height: 20px;
                  margin-right: 10px;
                  border: 3px solid var(--vscode-input-border);
                  border-top: 3px solid var(--vscode-button-background);
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
              }
              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }
              #input-container {
                  display: flex;
                  margin-top: 10px;
              }
              #message-input {
                  flex-grow: 1;
                  margin-right: 8px;
                  padding: 8px;
                  background: var(--vscode-input-background);
                  color: var(--vscode-input-foreground);
                  border: 1px solid var(--vscode-input-border);
                  border-radius: 4px;
              }
              button {
                  padding: 8px 16px;
                  background: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
              }
              button:hover {
                  background: var(--vscode-button-hoverBackground);
              }
          </style>
      </head>
      <body>
          <div id="chat-container">
              <div id="messages"></div>
              <div id="input-container">
                  <input type="text" id="message-input" placeholder="Ask Claude...">
                  <button id="send-button">Send</button>
              </div>
          </div>
          <script>
              const vscode = acquireVsCodeApi();
              const messagesDiv = document.getElementById('messages');
              const messageInput = document.getElementById('message-input');
              const sendButton = document.getElementById('send-button');

              function createLoadingIndicator() {
                  const loadingDiv = document.createElement('div');
                  loadingDiv.className = 'loading';
                  loadingDiv.innerHTML = \`
                      <div class="loading-spinner"></div>
                      <span>Claude is thinking...</span>
                  \`;
                  return loadingDiv;
              }

              function formatCodeBlocks(text) {
                  const parts = text.split(/\`\`\`(\\w*)\\n?/);
                  let formatted = '';
                  let isInCodeBlock = false;
                  
                  parts.forEach((part, index) => {
                      if (index % 2 === 1) {
                          return;
                      }
                      
                      if (isInCodeBlock) {
                          formatted += \`<div class="code-block">
                                          <button class="copy-button">Copy</button>
                                          <pre><code>\${part}</code></pre>
                                      </div>\`;
                      } else {
                          formatted += part.replace(/\\n/g, '<br>');
                      }
                      
                      isInCodeBlock = !isInCodeBlock;
                  });
                  
                  return formatted;
              }

              function addMessage(text, isUser) {
                  const messageDiv = document.createElement('div');
                  messageDiv.className = 'message ' + (isUser ? 'user-message' : 'claude-message');
                  
                  if (isUser) {
                      messageDiv.textContent = text;
                  } else {
                      messageDiv.innerHTML = formatCodeBlocks(text);
                      
                      messageDiv.querySelectorAll('.copy-button').forEach(button => {
                          button.addEventListener('click', () => {
                              const codeBlock = button.nextElementSibling.textContent;
                              navigator.clipboard.writeText(codeBlock);
                              
                              const originalText = button.textContent;
                              button.textContent = 'Copied!';
                              setTimeout(() => {
                                  button.textContent = originalText;
                              }, 2000);
                          });
                      });
                  }
                  
                  messagesDiv.appendChild(messageDiv);
                  messagesDiv.scrollTop = messagesDiv.scrollHeight;
              }

              sendButton.addEventListener('click', () => {
                  const text = messageInput.value;
                  if (text) {
                      addMessage(text, true);
                      
                      const loadingIndicator = createLoadingIndicator();
                      messagesDiv.appendChild(loadingIndicator);
                      messagesDiv.scrollTop = messagesDiv.scrollHeight;
                      
                      vscode.postMessage({
                          command: 'sendMessage',
                          text: text
                      });
                      messageInput.value = '';
                  }
              });

              messageInput.addEventListener('keypress', (e) => {
                  if (e.key === 'Enter') {
                      sendButton.click();
                  }
              });

              window.addEventListener('message', event => {
                  const message = event.data;
                  switch (message.command) {
                      case 'receiveMessage':
                          const loadingIndicator = document.querySelector('.loading');
                          if (loadingIndicator) {
                              loadingIndicator.remove();
                          }
                          addMessage(message.text, false);
                          break;
                  }
              });
          </script>
      </body>
      </html>
  `;
}
//# sourceMappingURL=extension.js.map