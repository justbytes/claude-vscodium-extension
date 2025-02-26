"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const vscode = require("vscode");
const sdk_1 = require("@anthropic-ai/sdk");
const chatLayout_1 = require("./static/chatLayout");
class App {
    constructor(extensionUri, anthropic, chatStorage, currentChat) {
        this._disposables = [];
        this._panel = vscode.window.createWebviewPanel("claudeChat", "Chat with Claude", vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, "src")],
        });
        this._anthropic = anthropic;
        this._chatStorage = chatStorage;
        this._currentChat = currentChat;
        // Set initial content
        (0, chatLayout_1.initialWebviewContext)(extensionUri, this._panel, this._currentChat);
        // Listen for panel disposal
        this._panel.onDidDispose(() => this._onDispose(), null, this._disposables);
        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
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
                default:
                    console.log("Unknown command received:", message.command);
                    break;
            }
        }, null, this._disposables);
    }
    static async createOrShow(extensionUri, chatStorage) {
        const config = vscode.workspace.getConfiguration("claudeAI");
        const apiKey = config.get("apiKey");
        if (!apiKey) {
            vscode.window.showErrorMessage("Please set your Claude API key in settings");
            return;
        }
        const anthropic = new sdk_1.default({ apiKey });
        // If we already have a panel, show it
        if (App._current) {
            App._current._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        // Try to get all chats and find the most recent one
        let currentChat;
        try {
            const allChats = await chatStorage.getAllChats();
            if (allChats.length > 0) {
                // Chats are already sorted by creation date (newest first)
                currentChat = allChats[0];
            }
            else {
                // Create a new chat if none exists
                currentChat = await chatStorage.createChat();
            }
        }
        catch (error) {
            console.error("Error loading chats:", error);
            // Create a new chat if there was an error
            currentChat = await chatStorage.createChat();
        }
        // Create new panel instance
        App._current = new App(extensionUri, anthropic, chatStorage, currentChat);
    }
    async _handleSendMessage(text) {
        try {
            const response = await this._anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                messages: [{ role: "user", content: text }],
                system: "You are a helpful AI assistant integrated into VSCodium. Help users with coding tasks, explanations, and general development questions.",
            });
            const userMessage = {
                role: "user",
                content: text,
                timestamp: new Date().toISOString(),
            };
            const assistantMessage = {
                role: "assistant",
                content: response.content[0].text,
                timestamp: new Date().toISOString(),
            };
            // Save messages to storage
            await this._chatStorage.addMessageToChat(this._currentChat.id, userMessage);
            await this._chatStorage.addMessageToChat(this._currentChat.id, assistantMessage);
            // Send response back to webview
            this._panel.webview.postMessage({
                command: "receiveMessage",
                text: response.content[0].text,
                chatId: this._currentChat.id,
            });
        }
        catch (error) {
            vscode.window.showErrorMessage("Error communicating with Claude: " + error);
        }
    }
    async _handleCreateNewChat() {
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
        }
        catch (error) {
            console.error("Error creating new chat:", error);
            vscode.window.showErrorMessage("Error creating new chat: " + error);
        }
    }
    async _handleGetAllChats() {
        try {
            console.log("Getting all chats");
            const allChats = await this._chatStorage.getAllChats();
            console.log("Found chats:", allChats.length);
            // Send chats back to webview
            this._panel.webview.postMessage({
                command: "allChatsLoaded",
                chats: allChats,
            });
        }
        catch (error) {
            console.error("Error getting all chats:", error);
            vscode.window.showErrorMessage("Error loading chats: " + error);
        }
    }
    async _handleLoadChat(chatId) {
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
            }
            else {
                console.error("Chat not found:", chatId);
                vscode.window.showErrorMessage("Chat not found");
            }
        }
        catch (error) {
            console.error("Error loading chat:", error);
            vscode.window.showErrorMessage("Error loading chat: " + error);
        }
    }
    _onDispose() {
        App._current = undefined;
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map