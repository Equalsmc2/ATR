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
    log("[SYSTEM] Calibrating spatial dimensions...", "system");
    log("[SYSTEM] Injecting reality parameters...", "system");

    try {
      const notesSnap = await db.collection("notes").orderBy("timestamp").get();
      cache.notes = notesSnap.docs.map(doc => doc.id);
      log("<br>📄 <u>COMPILED SCRIPTS:</u>", "gold");
      if (notesSnap.empty) log(" [NULL] No operational scripts found.", "system");
      else notesSnap.docs.forEach((doc, i) => { 
        log(`<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> SCRIPT_0${i + 1}: ${doc.data().text}`);
      });

      const invSnap = await db.collection("inventory").orderBy("timestamp").get();
      cache.inventory = invSnap.docs.map(doc => doc.id);
      log("<br>📦 <u>EMBEDDED REGISTRY:</u>", "gold");
      if (invSnap.empty) log(" [NULL] Registry empty.", "system");
      else invSnap.docs.forEach((doc, i) => { log(` NODE_0${i + 1}: ${doc.data().text}`); });

      log("<br>[STATUS: ONLINE] Run 'commands' to view logic syntax.", "system");
    } catch (err) { log(`[FATAL ERROR] Matrix desync: ${err.message}`, "error"); }
  };

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
    help: function() { return this.commands(); },
    "admin": () => `
    <span style="color:#ff0055; font-family:'Orbitron', sans-serif;">[ ADMIN OVERRIDES ]</span>
    admin param [text]       → Alter spatial conditions (weather)
    admin signal [text]      → Broadcast quantum telemetry
    admin inject [item;100]  → Upload blueprint to constructs (use semicolon)`,
    compile: async (t) => {
      if (!t) return "Syntax Error: compile [text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() }); return "[SUCCESS] Script successfully compiled.";
    },
    scripts: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get(); cache.notes = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] No scripts exist in this plane.";
      return snap.docs.map((doc, i) => `<span class="timestamp">[${formatTime(doc.data().timestamp)}]</span> SCRIPT_0${i+1}: ${doc.data().text}`).join("\n");
    },
    terminate: async (i) => {
      const idx = parseInt(i) - 1; if (isNaN(idx) || !cache.notes[idx]) return "[ERROR] Invalid node.";
      await db.collection("notes").doc(cache.notes[idx]).delete(); return `[EXECUTED] Script_0${idx + 1} terminated.`;
    },
    encode: async (item) => {
      if (!item) return "Syntax Error: encode [item name]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() }); return `[SUCCESS] Parameter '${item}' encoded.`;
    },
    registry: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get(); cache.inventory = snap.docs.map(doc => doc.id);
      if (snap.empty) return "[NULL] Registry is empty.";
      return snap.docs.map((doc, i) => `NODE_0${i+1}: ${doc.data().text}`).join("\n");
    },
    extract: async (i) => {
      const idx = parseInt(i) - 1; if (isNaN(idx) || !cache.inventory[idx]) return "[ERROR] Invalid node.";
      const name = (await db.collection("inventory").doc(cache.inventory[idx]).get()).data().text;
      await db.collection("inventory").doc(cache.inventory[idx]).delete(); return `[EXECUTED] '${name}' extracted.`;
    },
    dimensions: async () => {
      const doc = await db.collection("meta").doc("temperature").get(); return doc.exists ? `[SPATIAL ALIGNMENT]: ${doc.data().text}` : "[ERROR] Sensors disabled.";
    },
    telemetry: async () => {
      const doc = await db.collection("meta").doc("broadcast").get(); return doc.exists ? `[QUANTUM FREQUENCY INTERCEPT]:\n"${doc.data().text}"` : "[SILENCE] No telemetry detected.";
    },
    cycles: async (input) => {
      const goldRef = db.collection("meta").doc("gold"); const doc = await goldRef.get();
      let current = doc.exists ? doc.data().amount : 0;
      if (!input) return `[COMPUTE POWER]: ${current} Cycles available.`;
      const match = input.trim().match(/^([\+\-]?)(\d+)$/); if (!match) return "Syntax Error: cycles +50 or cycles -20";
      if (match[1] === "+") current += parseInt(match[2]); else if (match[1] === "-") current -= parseInt(match[2]); else current = parseInt(match[2]);
      await goldRef.set({ amount: current, timestamp: Date.now() }); return `[SYNC] Compute updated: ${current} Cycles.`;
    },
    constructs: async () => {
      const snap = await db.collection("shop").orderBy("price").get(); if (snap.empty) return "[NULL] No blueprints loaded.";
      return snap.docs.map((doc, i) => `BLUEPRINT_0${i+1}: ${doc.data().name} — <span style="color:#00ffff">${doc.data().price} Cycles</span>`).join("\n");
    },
    synthesize: async (itemName) => {
      if (!itemName) return "Syntax Error: synthesize [blueprint name]";
      const goldRef = db.collection("meta").doc("gold"); const currentGold = (await goldRef.get()).data()?.amount || 0;
      const shopSnap = await db.collection("shop").where("name", "==", itemName).limit(1).get();
      if (shopSnap.empty) return `[ERROR] Blueprint '${itemName}' does not exist.`;
      const { price, name } = shopSnap.docs[0].data();
      if (currentGold < price) return `[DENIED] Insufficient compute energy. Requires ${price}. You have ${currentGold}.`;
      await goldRef.set({ amount: currentGold - price, timestamp: Date.now() });
      await db.collection("inventory").add({ text: name, timestamp: Date.now() });
      await db.collection("shop").doc(shopSnap.docs[0].id).delete();
      return `[FABRICATED] '${name}' synthesized.\nRemaining Energy: ${currentGold - price} Cycles.`;
    },
    "admin param": async (t) => { if(!t) return "Syntax Error"; await db.collection("meta").doc("temperature").set({ text: t, timestamp: Date.now() }); return `[OVERRIDE] Spatial alignment updated.`; },
    "admin signal": async (t) => { if(!t) return "Syntax Error"; await db.collection("meta").doc("broadcast").set({ text: t, timestamp: Date.now() }); return `[OVERRIDE] Telemetry injected.`; },
    "admin inject": async (input) => { const [n, p] = input.split(";"); if (!n || !p) return "Syntax Error"; await db.collection("shop").add({ name: n.trim(), price: parseInt(p), timestamp: Date.now() }); return `[SYSTEM] Blueprint '${n.trim()}' injected.`; },
    clear: () => { terminal.innerHTML = ""; return ""; }
  };

  cli.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowUp") { if (historyIndex > 0) { historyIndex--; cli.value = cmdHistory[historyIndex]; } e.preventDefault(); } 
    else if (e.key === "ArrowDown") { if (historyIndex < cmdHistory.length - 1) { historyIndex++; cli.value = cmdHistory[historyIndex]; } else { historyIndex = cmdHistory.length; cli.value = ""; } e.preventDefault(); }
    else if (e.key === "Enter") {
      const input = cli.value.trim(); if (!input) return;
      cmdHistory.push(input); historyIndex = cmdHistory.length; log(`[EXEC]> ${input}`, "user"); cli.value = "";
      const parts = input.split(/\s+/); const cmd = parts[0].toLowerCase(); const args = parts.slice(1);
      const isDm = cmd === "admin"; const commandKey = (isDm && args.length > 0) ? `admin ${args[0].toLowerCase()}` : cmd; const commandArgs = isDm ? args.slice(1).join(" ") : args.join(" ");
      try { if (commands[commandKey]) { const result = await commands[commandKey](commandArgs); if (result) log(result); } else { log(`[EXCEPTION] Unrecognized parameter: '${commandKey}'`, "error"); } } catch (err) { log(`[CRITICAL] Logic exception: ${err.message}`, "error"); }
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
        div.innerHTML = `<span class="timestamp">[${formatTime(d.timestamp)}]</span><span class="user">NODE_${doc.id.slice(0,4).toUpperCase()}></span><span class="text">${d.text}</span>`;
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
    // Only apply parallax if screen is large (prevents mobile jitter)
    if(window.innerWidth > 900) {
      const x = (window.innerWidth / 2 - e.pageX) / 30;
      const y = (window.innerHeight / 2 - e.pageY) / 30;
      if (spatialGrid) spatialGrid.style.transform = `translate(${x}px, ${y}px)`;
      const tiltX = (window.innerHeight / 2 - e.pageY) / 100;
      const tiltY = (e.pageX - window.innerWidth / 2) / 100;
      if (terminalWrapper && chatWrapper) {
        terminalWrapper.style.transform = `perspective(2500px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        chatWrapper.style.transform = `perspective(2500px) rotateX(${tiltX * -1}deg) rotateY(${tiltY * -1}deg)`;
      }
    }
  });

  document.addEventListener("mouseleave", () => {
    if (terminalWrapper && chatWrapper && window.innerWidth > 900) {
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
