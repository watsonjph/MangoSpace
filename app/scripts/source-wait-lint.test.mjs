import assert from "node:assert/strict";
import test from "node:test";
import { ESLint } from "eslint";

test("source readiness calls are restricted to the guarded helper", async () => {
  const eslint = new ESLint();
  for (const filePath of ["e2e/regression.spec.ts", "scripts/regression.mjs"]) {
    for (const code of [
      'window.hubasMap?.isSourceLoaded("lgus");',
      'window.hubasMap?.["isSourceLoaded"]("lgus");',
    ]) {
      const [result] = await eslint.lintText(code, { filePath });
      assert(result.messages.some(message => message.ruleId === "no-restricted-syntax" && message.message.includes("waitForLgusSource")));
    }
    const [result] = await eslint.lintText('waitForLgusSource(page);', { filePath });
    assert(!result.messages.some(message => message.ruleId === "no-restricted-syntax"));
  }
  const [helper] = await eslint.lintFiles(["scripts/wait-for-lgus-source.mjs"]);
  assert.equal(helper.errorCount, 0);
});
