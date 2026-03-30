document.addEventListener("DOMContentLoaded", () => {
  const tray = document.getElementById("side-tray");

  // 🛠️ Toggle Tray Visibility
  const toggleBtn = document.getElementById("tools-toggle");
  const closeBtn = document.getElementById("tray-close");

  if (toggleBtn) toggleBtn.addEventListener("click", () => tray.classList.add("open"));
  if (closeBtn) closeBtn.addEventListener("click", () => tray.classList.remove("open"));
});

// 🎲 Dice Logic
// We attach this to 'window' so the HTML onclick="roll()" attributes can find it
window.roll = (sides) => {
  const display = document.getElementById("dice-display");
  const result = Math.floor(Math.random() * sides) + 1;
  
  // Quick animation text
  display.textContent = "Rolling...";
  display.style.color = "#888";

  setTimeout(() => {
    display.innerHTML = `d${sides}: <span style="color:#50ffab">${result}</span>`;
    display.style.color = "#fff";
  }, 150);
};

// 🔢 Calculator Logic
let calcExp = "";

window.calc = (val) => {
  const screen = document.getElementById("calc-screen");
  
  if (val === "C") {
    // Clear
    calcExp = "";
    screen.textContent = "0";
  } else if (val === "=") {
    // Calculate
    try {
      // Evaluate the math string (Note: eval is safe here because input is restricted to buttons)
      const result = eval(calcExp);
      // Handle division by zero or infinity
      if (!isFinite(result)) {
        screen.textContent = "Error";
        calcExp = "";
      } else {
        screen.textContent = result;
        calcExp = result.toString();
      }
    } catch (e) {
      screen.textContent = "Err";
      calcExp = "";
    }
  } else {
    // Add number or operator
    // Prevent starting with an operator (except minus)
    if (calcExp === "" && ["*", "/", "+"].includes(val)) return;
    
    calcExp += val;
    screen.textContent = calcExp;
  }
};