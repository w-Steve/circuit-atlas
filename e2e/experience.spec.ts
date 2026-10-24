import { test, expect } from "@playwright/test";
test("complete observation, physical playback, phone zoom and nonempty photo export", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/circuits/shanghai/map");
  await page.locator('.venue-info-link').click();
  await page.locator('.venue-about summary').click();
  await expect(page.locator('.venue-source-content')).toContainText('GEDTM30');
  await page.locator('.venue-back').click();
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
  await page.getByRole("button", { name: "A 主看台 ↗", exact: true }).click();
  await page.getByRole("button", { name: "上层", exact: true }).click();
  await page.getByRole("slider", { name: "上层看台选点" }).press("ArrowRight");
  await expect(page.locator(".experience-title")).toContainText("上层");
  await page.getByRole("button", { name: "进入此处视野 ↗" }).click();
  await page.getByRole("button", { name: "播放赛车经过", exact: true }).click();
  await expect(page.getByTestId("sim-status")).toHaveText("正在经过");
  const before = await page.getByTestId("car-position").innerText();
  await expect(page.getByTestId("car-position")).not.toHaveText(before);
  await expect
    .poll(
      async () =>
        parseFloat(await page.getByTestId("car-distance").innerText()),
      { timeout: 15000, intervals: [100] },
    )
    .toBeLessThan(74);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  const pos = await page.getByTestId("car-position").innerText();
  await page.waitForTimeout(300);
  await expect(page.getByTestId("car-position")).toHaveText(pos);
  await page.getByRole("button", { name: "打开手机相机", exact: true }).click();
  await page.getByRole("button", { name: "5×", exact: true }).click();
  await expect(page.getByText("120 mm", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "1×", exact: true }).click();
  await expect(page.locator(".frame-stats")).toContainText("画面内");
  await page.screenshot({ path: info.outputPath("phone.png") });
  await page.getByRole("button", { name: "拍照", exact: true }).click();
  const image = page.getByRole("img", { name: "上海赛车场模拟照片" });
  await expect(image).toBeVisible();
  const png = await image.evaluate((img: HTMLImageElement) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const a = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < a.length; i += 400)
      colors.add(a[i] * 65536 + a[i + 1] * 256 + a[i + 2]);
    return {
      w: img.naturalWidth,
      h: img.naturalHeight,
      colors: colors.size,
      src: img.src.length,
    };
  });
  expect(png.w).toBe(1600);
  expect(png.h).toBe(1200);
  expect(png.colors).toBeGreaterThan(10);
  expect(png.src).toBeGreaterThan(10000);
  const difference = await image.evaluate((img: HTMLImageElement) => {
    const actual = document.createElement("canvas");
    actual.width = 1600;
    actual.height = 1200;
    const ctx = actual.getContext("2d")!;
    ctx.drawImage(document.querySelector("canvas")!, 0, 0, 1600, 1200);
    const a = ctx.getImageData(0, 0, 1600, 1200).data;
    ctx.clearRect(0, 0, 1600, 1200);
    ctx.drawImage(img, 0, 0);
    const b = ctx.getImageData(0, 0, 1600, 1200).data;
    let d = 0,
      n = 0;
    for (let i = 0; i < a.length; i += 160) {
      d +=
        Math.abs(a[i] - b[i]) +
        Math.abs(a[i + 1] - b[i + 1]) +
        Math.abs(a[i + 2] - b[i + 2]);
      n += 3;
    }
    return d / n;
  });
  expect(difference).toBeLessThan(2);

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "保存 PNG ↓" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("shanghai-a-1-1000-fixed.png");
  await download.saveAs(info.outputPath("capture.png"));
  await page.getByRole("button", { name: "关闭预览" }).click();
  const canvas = page.locator("canvas"),
    bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const previousFrame = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.45,
    bounds!.y + bounds!.height * 0.45,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width * 0.65,
    bounds!.y + bounds!.height * 0.5,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "拍照", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(previousFrame);
  await page.getByRole("button", { name: "返回肉眼" }).click();
  await expect(page.getByTestId("car-position")).toHaveText(pos);
  await page.getByRole("button", { name: "重置 / 重播" }).click();
  await expect(page.getByTestId("sim-status")).toHaveText("就绪 · 上游起点");
  await page.goto("/#/circuits/shanghai/map");
  await page.reload();
  await expect(page.getByRole("button", { name: "A 主看台 ↗" })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath("overview.png") });
});
