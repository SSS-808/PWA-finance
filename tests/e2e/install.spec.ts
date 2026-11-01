import { devices, expect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import { signUpAndConfirm } from "./helpers";

test("the manifest and icons load without logging in", async ({
  page,
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: en.app.name,
    short_name: en.app.shortName,
    start_url: "/",
    display: "standalone",
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  for (const icon of manifest.icons as { src: string }[]) {
    const file = await request.get(icon.src);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("image/png");
  }

  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(appleIcon).toBeTruthy();
  const appleFile = await request.get(String(appleIcon));
  expect(appleFile.headers()["content-type"]).toBe("image/png");
});

test.describe("on an iPhone", () => {
  test.use({ userAgent: devices["iPhone 13"].userAgent });

  test("Settings shows the Add to Home Screen steps behind a ?", async ({
    page,
  }) => {
    await signUpAndConfirm(page);
    await page.goto("/settings");
    const section = page.getByRole("region", { name: en.settings.app.title });
    await expect(section.getByText(en.settings.app.addToHome)).toBeVisible();
    await section
      .getByRole("button", {
        name: en.help.about.replace("{field}", en.settings.app.addToHome),
      })
      .click();
    await expect(page.getByText(en.settings.app.iosSteps)).toBeVisible();
  });
});
