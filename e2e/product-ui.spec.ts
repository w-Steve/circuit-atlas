import { test, expect } from "@playwright/test";
test("product layouts show contextual controls and preserve full canvas view", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("catalog.png"),
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "搜索赛道" }).fill("不存在的赛道");
  await expect(
    page.getByText("没有找到匹配的赛道。试试其他关键词。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜索赛道" }).fill("上海");
  await page.getByRole("link", { name: /上海国际赛车场/ }).click();
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-ready",
    "true",
  );
  await page.screenshot({ path: info.outputPath("map.png") });
  await page.getByRole("button", { name: "恢复鸟瞰角度" }).click();
  await page.getByRole("button", { name: "A 主看台 ↗", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-ready",
    "true",
  );
  await page.screenshot({ path: info.outputPath("select.png") });
  await page.getByRole("button", { name: "进入此处视野 ↗" }).click();
  await expect(page.locator(".selection")).toHaveCount(0);
  await expect(page.locator("[data-testid=car-position]")).toBeHidden();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-ready",
    "true",
  );
  await page.screenshot({ path: info.outputPath("eye.png") });
  await page.getByText("测量", { exact: true }).click();
  await expect(
    page.getByText("P 房 · 建筑前沿中心", { exact: true }),
  ).toBeVisible();
  await page.getByText("测量", { exact: true }).click();
  await page.getByRole("button", { name: "打开手机相机" }).click();
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-camera-ready",
    "true",
  );
  await page.screenshot({ path: info.outputPath("phone.png") });
  await page.getByText("取景设置", { exact: true }).first().click();
  await expect(page.getByRole("slider", { name: "连续变焦" })).toBeVisible();
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
});
