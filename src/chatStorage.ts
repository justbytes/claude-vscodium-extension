import * as vscode from "vscode";
import { getNonce } from "./utils/nonce";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  title: string;
}

export class ChatStorage {
  constructor(private storage: vscode.Memento) {}

  private async getChats(): Promise<{ [key: string]: Chat }> {
    return this.storage.get("chats", {});
  }

  private async saveChats(chats: { [key: string]: Chat }): Promise<void> {
    await this.storage.update("chats", chats);
  }

  async createChat(): Promise<Chat> {
    const chats = await this.getChats();
    const newChat: Chat = {
      id: Date.now().toString(),
      messages: [],
      createdAt: new Date().toISOString(),
      title: `Chat ${Object.keys(chats).length + 1}`,
    };
    chats[newChat.id] = newChat;
    await this.saveChats(chats);
    return newChat;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const chats = await this.getChats();
    return chats[id];
  }

  async getAllChats(): Promise<Chat[]> {
    const chats = await this.getChats();
    return Object.values(chats).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async addMessageToChat(chatId: string, message: ChatMessage): Promise<void> {
    const chats = await this.getChats();
    if (chats[chatId]) {
      chats[chatId].messages.push(message);
      await this.saveChats(chats);
    }
  }
}

// Add to the end of getWebviewContent function:
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
      <body>
          <div id="app">
              <nav class="chat-nav">
                  <div class="nav-title">Claude Chats</div>
                  <button id="new-chat-btn" class="nav-button">New Chat</button>
              </nav>
              <div class="sidebar">
                  <div class="chat-list">
                      ${chats
                        .map(
                          (chat) => `
                          <div class="chat-item ${
                            chat.id === currentChat.id ? "active" : ""
                          }" 
                               data-chat-id="${chat.id}">
                              ${chat.title}
                          </div>
                      `
                        )
                        .join("")}
                  </div>
              </div>
              <div id="chat-container">
                  <div id="messages"></div>
                  <div id="input-container">
                      <input type="text" id="message-input" placeholder="Ask Claude...">
                      <button id="send-button">Send</button>
                  </div>
              </div>
          </div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
          <script nonce="${nonce}">
              // Initialize with current chat data
              window.currentChat = ${JSON.stringify(currentChat)};
              window.chats = ${JSON.stringify(chats)};
          </script>
      </body>
      </html>`;
}
