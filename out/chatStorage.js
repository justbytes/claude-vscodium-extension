"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStorage = void 0;
const nonce_1 = require("./utils/nonce");
class ChatStorage {
    constructor(storage) {
        this.storage = storage;
    }
    async getChats() {
        return this.storage.get("chats", {});
    }
    async saveChats(chats) {
        await this.storage.update("chats", chats);
    }
    async createChat() {
        const chats = await this.getChats();
        const newChat = {
            id: Date.now().toString(),
            messages: [],
            createdAt: new Date().toISOString(),
            title: `Chat ${Object.keys(chats).length + 1}`,
        };
        chats[newChat.id] = newChat;
        await this.saveChats(chats);
        return newChat;
    }
    async getChat(id) {
        const chats = await this.getChats();
        return chats[id];
    }
    async getAllChats() {
        const chats = await this.getChats();
        return Object.values(chats).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async addMessageToChat(chatId, message) {
        const chats = await this.getChats();
        if (chats[chatId]) {
            chats[chatId].messages.push(message);
            await this.saveChats(chats);
        }
    }
}
exports.ChatStorage = ChatStorage;
// Add to the end of getWebviewContent function:
function getWebviewContent(webview, styleUri, scriptUri, chats, currentChat) {
    const nonce = (0, nonce_1.getNonce)();
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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
        .map((chat) => `
                          <div class="chat-item ${chat.id === currentChat.id ? "active" : ""}" 
                               data-chat-id="${chat.id}">
                              ${chat.title}
                          </div>
                      `)
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
//# sourceMappingURL=chatStorage.js.map