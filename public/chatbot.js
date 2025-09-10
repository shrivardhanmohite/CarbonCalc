document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("chat-send");

  function appendMessage(sender, message) {
    const div = document.createElement("div");
    div.classList.add("mb-2");
    div.innerHTML = `<strong>${sender}:</strong> ${message.replace(/\n/g, "<br>")}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("You", text);
    userInput.value = "";
    sendBtn.disabled = true;
    sendBtn.textContent = "Thinking...";

    try {
      const res = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text })
      });

      const data = await res.json();
      if (data.error) {
        appendMessage("Bot", "⚠️ " + data.error);
      } else {
        appendMessage("Bot", data.reply || "Sorry, no answer returned.");
      }
    } catch (err) {
      console.error("Chat error:", err);
      appendMessage("Bot", "⚠️ Failed to connect to server.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  });
});
