document.addEventListener("DOMContentLoaded", () => {
  // 🔥 Firebase Setup
  const config = {
    apiKey: "AIzaSyBJKMF5F9s_C6jIxUsAacZPTzTIEcWRHZQ",
    projectId: "library-terminal-4c413"
  };
  
  if (!firebase.apps.length) firebase.initializeApp(config);
  const db = firebase.firestore();

  const terminal = document.getElementById("terminal");
  const cli = document.getElementById("cli");
  let cache = { notes: [], inventory: [] };
  let cmdHistory = [];
  let historyIndex = -1;
  
  const updateClock = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const clockEl = document.getElementById("system-clock");
    if(clockEl) clockEl.innerText = timeString + " SYS";
  };
  setInterval(updateClock, 1000);
  updateClock();

  const log = (text, type = "normal") => {
    const div = document.createElement("div");
    div.classList.add("line", type);
    div.innerHTML = text.replace(/\n/g, "<br>");
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  };

  const formatTime = (ms) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const loadData = async () => {
    log("[SYSTEM] Initializing system routines...", "system");
    log("[SYSTEM] Fetching database records...", "system");

    try {
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      log("\n📄 <u>SAVED NOTES:</u>", "gold");
      if (notesSnap.empty) log(" [NULL] No notes found.", "system");
      else notesSnap.docs.forEach((doc, i) => { 
        log(`<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> NOTE_0${i + 1}: ${doc.data().text}`);
      });

      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      log("\n📦 <u>INVENTORY:</u>", "gold");
      if (invSnap.empty) log(" [NULL] Inventory empty.", "system");
      else invSnap.docs.forEach((doc, i) => { log(` ITEM_0${i + 1}: ${doc.data().text}`); });

      log("\n[STATUS: ONLINE] Type 'help' to view available commands.", "system");
    } catch (err) { log(`[FATAL ERROR] Database connection failed: ${err.message}`, "error"); }
  };

  // 🛠️ NORMALIZED COMMANDS OBJECT
  const commands = {
    commands: () => `
    <span style="color:#00ffff; font-family:'Orbitron', sans-serif; letter-spacing:1px;">[ SYSTEM COMMANDS ]</span>
    write [text]    → Save a new note
    read            → Read all saved notes
    rm [#]          → Delete a note by number
    store [item]    → Add an item to your inventory
    take [#]        → Remove an item from inventory by number
    inv             → Check your inventory
    weather         → Check current weather conditions
    radio           → Intercept radio signals
    bank [+/- amt]  → Manage your coins
    shop            → View available items in the shop
    buy [item]      → Buy an item from the shop
    clear           → Clear the terminal display
    help            → Show this menu`,
    
    help: function() { return this.commands(); },
    
    admin: () => `
    <span style="color:#ff0055; font-family:'Orbitron', sans-serif;">[ ADMIN COMMANDS ]</span>
    admin weather [text]     → Alter weather conditions
    admin radio [text]       → Update radio broadcast
    admin stock [item;100]   → Upload items to shop (use semicolon for price)`,

    write: async (t) => {
      if (!t) return "Syntax Error: write [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() }); return "[SUCCESS] Note saved.";
    },
    read: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get(); cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] No notes exist.";
      return snap.docs.map((doc, i) => `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> NOTE_0${i+1}: ${doc.data().text}`).join("\n");
    },
    rm: async (i) => {
      const idx = parseInt(i) - 1; if (isNaN(idx) || !cache.notes[idx]) return "[ERROR] Invalid note number.";
      await db.collection("notes").doc(cache.notes[idx]).delete(); return `[EXECUTED] Note_0${idx + 1} deleted.`;
    },
    store: async (item) => {
      if (!item) return "Syntax Error: store [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() }); return `[SUCCESS] '${item}' added to inventory.`;
    },
    inv: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get(); cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] Inventory is empty.";
      return snap.docs.map((doc, i) => `ITEM_0${i+1}: ${doc.data().text}`).join("\n");
    },
    take: async (i) => {
      const idx = parseInt(i) - 1; if (isNaN(idx) || !cache.inventory[idx]) return "[ERROR] Invalid item number.";
      const name = (await db.collection("inventory").doc(cache.inventory[idx]).get()).data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete(); return `[EXECUTED] '${name}' removed from inventory.`;
    },
    weather: async () => {
      const doc = await db.collection("meta").doc("temperature").get(); return doc.exists ? `[WEATHER]: ${doc.data().text}` : "[ERROR] Sensors offline.";
    },
    radio: async () => {
      const doc = await db.collection("meta").doc("broadcast").get(); return doc.exists ? `[RADIO INTERCEPT]:\n"${doc.data().text}"` : "[SILENCE] No signals detected.";
    },
    bank: async (input) => {
      const goldRef = db.collection("meta").doc("gold"); const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;
      if (!input) return `[BANK]: ${current} Coins available.`;
      const match = input.trim().match(/^([\+\-]?)(\d+)$/); if (!match) return "Syntax Error: bank +50 or bank -20";
      if (match[1] === "+") current += parseInt(match[2]); else if (match[1] === "-") current -= parseInt(match[2]); else current = parseInt(match[2]);
      await goldRef.set({ amount: current, timestamp: Date.now() }); return `[SUCCESS] Bank updated: ${current} Coins.`;
    },
    shop: async () => {
      const snap = await db.collection("shop").orderBy("price").get(); if (snap.empty) return "[NULL] Shop is empty.";
      return snap.docs.map((doc, i) => `ITEM_0${i+1}: ${doc.data().name} — <span style="color:#00ffff">${doc.data().price} Coins</span>`).join("\n");
    },
    buy: async (itemName) => {
      if (!itemName) return "Syntax Error: buy [item name]";
      const goldRef = db.collection("meta").doc("gold"); const currentGold = (await goldRef.get()).data()?.amount || 0;
      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[ERROR] Item '${itemName}' does not exist in the shop.`;
      const { price, name } = shopSnap.docs[0].data();
      if (currentGold < price) return `[DENIED] Insufficient funds. Requires ${price} Coins. You have ${currentGold}.`;
      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(shopSnap.docs[0].id).delete();
      return `[SUCCESS] Bought '${name}'.\nRemaining Balance: ${currentGold - price} Coins.`;
    },
    "admin weather": async (t) => { if(!t) return "Syntax Error"; await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() }); return `[ADMIN] Weather updated.`; },
    "admin radio": async (t) => { if(!t) return "Syntax Error"; await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() }); return `[ADMIN] Radio updated.`; },
    "admin stock": async (input) => { const [n, p] = input.split(";"); if (!n || !p) return "Syntax Error"; await db.collection("shop").add({ name: n.trim(), price: parseInt(p), timestamp: Date.now() }); return `[ADMIN] '${n.trim()}' added to shop.`; },
    clear: () => { terminal.innerHTML = ""; return ""; }
  };

  cli.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowUp") { if (historyIndex > 0) { historyIndex--; cli.value = cmdHistory[historyIndex]; } e.preventDefault(); } 
    else if (e.key === "ArrowDown") { if (historyIndex < cmdHistory.length - 1) { historyIndex++; cli.value = cmdHistory[historyIndex]; } else { historyIndex = cmdHistory.length; cli.value = ""; } e.preventDefault(); }
    else if (e.key === "Enter") {
      const input = cli.value.trim(); if (!input) return;
      cmdHistory.push(input); historyIndex = cmdHistory.length; log(`[EXEC]> ${input}`, "user"); cli.value = "";
      const parts = input.split(/\s+/); const cmd = parts[0].toLowerCase(); const args = parts.slice(1);
      
      // Fixed Admin parsing logic
      const isDm = cmd === "admin"; 
      const commandKey = (isDm && args.length > 0) ? `admin ${args[0].toLowerCase()}` : cmd; 
      const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");
      
      try { 
        if (commands[commandKey]) { 
          const result = await commands[commandKey](commandArgs); 
          if (result) log(result); 
        } else { 
          log(`[ERROR] Unknown command: '${commandKey}'. Type 'help' for a list of commands.`, "error"); 
        } 
      } catch (err) { log(`[CRITICAL ERROR]: ${err.message}`, "error"); }
    }
  });

  loadData();

  // --- LIVE RELAY LOGIC ---
  const chatBox = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  if (chatBox && chatInput) {
    db.collection("relay_chat").orderBy("timestamp", "desc").limit(30).onSnapshot((snapshot) => {
      chatBox.innerHTML = ""; 
      snapshot.forEach((doc) => {
        const d = doc.data(); const div = document.createElement("div"); div.className = "chat-msg";
        div.innerHTML = `<span class="timestamp">[${formatTime(d.timestamp)}]</span><span class="user">NODE_${doc.id.slice(0,4).toUpperCase()}> </span><span class="text">${d.text}</span>`;
        chatBox.appendChild(div);
      });
    });
    chatInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && chatInput.value.trim() !== "") {
        const text = chatInput.value.trim(); chatInput.value = ""; 
        try { await db.collection("relay_chat").add({ text: text, timestamp: Date.now() }); } catch (err) {}
      }
    });
  }

  // --- QUANTUM PARALLAX & MOUSE TRACKING ---
  const spatialGrid = document.getElementById("spatial-grid");
  const terminalWrapper = document.getElementById("terminal-wrapper");
  const chatWrapper = document.getElementById("chat-wrapper");

  document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 30;
    const y = (window.innerHeight / 2 - e.pageY) / 30;
    if (spatialGrid) spatialGrid.style.transform = `translate(${x}px, ${y}px)`;
    const tiltX = (window.innerHeight / 2 - e.pageY) / 100;
    const tiltY = (e.pageX - window.innerWidth / 2) / 100;
    if (terminalWrapper && chatWrapper) {
      terminalWrapper.style.transform = `perspective(2500px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      chatWrapper.style.transform = `perspective(2500px) rotateX(${tiltX * -1}deg) rotateY(${tiltY * -1}deg)`;
    }
  });

  document.addEventListener("mouseleave", () => {
    if (terminalWrapper && chatWrapper) {
      terminalWrapper.style.transform = ""; chatWrapper.style.transform = "";
    }
  });

  // --- THE CODE OF REALITY (MATRIX RAIN) ---
  const canvas = document.getElementById('reality-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'.split('');
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = [];
    for(let x = 0; x < columns; x++) drops[x] = 1;

    function drawRain() {
      ctx.fillStyle = 'rgba(1, 1, 5, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = fontSize + 'px "Fira Code"';
      for(let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        
        if (Math.random() > 0.96) {
          ctx.fillStyle = '#00ffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ffff';
        } else {
          ctx.fillStyle = '#0088ff';
          ctx.shadowBlur = 0;
        }
        
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    setInterval(drawRain, 50);

    window.addEventListener('resize', () => {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
    });
  }
});
