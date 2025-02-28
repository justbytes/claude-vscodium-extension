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
            // Get all existing chat messages
            const allMessages = this._currentChat.messages;
            // Implement a more advanced context management approach
            let contextMessages = [];
            // Always include the first few messages to maintain the initial context
            if (allMessages.length > 0) {
                // Include first 2 messages (likely includes initial instructions/context)
                contextMessages = contextMessages.concat(allMessages.slice(0, Math.min(2, allMessages.length)));
            }
            // Always include the most recent messages for immediate context
            const RECENT_MESSAGES_COUNT = 6;
            if (allMessages.length > 2) {
                contextMessages = contextMessages.concat(allMessages.slice(Math.max(2, allMessages.length - RECENT_MESSAGES_COUNT)));
            }
            // Convert to Claude API format
            const previousMessages = contextMessages.map((message) => ({
                role: message.role,
                content: message.content,
            }));
            // Add the new user message
            previousMessages.push({ role: "user", content: text });
            // Enhance system prompt with info about potential context truncation
            let systemPrompt = "You are a helpful AI assistant integrated into VSCode extenstion. Help users with coding tasks, explanations, and general development questions.";
            if (allMessages.length > 2 + RECENT_MESSAGES_COUNT) {
                systemPrompt +=
                    " Some earlier messages in this conversation may have been omitted for context management, but the user expects you to maintain continuity.";
            }
            // Call Claude API with the optimized context
            const response = await this._anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 1000,
                messages: previousMessages,
                system: systemPrompt,
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
    async _handleDeleteChat(chatId) {
        console.log("Deleting Chat ", chatId);
        const success = await this._chatStorage.deleteChat(chatId);
        if (success) {
            // Otherwise just notify the webview that the chat was deleted
            this._handleGetAllChats();
        }
        else {
            vscode.window.showErrorMessage("Failed to delete chat");
        }
    }
    async _handleConfirmDeleteChat(chatId) {
        const result = await vscode.window.showWarningMessage("Are you sure you want to delete this chat?", { modal: true }, "Delete", "Cancel");
        if (result === "Delete") {
            await this._handleDeleteChat(chatId);
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