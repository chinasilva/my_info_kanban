import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("signals api returns 400 for non-existent cursor", async ({ request }) => {
  const response = await request.get("/api/signals", {
    params: {
      sourceType: "video",
      limit: "12",
      cursor: randomUUID(),
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: "Invalid cursor",
  });
});
