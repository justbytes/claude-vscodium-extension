import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { Chat, ChatMessage, ChatStorage } from "./chatStorage";
import { getNonce } from "./utils/nonce";

export class App {
  private static _current: App | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _anthropic: Anthropic;
  private readonly _chatStorage: ChatStorage;
  private _currentChat: Chat;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    extensionUri: vscode.Uri,
    anthropic: Anthropic,
    chatStorage: ChatStorage,
    currentChat: Chat
  ) {
    this._panel = vscode.window.createWebviewPanel(
      "claudeChat", // viewType
      "Chat with Claude", // title
      vscode.ViewColumn.Beside, // column to show the panel in
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
      }
    );

    this._anthropic = anthropic;
    this._chatStorage = chatStorage;
    this._currentChat = currentChat;

    // Set initial content
    this._setWebviewContent(extensionUri);

    // Listen for panel disposal
    this._panel.onDidDispose(() => this._onDispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "sendMessage":
            await this._handleSendMessage(message.text);
            break;

          case "createNewChat":
            await this._handleCreateNewChat();
            break;

          case "loadChat":
            await this._handleLoadChat(message.chatId);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    chatStorage: ChatStorage
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("claudeAI");
    const apiKey = config.get<string>("apiKey");

    if (!apiKey) {
      vscode.window.showErrorMessage(
        "Please set your Claude API key in settings"
      );
      return;
    }

    const anthropic = new Anthropic({ apiKey });

    // If we already have a panel, show it
    if (App._current) {
      App._current._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    // Create new chat
    const currentChat = await chatStorage.createChat();

    // Create new panel instance
    App._current = new App(extensionUri, anthropic, chatStorage, currentChat);
  }

  private async _handleSendMessage(text: string): Promise<void> {
    try {
      const response = await this._anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [{ role: "user", content: text }],
        system:
          "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
      });

      const userMessage: ChatMessage = {
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content[0].text,
        timestamp: new Date().toISOString(),
      };

      // Save messages to storage
      await this._chatStorage.addMessageToChat(
        this._currentChat.id,
        userMessage
      );
      await this._chatStorage.addMessageToChat(
        this._currentChat.id,
        assistantMessage
      );

      // Send response back to webview
      this._panel.webview.postMessage({
        command: "receiveMessage",
        text: response.content[0].text,
        chatId: this._currentChat.id,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        "Error communicating with Claude: " + error
      );
    }
  }

  private async _handleCreateNewChat(): Promise<void> {
    const newChat = await this._chatStorage.createChat();
    this._currentChat = newChat;
    this._panel.webview.postMessage({
      command: "chatCreated",
      chat: newChat,
    });
  }

  private async _handleLoadChat(chatId: string): Promise<void> {
    const chatToLoad = await this._chatStorage.getChat(chatId);
    if (chatToLoad) {
      this._currentChat = chatToLoad;
      this._panel.webview.postMessage({
        command: "chatLoaded",
        chat: chatToLoad,
      });
    }
  }

  private _setWebviewContent(extensionUri: vscode.Uri): void {
    // Get paths to resource files
    const mediaPath = vscode.Uri.joinPath(extensionUri, "media");
    const indexStylePath = vscode.Uri.joinPath(
      mediaPath,
      "styles",
      "index.css"
    );

    const navbarStylePath = vscode.Uri.joinPath(
      mediaPath,
      "styles",
      "navbar.css"
    );

    const messagesStylePath = vscode.Uri.joinPath(
      mediaPath,
      "styles",
      "messages.css"
    );

    const promptStylePath = vscode.Uri.joinPath(
      mediaPath,
      "styles",
      "prompt.css"
    );

    const navbarLogicPath = vscode.Uri.joinPath(
      mediaPath,
      "logic",
      "navbar.js"
    );
    const messagesLogicPath = vscode.Uri.joinPath(
      mediaPath,
      "logic",
      "messages.js"
    );
    const promptLogicPath = vscode.Uri.joinPath(
      mediaPath,
      "logic",
      "prompt.js"
    );

    const indexStyleUri = this._panel.webview.asWebviewUri(indexStylePath);
    const navbarStyleUri = this._panel.webview.asWebviewUri(navbarStylePath);
    const messagesStyleUri =
      this._panel.webview.asWebviewUri(messagesStylePath);
    const promptStyleUri = this._panel.webview.asWebviewUri(promptStylePath);
    const navbarLogicUri = this._panel.webview.asWebviewUri(navbarLogicPath);
    const messagesLogicUri =
      this._panel.webview.asWebviewUri(messagesLogicPath);
    const promptLogicUri = this._panel.webview.asWebviewUri(promptLogicPath);

    const nonce = getNonce();

    this._panel.webview.html = `<!DOCTYPE html>
      <html lang="en">
      <head>

        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
          this._panel.webview.cspSource
        } 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${indexStyleUri}" rel="stylesheet">
        <link href="${navbarStyleUri}" rel="stylesheet">
        
        <link href="${messagesStyleUri}" rel="stylesheet">
        <link href="${promptStyleUri}" rel="stylesheet">
    
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
  
        <script nonce="${nonce}" src="${promptLogicUri}"></script>
        <script nonce="${nonce}">
            // Initialize with current chat data
            window.currentChat = ${JSON.stringify(this._currentChat)};
        </script>
        
        <script nonce="${nonce}" src="${navbarLogicUri}"></script>
        <script nonce="${nonce}" src="${messagesLogicUri}"></script>
 
          
      </body>
      </html>`;
  }

  private _onDispose(): void {
    App._current = undefined;

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
