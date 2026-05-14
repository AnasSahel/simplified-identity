/**
 * Unit tests for `groupTransformsByPrefix`. Six cases per the ADR:
 *   1. Normal prefix-based grouping
 *   2. Names without `-` land in Other
 *   3. A solo group is absorbed into Other
 *   4. Overflow above maxGroups merges smallest into Other
 *   5. All solos collapse into a single Other group
 *   6. Empty input returns an empty array
 *
 * Runner: Node's built-in `node:test` + `node --experimental-strip-types`
 * (Node 22+) — zero dependency, no test framework setup required.
 *
 * Run from the package dir:
 *   node --experimental-strip-types --test src/grouping.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  groupTransformsByPrefix,
  OTHER_GROUP_PREFIX,
  type GroupableTransform,
} from "./grouping.ts";

const t = (id: string, name: string): GroupableTransform => ({ id, name });

describe("groupTransformsByPrefix", () => {
  it("buckets by the substring before the first dash (normal case)", () => {
    const input = [
      t("1", "acme-foo"),
      t("2", "acme-bar"),
      t("3", "widgets-zap"),
      t("4", "widgets-pop"),
    ];
    const groups = groupTransformsByPrefix(input);

    assert.equal(groups.length, 2);
    assert.deepEqual(
      groups.map((g) => g.prefix),
      ["acme", "widgets"],
    );
    assert.equal(groups[0].count, 2);
    assert.equal(groups[1].count, 2);
    assert.deepEqual(
      groups[0].transforms.map((x) => x.id),
      ["1", "2"],
    );
  });

  it("routes names without a dash into the Other bucket", () => {
    const input = [
      t("1", "acme-foo"),
      t("2", "acme-bar"),
      t("3", "loneNoDash"),
    ];
    const groups = groupTransformsByPrefix(input);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].prefix, "acme");
    assert.equal(groups[1].prefix, OTHER_GROUP_PREFIX);
    assert.equal(groups[1].count, 1);
    assert.equal(groups[1].transforms[0].name, "loneNoDash");
  });

  it("absorbs a solo group (size 1) into Other", () => {
    const input = [
      t("1", "acme-foo"),
      t("2", "acme-bar"),
      t("3", "solo-only"),
    ];
    const groups = groupTransformsByPrefix(input);

    // `solo` has only one transform → it is folded into Other.
    assert.equal(groups.length, 2);
    assert.equal(groups[0].prefix, "acme");
    assert.equal(groups[1].prefix, OTHER_GROUP_PREFIX);
    assert.equal(groups[1].count, 1);
    assert.equal(groups[1].transforms[0].name, "solo-only");
  });

  it("merges the smallest groups into Other when over maxGroups", () => {
    // 13 distinct prefixes, sizes 13..1. With maxGroups=12 we expect 11
    // real groups (slot 12 reserved for Other) plus one Other bucket.
    const input: GroupableTransform[] = [];
    let id = 0;
    for (let i = 1; i <= 13; i++) {
      const prefix = `p${String(i).padStart(2, "0")}`;
      // size for this prefix — use (14 - i) so prefix p01 has size 13 etc.
      const size = 14 - i;
      for (let k = 0; k < size; k++) {
        id++;
        input.push(t(String(id), `${prefix}-item${k}`));
      }
    }

    const groups = groupTransformsByPrefix(input, { maxGroups: 12 });

    assert.equal(groups.length, 12);
    const last = groups[groups.length - 1];
    assert.equal(last.prefix, OTHER_GROUP_PREFIX);

    // The 11 kept real prefixes are the 11 largest: p01..p11. The
    // smallest two (p12 size 2, p13 size 1) are folded into Other.
    // Note p13's only entry is also a solo, but the absorption pass
    // drops it into Other before the cap pass, so Other = p12 (2) + p13 (1) = 3.
    assert.equal(last.count, 3);
    const keptPrefixes = groups.slice(0, -1).map((g) => g.prefix);
    assert.deepEqual(
      [...keptPrefixes].sort(),
      ["p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10", "p11"],
    );
  });

  it("collapses an all-solo input into a single Other bucket", () => {
    const input = [
      t("1", "alpha-only"),
      t("2", "beta-only"),
      t("3", "gamma-only"),
      t("4", "delta-only"),
    ];
    const groups = groupTransformsByPrefix(input);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].prefix, OTHER_GROUP_PREFIX);
    assert.equal(groups[0].count, 4);
  });

  it("returns an empty array for an empty input", () => {
    const groups = groupTransformsByPrefix([]);
    assert.deepEqual(groups, []);
  });
});
