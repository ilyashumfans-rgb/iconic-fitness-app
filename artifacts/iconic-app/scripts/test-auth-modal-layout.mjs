// Native-layout regression: run with node scripts/test-auth-modal-layout.mjs.
// Uses the Yoga C++ sources shipped with this app's React Native (requires g++).
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(app, "components/AuthPopup.tsx"), "utf8");
assert.ok(source.includes('style={Platform.OS === "web" ? styles.scroll : styles.nativeScroll}'),
  "Native scroll must not inherit the web-only flexGrow: 0");
const style = source.match(/nativeScroll:\s*\{([^}]+)\}/)?.[1];
assert.ok(style, "Native viewport style must exist");
const numbers = Object.fromEntries([...style.matchAll(/(\w+):\s*(-?\d+)/g)]
  .map(([, key, value]) => [key, Number(value)]));
assert.equal(numbers.flexGrow, 1);
assert.equal(numbers.flexShrink, 1);
assert.equal(numbers.flexBasis, 0);
const yoga = join(app, "node_modules/react-native/ReactCommon/yoga");
function cppFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? cppFiles(join(dir, e.name)) :
      e.name.endsWith(".cpp") ? [join(dir, e.name)] : []);
}
const temp = mkdtempSync(join(tmpdir(), "auth-yoga-"));
try {
  writeFileSync(join(temp, "test.cpp"), `
#include <yoga/Yoga.h>
#include <cstdio>
#include <cstdlib>
void check(float height, float keyboard, bool broken) {
  auto card = YGNodeNew();
  YGNodeStyleSetWidth(card, 360);
  YGNodeStyleSetHeight(card, height * .88f);
  auto header = YGNodeNew();
  YGNodeStyleSetHeight(header, 90);
  YGNodeStyleSetFlexShrink(header, 0);
  auto wrapper = YGNodeNew();
  YGNodeStyleSetFlex(wrapper, 1);
  YGNodeStyleSetPadding(wrapper, YGEdgeBottom, keyboard);
  auto scroll = YGNodeNew();
  YGNodeStyleSetOverflow(scroll, YGOverflowScroll);
  if (broken) {
    // Exact previous merged style: flexGrow:0, flexShrink:1, flex:1.
    YGNodeStyleSetFlexGrow(scroll, 0);
    YGNodeStyleSetFlexShrink(scroll, 1);
    YGNodeStyleSetFlex(scroll, 1);
  } else {
    YGNodeStyleSetFlexGrow(scroll, ${numbers.flexGrow});
    YGNodeStyleSetFlexShrink(scroll, ${numbers.flexShrink});
    YGNodeStyleSetFlexBasis(scroll, ${numbers.flexBasis});
  }
  auto form = YGNodeNew();
  YGNodeStyleSetHeight(form, 500);
  YGNodeInsertChild(scroll, form, 0);
  YGNodeInsertChild(wrapper, scroll, 0);
  YGNodeInsertChild(card, header, 0);
  YGNodeInsertChild(card, wrapper, 1);
  YGNodeCalculateLayout(card, YGUndefined, YGUndefined, YGDirectionLTR);
  float actual = YGNodeLayoutGetHeight(scroll);
  printf("%s screen=%.0f keyboard=%.0f viewport=%.1f\\n",
    broken ? "previous" : "fixed", height, keyboard, actual);
  if (broken ? actual != 0 : actual < 100) std::abort();
  YGNodeFreeRecursive(card);
}
int main() {
  for (float h : {640.f, 800.f, 1024.f}) {
    check(h, 0, true);
    check(h, 0, false);
    check(h, 280, false);
  }
}
`.replace("#include <cstdio>", "#include <cstdio>\n#include <initializer_list>"));
  execFileSync("g++", ["-std=c++20", "-O0", "-I", yoga, join(temp, "test.cpp"),
    ...cppFiles(join(yoga, "yoga")), "-o", join(temp, "test")], { stdio: "pipe" });
  execFileSync(join(temp, "test"), [], { stdio: "inherit" });
  console.log("PASS: previous zero-height failure reproduced; fixed native viewports remain visible.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
