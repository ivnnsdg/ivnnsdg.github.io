const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../js/content-updates.js");

const item = { id: "x", projectId: "p", status: "published", publishedAt: "2026-10-24T14:00:00-04:00" };
const list = [item, { id: "y", projectId: "q", status: "upcoming", publishedAt: "2026-10-24T14:00:00-04:00" }];

test("not new before publication", () => assert.equal(C.isNew(item, new Date("2026-10-24T17:59:59Z")), false));
test("new at publication instant", () => assert.equal(C.isNew(item, new Date("2026-10-24T18:00:00Z")), true));
test("new just before 7 days", () => assert.equal(C.isNew(item, new Date("2026-10-31T17:59:59Z")), true));
test("expired at exactly 7 days", () => assert.equal(C.isNew(item, new Date("2026-10-31T18:00:00Z")), false));
test("upcoming items are never new", () => assert.equal(C.isItemNew("y", new Date("2026-10-25T00:00:00Z"), list), false));
test("invalid date is not new", () => assert.equal(C.isNew({ ...item, publishedAt: "bad" }, new Date()), false));
test("project badge follows its items", () => {
  assert.equal(C.isProjectNew("p", new Date("2026-10-25T00:00:00Z"), list), true);
  assert.equal(C.isProjectNew("p", new Date("2026-11-01T00:00:00Z"), list), false);
  assert.equal(C.isProjectNew("other", new Date("2026-10-25T00:00:00Z"), list), false);
});
test("registry holds the two published entries", () => {
  assert.deepEqual(C.items.map((i) => i.id), ["recycling-build-video", "digital-art-gallery"]);
  assert.equal(C.items.find((i) => i.id === "digital-art-gallery").publishedAt, null);
});

test("pages: links, embed, and badge hooks", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const index = read("index.html");
  assert.match(index, /id="latest-feed"/);
  assert.match(index, /<a class="explore-link" href="portfolio\.html">Explore All Work/);
  assert.equal((index.match(/data-new-project=|data-new-item=/g) || []).length, 0);
  assert.match(read("portfolio.html"), /<a class="work-card is-wide is-recycling" href="project-recycling\.html" data-tone="sustainability" data-new-project="plastic-filament-recycling"/);
  const page = read("project-recycling.html");
  assert.match(page, /youtube-nocookie\.com\/embed\/VwZgvXHe2K4/);
  assert.doesNotMatch(page, /autoplay/);
  assert.match(page, /allowfullscreen/);
  assert.equal((page.match(/data-new-item=/g) || []).length, 1);
  assert.match(page, /<h2 id="build-video-title" data-new-item="recycling-build-video">Full Build Video<\/h2>/);
  assert.equal((page.match(/youtu\.be\/VwZgvXHe2K4/g) || []).length, 1);
  assert.equal((page.match(/Coming Soon/g) || []).length, 2);
  assert.doesNotMatch(page, /case-section|Follow the complete|Ender-3|Case study/);
});

test("Portfolio catalog sections and Home highlights", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const work = read("portfolio.html");
  for (const id of ["engineering-projects", "research", "design-creative"]) assert.ok(work.includes(`<section class="portfolio-section" id="${id}"`), id);
  for (const name of ["Plastic-to-Filament Recycling System", "Wind Turbine Research",   "Popsicle-Stick Truss Bridge", "Suspension System Modeling", "CAD &amp; Prototyping"]) {
      assert.ok(work.includes(`<h3>${name}</h3>`), name);
  }
  assert.match(work, /href="research\.html"/);
  const home = read("index.html");
  assert.match(home, /Latest Updates/);
  assert.doesNotMatch(home, /Popsicle|Blender|Wind Turbine|Suspension|class="work-card/);
  assert.doesNotMatch(work, /index-code|Academic|Coursework/);
});

const root = path.join(__dirname, "..");
const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html") && f !== "projects.html");

test("same main navigation on every page", () => {
  const navOf = (h) => h.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0].replace(/ aria-current="page"/g, "").replace(/>\s+</g, "><");
  const base = navOf(fs.readFileSync(path.join(root, "index.html"), "utf8"));
  for (const p of pages) assert.equal(navOf(fs.readFileSync(path.join(root, p), "utf8")), base, p);
});

test("every local link and anchor resolves", () => {
  for (const p of [...pages, "projects.html"]) {
    const html = fs.readFileSync(path.join(root, p), "utf8");
    for (const m of html.matchAll(/href="([^"#?:]*)(\?[^"#]*)?(#[^"]*)?"/g)) {
      const [, file, , hash] = m;
      const target = decodeURIComponent(file) || p;
      assert.ok(fs.existsSync(path.join(root, target)), `${p} -> ${target}`);
      if (hash && target.endsWith(".html")) {
        assert.ok(fs.readFileSync(path.join(root, target), "utf8").includes(`id="${hash.slice(1)}"`), `${p} -> ${target}${hash}`);
      }
    }
  }
});

test("project pages have breadcrumb and back link", () => {
  for (const p of ["project-recycling.html", "project-truss.html", "project-dynamics.html", "research.html"]) {
    const html = fs.readFileSync(path.join(root, p), "utf8");
    assert.match(html, /class="breadcrumb"/, p);
    assert.match(html, /← Back to Portfolio/, p);
  }
});

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-10-24T18:00:00Z");
const mk = (id, daysAgo, extra = {}) => ({ id, projectId: id, title: id, category: "c", subtitle: "s", coverImage: "x.jpg", url: "x.html", status: "published", publishedAt: new Date(T0 - daysAgo * DAY).toISOString(), updatedAt: null, ...extra });
const ids = (l, now = new Date(T0 + 1000)) => C.selectFeed(now, l).map((i) => i.id);

test("feed: only two items exist -> exactly two, no fillers", () => assert.deepEqual(ids([mk("a", 1), mk("b", 90)]), ["a", "b"]));
test("feed: four or more recent -> newest four, newest first", () => assert.deepEqual(ids([mk("a", 5), mk("b", 1), mk("c", 3), mk("d", 2), mk("e", 4)]), ["b", "d", "c", "e"]));
test("feed: recent plus older fill up to four", () => assert.deepEqual(ids([mk("a", 2), mk("b", 100), mk("c", 200), mk("d", 300), mk("e", 400)]), ["a", "b", "c", "d"]));
test("feed: nothing in 30 days -> three newest", () => assert.deepEqual(ids([mk("a", 40), mk("b", 50), mk("c", 60), mk("d", 70)]), ["a", "b", "c"]));
test("feed: never empty without recent work", () => assert.equal(ids([mk("a", 400)]).length, 1));
test("feed: new item < 7 days gets NEW, 7+ days does not", () => {
  const l = [mk("a", 6.9), mk("b", 7.1)];
  assert.equal(C.isItemNew("a", new Date(T0), l), true);
  assert.equal(C.isItemNew("b", new Date(T0), l), false);
});
test("feed: meaningful update moves the existing card to top without duplicating or re-badging", () => {
  const l = [mk("a", 60, { updatedAt: new Date(T0 - DAY).toISOString() }), mk("b", 10)];
  assert.deepEqual(ids(l), ["a", "b"]);
  assert.equal(C.isItemNew("a", new Date(T0), l), false);
});
test("feed: unchanged dates keep order regardless of other edits", () => {
  const a = mk("a", 10), b = mk("b", 5);
  assert.deepEqual(ids([a, b]), ids([{ ...a, subtitle: "typo fixed", url: "y.html" }, { ...b, coverImage: "z.jpg" }]));
});
test("feed: future and upcoming content is hidden", () => {
  const l = [mk("a", 1), mk("future", -3), mk("soon", 1, { status: "upcoming" }), mk("bad", 1, { publishedAt: "garbage" })];
  assert.deepEqual(ids(l), ["a"]);
});
test("feed: one card per project", () => {
  assert.deepEqual(ids([mk("a", 1, { projectId: "p" }), mk("b", 2, { projectId: "p" }), mk("c", 3)]), ["a", "c"]);
});
test("feed: undated legacy entry shows last and never NEW", () => {
  const l = [mk("old", 0, { publishedAt: null }), mk("a", 100)];
  assert.deepEqual(ids(l), ["a", "old"]);
  assert.equal(C.isItemNew("old", new Date(T0), l), false);
});
test("real feed: recycling first with NEW, art second, both unique", () => {
  const feed = C.selectFeed(new Date("2026-10-25T00:00:00Z"));
  assert.deepEqual(feed.map((i) => i.id), ["recycling-build-video", "digital-art-gallery"]);
  assert.equal(C.isItemNew("recycling-build-video", new Date("2026-10-25T00:00:00Z")), true);
  assert.equal(C.isItemNew("recycling-build-video", new Date("2026-11-01T00:00:00Z")), false);
  assert.equal(C.isItemNew("digital-art-gallery", new Date("2026-10-25T00:00:00Z")), false);
});
test("every registry entry has a real cover image and valid destination", () => {
  for (const i of C.items) {
    assert.ok(fs.existsSync(path.join(root, i.coverImage)), i.coverImage);
    const [file, hash] = i.url.split("#");
    assert.ok(fs.existsSync(path.join(root, file)), i.url);
    if (hash) assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(`id="${hash}"`), i.url);
  }
});
