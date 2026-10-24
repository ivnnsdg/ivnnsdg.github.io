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
test("only the build video is registered", () => {
  assert.deepEqual(C.items.map((i) => i.id), ["recycling-build-video"]);
});

test("pages: links, embed, and badge hooks", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const index = read("index.html");
  assert.match(index, /<a class="work-card is-hero" href="project-recycling\.html" data-new-project="plastic-filament-recycling"/);
  assert.equal((index.match(/data-new-project=/g) || []).length, 1);
  assert.match(read("portfolio.html"), /<a class="work-card is-wide" href="project-recycling\.html" data-new-project="plastic-filament-recycling"/);
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
  assert.equal((home.match(/class="work-card/g) || []).length, 3);
  assert.doesNotMatch(home, /Popsicle|Blender/);
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
