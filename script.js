// ===== 할 일 관리 앱 (Tasky) =====

const STORAGE_KEY = "todos";

// ----- 상태 -----
let todos = [];              // { id, text, category, completed, due, createdAt }
let statusFilter = "all";    // all | active | completed
let categoryFilter = "all";  // all | 업무 | 개인 | 공부
let searchTerm = "";
let sortBy = "created";      // created | due | category

// ----- DOM -----
const form = document.getElementById("todoForm");
const input = document.getElementById("todoInput");
const categorySelect = document.getElementById("categorySelect");
const dueInput = document.getElementById("dueInput");
const todoList = document.getElementById("todoList");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const clearCompletedBtn = document.getElementById("clearCompleted");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const todayDate = document.getElementById("todayDate");

// 요약 카드 / 사이드바 카운트
const statTotal = document.getElementById("statTotal");
const statActive = document.getElementById("statActive");
const statCompleted = document.getElementById("statCompleted");
const statRate = document.getElementById("statRate");
const statFill = document.getElementById("statFill");
const navCountAll = document.getElementById("navCountAll");
const navCountActive = document.getElementById("navCountActive");
const navCountCompleted = document.getElementById("navCountCompleted");

// ===== 저장소 =====
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    todos = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(todos)) todos = [];
  } catch (e) {
    todos = [];
  }
}

// ===== 날짜 유틸 =====
// 오늘 날짜를 YYYY-MM-DD 로 (로컬 기준)
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 두 날짜 문자열의 일(day) 차이 (due - today)
function dayDiff(due) {
  const t = new Date(todayStr() + "T00:00:00");
  const d = new Date(due + "T00:00:00");
  return Math.round((d - t) / 86400000);
}

// 마감일 → 표시 텍스트 + 상태 클래스
function describeDue(due) {
  if (!due) return null;
  const diff = dayDiff(due);
  if (diff < 0) return { label: `기한 초과 (${Math.abs(diff)}일)`, cls: "overdue" };
  if (diff === 0) return { label: "오늘 마감", cls: "today" };
  if (diff === 1) return { label: "내일 마감", cls: "tomorrow" };
  return { label: `${due} (${diff}일 남음)`, cls: "normal" };
}

// ===== CRUD =====
function addTodo(text, category, due) {
  todos.push({
    id: Date.now(),
    text,
    category,
    completed: false,
    due: due || "",
    createdAt: Date.now(),
  });
  saveTodos();
  render();
}

function toggleTodo(id) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTodos();
  render();
}

function updateTodo(id, newText, newDue) {
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  t.text = newText;
  if (newDue !== undefined) t.due = newDue;
  saveTodos();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((x) => x.id !== id);
  saveTodos();
  render();
}

function clearCompleted() {
  const hasCompleted = todos.some((t) => t.completed);
  if (!hasCompleted) return;
  if (!confirm("완료한 할 일을 모두 삭제할까요?")) return;
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  render();
}

// ===== 필터 + 검색 + 정렬 =====
function getVisibleTodos() {
  let list = todos.slice();

  // 상태 필터
  if (statusFilter === "active") list = list.filter((t) => !t.completed);
  if (statusFilter === "completed") list = list.filter((t) => t.completed);

  // 카테고리 필터
  if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter);

  // 검색
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    list = list.filter((t) => t.text.toLowerCase().includes(q));
  }

  // 정렬
  if (sortBy === "due") {
    // 마감일 있는 항목 먼저, 임박순. 없는 항목은 뒤로
    list.sort((a, b) => {
      if (!a.due && !b.due) return a.createdAt - b.createdAt;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
  } else if (sortBy === "category") {
    const order = { 업무: 0, 개인: 1, 공부: 2 };
    list.sort((a, b) => order[a.category] - order[b.category] || a.createdAt - b.createdAt);
  } else {
    list.sort((a, b) => a.createdAt - b.createdAt);
  }

  return list;
}

// ===== 통계 갱신 =====
function updateStats() {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statActive.textContent = active;
  statCompleted.textContent = completed;
  statRate.textContent = `${rate}%`;
  statFill.style.width = `${rate}%`;

  navCountAll.textContent = total;
  navCountActive.textContent = active;
  navCountCompleted.textContent = completed;
}

// ===== 렌더링 =====
function render() {
  todoList.innerHTML = "";
  const list = getVisibleTodos();

  emptyMessage.style.display = list.length === 0 ? "block" : "none";
  list.forEach((todo) => todoList.appendChild(createTodoElement(todo)));

  updateStats();
}

function createTodoElement(todo) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " is-completed" : "");

  // 체크박스
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-item__check";
  checkbox.checked = todo.completed;
  checkbox.addEventListener("change", () => toggleTodo(todo.id));

  // 본문
  const body = document.createElement("div");
  body.className = "todo-item__body";

  const text = document.createElement("div");
  text.className = "todo-item__text";
  text.textContent = todo.text;

  const meta = document.createElement("div");
  meta.className = "todo-item__meta";

  const tag = document.createElement("span");
  tag.className = `tag tag--${todo.category}`;
  tag.textContent = todo.category;
  meta.appendChild(tag);

  const dueInfo = describeDue(todo.due);
  if (dueInfo && !todo.completed) {
    const due = document.createElement("span");
    due.className = `due due--${dueInfo.cls}`;
    due.textContent = dueInfo.label;
    meta.appendChild(due);
  } else if (dueInfo && todo.completed) {
    const due = document.createElement("span");
    due.className = "due due--normal";
    due.textContent = todo.due;
    meta.appendChild(due);
  }

  body.appendChild(text);
  body.appendChild(meta);

  // 액션
  const actions = document.createElement("div");
  actions.className = "todo-item__actions";

  const editBtn = document.createElement("button");
  editBtn.className = "iconbtn";
  editBtn.textContent = "수정";
  editBtn.addEventListener("click", () => startEdit(li, todo));

  const delBtn = document.createElement("button");
  delBtn.className = "iconbtn iconbtn--delete";
  delBtn.textContent = "삭제";
  delBtn.addEventListener("click", () => deleteTodo(todo.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(actions);
  return li;
}

// ===== 수정 모드 (내용 + 마감일) =====
function startEdit(li, todo) {
  const body = li.querySelector(".todo-item__body");
  body.innerHTML = "";

  const row = document.createElement("div");
  row.className = "edit-row";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.className = "edit-row__text";
  textInput.value = todo.text;
  textInput.maxLength = 100;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "edit-row__date";
  dateInput.value = todo.due || "";

  const commit = () => {
    const newText = textInput.value.trim();
    if (newText === "") { render(); return; } // 빈 값이면 취소
    updateTodo(todo.id, newText, dateInput.value);
  };

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") render();
  });
  // 날짜 선택 후 텍스트에서 포커스가 빠질 때 저장되도록 텍스트 blur에만 commit
  textInput.addEventListener("blur", () => {
    // 날짜 입력으로 포커스가 옮겨가는 경우는 저장하지 않음
    setTimeout(() => {
      if (document.activeElement !== dateInput) commit();
    }, 0);
  });
  // 날짜만 바꾸고 빠져나가도 저장되도록
  dateInput.addEventListener("change", commit);

  row.appendChild(textInput);
  row.appendChild(dateInput);
  body.appendChild(row);
  textInput.focus();
  textInput.select();
}

// ===== 이벤트 =====
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") return;
  addTodo(text, categorySelect.value, dueInput.value);
  input.value = "";
  dueInput.value = "";
  input.focus();
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  render();
});

sortSelect.addEventListener("change", () => {
  sortBy = sortSelect.value;
  render();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

// 사이드바 필터 (상태 / 카테고리)
sidebar.addEventListener("click", (e) => {
  const btn = e.target.closest(".navitem");
  if (!btn) return;

  if (btn.dataset.filter) {
    statusFilter = btn.dataset.filter;
    setActive(btn, "[data-filter]");
  } else if (btn.dataset.category) {
    categoryFilter = btn.dataset.category;
    setActive(btn, "[data-category]");
  }
  sidebar.classList.remove("is-open");
  render();
});

function setActive(activeBtn, selector) {
  sidebar.querySelectorAll(selector).forEach((b) =>
    b.classList.toggle("is-active", b === activeBtn)
  );
}

// 모바일 메뉴 토글
menuToggle.addEventListener("click", () => sidebar.classList.toggle("is-open"));

// 오늘 날짜 표시
function showToday() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  todayDate.textContent =
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ===== 초기화 =====
showToday();
loadTodos();
render();
