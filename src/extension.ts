import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { getNonce } from "./utils/nonce";
import { Chat, ChatMessage, ChatStorage } from "./chatStorage";

export function activate(context: vscode.ExtensionContext) {
  // Initialize chat storage
  const chatStorage = new ChatStorage(context.globalState);

  let disposable = vscode.commands.registerCommand(
    "vscodium-claude.askClaude",
    async () => {
      const config = vscode.workspace.getConfiguration("claudeAI");
      const apiKey = config.get<string>("apiKey");

      if (!apiKey) {
        vscode.window.showErrorMessage(
          "Please set your Claude API key in settings"
        );
        return;
      }

      const anthropic = new Anthropic({ apiKey });
      const panel = vscode.window.createWebviewPanel(
        "claudeChat",
        "Chat with Claude",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "media"),
          ],
        }
      );

      // Get paths to resource files
      const styleMainPath = vscode.Uri.joinPath(
        context.extensionUri,
        "media",
        "chat.css"
      );
      const scriptPath = vscode.Uri.joinPath(
        context.extensionUri,
        "media",
        "chat.js"
      );
      const styleVSCodeUri = panel.webview.asWebviewUri(styleMainPath);
      const scriptUri = panel.webview.asWebviewUri(scriptPath);

      // Load existing chats
      const chats = await chatStorage.getAllChats();

      // Create new chat
      const currentChat = await chatStorage.createChat();

      // Set webview HTML content
      panel.webview.html = getWebviewContent(
        panel.webview,
        styleVSCodeUri,
        scriptUri,
        chats,
        currentChat
      );

      // Handle messages from webview
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case "sendMessage":
            try {
              const response = await anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                messages: [{ role: "user", content: message.text }],
                system:
                  "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
              });

              const newMessage: ChatMessage = {
                role: "user",
                content: message.text,
                timestamp: new Date().toISOString(),
              };

              const assistantMessage: ChatMessage = {
                role: "assistant",
                content: response.content[0].text,
                timestamp: new Date().toISOString(),
              };

              // Save messages to storage
              await chatStorage.addMessageToChat(currentChat.id, newMessage);
              await chatStorage.addMessageToChat(
                currentChat.id,
                assistantMessage
              );

              // Send response back to webview
              panel.webview.postMessage({
                command: "receiveMessage",
                text: response.content[0].text,
                chatId: currentChat.id,
              });
            } catch (error) {
              vscode.window.showErrorMessage(
                "Error communicating with Claude: " + error
              );
            }
            break;

          case "createNewChat":
            const newChat = await chatStorage.createChat();
            panel.webview.postMessage({
              command: "chatCreated",
              chat: newChat,
            });
            break;

          case "loadChat":
            const chatToLoad = await chatStorage.getChat(message.chatId);
            if (chatToLoad) {
              panel.webview.postMessage({
                command: "chatLoaded",
                chat: chatToLoad,
              });
            }
            break;
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent(
  webview: vscode.Webview,
  styleUri: vscode.Uri,
  scriptUri: vscode.Uri,
  chats: Chat[],
  currentChat: Chat
) {
  const nonce = getNonce();

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
        webview.cspSource
      } 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <link href="${styleUri}" rel="stylesheet">
      <title>Chat with Claude</title>
      
    </head>
    <body id="app">
      <nav class="chat-nav">
        <button id="new-chat-btn" class="nav-button">New Chat</button>
        <button id="old-chat-btn" class="nav-button">History</button> 
      </nav>
        
      <div id="chat-container">
        <div id="messages"></div>
      </div>

      <div class="prompt-container">
        <div class="long-box">
          <div class="context"></div>
          <div class="prompt-textarea">
            <textarea 
              id="message-input" 
              class="auto-resize-textarea"
              placeholder="Type your message..."
            
            ></textarea>
          </div>
        </div>
        <div class="prompt-btns">
          <button class="submit-prompt">↑</button>
          <button class="attachment">📎</button>
        </div>
      </div>

      <script nonce="${nonce}" src="${scriptUri}"></script>
      <script nonce="${nonce}">
        // Initialize with current chat data
        window.currentChat = ${JSON.stringify(currentChat)};
        window.chats = ${JSON.stringify(chats)};

        // Handle textarea resize
        const textarea = document.getElementById('message-input');

        textarea.addEventListener('keyup', function() {
          this.style.height = 'auto';
          this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Handle paste events
        textarea.addEventListener('paste', function() {
          setTimeout(() => {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
          }, 0);
        });
      </script>
    </body>
    </html>`;
}
