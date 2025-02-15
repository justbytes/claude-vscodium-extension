// src/extension.ts
import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "vscodium-claude.askClaude",
    async () => {
      // Get API key from configuration
      const config = vscode.workspace.getConfiguration("claudeAI");
      const apiKey = config.get<string>("apiKey");

      if (!apiKey) {
        vscode.window.showErrorMessage(
          "Please set your Claude API key in settings"
        );
        return;
      }

      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Get selected text or current file content
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No editor is active");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(
        selection.isEmpty ? undefined : selection
      );

      // Create webview panel for chat
      const panel = vscode.window.createWebviewPanel(
        "claudeChat",
        "Chat with Claude",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        }
      );

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
                system:
                  "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
              });

              // Send response back to webview
              panel.webview.postMessage({
                command: "receiveMessage",
                text: response.content[0].text,
              });
            } catch (error) {
              vscode.window.showErrorMessage(
                "Error communicating with Claude: " + error
              );
            }
            break;
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function getChatHtml() {
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
                    margin: 5px 0;
                    padding: 5px;
                    border-radius: 5px;
                }
                .user-message {
                    background: var(--vscode-editor-selectionBackground);
                }
                .claude-message {
                    background: var(--vscode-editor-inactiveSelectionBackground);
                }
                #input-container {
                    display: flex;
                }
                #message-input {
                    flex-grow: 1;
                    margin-right: 5px;
                    padding: 5px;
                    background: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }
                button {
                    padding: 5px 10px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
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

                function addMessage(text, isUser) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + (isUser ? 'user-message' : 'claude-message');
                    messageDiv.textContent = text;
                    messagesDiv.appendChild(messageDiv);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }

                sendButton.addEventListener('click', () => {
                    const text = messageInput.value;
                    if (text) {
                        addMessage(text, true);
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
                            addMessage(message.text, false);
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}
