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

async function getBlockedSites() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  return blockedSites;
}

// Rebuild all dynamic rules from the stored list. Each domain gets a rule
// that redirects its main-frame requests (including subdomains) to blocked.html.
async function syncRules(sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: sites.map((domain, i) => ({
      id: i + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" },
      },
      condition: {
        urlFilter: `||${domain}^`,
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
  for (const domain of sites) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = domain;
    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "✕";
    btn.title = `Unblock ${domain}`;
    btn.addEventListener("click", async () => {
      const current = await getBlockedSites();
      await saveSites(current.filter((s) => s !== domain));
    });
    li.append(span, btn);
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
  if (sites.includes(domain)) {
    showError("That site is already blocked.");
    return;
  }
  sites.push(domain);
  sites.sort();
  await saveSites(sites);
  input.value = "";
  input.focus();
}

addBtn.addEventListener("click", addSite);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

getBlockedSites().then(render);
