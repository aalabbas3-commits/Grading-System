const CFG = window.RESULTS_APP_CONFIG || {};
const API_URL = String(CFG.API_URL || "").trim();
const MIN_ID_DIGITS = Number(CFG.MIN_ID_DIGITS || 9);

const form = document.getElementById("searchForm");
const idInput = document.getElementById("studentId");
const searchButton = document.getElementById("searchButton");
const message = document.getElementById("formMessage");
const resultArea = document.getElementById("resultArea");
const emptyState = document.getElementById("emptyState");

form.addEventListener("submit", handleSearch);

idInput.addEventListener("input", () => {
  const normalized = normalizeDigits(idInput.value).replace(/\D/g, "");
  if (idInput.value !== normalized) idInput.value = normalized;
  setMessage("");
});

function normalizeDigits(value) {
  return String(value || "")
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

async function handleSearch(event) {
  event.preventDefault();

  const studentId = normalizeDigits(idInput.value).replace(/\D/g, "");

  resultArea.hidden = true;
  emptyState.hidden = true;

  if (studentId.length < MIN_ID_DIGITS) {
    setMessage(`أدخل رقمًا صحيحًا لا يقل عن ${MIN_ID_DIGITS} أرقام.`, true);
    idInput.focus();
    return;
  }

  setLoading(true);
  setMessage("جاري البحث عن النتيجة...");

  try {
    const url = new URL(API_URL);
    url.searchParams.set("action", "getResult");
    url.searchParams.set("student_id", studentId);
    url.searchParams.set("_", Date.now());

    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      throw new Error("تعذر الاتصال بالخدمة.");
    }

    const payload = await response.json();

    if (!payload.ok) {
      throw new Error(payload.message || payload.error || "تعذر جلب النتيجة.");
    }

    renderResult(payload.data);

  } catch (error) {
    showEmpty(
      "تعذر جلب النتيجة",
      "تحقق من اتصال الإنترنت ثم حاول مرة أخرى."
    );
    setMessage("");

  } finally {
    setLoading(false);
  }
}

function renderResult(data) {
  if (!data || !data.found) {
    showEmpty(
      "لم يتم العثور على الطالب",
      "تأكد من رقم الطالب أو السجل المدني ثم حاول مرة أخرى."
    );
    setMessage("");
    return;
  }

  const student = data.student || {};
  const results = Array.isArray(data.results) ? data.results : [];

  document.getElementById("studentName").textContent =
    student.student_name || "طالب";

  document.getElementById("studentClass").textContent =
    student.class_name ? `الفصل: ${student.class_name}` : "";

  document.getElementById("resultCount").textContent =
    results.length === 1
      ? "اختبار واحد منشور"
      : `${results.length} اختبارات منشورة`;

  const list = document.getElementById("resultsList");

  if (!results.length) {
    list.innerHTML = `
      <div class="empty-state" style="margin:0;box-shadow:none;border:0;background:#f7fbff">
        <div class="empty-icon" style="background:#eaf4ff;color:#126ed1">i</div>
        <h2>لا توجد نتائج منشورة حاليًا</h2>
        <p>تم العثور على الطالب، لكن لا توجد له نتائج منشورة حتى الآن.</p>
      </div>
    `;
  } else {
    list.innerHTML = results.map(renderResultRow).join("");
  }

  emptyState.hidden = true;
  resultArea.hidden = false;
  setMessage("");

  resultArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderResultRow(result) {
  const score = safeNumber(result.score);
  const max = safeNumber(result.max_score);
  const percentage = max > 0
    ? Math.max(0, Math.min(100, (score / max) * 100))
    : 0;

  return `
    <article class="result-card">
      <div class="result-card__exam">
        <div class="exam-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 3h8l4 4v14H7z"></path>
            <path d="M15 3v5h5"></path>
            <path d="M10 12h6M10 16h6"></path>
          </svg>
        </div>
        <div class="result-card__exam-copy">
          <h3 class="result-card__exam-title">${escapeHtml(result.exam_name || "اختبار")}</h3>
        </div>
      </div>

      <div class="result-card__score">
        <div class="score-label">الدرجة من ${formatNumber(max)}</div>
        <div class="score-main">
          <span class="score-main__value">${formatNumber(score)}</span>
          <span class="score-main__sep">/</span>
          <span class="score-main__max">${formatNumber(max)}</span>
        </div>
      </div>

      <div class="result-card__meter">
        <span class="percent-badge">${formatNumber(Math.round(percentage))}%</span>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style="width:${percentage.toFixed(1)}%"></div>
        </div>
      </div>
    </article>
  `;
}

function showEmpty(title, text) {
  document.getElementById("emptyTitle").textContent = title;
  document.getElementById("emptyText").textContent = text;
  resultArea.hidden = true;
  emptyState.hidden = false;
}

function setLoading(loading) {
  searchButton.disabled = loading;
  searchButton.classList.toggle("loading", loading);
}

function setMessage(text, isError = false) {
  message.textContent = text || "";
  message.className = "form-message" + (isError ? " error" : "");
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number)
    ? String(number)
    : String(number.toFixed(2)).replace(/\.?0+$/, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[character]));
}
