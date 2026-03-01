import { expect, test } from "@playwright/test";

test("home page responds with expected HTML", async ({ request }) => {
  const response = await request.get("/zh");
  expect(response.ok()).toBeTruthy();

  const html = await response.text();
  expect(html).toContain("<html");
  expect(html).toContain("High-Signal");
});
