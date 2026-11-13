import test from "node:test";
import assert from "node:assert/strict";
import { applyGuideSeo, clearGuideSeo } from "../src/guides/seo.ts";

class Element {
  constructor(tagName) { this.tagName = tagName.toLowerCase(); this.dataset = {}; }
  remove() { globalThis.document.head.nodes = globalThis.document.head.nodes.filter((node) => node !== this); }
}

function installDocument() {
  const head = {
    nodes: [],
    append(node) { this.nodes.push(node); },
    querySelectorAll(selector) {
      return selector === '[data-guide-seo="true"]' ? this.nodes.filter((node) => node.dataset.guideSeo === "true") : [];
    },
  };
  globalThis.document = {
    title: "",
    head,
    documentElement: { lang: "zh-CN", dir: "ltr" },
    createElement: (tagName) => new Element(tagName),
  };
  return head;
}

test("Guide SEO cleanup removes only Guide-owned metadata and restores default document direction", () => {
  const head = installDocument();
  const destinationMeta = new Element("meta");
  destinationMeta.name = "robots";
  destinationMeta.content = "destination-owned";
  head.append(destinationMeta);

  applyGuideSeo({ locale: "ur", canonical: null, title: "Missing Guide", description: "", noIndex: true });
  assert.equal(document.documentElement.lang, "ur");
  assert.equal(document.documentElement.dir, "rtl");
  assert.equal(head.nodes.some((node) => node.name === "robots" && node.content === "noindex, nofollow"), true);

  clearGuideSeo();
  assert.equal(document.documentElement.lang, "zh-CN");
  assert.equal(document.documentElement.dir, "ltr");
  assert.equal(head.nodes.some((node) => node.dataset.guideSeo === "true"), false);
  assert.equal(head.nodes.includes(destinationMeta), true);
});

test("page metadata uses en-GB and owner noindex metadata cleans up on navigation", () => {
  const head = installDocument();
  applyGuideSeo({ locale: "en", canonical: "https://example.test/en/health/sample", title: "English", description: "Guide",
    alternates: [{ locale: "en", href: "https://example.test/en/health/sample" }] });
  assert.equal(head.nodes.find((node) => node.hreflang)?.hreflang, "en-GB");

  applyGuideSeo({ locale: "zh-CN", canonical: null, title: "Owner editorial", description: "", noIndex: true });
  assert.equal(head.nodes.some((node) => node.name === "robots" && node.content === "noindex, nofollow"), true);
  clearGuideSeo();
  assert.equal(head.nodes.some((node) => node.dataset.guideSeo === "true"), false);
  assert.equal(document.documentElement.lang, "zh-CN");
  assert.equal(document.documentElement.dir, "ltr");
});
