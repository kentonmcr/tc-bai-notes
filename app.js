const STORAGE_KEY = "notes-app:notes";

const addForm = document.getElementById("add-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const notesList = document.getElementById("notes-list");
const emptyState = document.getElementById("empty-state");

let notes = loadNotes();

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

function render() {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const note of notes) {
    notesList.appendChild(buildNoteCard(note));
  }
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

addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  notes.push({
    id: createId(),
    title,
    body: bodyInput.value.trim(),
  });
  saveNotes();

  addForm.reset();
  titleInput.focus();
  render();
});

render();
