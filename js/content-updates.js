/*
 * Published content registry and NEW-badge logic.
 * To publish something new, add an entry with a fixed ISO 8601 `publishedAt`
 * (with timezone). The NEW badge shows for 7 days from that moment and then
 * disappears on its own; nothing needs to be removed.
 * Status values: "published" | "upcoming" (upcoming items never show NEW).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PortfolioContent = api;
  if (typeof document !== "undefined") {
    const run = () => api.applyBadges(document);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  const items = [
    {
      id: "recycling-build-video",
      title: "Full Build Process — From Disassembly to Final Prototype",
      projectId: "plastic-filament-recycling",
      status: "published",
      publishedAt: "2026-10-24T14:00:00-04:00",
      href: "project-recycling.html#build-video"
    }
  ];

  function isNew(item, now) {
    if (!item || item.status !== "published") return false;
    const published = Date.parse(item.publishedAt);
    if (Number.isNaN(published)) return false;
    const current = (now instanceof Date ? now : new Date(now)).getTime();
    return current >= published && current < published + NEW_WINDOW_MS;
  }

  function isItemNew(id, now = new Date(), list = items) {
    return isNew(list.find((item) => item.id === id), now);
  }

  function isProjectNew(projectId, now = new Date(), list = items) {
    return list.some((item) => item.projectId === projectId && isNew(item, now));
  }

  function applyBadges(scope, now = new Date(), list = items) {
    scope.querySelectorAll("[data-new-item], [data-new-project]").forEach((el) => {
      const show = el.dataset.newItem
        ? isItemNew(el.dataset.newItem, now, list)
        : isProjectNew(el.dataset.newProject, now, list);
      const existing = el.querySelector(":scope > .new-badge");
      if (!show) { if (existing) existing.remove(); return; }
      if (existing) return;
      const badge = document.createElement("span");
      badge.className = "new-badge";
      badge.textContent = "NEW";
      badge.setAttribute("aria-label", "New content");
      el.append(badge);
    });
  }

  return { NEW_WINDOW_MS, items, isNew, isItemNew, isProjectNew, applyBadges };
});
