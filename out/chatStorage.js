"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStorage = void 0;
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
    async deleteChat(chatId) {
        const chats = await this.getChats();
        if (chats[chatId]) {
            delete chats[chatId];
            await this.saveChats(chats);
            return true;
        }
        return false;
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
//# sourceMappingURL=chatStorage.js.map