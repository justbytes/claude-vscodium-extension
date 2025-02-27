import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import { Chat, ChatMessage, ChatArchive } from "./ChatArchive";
import { initialWebviewContext } from "./static/chatLayout";

export class App {
  private static _current: App | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _anthropic: Anthropic;
  private readonly _chatStorage: ChatArchive;
  private _currentChat: Chat;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    extensionUri: vscode.Uri,
    anthropic: Anthropic,
    chatStorage: ChatArchive,
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
        // Add debugging
        console.log("Extension received message:", message.command);

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

          case "getAllChats":
            await this._handleGetAllChats();
            break;

          case "deleteChat":
            await this._handleDeleteChat(message.chatId);
            break;

          case "confirmDeleteChat":
            await this._handleConfirmDeleteChat(message.chatId);
            break;

          default:
            console.log("Unknown command received:", message.command);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static async createOrShow(
    extensionUri: vscode.Uri,
    chatStorage: ChatArchive
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

    // Try to get all chats and find the most recent one
    let currentChat: Chat;
    try {
      const allChats = await chatStorage.getAllChats();

      if (allChats.length > 0) {
        // Chats are already sorted by creation date (newest first)
        currentChat = allChats[0];
      } else {
        // Create a new chat if none exists
        currentChat = await chatStorage.createChat();
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      // Create a new chat if there was an error
      currentChat = await chatStorage.createChat();
    }

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
    try {
      console.log("Creating new chat");
      const newChat = await this._chatStorage.createChat();
      this._currentChat = newChat;

      console.log("New chat created:", newChat.id);

      // Send response back to webview
      this._panel.webview.postMessage({
        command: "chatCreated",
        chat: newChat,
      });
    } catch (error) {
      console.error("Error creating new chat:", error);
      vscode.window.showErrorMessage("Error creating new chat: " + error);
    }
  }

  private async _handleGetAllChats(): Promise<void> {
    try {
      console.log("Getting all chats");
      const allChats = await this._chatStorage.getAllChats();

      console.log("Found chats:", allChats.length);

      // Send chats back to webview
      this._panel.webview.postMessage({
        command: "allChatsLoaded",
        chats: allChats,
      });
    } catch (error) {
      console.error("Error getting all chats:", error);
      vscode.window.showErrorMessage("Error loading chats: " + error);
    }
  }

  private async _handleLoadChat(chatId: string): Promise<void> {
    try {
      console.log("Loading chat:", chatId);
      const chatToLoad = await this._chatStorage.getChat(chatId);
      if (chatToLoad) {
        this._currentChat = chatToLoad;

        console.log("Chat loaded with", chatToLoad.messages.length, "messages");

        // Send loaded chat back to webview
        this._panel.webview.postMessage({
          command: "chatLoaded",
          chat: chatToLoad,
        });
      } else {
        console.error("Chat not found:", chatId);
        vscode.window.showErrorMessage("Chat not found");
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      vscode.window.showErrorMessage("Error loading chat: " + error);
    }
  }

  private async _handleDeleteChat(chatId: string): Promise<void> {
    console.log("Deleting Chat ", chatId);

    const success = await this._chatStorage.deleteChat(chatId);
    if (success) {
      // if chats list == 0 create a new chat
      // if () {

      // }

      // Otherwise just notify the webview that the chat was deleted
      this._handleGetAllChats();
    } else {
      vscode.window.showErrorMessage("Failed to delete chat");
    }
  }

  private async _handleConfirmDeleteChat(chatId: string): Promise<void> {
    const result = await vscode.window.showWarningMessage(
      "Are you sure you want to delete this chat?",
      { modal: true },
      "Delete",
      "Cancel"
    );

    if (result === "Delete") {
      await this._handleDeleteChat(chatId);
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
