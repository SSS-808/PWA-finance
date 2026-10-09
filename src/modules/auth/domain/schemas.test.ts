import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  PASSWORD_MIN_LENGTH,
  emailSchema,
  fieldErrorsFrom,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "./schemas";

const nine = "a".repeat(PASSWORD_MIN_LENGTH - 1);
const ten = "a".repeat(PASSWORD_MIN_LENGTH);

describe("PASSWORD_MIN_LENGTH", () => {
  it("is 10", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
  });
});

describe("emailSchema", () => {
  it("trims and lowercases a valid email", () => {
    expect(emailSchema.parse("  Name@Example.COM ")).toBe("name@example.com");
  });

  it.each(["", "   ", "name", "name@", "@example.com", "a b@example.com"])(
    "rejects %j with invalid_email",
    (value) => {
      const result = emailSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("invalid_email");
    },
  );

  it("rejects a missing value with invalid_email", () => {
    const result = emailSchema.safeParse(undefined);
    expect(result.error?.issues[0]?.message).toBe("invalid_email");
  });
});

describe("logInSchema", () => {
  it("accepts any non-empty password and normalises the email", () => {
    expect(
      logInSchema.parse({ email: " A@B.co ", password: "x" }),
    ).toStrictEqual({ email: "a@b.co", password: "x" });
  });

  it("rejects an empty password with required", () => {
    const result = logInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(result.error?.issues[0]?.message).toBe("required");
    expect(result.error?.issues[0]?.path).toStrictEqual(["password"]);
  });

  it("rejects a missing password with required", () => {
    const result = logInSchema.safeParse({ email: "a@b.co" });
    expect(result.error?.issues[0]?.message).toBe("required");
  });

  it("rejects an invalid email with invalid_email", () => {
    const result = logInSchema.safeParse({ email: "nope", password: "x" });
    expect(result.error?.issues[0]?.message).toBe("invalid_email");
    expect(result.error?.issues[0]?.path).toStrictEqual(["email"]);
  });
});

describe("signUpSchema", () => {
  it("accepts a password of exactly the minimum length", () => {
    expect(
      signUpSchema.parse({ email: "A@B.co", password: ten }),
    ).toStrictEqual({ email: "a@b.co", password: ten });
  });

  it("rejects a password one character short", () => {
    const result = signUpSchema.safeParse({ email: "a@b.co", password: nine });
    expect(result.error?.issues[0]?.message).toBe("password_too_short");
    expect(result.error?.issues[0]?.path).toStrictEqual(["password"]);
  });

  it("does not trim the password", () => {
    const padded = `${nine} `;
    expect(
      signUpSchema.parse({ email: "a@b.co", password: padded }).password,
    ).toBe(padded);
  });

  it("rejects a missing password with required", () => {
    const result = signUpSchema.safeParse({ email: "a@b.co" });
    expect(result.error?.issues[0]?.message).toBe("required");
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of the minimum length", () => {
    expect(
      resetPasswordSchema.parse({ password: ten, confirmPassword: ten }),
    ).toStrictEqual({ password: ten, confirmPassword: ten });
  });

  it("puts the mismatch error on confirmPassword", () => {
    const result = resetPasswordSchema.safeParse({
      password: ten,
      confirmPassword: `${ten}b`,
    });
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.message).toBe("passwords_dont_match");
    expect(result.error?.issues[0]?.path).toStrictEqual(["confirmPassword"]);
  });

  it("rejects a password one character short", () => {
    const result = resetPasswordSchema.safeParse({
      password: nine,
      confirmPassword: nine,
    });
    expect(result.error?.issues[0]?.message).toBe("password_too_short");
    expect(result.error?.issues[0]?.path).toStrictEqual(["password"]);
  });

  it("rejects an empty confirmation with required", () => {
    const result = resetPasswordSchema.safeParse({
      password: ten,
      confirmPassword: "",
    });
    expect(result.error?.issues[0]?.message).toBe("required");
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each failing field to its error key", () => {
    const result = signUpSchema.safeParse({ email: "nope", password: nine });
    expect(fieldErrorsFrom(result.error!)).toStrictEqual({
      email: "invalid_email",
      password: "password_too_short",
    });
  });

  it("keeps only the first error per field", () => {
    const result = resetPasswordSchema.safeParse({
      password: nine,
      confirmPassword: "",
    });
    const errors = fieldErrorsFrom(result.error!);
    expect(errors.password).toBe("password_too_short");
    expect(errors.confirmPassword).toBe("required");
  });

  it("falls back to unknown for a message that is not an error key", () => {
    const result = z.object({ email: z.string().min(5) }).safeParse({
      email: "a",
    });
    expect(fieldErrorsFrom(result.error!)).toStrictEqual({ email: "unknown" });
  });

  it("ignores issues that are not on a known field", () => {
    const result = resetPasswordSchema.safeParse("not an object");
    expect(fieldErrorsFrom(result.error!)).toStrictEqual({});
  });
});
