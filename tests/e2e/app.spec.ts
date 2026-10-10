import { expect, test, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import { greeting, logOutFromSettings, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: en.nav.label });
}

function navLink(page: Page, name: string) {
  return mainNav(page).getByRole("link", { name });
}

function nameBox(page: Page) {
  return page.getByRole("textbox", { name: en.settings.profile.displayName });
}

function currencyBox(page: Page) {
  return page.getByRole("combobox", { name: en.settings.profile.baseCurrency });
}

function timeZoneBox(page: Page) {
  return page.getByRole("combobox", { name: en.settings.profile.timeZone });
}

async function saveProfile(page: Page) {
  await page.getByRole("button", { name: en.settings.profile.submit }).click();
}

test("home shows the email greeting and marks Home as the current page", async ({
  page,
}) => {
  const { email } = await signUpAndConfirm(page);
  await expect(page.getByText(greeting(email))).toBeVisible();
  await expect(navLink(page, en.nav.home)).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(navLink(page, en.nav.settings)).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("settings saves the name, currency and time zone, and Home greets by name", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await navLink(page, en.nav.settings).click();
  await expect(navLink(page, en.nav.settings)).toHaveAttribute(
    "aria-current",
    "page",
  );

  await nameBox(page).fill("Sai");
  await currencyBox(page).selectOption("USD");
  await timeZoneBox(page).selectOption("Asia/Bangkok");
  await saveProfile(page);
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: en.settings.profile.saved }),
  ).toBeVisible();

  // The form must keep showing what was saved, not snap back to the old values
  await expect(nameBox(page)).toHaveValue("Sai");
  await expect(currencyBox(page)).toHaveValue("USD");
  await expect(timeZoneBox(page)).toHaveValue("Asia/Bangkok");

  const savedToast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: en.settings.profile.saved });
  await expect(savedToast).toBeHidden({ timeout: 6000 });

  // The client-side trip to Home must already show the new name
  await navLink(page, en.nav.home).click();
  await expect(
    page.getByText(en.home.greetingNamed.replace("{name}", "Sai")),
  ).toBeVisible();

  await navLink(page, en.nav.settings).click();
  await expect(page).toHaveURL(/\/settings$/);
  // Coming back to Settings must not announce the old save again
  await expect(nameBox(page)).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(savedToast).toHaveCount(0);
  await page.reload();
  await expect(nameBox(page)).toHaveValue("Sai");
  await expect(currencyBox(page)).toHaveValue("USD");
  await expect(timeZoneBox(page)).toHaveValue("Asia/Bangkok");

  await navLink(page, en.nav.home).click();
  await expect(
    page.getByText(en.home.greetingNamed.replace("{name}", "Sai")),
  ).toBeVisible();
});

test("a name longer than 60 characters is refused by the server", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await navLink(page, en.nav.settings).click();

  // Remove the browser's own limit so the server check is the one under test
  await nameBox(page).evaluate((input) => input.removeAttribute("maxlength"));
  await nameBox(page).fill("a".repeat(61));
  await saveProfile(page);
  await expect(page.getByText(en.settings.errors.name_too_long)).toBeVisible();
  await expect(nameBox(page)).toHaveValue("a".repeat(61));
});

test("log out from settings returns to the login page", async ({ page }) => {
  await signUpAndConfirm(page);
  await logOutFromSettings(page);
});

test("the nav is a bottom bar on a phone and a left sidebar on a computer", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  const nav = mainNav(page);

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(nav).toBeVisible();
  const phone = await nav.boundingBox();
  expect(await nav.evaluate((el) => getComputedStyle(el).position)).toBe(
    "fixed",
  );
  expect(phone?.x).toBe(0);
  expect(phone?.width).toBe(390);
  expect((phone?.y ?? 0) + (phone?.height ?? 0)).toBeCloseTo(800, 0);

  await page.setViewportSize({ width: 1280, height: 800 });
  const desktop = await nav.boundingBox();
  expect(desktop?.x).toBe(0);
  expect(desktop?.y).toBe(0);
  expect(desktop?.width).toBeLessThan(300);
  expect(desktop?.height).toBe(800);
});

test("the page background follows the phone's dark and light setting", async ({
  page,
}) => {
  await signUpAndConfirm(page);

  // Converts any CSS colour to RGB with a canvas, then takes the mid-point of its brightest and darkest channel
  const lightness = () =>
    page.evaluate(() => {
      const colour = getComputedStyle(document.body).backgroundColor;
      const context = document.createElement("canvas").getContext("2d");
      if (!context) throw new Error("No canvas");
      context.fillStyle = colour;
      context.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0] = context.getImageData(
        0,
        0,
        1,
        1,
      ).data;
      return (Math.max(red, green, blue) + Math.min(red, green, blue)) / 510;
    });

  await page.emulateMedia({ colorScheme: "dark" });
  expect(await lightness()).toBeLessThan(0.3);

  await page.emulateMedia({ colorScheme: "light" });
  expect(await lightness()).toBeGreaterThan(0.7);
});

test("home and settings fit every width and the nav never covers the last element", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUpAndConfirm(page);

  const paths = [
    {
      path: "/",
      ready: () => page.getByRole("heading", { name: en.home.startTitle }),
    },
    {
      path: "/settings",
      ready: () =>
        page.getByRole("button", { name: en.settings.profile.submit }),
    },
  ];

  for (const { path, ready } of paths) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await expect(ready()).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const lastBottom = await page.evaluate(() => {
        let element: Element | null = document.querySelector("main");
        while (element?.lastElementChild) element = element.lastElementChild;
        return element?.getBoundingClientRect().bottom ?? 0;
      });
      const navBox = await mainNav(page).boundingBox();
      if (width < 1024) {
        expect(lastBottom, `${path} at ${width}px`).toBeLessThanOrEqual(
          navBox?.y ?? 0,
        );
      } else {
        expect(lastBottom, `${path} at ${width}px`).toBeLessThanOrEqual(800);
      }
    }
  }
});

function timeZoneHintButton(page: Page) {
  return page.getByRole("button", {
    name: en.help.about.replace("{field}", en.settings.profile.timeZone),
  });
}

test("a help hint opens from its question mark button and closes with Escape", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await navLink(page, en.nav.settings).click();
  const hint = page.getByText(en.settings.profile.timeZoneHint);
  await expect(hint).toHaveCount(0);

  await timeZoneHintButton(page).click();
  await expect(hint).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(hint).toHaveCount(0);
});

test("an open help hint does not follow the user to Home", async ({ page }) => {
  await signUpAndConfirm(page);
  await navLink(page, en.nav.settings).click();
  await timeZoneHintButton(page).click();
  await expect(page.getByText(en.settings.profile.timeZoneHint)).toBeVisible();

  await navLink(page, en.nav.home).click();
  await expect(
    page.getByRole("heading", { name: en.home.startTitle }),
  ).toBeVisible();
  await expect(
    page.getByText(en.settings.profile.timeZoneHint).filter({ visible: true }),
  ).toHaveCount(0);
});

test("the help bubble stays inside the screen at every width", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signUpAndConfirm(page);

  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/settings");
    await timeZoneHintButton(page).click();
    const bubble = page.getByText(en.settings.profile.timeZoneHint);
    await expect(bubble).toBeVisible();

    const box = await bubble.boundingBox();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    console.log(
      `bubble ${width}px: left=${box?.x}, right=${(box?.x ?? 0) + (box?.width ?? 0)}, width=${box?.width}`,
    );
    expect(box?.x, `left at ${width}px`).toBeGreaterThanOrEqual(0);
    expect(
      (box?.x ?? 0) + (box?.width ?? 0),
      `right at ${width}px`,
    ).toBeLessThanOrEqual(width);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});
