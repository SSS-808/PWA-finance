import { expect, test } from "@playwright/test";

const widths = [320, 390, 768, 1024, 1280, 1440];

for (const width of widths) {
  test(`home page fits ${width}px without horizontal scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Personal Wallet" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
