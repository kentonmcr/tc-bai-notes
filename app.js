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

let notes = loadNotes();
let toastTimeoutId = null;
let selectedIds = new Set();

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

function render(flashId) {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    emptyState.hidden = false;
    updateBulkBar();
    return;
  }
  emptyState.hidden = true;

  for (const note of notes) {
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
    notesList.appendChild(row);
  }

  updateBulkBar();
}

function updateBulkBar() {
  const total = notes.length;
  const selectedCount = selectedIds.size;

  bulkActions.hidden = selectedCount === 0;
  selectedCountEl.textContent =
    selectedCount === 1 ? "1 selected" : `${selectedCount} selected`;

  selectAllCheckbox.checked = total > 0 && selectedCount === total;
  selectAllCheckbox.indeterminate =
    selectedCount > 0 && selectedCount < total;
}

function buildNoteCard(note) {
  const card = document.createElement("div");
  card.className = "note-card";

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
  if (selectAllCheckbox.checked) {
    for (const note of notes) {
      selectedIds.add(note.id);
    }
  } else {
    selectedIds.clear();
  }
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
  link.click();

  URL.revokeObjectURL(url);
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  const newNote = {
    id: createId(),
    title,
    body: bodyInput.value.trim(),
  };
  notes.unshift(newNote);
  saveNotes();

  addForm.reset();
  titleInput.focus();
  render(newNote.id);
  showToast("Note added");
});

render();
