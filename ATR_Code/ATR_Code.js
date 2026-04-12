document.addEventListener("DOMContentLoaded", () => {
  // 🔥 Firebase Setup
  const config = {
    apiKey: "AIzaSyBJKMF5F9s_C6jIxUsAacZPTzTIEcWRHZQ",
    projectId: "library-terminal-4c413"
  };
  
  if (!firebase.apps.length) firebase.initializeApp(config);
  const db = firebase.firestore();

  // 💾 State & DOM
  const terminal = document.getElementById("terminal");
  const cli = document.getElementById("cli");
  const chatBox = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  
  let cache = { notes: [], inventory: [] };
  let cmdHistory = [];
  let historyIndex = -1;
  
  // ⏰ Real-time System Clock
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
    const clockEl = document.getElementById("system-clock");
    if(clockEl) clockEl.innerText = timeString;
  };
  setInterval(updateClock, 1000);
  updateClock();

  // 🧾 Utility: Logging with Colors
  const log = (text, type = "normal") => {
    const div = document.createElement("div");
    div.classList.add("line", type);
    div.innerHTML = text.replace(/\n/g, "<br>");
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight; // Auto-scroll to bottom
  };

  const formatTime = (ms) => new Date(ms).toLocaleString(undefined, { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  // 📡 Data Loading
  const loadData = async () => {
    log("⏳ Establishing link to the Archive...", "system");
    try {
      // Notes
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      log("<br>📜 <u>ARCHIVED NOTES:</u>", "gold");
      if (notesSnap.empty) log(" — No records found —", "system");
      else notesSnap.docs.forEach((doc, i) => { 
        log(`<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> ${i + 1}. ${doc.data().text}`);
      });

      // Inventory
      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      log("<br>🎒 <u>INVENTORY:</u>", "gold");
      if (invSnap.empty) log(" — Empty —", "system");
      else invSnap.docs.forEach((doc, i) => { 
        log(`${i + 1}. ${doc.data().text}`);
      });

      log("<br>✅ Link Established. Type 'help' for commands.", "system");
    } catch (err) {
      log(`❌ Connection Error: ${err.message}`, "error");
    }
  };

  // 🎮 Command Logic (Truncated for brevity, but keep your existing commands intact here)
  const commands = {
    help: () => `PLAYER COMMANDS: note, notes, delete, add, take, inventory, weather, radio, bank, shop, buy, clear`,
    clear: () => { terminal.innerHTML = ""; return ""; }
    // ... [Paste your existing command logic here] ...
  };

  // ⌨️ CLI Input Handler
  cli.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowUp" && historyIndex > 0) {
      historyIndex--;
      cli.value = cmdHistory[historyIndex];
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (historyIndex < cmdHistory.length - 1) {
        historyIndex++;
        cli.value = cmdHistory[historyIndex];
      } else {
        historyIndex = cmdHistory.length;
        cli.value = "";
      }
      e.preventDefault();
    } else if (e.key === "Enter") {
      const input = cli.value.trim();
      if (!input) return;

      cmdHistory.push(input);
      historyIndex = cmdHistory.length;

      log(`> ${input}`, "user");
      cli.value = "";

      const [cmd, ...args] = input.split(" ");
      const isDm = cmd.toLowerCase() === "dm";
      const commandKey = isDm ? `dm ${args[0]}` : cmd.toLowerCase();
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");

      try {
        if (commands[commandKey]) {
          const result = await commands[commandKey](commandArgs);
          if (result) log(result);
        } else {
          log(`Unknown syntax: '${commandKey}'`, "error");
        }
      } catch (err) {
        log(`System Failure: ${err.message}`, "error");
      }
    }
  });

  loadData();

  // --- LIVE RELAY CHAT LOGIC ---
  if (chatBox && chatInput) {
    db.collection("relay_chat").orderBy("timestamp", "desc").limit(30)
      .onSnapshot((snapshot) => {
        chatBox.innerHTML = "";
        snapshot.forEach((doc) => {
          const data = doc.data();
          const msgDiv = document.createElement("div");
          msgDiv.className = "chat-msg";
          msgDiv.innerHTML = `
            <span class="timestamp">[${formatTime(data.timestamp)}]</span>
            <span class="user">USR_${doc.id.slice(0,3).toUpperCase()}></span> 
            <span class="text">${data.text}</span>
          `;
          chatBox.appendChild(msgDiv);
        });
      });

    chatInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const text = chatInput.value.trim();
        chatInput.value = ""; 
        try {
          await db.collection("relay_chat").add({ text: text, timestamp: Date.now() });
        } catch (err) {
          console.error("Transmission failed:", err);
        }
      }
    });
  }
});
