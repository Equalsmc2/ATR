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
    if(clockEl) clockEl.innerText = timeString + " SYS";
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
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  // 📡 Data Loading
  const loadData = async () => {
    log("[SYSTEM] Calibrating spatial dimensions...", "system");
    log("[SYSTEM] Injecting reality parameters...", "system");

    try {
      // Load Scripts (formerly Notes)
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      
      log("<br>📄 <u>COMPILED SCRIPTS:</u>", "gold");
      if (notesSnap.empty) log(" [NULL] No operational scripts found.", "system");
      else notesSnap.docs.forEach((doc, i) => { 
        const d = doc.data();
        log(`<span class="timestamp">[${formatTime(d.timestamp)}]</span> SCRIPT_0${i + 1}: ${d.text}`);
      });

      // Load Embedded Data (formerly Inventory)
      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      
      log("<br>📦 <u>EMBEDDED REGISTRY:</u>", "gold");
      if (invSnap.empty) log(" [NULL] Registry empty.", "system");
      else invSnap.docs.forEach((doc, i) => { 
        log(` NODE_0${i + 1}: ${doc.data().text}`);
      });

      log("<br>[STATUS: ONLINE] Run 'commands' to view logic syntax.", "system");
    } catch (err) {
      log(`[FATAL ERROR] Matrix desync: ${err.message}`, "error");
    }
  };

  // 🎮 Command Logic
  const commands = {
    commands: () => `
    <span style="color:#00ffff; font-family:'Orbitron', sans-serif; letter-spacing:1px;">[ LOGIC SYNTAX ]</span>
    compile [text]    → Write a script to the matrix
    scripts           → Read all compiled scripts
    terminate [#]     → Erase script by node number
    encode [item]     → Embed an item into your spatial registry
    extract [#]       → Remove an item by node number
    registry          → Check embedded spatial registry
    dimensions        → Check current spatial alignment/conditions
    telemetry         → Intercept quantum frequency signals
    cycles [+/- amt]  → Adjust computational processing energy
    constructs        → View available reality blueprints
    synthesize [item] → Expend cycles to synthesize a construct
    clear             → Purge terminal display`,

    // ALIAS FOR MUSCLE MEMORY
    help: function() { return this.commands(); },

    "admin": () => `
    <span style="color:#ff0055; font-family:'Orbitron', sans-serif;">[ ADMIN OVERRIDES ]</span>
    admin param [text]       → Alter spatial conditions (weather)
    admin signal [text]      → Broadcast quantum telemetry
    admin inject [item;100]  → Upload blueprint to constructs (use semicolon)`,

    // --- SCRIPTS (NOTES) ---
    compile: async (t) => {
      if (!t) return "Syntax Error: compile [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "[SUCCESS] Script successfully compiled to reality matrix.";
    },
    scripts: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] No scripts exist in this plane.";
      return snap.docs.map((doc, i) => 
        `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> SCRIPT_0${i+1}: ${doc.data().text}`
      ).join("\n");
    },
    terminate: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "[ERROR] Invalid script node designation.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `[EXECUTED] Script_0${idx + 1} terminated and purged.`;
    },

    // --- REGISTRY (INVENTORY) ---
    encode: async (item) => {
      if (!item) return "Syntax Error: encode [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return `[SUCCESS] Parameter '${item}' encoded to spatial registry.`;
    },
    registry: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] Spatial registry is empty.";
      return snap.docs.map((doc, i) => `NODE_0${i+1}: ${doc.data().text}`).join("\n");
    },
    extract: async (i) => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "[ERROR] Invalid node designation.";
      const docRef = await db.collection("inventory").doc(cache.inventory[idx]).get();
      const name = docRef.data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `[EXECUTED] '${name}' extracted from registry.`;
    },

    // --- WORLD INFO ---
    dimensions: async () => {
      const doc = await db.collection("meta").doc("temperature").get();
      return doc.exists ? `[SPATIAL ALIGNMENT]: ${doc.data().text}` : "[ERROR] Sensors disabled.";
    },
    telemetry: async () => {
      const doc = await db.collection("meta").doc("broadcast").get();
      return doc.exists ? `[QUANTUM FREQUENCY INTERCEPT]:\n"${doc.data().text}"` : "[SILENCE] No telemetry detected.";
    },
    
    // --- CYCLES (ECONOMY) ---
    cycles: async (input) => {
      const goldRef = db.collection("meta").doc("gold");
      const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;

      if (!input) return `[COMPUTE POWER]: ${current} Cycles available.`;

      const match = input.trim().match(/^([\+\-]?)(\d+)$/);
      if (!match) return "Syntax Error: cycles +50 or cycles -20";

      const sign = match[1];
      const val = parseInt(match[2]);
      
      if (sign === "+") current += val;
      else if (sign === "-") current -= val;
      else current = val;

      await goldRef.set({ amount: current, timestamp: Date.now() });
      return `[SYNC] Compute updated. Available processing energy: ${current} Cycles.`;
    },

    constructs: async () => {
      const snap = await db.collection("shop").orderBy("price").get();
      if (snap.empty) return "[NULL] No blueprints loaded in the synthesizer.";
      return snap.docs.map((doc, i) => 
        `BLUEPRINT_0${i+1}: ${doc.data().name} — <span style="color:#00ffcc">${doc.data().price} Cycles</span>`
      ).join("\n");
    },

    synthesize: async (itemName) => {
      if (!itemName) return "Syntax Error: synthesize [blueprint name]";
      const goldRef = db.collection("meta").doc("gold");
      const goldDoc = await goldRef.get();
      const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;

      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[ERROR] Blueprint '${itemName}' does not exist in registry.`;

      const itemDoc = shopSnap.docs[0];
      const { price, name } = itemDoc.data();

      if (currentGold < price) return `[DENIED] Insufficient compute energy. Requires ${price} Cycles. You have ${currentGold}.`;

      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(itemDoc.id).delete();

      return `[FABRICATED] Blueprint '${name}' successfully synthesized.\nRemaining Energy: ${currentGold - price} Cycles.`;
    },

    // --- DM TOOLS ---
    "admin param": async (t) => {
      if(!t) return "Syntax Error: admin param [text]";
      await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() });
      return `[OVERRIDE] Spatial alignment parameters updated.`;
    },
    "admin signal": async (t) => {
      if(!t) return "Syntax Error: admin signal [text]";
      await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() });
      return `[OVERRIDE] Quantum telemetry broadcast injected.`;
    },
    "admin inject": async (input) => {
      const [name, price] = input.split(";");
      if (!name || !price) return "Syntax Error: admin inject [blueprint name];[price]";
      await db.collection("shop").add({ name: name.trim(), price: parseInt(price), timestamp: Date.now() });
      return `[SYSTEM] Injected blueprint '${name.trim()}' requiring ${price} Cycles.`;
    },

    clear: () => {
      terminal.innerHTML = "";
      return "";
    }
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

      log(`[EXEC]> ${input}`, "user");
      cli.value = "";

      const parts = input.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      const isDm = cmd === "admin";
      const commandKey = (isDm && args.length > 0) ? `admin ${args[0].toLowerCase()}` : cmd;
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");

      try {
        if (commands[commandKey]) {
          const result = await commands[commandKey](commandArgs);
          if (result) log(result);
        } else {
          log(`[EXCEPTION] Unrecognized parameter: '${commandKey}'`, "error");
        }
      } catch (err) {
        log(`[CRITICAL] Logic exception: ${err.message}`, "error");
      }
    }
  });

  loadData();

  // --- LIVE RELAY LOGIC ---
  const chatBox = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");

  if (chatBox && chatInput) {
    db.collection("relay_chat")
      .orderBy("timestamp", "desc")
      .limit(30)
      .onSnapshot((snapshot) => {
        chatBox.innerHTML = ""; 
        snapshot.forEach((doc) => {
          const data = doc.data();
          const msgDiv = document.createElement("div");
          msgDiv.className = "chat-msg";
          msgDiv.innerHTML = `
            <span class="timestamp">[${formatTime(data.timestamp)}]</span>
            <span class="user">NODE_${doc.id.slice(0,4).toUpperCase()}></span> 
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
          await db.collection("relay_chat").add({
            text: text,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error("Telemetry failed:", err);
        }
      }
    });
  }
});
