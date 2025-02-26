function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function renderOldChats(chats) {
  console.log("Rendering old chats:", chats);
  const container = document.getElementById("old-chats-container");

  if (!chats || chats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🕰️</div>
        <div>No previous chats found</div>
        <button class="new-chat-button">Start a new chat</button>
      </div>
    `;

    // Add event listener to the new chat button
    const newChatBtn = container.querySelector(".new-chat-button");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", function () {
        console.log("New chat button clicked from empty state");
        vscode.postMessage({ command: "createNewChat" });
        toggleView("chat");
      });
    }

    return;
  }

  // Create a list of chat items
  const chatsList = chats
    .map(
      (chat) => `
    <div class="old-chat-item" data-chat-id="${chat.id}">
      <div class="chat-title">${chat.title}</div>
      <div class="chat-date">${formatDate(chat.createdAt)}</div>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <h2>Previous Chats</h2>
    ${chatsList}
  `;

  // Add event listeners to chat items
  container.querySelectorAll(".old-chat-item").forEach((item) => {
    item.addEventListener("click", function () {
      const chatId = item.dataset.chatId;
      console.log("Loading chat:", chatId);
      vscode.postMessage({
        command: "loadChat",
        chatId: chatId,
      });
      toggleView("chat");
    });
  });
}

// Listen for messages from the extension
window.addEventListener("message", (event) => {
  const message = event.data;
  console.log("Message received in old-chats.js:", message.command);

  if (message.command === "allChatsLoaded") {
    renderOldChats(message.chats);
  }
});
