document.getElementById("old-chat-btn").addEventListener("click", () => {
  toggleView("old-chats");
});

document.getElementById("new-chat-btn").addEventListener("click", () => {
  vscode.postMessage({ command: "createNewChat" });
  toggleView("chat");
});

document.querySelectorAll(".chat-item").forEach((item) => {
  item.addEventListener("click", () => {
    const chatId = item.dataset.chatId;
    vscode.postMessage({
      command: "loadChat",
      chatId: chatId,
    });
  });
});
