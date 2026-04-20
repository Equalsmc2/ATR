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
  
  let cache = { notes: [], inventory: [] };
  let cmdHistory = [];
  let historyIndex = -1;
  
  // ⏰ Real-time System Clock
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
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
    terminal.scrollTop = terminal.scrollHeight;
  };

  const formatTime = (ms) => new Date(ms).toLocaleString(undefined, { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  // 📡 Data Loading
  const loadData = async () => {
    log("⏳ Establishing link to the Archive...", "system");

    try {
      // Load Notes
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      
      log("<br>📜 <u>ARCHIVED NOTES:</u>", "gold");
      if (notesSnap.empty) log(" — No records found —", "system");
      else notesSnap.docs.forEach((doc, i) => { 
        const d = doc.data();
        log(`<span class="timestamp">[${formatTime(d.timestamp)}]</span> ${i + 1}. ${d.text}`);
      });

      // Load Inventory
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

  // 🎮 Command Logic
  const commands = {
    help: () => `
    <span style="color:#fff">PLAYER COMMANDS:</span>
    note [text]       → Write a new note
    notes             → Read all notes
    delete [#]        → Delete note by number
    add [item]        → Add to inventory
    take [#]          → Remove item by number
    inventory         → Check inventory
    weather           → Check temperature
    radio             → Check broadcast frequency
    bank [+/- amt]    → Check or change gold
    shop              → View shop items
    buy [item]        → Buy item (auto-deducts gold)
    clear             → Clear terminal screen`,

    "dm help": () => `
    <span style="color:#ff5555">DM COMMANDS:</span>
    dm temp [text]      → Set weather
    dm broadcast [text] → Set radio message
    dm stock [item;100] → Add item to shop (use semicolon)`,

    // --- NOTES ---
    note: async (t) => {
      if (!t) return "Usage: note [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "✍️ Note inscribed into the archive.";
    },
    notes: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "No notes found.";
      return snap.docs.map((doc, i) => 
        `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> ${i+1}. ${doc.data().text}`
      ).join("\n");
    },
    delete: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "❌ Invalid note number.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `🗑️ Note ${idx + 1} burned from the archive.`;
    },

    // --- INVENTORY ---
    add: async (item) => {
      if (!item) return "Usage: add [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return `🎒 '${item}' added to inventory.`;
    },
    inventory: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "Inventory is empty.";
      return snap.docs.map((doc, i) => `${i+1}. ${doc.data().text}`).join("\n");
    },
    take: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "❌ Invalid item number.";
      const docRef = await db.collection("inventory").doc(cache.inventory[idx]).get();
      const name = docRef.data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `🗑️ '${name}' removed from inventory.`;
    },

    // --- WORLD INFO ---
    weather: async () => {
      const doc = await db.collection("meta").doc("temperature").get();
      return doc.exists ? `🌤️ Condition: ${doc.data().text}` : "No weather data.";
    },
    radio: async () => {
      const doc = await db.collection("meta").doc("broadcast").get();
      return doc.exists ? `📡 Incoming Transmission: "${doc.data().text}"` : "📡 Static... (No signal)";
    },
    
    // --- ECONOMY ---
    bank: async (input) => {
      const goldRef = db.collection("meta").doc("gold");
      const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;

      if (!input) return `💰 Current Reserve: ${current} gp`;

      const match = input.trim().match(/^([\+\-]?)(\d+)$/);
      if (!match) return "Usage: bank +50 or bank -20";

      const sign = match[1];
      const val = parseInt(match[2]);
      
      if (sign === "+") current += val;
      else if (sign === "-") current -= val;
      else current = val;

      await goldRef.set({ amount: current, timestamp: Date.now() });
      return `🪙 Transaction Complete. New Balance: ${current} gp`;
    },

    shop: async () => {
      const snap = await db.collection("shop").orderBy("price").get();
      if (snap.empty) return "🛒 The shop shelves are bare.";
      return snap.docs.map((doc, i) => 
        `${i+1}. ${doc.data().name} — <span style="color:#ffcc00">${doc.data().price} gp</span>`
      ).join("\n");
    },

    buy: async (itemName) => {
      if (!itemName) return "Usage: buy [item name]";
      const goldRef = db.collection("meta").doc("gold");
      const goldDoc = await goldRef.get();
      const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;

      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `❌ Item '${itemName}' not found.`;

      const itemDoc = shopSnap.docs[0];
      const { price, name } = itemDoc.data();

      if (currentGold < price) return `💸 Insufficient funds. Need ${price} gp, have ${currentGold} gp.`;

      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(itemDoc.id).delete();

      return `🤝 Purchased '${name}'.\n💰 Remaining Gold: ${currentGold - price}`;
    },

    // --- DM TOOLS ---
    "dm temp": async (t) => {
      if(!t) return "Usage: dm temp [text]";
      await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() });
      return `🌡️ Weather updated.`;
    },
    "dm broadcast": async (t) => {
      if(!t) return "Usage: dm broadcast [text]";
      await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() });
      return `📡 Broadcast signal updated.`;
    },
    "dm stock": async (input) => {
      const [name, price] = input.split(";");
      if (!name || !price) return "Usage: dm stock [item name];[price]";
      await db.collection("shop").add({ name: name.trim(), price: parseInt(price), timestamp: Date.now() });
      return `📦 Stocked '${name.trim()}' for ${price} gp.`;
    },

    clear: () => {
      terminal.innerHTML = "";
      return "";
    },
    exit: () => "🔒 Session terminated."
  };

  // ⌨️ Input Handler
  cli.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowUp") {
      if (historyIndex > 0) {
        historyIndex--;
        cli.value = cmdHistory[historyIndex];
      }
      e.preventDefault();
    } 
    else if (e.key === "ArrowDown") {
      if (historyIndex < cmdHistory.length - 1) {
        historyIndex++;
        cli.value = cmdHistory[historyIndex];
      } else {
        historyIndex = cmdHistory.length;
        cli.value = "";
      }
      e.preventDefault();
    }
    else if (e.key === "Enter") {
      const input = cli.value.trim();
      if (!input) return;

      cmdHistory.push(input);
      historyIndex = cmdHistory.length;

      log(`> ${input}`, "user");
      cli.value = "";

      // 🔥 Improved parsing: splits by 1 or more spaces so double-spaces don't crash it
      const parts = input.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      const isDm = cmd === "dm";
      // Ensure 'dm' has a second argument before trying to read it
      const commandKey = (isDm && args.length > 0) ? `dm ${args[0].toLowerCase()}` : cmd;
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

  // --- LIVE RELAY LOGIC ---
  const chatBox = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");

  if (chatBox && chatInput) {
    // 1. LISTEN (Real-time updates)
    db.collection("relay_chat")
      .orderBy("timestamp", "desc")
      .limit(30)
      .onSnapshot((snapshot) => {
        chatBox.innerHTML = ""; // Clear for re-render
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

    // 2. TRANSMIT (Send message)
    chatInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const text = chatInput.value.trim();
        chatInput.value = ""; // Clear immediately for UX
        
        try {
          await db.collection("relay_chat").add({
            text: text,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error("Transmission failed:", err);
        }
      }
    });
  }

});
