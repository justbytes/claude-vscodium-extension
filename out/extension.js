"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const ChatArchive_1 = require("./ChatArchive");
const App_1 = require("./App");
function activate(context) {
    // Initialize chat storage
    const chatStorage = new ChatArchive_1.ChatArchive(context.globalState);
    let disposable = vscode.commands.registerCommand("vscodium-claude.askClaude", async () => {
        // Create or show the App instance
        await App_1.App.createOrShow(context.extensionUri, chatStorage);
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map