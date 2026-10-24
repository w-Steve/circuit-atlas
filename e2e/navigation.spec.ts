import {returnToWorld} from './navigation-helpers';
import { test, expect } from "@playwright/test";
test("catalog, map, view and camera deep links preserve the Shanghai scene", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "赛道图鉴", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("gate-a-catalog.png") });
  await page.getByRole("link", { name: /上海国际赛车场/ }).click();
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
  await page.getByRole("button", { name: "A 主看台 ↗", exact: true }).click();
  await page.getByRole("button", { name: "进入此处视野 ↗", exact: true }).click();
  await expect(page).toHaveURL(/\/zones\/a\/eye$/);
  await page.getByRole("button", { name: "打开手机相机", exact: true }).click();
  await page.getByRole("button", { name: "3×", exact: true }).click();
  await returnToWorld(page);
  await expect(
    page.getByRole("link", { name: /上海国际赛车场/ }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("link", { name: /上海国际赛车场/ }).click();
  await page.getByRole("button", { name: "A 主看台 ↗", exact: true }).click();
  await page.getByRole("button", { name: "进入相机 ◎", exact: true }).click();
  await expect(page.getByText("72 mm", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "拍照", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("gate-a-camera.png") });
  await page.goto("/#/circuits/missing/map");
  await expect(
    page.getByText("找不到此赛道页面", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回赛道选择" }).click();
  await expect(
    page.getByRole("link", { name: /上海国际赛车场/ }),
  ).toBeVisible();
});
