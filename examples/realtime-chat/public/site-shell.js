import { initI18n, t, language, localizedPortalUrl } from "./i18n.js?v=20";

const insideApp = document.body.dataset.portalApp === "true";
if (!insideApp) initI18n();
function syncReadingLanguage() {
  if (!document.body.classList.contains("reading-page")) return;
  // Contact POST confirmations have no equivalent GET endpoint.
  if (!/^\/portal\/(?:docs(?:\/|$)|pages\/|pricing$|use-cases$|about$|privacy-policy$|blog(?:\/|$)|releases(?:\/|$))/.test(location.pathname)) return;
  const url = new URL(location.href);
  if (url.searchParams.get("lang") !== language()) {
    location.replace(localizedPortalUrl(location.href, location.href));
    return;
  }
  // Keep the article's actual language; do not label untranslated prose as translated.
  const article = document.querySelector("article[lang]");
  document.querySelector("#content-language-notice")?.remove();
  if (article && article.lang !== language()) {
    const notice = document.createElement("p");
    notice.id = "content-language-notice";
    notice.setAttribute("role", "status");
    notice.textContent = t("content.languageFallback") + " (" + article.lang + ")";
    article.before(notice);
  }
}
window.addEventListener("kasamila:language-changed", syncReadingLanguage);
syncReadingLanguage();
let identity = null;
let identityVersion = 0;
function render() {
  document.querySelectorAll(".workspace-link").forEach((link) => {
    link.classList.toggle("hidden", !identity);
    link.href = localizedPortalUrl("/portal#workspace/overview", location.href);
  });
  document.querySelector("#landing-login")?.classList.toggle("hidden", Boolean(identity));
  document.querySelector("#logout-button")?.classList.toggle("hidden", !identity);
}
window.addEventListener("kasamila:identity", (event) => { identity = event.detail; render(); });
if (!insideApp) {
  document.querySelector("#landing-login")?.addEventListener("click", () => {
    location.assign("/portal?return=" + encodeURIComponent(location.pathname + location.search) + "#login");
  });
  document.querySelector("#logout-button")?.addEventListener("click", async (event) => {
    identityVersion += 1;
    const button = event.currentTarget;
    button.disabled = true;
    const entry = document.cookie.split("; ").find((value) => value.startsWith("kasamila_csrf="));
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin",
        headers: { "X-CSRF-Token": entry ? decodeURIComponent(entry.split("=").slice(1).join("=")) : "" } });
      if (!response.ok) throw new Error("logout");
      identity = null;
      render();
    } catch { button.textContent = t("form.refresh"); }
    finally { button.disabled = false; }
  });
  fetch("/api/v1/me", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => { const result = response.ok ? (await response.json()).data : null; if (identityVersion === 0) { identity = result; render(); } })
    .catch(() => {});
}
render();
document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[href]");
  if (link) link.setAttribute("href", localizedPortalUrl(link.getAttribute("href"), location.href));
}, true);
