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
  assert.match(index, /<a class="project-card reveal" data-new-project="plastic-filament-recycling" href="project-recycling\.html"/);
  assert.equal((index.match(/data-new-project=/g) || []).length, 1);
  assert.match(read("projects.html"), /href="project-recycling\.html" class="case-index-item/);
  const page = read("project-recycling.html");
  assert.match(page, /youtube-nocookie\.com\/embed\/VwZgvXHe2K4/);
  assert.doesNotMatch(page, /autoplay/);
  assert.match(page, /allowfullscreen/);
  assert.equal((page.match(/data-new-item=/g) || []).length, 1);
  assert.match(page, /Coming Soon/);
  assert.match(page, /Documentation Coming Soon/);
});
