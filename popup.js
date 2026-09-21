const input = document.getElementById("domain-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("site-list");
const empty = document.getElementById("empty");
const errorEl = document.getElementById("error");

// Turn whatever the user typed (URL, domain with www, etc.) into a bare domain.
function normalizeDomain(raw) {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/^www\./, "");
  d = d.split(/[/?#]/)[0];
  d = d.split(":")[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return null;
  return d;
}

// Each entry is { domain, enabled }. Older versions stored plain strings,
// so migrate those on read.
async function getBlockedSites() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  return blockedSites.map((s) =>
    typeof s === "string" ? { domain: s, enabled: true } : s
  );
}

// Rebuild all dynamic rules from the stored list. Each enabled domain gets a
// rule that redirects its main-frame requests (incl. subdomains) to blocked.html.
async function syncRules(sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: sites
      .filter((s) => s.enabled)
      .map((s, i) => ({
        id: i + 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" },
        },
        condition: {
          urlFilter: `||${s.domain}^`,
          resourceTypes: ["main_frame"],
        },
      })),
  });
}

async function saveSites(sites) {
  await chrome.storage.local.set({ blockedSites: sites });
  await syncRules(sites);
  render(sites);
}

function render(sites) {
  list.innerHTML = "";
  empty.style.display = sites.length ? "none" : "block";
  for (const site of sites) {
    const li = document.createElement("li");
    if (!site.enabled) li.classList.add("disabled");

    const span = document.createElement("span");
    span.className = "domain";
    span.textContent = site.domain;

    const toggle = document.createElement("label");
    toggle.className = "toggle";
    toggle.title = site.enabled
      ? `Pause blocking ${site.domain}`
      : `Resume blocking ${site.domain}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = site.enabled;
    checkbox.addEventListener("change", async () => {
      const current = await getBlockedSites();
      await saveSites(
        current.map((s) =>
          s.domain === site.domain ? { ...s, enabled: checkbox.checked } : s
        )
      );
    });
    const slider = document.createElement("span");
    slider.className = "slider";
    toggle.append(checkbox, slider);

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "✕";
    btn.title = `Remove ${site.domain}`;
    btn.addEventListener("click", async () => {
      const current = await getBlockedSites();
      await saveSites(current.filter((s) => s.domain !== site.domain));
    });

    li.append(span, toggle, btn);
    list.appendChild(li);
  }
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = msg ? "block" : "none";
}

async function addSite() {
  showError("");
  const domain = normalizeDomain(input.value);
  if (!domain) {
    showError("Enter a valid domain, e.g. youtube.com");
    return;
  }
  const sites = await getBlockedSites();
  if (sites.some((s) => s.domain === domain)) {
    showError("That site is already in the list.");
    return;
  }
  sites.push({ domain, enabled: true });
  sites.sort((a, b) => a.domain.localeCompare(b.domain));
  await saveSites(sites);
  input.value = "";
  input.focus();
}

addBtn.addEventListener("click", addSite);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// Render, and re-sync rules once in case the stored format was just migrated.
getBlockedSites().then(async (sites) => {
  render(sites);
  await syncRules(sites);
});
