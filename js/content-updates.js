/*
 * Published content registry, Home "Latest Updates" feed, and NEW-badge logic.
 *
 * To publish something new, add an entry to `items` with a fixed ISO 8601
 * `publishedAt` (with timezone). To record a meaningful update to existing
 * work, set that entry's `updatedAt` (and optionally a new `subtitle`/
 * `updateType`) instead of adding a duplicate; the card moves to the top.
 * Minor edits (typos, CSS, links, deploys) must NOT touch these dates.
 *
 * - NEW shows for 7 days after `publishedAt` only, then disappears by itself.
 * - Feed: newest of publishedAt/updatedAt first, one card per `projectId`,
 *   up to 4 items when anything changed in the last 30 days, otherwise 3.
 * - Status "published" is shown; "upcoming" (or a future publishedAt) is hidden.
 * - An entry without publishedAt is an older entry with an unknown date; it
 *   is shown after dated entries and never gets a NEW badge.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PortfolioContent = api;
  if (typeof document !== "undefined") {
    const run = () => {
      const feed = document.getElementById("latest-feed");
      if (feed) api.renderFeed(feed);
      api.applyBadges(document);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const FEED_RECENT_LIMIT = 4;
  const FEED_FALLBACK_LIMIT = 3;

  const items = [
    {
      id: "recycling-build-video",
      projectId: "plastic-filament-recycling",
      title: "Plastic-to-Filament Recycling System",
      category: "Sustainability · Video",
      subtitle: "Full Build Video · 7 min",
      coverImage: "assets/images/projects/recycling-build-video.jpg",
      coverAlt: "Plastic-to-Filament Recycling System build video frame",
      url: "project-recycling.html#build-video",
      updateType: "video",
      status: "published",
      publishedAt: "2026-10-24T14:00:00-04:00",
      updatedAt: null
    },
    {
      // Original publication date is unknown, so none is recorded.
      id: "digital-art-gallery",
      projectId: "digital-art",
      title: "Digital Art & Illustrations",
      category: "Creative Work · Gallery",
      subtitle: "Drawings and Blender renders",
      coverImage: "assets/images/creative/blender/17909941443034331.webp",
      coverAlt: "Blender render from the digital art gallery",
      url: "portfolio.html#digital-art",
      updateType: "gallery",
      status: "published",
      publishedAt: null,
      updatedAt: null
    }
  ];

  function toMs(value) {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }

  function nowMs(now) {
    return (now instanceof Date ? now : new Date(now)).getTime();
  }

  // Most recent meaningful publication/update that has already happened.
  function lastChangeMs(item, now) {
    const current = nowMs(now);
    const times = [toMs(item.publishedAt), toMs(item.updatedAt)].filter((t) => t !== null && t <= current);
    return times.length ? Math.max(...times) : null;
  }

  function isVisible(item, now) {
    if (!item || item.status !== "published") return false;
    if (item.publishedAt) {
      const published = toMs(item.publishedAt);
      if (published === null || published > nowMs(now)) return false;
    }
    return true;
  }

  function selectFeed(now = new Date(), list = items) {
    const current = nowMs(now);
    const sorted = list
      .filter((item) => isVisible(item, current))
      .map((item) => ({ item, at: lastChangeMs(item, current) }))
      .sort((a, b) => (b.at ?? -Infinity) - (a.at ?? -Infinity) || a.item.id.localeCompare(b.item.id));
    const seen = new Set();
    const unique = sorted.filter(({ item }) => {
      const key = item.projectId || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const hasRecent = unique.some(({ at }) => at !== null && current - at < RECENT_WINDOW_MS);
    return unique.slice(0, hasRecent ? FEED_RECENT_LIMIT : FEED_FALLBACK_LIMIT).map(({ item }) => item);
  }

  // Dates are shown in UTC so every visitor sees the same day.
  function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));
  }

  function renderFeed(container, now = new Date(), list = items) {
    const feed = selectFeed(now, list);
    container.textContent = "";
    container.dataset.count = String(feed.length);
    feed.forEach((item, index) => {
      const card = document.createElement("a");
      card.className = "feed-card";
      card.href = item.url;
      card.dataset.newItem = item.id;

      const media = document.createElement("div");
      media.className = "work-media";
      const img = document.createElement("img");
      img.src = item.coverImage;
      img.alt = item.coverAlt || "";
      img.decoding = "async";
      img.loading = index === 0 ? "eager" : "lazy";
      media.append(img);

      const info = document.createElement("div");
      info.className = "work-info";
      const kicker = document.createElement("p");
      kicker.className = "card-kicker";
      kicker.textContent = item.category;
      const title = document.createElement("h3");
      title.textContent = item.title;
      const subtitle = document.createElement("p");
      subtitle.className = "feed-subtitle";
      subtitle.textContent = item.subtitle;
      info.append(kicker, title, subtitle);

      const changeMs = lastChangeMs(item, now);
      if (changeMs !== null) {
        const updated = toMs(item.updatedAt) !== null && toMs(item.updatedAt) <= nowMs(now) && toMs(item.updatedAt) > (toMs(item.publishedAt) ?? -Infinity);
        const time = document.createElement("time");
        time.className = "feed-date";
        time.dateTime = new Date(changeMs).toISOString();
        time.textContent = (updated ? "Updated " : "") + formatDate(changeMs);
        info.append(time);
      }
      card.append(media, info);
      container.append(card);
    });
  }

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

  return { NEW_WINDOW_MS, RECENT_WINDOW_MS, items, isNew, isItemNew, isProjectNew, applyBadges, selectFeed, renderFeed };
});
