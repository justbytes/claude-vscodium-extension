const vscode = acquireVsCodeApi();
const textarea = document.getElementById("message-input");
const sendButton = document.querySelector(".submit-prompt");
const attachment = document.querySelector(".attachment");
const messagesDiv = document.getElementById("messages");

function createLoadingIndicator() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Claude is thinking...</span>
    `;
  return loadingDiv;
}

function adjustTextareaHeight() {
  textarea.style.height = "auto"; // Reset height
  const maxHeight = 300; // Maximum height before scrolling
  textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}

// Handle sending messages
sendButton.addEventListener("click", () => {
  const text = textarea.value;
  if (text) {
    addMessage(text, true);

    const loadingIndicator = createLoadingIndicator();
    messagesDiv.appendChild(loadingIndicator);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    vscode.postMessage({
      command: "sendMessage",
      text: text,
    });
    textarea.value = "";
    adjustTextareaHeight(); // Reset height after clearing
  }
});

// Handle Enter key
textarea.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Prevent new line
    sendButton.click();
  }
});

// Handle textarea resizing
textarea.addEventListener("input", adjustTextareaHeight);
textarea.addEventListener("keyup", adjustTextareaHeight);
textarea.addEventListener("paste", () => {
  setTimeout(adjustTextareaHeight, 0);
});

// Initial height adjustment
adjustTextareaHeight();
