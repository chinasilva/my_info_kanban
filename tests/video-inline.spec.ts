import { expect, test } from "@playwright/test";

test.skip(process.env.RUN_UI_E2E !== "1", "UI E2E disabled by default. Set RUN_UI_E2E=1 to enable.");

test("video highlight opens inline iframe player", async ({ page }) => {
  await page.goto("/zh/video-playback-e2e");

  await expect(page.getByText("E2E Video Signal")).toBeVisible();
  await page.getByText("E2E Video Signal").click();

  const player = page.locator('iframe[title="E2E Video Signal"]');
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});
