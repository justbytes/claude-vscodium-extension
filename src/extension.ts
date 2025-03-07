import * as vscode from "vscode";
import { ChatArchive } from "./ChatArchive";
import { App } from "./App";

export function activate(context: vscode.ExtensionContext) {
  // Initialize chat storage
  const chatStorage = new ChatArchive(context.globalState);

  let disposable = vscode.commands.registerCommand(
    "vscodium-claude.askClaude",
    async () => {
      // Create or show the App instance
      await App.createOrShow(context.extensionUri, chatStorage);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
