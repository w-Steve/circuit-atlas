import { test, expect } from "@playwright/test";
test("scene chunk failure offers a recoverable reload", async ({ page }) => {
  await page.route(/\/assets\/CircuitExperience-.*\.js/, (route) => route.abort());
  await page.goto("/#/circuits/shanghai/map");
  await expect(
    page.getByRole("heading", { name: "场景加载失败" }),
  ).toBeVisible();
  await page.unroute(/\/assets\/CircuitExperience-.*\.js/);
  await page.getByRole("button", { name: "重新加载场景" }).click();
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
});
test("actual WebGL context loss pauses the simulator and offers recovery", async ({
  page,
}) => {
  await page.goto("/#/circuits/shanghai/map");
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
  await page.getByRole("button", { name: "A 主看台 ↗", exact: true }).click();
  await page.getByRole("button", { name: "进入此处视野 ↗", exact: true }).click();
  await page.getByRole("button", { name: "播放赛车经过", exact: true }).click();
  const supported = await page
    .locator("canvas")
    .evaluate((c: HTMLCanvasElement) => {
      const gl = c.getContext("webgl2");
      const extension = gl?.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
  expect(supported).toBe(true);
  await expect(
    page.getByRole("heading", { name: "WebGL 画面已中断" }),
  ).toBeVisible();
  await expect(page.getByTestId("sim-status")).toHaveText("已暂停");
  await page.getByRole("button", { name: "重新加载场景" }).click();
  await expect(page.getByRole("button", { name: "播放赛车经过", exact: true })).toBeVisible();
});
test("unsupported WebGL has an actionable error screen", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return original.call(this, type as never, ...(args as []));
    } as typeof original;
  });
  await page.goto("/#/circuits/shanghai/map");
  await expect(
    page.getByRole("heading", { name: /WebGL 无法启动|场景加载失败/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "重新加载场景" }),
  ).toBeVisible();
});
