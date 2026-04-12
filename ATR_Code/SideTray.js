document.addEventListener("DOMContentLoaded", () => {
  const tray = document.getElementById("side-tray");
  const toggleBtn = document.getElementById("tools-toggle");
  const closeBtn = document.getElementById("tray-close");

  // 🛠️ Toggle Tray Visibility
  if (toggleBtn) toggleBtn.addEventListener("click", () => tray.classList.add("open"));
  if (closeBtn) closeBtn.addEventListener("click", () => tray.classList.remove("open"));
});

// 🎲 Dice Logic
window.roll = (sides) => {
  const display = document.getElementById("dice-display");
  const result = Math.floor(Math.random() * sides) + 1;
  
  display.textContent = "Rolling...";
  display.style.color = "#888";

  setTimeout(() => {
    display.innerHTML = `d${sides}: <span style="color: var(--term-text)">${result}</span>`;
    display.style.color = "#fff";
  }, 150);
};

// 🔢 Calculator Logic
let calcExp = "";

window.calc = (val) => {
  const screen = document.getElementById("calc-screen");

  if (val === "C") {
    calcExp = "";
    screen.textContent = "0";
  } else if (val === "=") {
    try {
      // Use Function constructor instead of raw eval for slightly safer execution
      const result = new Function('return ' + calcExp)();
      
      if (!isFinite(result)) {
        screen.textContent = "Error";
        calcExp = "";
      } else {
        // Format to prevent massive decimals overflowing the retro screen
        const finalResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
        screen.textContent = finalResult;
        calcExp = finalResult.toString();
      }
    } catch (e) {
      screen.textContent = "Err";
      calcExp = "";
    }
  } else {
    // Prevent starting with multiple operators or illegal leading operators
    if (calcExp === "" && ["*", "/", "+"].includes(val)) return;
    calcExp += val;
    screen.textContent = calcExp;
  }
};
