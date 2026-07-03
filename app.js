const STORAGE_KEY = "notes-app:notes";

const addForm = document.getElementById("add-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const notesList = document.getElementById("notes-list");
const emptyState = document.getElementById("empty-state");
const toast = document.getElementById("toast");
const bulkActions = document.getElementById("bulk-actions");
const selectAllCheckbox = document.getElementById("select-all-checkbox");
const selectedCountEl = document.getElementById("selected-count");
const exportSelectedBtn = document.getElementById("export-selected-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file-input");
const searchInput = document.getElementById("search-input");

let notes = loadNotes();
let toastTimeoutId = null;
let selectedIds = new Set();
let searchQuery = "";

let needsBackfillSave = false;
for (const note of notes) {
  if (typeof note.createdAt !== "number") {
    note.createdAt = Date.now();
    needsBackfillSave = true;
  }
}
if (needsBackfillSave) {
  sortNotesByDate();
  saveNotes();
}

function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function sortNotesByDate() {
  notes.sort((a, b) => b.createdAt - a.createdAt);
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove("visible");
  }, 2000);
}

function dayKey(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateHeading(timestamp) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dayKey(timestamp) === dayKey(Date.now())) return "Today";
  if (dayKey(timestamp) === dayKey(yesterday.getTime())) return "Yesterday";

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const CARD_COLORS = [
  "#fdecc8",
  "#d7e3fc",
  "#e2f0cb",
  "#ffd9e8",
  "#e5d4ef",
  "#d0f4f4",
  "#ffe0cc",
];

function getCardColor(note) {
  let hash = 0;
  for (let i = 0; i < note.id.length; i++) {
    hash = (hash * 31 + note.id.charCodeAt(i)) >>> 0;
  }
  return CARD_COLORS[hash % CARD_COLORS.length];
}

function getVisibleNotes() {
  if (!searchQuery) return notes;
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery) ||
      n.body.toLowerCase().includes(searchQuery)
  );
}

function render(flashId) {
  notesList.innerHTML = "";
  const visibleNotes = getVisibleNotes();

  if (notes.length === 0) {
    emptyState.textContent = "No notes yet. Add your first one above.";
    emptyState.hidden = false;
    updateBulkBar();
    return;
  }

  if (visibleNotes.length === 0) {
    emptyState.textContent = "No notes match your search.";
    emptyState.hidden = false;
    updateBulkBar();
    return;
  }

  emptyState.hidden = true;

  let lastDayKey = null;
  let currentGrid = null;

  for (const note of visibleNotes) {
    const noteDayKey = dayKey(note.createdAt);
    if (noteDayKey !== lastDayKey) {
      const heading = document.createElement("h3");
      heading.className = "date-heading";
      heading.textContent = formatDateHeading(note.createdAt);
      notesList.appendChild(heading);

      currentGrid = document.createElement("div");
      currentGrid.className = "notes-grid";
      notesList.appendChild(currentGrid);

      lastDayKey = noteDayKey;
    }

    const row = document.createElement("div");
    row.className = "note-row";

    const selectCheckbox = document.createElement("input");
    selectCheckbox.type = "checkbox";
    selectCheckbox.className = "select-checkbox";
    selectCheckbox.checked = selectedIds.has(note.id);
    selectCheckbox.addEventListener("change", () => {
      if (selectCheckbox.checked) {
        selectedIds.add(note.id);
      } else {
        selectedIds.delete(note.id);
      }
      updateBulkBar();
    });

    const card = buildNoteCard(note);
    if (note.id === flashId) {
      card.classList.add("note-card--flash");
      card.addEventListener("animationend", () => {
        card.classList.remove("note-card--flash");
      });
    }

    row.append(selectCheckbox, card);
    currentGrid.appendChild(row);
  }

  updateBulkBar();
}

function updateBulkBar() {
  const visibleNotes = getVisibleNotes();
  const visibleSelectedCount = visibleNotes.filter((n) =>
    selectedIds.has(n.id)
  ).length;
  const selectedCount = selectedIds.size;

  bulkActions.hidden = selectedCount === 0;
  selectedCountEl.textContent =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  selectAllCheckbox.checked =
    visibleNotes.length > 0 && visibleSelectedCount === visibleNotes.length;
  selectAllCheckbox.indeterminate =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleNotes.length;
}

function buildNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";
  card.style.setProperty("--card-color", getCardColor(note));

  const titleEl = document.createElement("h2");
  titleEl.textContent = note.title;

  const bodyEl = document.createElement("p");
  bodyEl.textContent = note.body;

  const actions = document.createElement("div");
  actions.className = "actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "secondary";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => {
    card.replaceWith(buildEditCard(note));
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    notes = notes.filter((n) => n.id !== note.id);
    selectedIds.delete(note.id);
    saveNotes();
    render();
  });

  actions.append(editBtn, deleteBtn);
  card.append(titleEl, bodyEl, actions);
  return card;
}

function buildEditCard(note) {
  const card = document.createElement("div");
  card.className = "note-card editing";
  card.style.setProperty("--card-color", getCardColor(note));

  const titleField = document.createElement("input");
  titleField.type = "text";
  titleField.value = note.title;

  const bodyField = document.createElement("textarea");
  bodyField.rows = 3;
  bodyField.value = note.body;

  const actions = document.createElement("div");
  actions.className = "actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", () => {
    const newTitle = titleField.value.trim();
    if (!newTitle) return;
    note.title = newTitle;
    note.body = bodyField.value.trim();
    saveNotes();
    render();
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    render();
  });

  actions.append(saveBtn, cancelBtn);
  card.append(titleField, bodyField, actions);
  return card;
}

selectAllCheckbox.addEventListener("change", () => {
  const visibleNotes = getVisibleNotes();
  for (const note of visibleNotes) {
    if (selectAllCheckbox.checked) {
      selectedIds.add(note.id);
    } else {
      selectedIds.delete(note.id);
    }
  }
  render();
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
});

deleteSelectedBtn.addEventListener("click", () => {
  const deletedCount = selectedIds.size;
  notes = notes.filter((n) => !selectedIds.has(n.id));
  selectedIds.clear();
  saveNotes();
  render();
  showToast(deletedCount === 1 ? "1 note deleted" : `${deletedCount} notes deleted`);
});

exportSelectedBtn.addEventListener("click", () => {
  const selectedNotes = notes.filter((n) => selectedIds.has(n.id));
  const blob = new Blob([JSON.stringify(selectedNotes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "notes-export.json";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
});

function parseImportedNotes(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  const importedNotes = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) return null;
    if (typeof entry.title !== "string" || entry.title.trim() === "") {
      return null;
    }
    importedNotes.push({
      id: createId(),
      title: entry.title.trim(),
      body: typeof entry.body === "string" ? entry.body.trim() : "",
      createdAt:
        typeof entry.createdAt === "number" ? entry.createdAt : Date.now(),
    });
  }

  return importedNotes;
}

importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  importFileInput.value = "";
  if (!file) return;

  const text = await file.text();
  const importedNotes = parseImportedNotes(text);

  if (!importedNotes) {
    showToast("Import failed: invalid file");
    return;
  }

  if (importedNotes.length === 0) {
    showToast("No notes found in file");
    return;
  }

  notes = [...importedNotes, ...notes];
  sortNotesByDate();
  saveNotes();
  render();
  showToast(
    importedNotes.length === 1
      ? "1 note imported"
      : `${importedNotes.length} notes imported`
  );
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  const newNote = {
    id: createId(),
    title,
    body: bodyInput.value.trim(),
    createdAt: Date.now(),
  };
  notes.unshift(newNote);
  saveNotes();

  addForm.reset();
  titleInput.focus();
  render(newNote.id);
  showToast("Note added");
});

render();
