function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  // Calculate time difference in milliseconds
  const diffMs = now - date;

  // Convert to minutes, hours, days
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format based on time difference
  if (diffMinutes < 1) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
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
      <div class="chat-date">
        <p>${formatTimeAgo(chat.createdAt)}</p>
        <button id="delete-btn">🗑️</button>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <h2>Previous Chats</h2>
    ${chatsList}
  `;
  
  const deleteBtn;
  container.querySelector("#delete-btn")

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
