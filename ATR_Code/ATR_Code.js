document.addEventListener("DOMContentLoaded", () => {
  // 🔥 Firebase Setup
  const config = {
    apiKey: "AIzaSyBJKMF5F9s_C6jIxUsAacZPTzTIEcWRHZQ",
    projectId: "library-terminal-4c413"
  };
  firebase.initializeApp(config);
  const db = firebase.firestore();

  // 💾 DOM Elements
  const terminal = document.getElementById("terminal");
  const cli = document.getElementById("cli");
  const tempRef = db.collection("meta").doc("temperature");
  const broadcastRef = db.collection("meta").doc("broadcast");
  const goldRef = db.collection("meta").doc("gold");
  const shopRef = db.collection("shop");
  let cache = { notes: [], inventory: [] };

  // 🧾 Utility Functions
  const log = t => {
    terminal.textContent += `\n${t}`;
    terminal.scrollTop = terminal.scrollHeight;
  };
  const format = ms => new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  // 📡 Load Data
  const fetchAndDisplay = async () => {
    log("⏳ Loading stored glyphs...\n");

    const showDocs = async (type, label) => {
      const snap = await db.collection(type).orderBy("timestamp").get();
      cache[type] = snap.docs.map(doc => doc.id);
      log(label);
      if (snap.empty) log("  — None —");
      else snap.forEach((doc, i) => {
        const d = doc.data();
        const line = type === "notes"
          ? `${i + 1}. [${format(d.timestamp)}] ${d.text}`
          : `${i + 1}. ${d.text}`;
        log(line);
      });
    };

    await showDocs("notes", "📜 Notes:");
    await showDocs("inventory", "\n🎒 Inventory:");
    log("\nType 'help' or 'dm help' for commands.");
  };

  // 🎮 Command Definitions
  const commands = {
    help: () => `Player Commands:
    note [text]        → Archive a note
    notes              → List notes
    delete [#]         → Remove a note
    add [item]         → Add item to inventory
    take [#]           → Remove item from inventory
    inventory          → List inventory
    weather            → Show current temperature
    radio              → Listen to the current broadcast
    clear              → Clear screen
    bank [+/-amount]   → Manage gold reserves
    shop               → List shop items
    buy [item name]    → Purchase an item from the shop
    exit               → Seal the Archive`,

    "dm help": () => `DM Commands:
    dm temp [text]     → Set the current temperature
    dm broadcast [text] → Set the radio transmission
    dm stock [item;price] → Add an item to the shop
    dm help            → Show this list of DM-only commands`,

    note: async t => {
      if (!t) return "Usage: note [your text]";
      await db.collection("notes").add({ text: t, timestamp: Date.now() });
      return "Note inscribed.";
    },

    notes: async () => {
      const snap = await db.collection("notes").orderBy("timestamp").get();
      if (snap.empty) return "No notes stored.";
      cache.notes = snap.docs.map(doc => doc.id);
      return snap.docs.map((doc, i) =>
        `${i + 1}. [${format(doc.data().timestamp)}] ${doc.data().text}`).join("\n");
    },

    delete: async i => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.notes[idx]) return "Invalid note number.";
      await db.collection("notes").doc(cache.notes[idx]).delete();
      return `Note ${idx + 1} removed.`;
    },

    add: async item => {
      if (!item) return "Usage: add [item]";
      await db.collection("inventory").add({ text: item, timestamp: Date.now() });
      return "Item stored.";
    },

    inventory: async () => {
      const snap = await db.collection("inventory").orderBy("timestamp").get();
      if (snap.empty) return "Inventory is empty.";
      cache.inventory = snap.docs.map(doc => doc.id);
      return snap.docs.map((doc, i) => `${i + 1}. ${doc.data().text}`).join("\n");
    },

    take: async i => {
      const idx = parseInt(i) - 1;
      if (isNaN(idx) || !cache.inventory[idx]) return "Invalid item number.";
      await db.collection("inventory").doc(cache.inventory[idx]).delete();
      return `Item ${idx + 1} removed.`;
    },

    weather: async () => {
      const doc = await tempRef.get();
      return doc.exists ? `🌤️ Current temperature: ${doc.data().text}` : "No temperature set.";
    },

    "dm temp": async t => {
      if (!t) return "Usage: dm temp [description]";
      await tempRef.set({ text: t, timestamp: Date.now() });
      return `🌡️ Temperature set to: ${t}`;
    },

    "dm broadcast": async message => {
      if (!message) return "Usage: dm broadcast [message]";
      await broadcastRef.set({ text: message, timestamp: Date.now() });
      return `📡 Broadcast set: "${message}"`;
    },

    radio: async () => {
      const doc = await broadcastRef.get();
      return doc.exists ? `📡 Radio Transmission: ${doc.data().text}` : "📡 Silence... No active broadcast.";
    },

    "bank": async input => {
        const doc = await goldRef.get();
        const current = doc.exists ? doc.data().amount : 0;

        if (!input) {
          return `💰 Bank Reserve: ${current} gold`;
        }

        const match = input.trim().match(/^([\+\-]?)(\d+)$/);
        if (!match) return "Usage: gold [+/-amount]";

        const sign = match[1];
        const value = parseInt(match[2]);

        let newTotal = current;
        if (sign === "+") newTotal += value;
        else if (sign === "-") newTotal -= value;
        else newTotal = value;

        await goldRef.set({ amount: newTotal, timestamp: Date.now() });
        return `💾 Bank balance updated: ${newTotal} gold`;
      },

      // 📜 List items available in the shop
      "shop": async () => {
        const snap = await shopRef.orderBy("timestamp").get();
        if (snap.empty) return "🛒 The shop is empty.";
        return snap.docs.map((doc, i) => {
          const d = doc.data();
          return `${i + 1}. ${d.name} — ${d.price} gold`;
        }).join("\n");
      },
      // 🛍️ Buy an item from the shop
      "buy": async itemName => {
        if (!itemName) return "Usage: buy [item name]";

        // Fetch current gold
        const goldDoc = await goldRef.get();
        const currentGold = goldDoc.exists ? goldDoc.data().amount : 0;

        // Find the item in the shop
        const snap = await shopRef.where("name", "==", itemName).limit(1).get();
        if (snap.empty) return `❌ Item '${itemName}' not found in the shop.`;

        const doc = snap.docs[0];
        const item = doc.data();

        if (currentGold < item.price)
          return `💸 Not enough gold. You need ${item.price}, but have ${currentGold}.`;

        // Deduct gold and remove item from shop
        const newTotal = currentGold - item.price;
        await goldRef.set({ amount: newTotal, timestamp: Date.now() });
        await db.collection("inventory").add({ text: item.name, timestamp: Date.now() });
        await shopRef.doc(doc.id).delete();

        return `✅ Purchased '${item.name}' for ${item.price} gold.\n💰 New balance: ${newTotal} gold.\n📦 Item removed from shop.`;
      },

        "dm stock": async input => {
          const [name, priceStr] = input.split(";");
          const price = parseInt(priceStr);
          if (!name || isNaN(price)) return "Usage: dm stock [item name];[price]";
          await shopRef.add({ name: name.trim(), price, timestamp: Date.now() });
          return `📦 '${name.trim()}' stocked for ${price} gold.`;
        },

    clear: () => (terminal.textContent = ""),
    exit: () => "📖 Archive sealed. Float freely."
  };

  // ⌨️ Command Input Listener
  cli.addEventListener("keydown", async e => {
    if (e.key === "Enter") {
      const input = cli.value.trim();
      log("> " + input);
      const [cmd, ...args] = input.split(" ");
      const base = cmd.toLowerCase() === "dm" ? `${cmd} ${args[0]}` : cmd.toLowerCase();
      const output = commands[base]
        ? await commands[base](args.slice(cmd === "dm" ? 1 : 0).join(" "))
        : `Unknown incantation: '${cmd}'`;
      if (output) log(output);
      cli.value = "";
    }
  });

  // 🚀 Initiate Terminal
  fetchAndDisplay();
});
