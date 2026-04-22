const $ = (sel, root = document) => root.querySelector(sel);

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const header = ["id", "name", "visited_at", "ip", "user_agent"];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) lines.push([r.id, r.name, r.visited_at, r.ip, r.user_agent].map(esc).join(","));
  return lines.join("\n");
}

async function fetchVisits({ limit, authHeader }) {
  const res = await fetch(`/api/admin/visits?limit=${encodeURIComponent(limit)}`, {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
  if (res.status === 401) return { unauthorized: true };
  const data = await res.json();
  return data;
}

function basicAuthHeader(password) {
  return "Basic " + btoa(`admin:${password}`);
}

function renderRows(rows, q) {
  const tbody = $("#rows");
  if (!tbody) return;
  tbody.innerHTML = "";
  const query = (q || "").trim().toLowerCase();
  const filtered = !query
    ? rows
    : rows.filter((r) => {
        return (
          (r.name || "").toLowerCase().includes(query) ||
          (r.ip || "").toLowerCase().includes(query) ||
          (r.user_agent || "").toLowerCase().includes(query)
        );
      });

  for (const r of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.visited_at)}</td>
      <td>${escapeHtml(r.ip)}</td>
      <td class="muted">${escapeHtml(r.user_agent)}</td>
    `;
    tbody.appendChild(tr);
  }
  return filtered;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function main() {
  const q = $("#q");
  const limitInput = $("#limit");
  const refresh = $("#refresh");
  const exportBtn = $("#exportCsv");
  const securityHint = $("#securityHint");

  let authHeader = "";
  let visits = [];

  async function load() {
    const limit = Number(limitInput?.value || 500) || 500;
    const data = await fetchVisits({ limit, authHeader });
    if (data?.unauthorized) {
      const pw = prompt("Admin password (set via ADMIN_PASSWORD):") || "";
      if (!pw) return;
      authHeader = basicAuthHeader(pw);
      return load();
    }
    if (!data?.ok) return;
    visits = data.visits || [];
    const secured = !!data.secured;
    if (securityHint) {
      securityHint.textContent = secured
        ? "Security: enabled (Basic Auth via ADMIN_PASSWORD)."
        : "Security: disabled. Set ADMIN_PASSWORD before sharing this admin URL.";
    }
    renderRows(visits, q?.value || "");
  }

  q?.addEventListener("input", () => renderRows(visits, q.value));
  refresh?.addEventListener("click", load);
  limitInput?.addEventListener("change", load);
  exportBtn?.addEventListener("click", () => {
    const filtered = renderRows(visits, q?.value || "") || [];
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio_visitors.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  await load();
}

main();

