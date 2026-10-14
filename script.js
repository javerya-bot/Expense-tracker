
const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const list = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search");
const filterInput = document.getElementById("filter");
const message = document.getElementById("form-message");

const STORAGE_KEY = "pennytrack_transactions";

let transactions = [];

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : [];

  if (Array.isArray(parsed)) {
    transactions = parsed.filter(item =>
      item &&
      Number.isFinite(item.id) &&
      typeof item.description === "string" &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      ["income", "expense"].includes(item.type) &&
      typeof item.category === "string" &&
      typeof item.date === "string"
    );
  }
} catch {
  transactions = [];
}

const icons = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "💡",
  Education: "📚",
  Health: "💊",
  Salary: "💼",
  Freelance: "💻",
  Other: "✨"
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

dateInput.value = todayString();
dateInput.max = todayString();

document.getElementById("today").textContent =
  new Date().toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

function formatMoney(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
  }).format(amount);
}

function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(transactions)
    );
    return true;
  } catch {
    message.textContent =
      "Could not save data. Check browser storage.";
    return false;
  }
}

function updateSummary() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = transactions
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  document.getElementById("income").textContent =
    formatMoney(income);

  document.getElementById("expense").textContent =
    formatMoney(expense);

  document.getElementById("balance").textContent =
    formatMoney(income - expense);

  document.getElementById("count").textContent =
    `${transactions.length} item${transactions.length === 1 ? "" : "s"}`;
}

function renderTransactions() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = filterInput.value;

  const filtered = transactions
    .filter(item => {
      const matchesSearch =
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesType =
        filter === "all" || item.type === filter;

      return matchesSearch && matchesType;
    })
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.id - a.id
    );

  list.replaceChildren();

  emptyState.classList.toggle("hidden", filtered.length > 0);

  if (transactions.length > 0 && filtered.length === 0) {
    emptyState.querySelector("h3").textContent =
      "No matching transactions";

    emptyState.querySelector("p").textContent =
      "Try another search or filter.";
  } else {
    emptyState.querySelector("h3").textContent =
      "No transactions yet";

    emptyState.querySelector("p").textContent =
      "Add your first transaction to see it here.";
  }

  filtered.forEach(item => {
    const row = document.createElement("article");
    row.className = "transaction";

    const icon = document.createElement("div");
    icon.className = "category-icon";
    icon.textContent = icons[item.category] || "✨";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("h3");
    title.textContent = item.description;

    const details = document.createElement("p");
    details.textContent =
      `${item.category} · ${item.date}`;

    info.append(title, details);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${item.type}`;

    amount.textContent =
      `${item.type === "income" ? "+" : "−"}${formatMoney(item.amount)}`;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${item.description}`
    );

    deleteButton.addEventListener("click", () => {
      deleteTransaction(item.id);
    });

    right.append(amount, deleteButton);
    row.append(icon, info, right);
    list.appendChild(row);
  });
}

function refreshApp() {
  updateSummary();
  renderTransactions();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  message.textContent = "";

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description) {
    message.textContent = "Please enter a description.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Enter an amount greater than zero.";
    return;
  }

  if (!["income", "expense"].includes(type)) {
    message.textContent = "Choose a valid transaction type.";
    return;
  }

  if (!Object.hasOwn(icons, category)) {
    message.textContent = "Choose a valid category.";
    return;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date > todayString()
  ) {
    message.textContent = "Choose a valid date up to today.";
    return;
  }

  const transaction = {
    id: Date.now() + Math.random(),
    description,
    amount,
    type,
    category,
    date
  };

  transactions.unshift(transaction);

  if (!saveTransactions()) {
    transactions.shift();
    return;
  }

  form.reset();
  dateInput.value = todayString();
  message.textContent = "Transaction added successfully!";

  refreshApp();
  descriptionInput.focus();
});

function deleteTransaction(id) {
  const previous = transactions;

  transactions = transactions.filter(
    item => item.id !== id
  );

  if (!saveTransactions()) {
    transactions = previous;
    return;
  }

  message.textContent = "Transaction deleted.";
  refreshApp();
}

searchInput.addEventListener("input", renderTransactions);
filterInput.addEventListener("change", renderTransactions);

refreshApp();
