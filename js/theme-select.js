const SELECT_ENHANCED = "data-theme-select-enhanced";

function isLatinText(value) {
  return /^[\d\sA-Za-z:./+\-()]+$/.test(String(value || "").trim());
}

function closeAllSelects(except = null) {
  document.querySelectorAll(".theme-select.open").forEach((selectShell) => {
    if (selectShell === except) return;
    selectShell.classList.remove("open");
    selectShell.querySelector(".theme-select-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function syncThemeSelect(select, shell) {
  const selectedOption = select.selectedOptions[0] || select.options[0];
  const valueNode = shell.querySelector(".theme-select-value");
  if (!selectedOption || !valueNode) return;
  valueNode.textContent = selectedOption.textContent;
  valueNode.classList.toggle("is-latin", isLatinText(selectedOption.textContent));
  shell.querySelectorAll("[data-select-value]").forEach((optionNode) => {
    const isSelected = optionNode.dataset.selectValue === select.value;
    optionNode.classList.toggle("selected", isSelected);
    optionNode.setAttribute("aria-selected", String(isSelected));
  });
}

function buildThemeSelect(select) {
  if (select.hasAttribute(SELECT_ENHANCED)) return;
  select.setAttribute(SELECT_ENHANCED, "true");
  select.classList.add("native-select");

  const shell = document.createElement("div");
  shell.className = "theme-select";

  const button = document.createElement("button");
  button.className = "theme-select-trigger";
  button.type = "button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const valueNode = document.createElement("span");
  valueNode.className = "theme-select-value";
  const chevron = document.createElement("span");
  chevron.className = "theme-select-chevron";
  chevron.setAttribute("aria-hidden", "true");
  button.append(valueNode, chevron);

  const list = document.createElement("div");
  list.className = "theme-select-list";
  list.setAttribute("role", "listbox");

  Array.from(select.options).forEach((option) => {
    const optionNode = document.createElement("button");
    optionNode.className = "theme-select-option";
    optionNode.type = "button";
    optionNode.dataset.selectValue = option.value;
    optionNode.textContent = option.textContent;
    optionNode.setAttribute("role", "option");
    optionNode.classList.toggle("is-latin", isLatinText(option.textContent));
    optionNode.addEventListener("click", () => {
      select.value = option.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      shell.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      syncThemeSelect(select, shell);
    });
    list.append(optionNode);
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    const willOpen = !shell.classList.contains("open");
    closeAllSelects(shell);
    shell.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });

  select.addEventListener("change", () => syncThemeSelect(select, shell));
  select.after(shell);
  shell.append(button, list);
  syncThemeSelect(select, shell);
}

export function enhanceThemeSelects(root = document) {
  root.querySelectorAll("select").forEach(buildThemeSelect);
}

document.addEventListener("click", (event) => {
  if (!event.target?.closest?.(".theme-select")) closeAllSelects();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeAllSelects();
});
