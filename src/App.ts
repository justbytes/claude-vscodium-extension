import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { Chat, ChatMessage, ChatStorage } from "./chatStorage";
import { initialWebviewContext } from "./static/chatLayout";

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
      "claudeChat",
      "Chat with Claude",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "src")],
      }
    );

    this._anthropic = anthropic;
    this._chatStorage = chatStorage;
    this._currentChat = currentChat;

    // Set initial content
    initialWebviewContext(extensionUri, this._panel, this._currentChat);

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
