const vscode = acquireVsCodeApi();

document.getElementById("new-chat-btn").addEventListener("click", () => {
  vscode.postMessage({ command: "createNewChat" });
});

document.getElementById("old-chat-btn").addEventListener("click", () => {
  <div class="chat-list">
    $
    {chats
      .map(
        (chat) => `
                          <div class="chat-item ${
                            chat.id === currentChat.id ? "active" : ""
                          }" 
                               data-chat-id="${chat.id}">
                              ${chat.title}
                          </div>
                      `
      )
      .join("")}
  </div>;
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
