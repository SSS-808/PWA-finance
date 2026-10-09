export const en = {
  app: {
    name: "Personal Wallet",
    tagline: "Track every kip, dollar and baht.",
    description: "A personal finance app for accounts, spending and savings.",
  },
  auth: {
    login: {
      title: "Welcome back",
      description: "Log in to see your money.",
      submit: "Log in",
      submitting: "Logging in…",
      forgot: "Forgot password?",
      noAccount: "New here?",
      signupLink: "Create an account",
    },
    signup: {
      title: "Create your account",
      description: "Just an email and a password. You can add your name later.",
      submit: "Create account",
      submitting: "Creating account…",
      haveAccount: "Already have an account?",
      loginLink: "Log in",
      sentTitle: "Check your email",
      sentBody:
        "We sent a link to {email}. Tap it to finish creating your account.",
      resend: "Send the email again",
      resending: "Sending…",
      resent: "Sent! Check your inbox and spam folder.",
    },
    forgot: {
      title: "Forgot your password?",
      description:
        "Enter your email and we'll send you a link to choose a new one.",
      submit: "Send reset link",
      submitting: "Sending…",
      sentTitle: "Check your email",
      sentBody:
        "If there's an account for {email}, we've sent a link to reset the password.",
      back: "Back to log in",
    },
    reset: {
      title: "Choose a new password",
      description: "Use at least 10 characters.",
      submit: "Save new password",
      submitting: "Saving…",
    },
    fields: {
      email: "Email",
      password: "Password",
      newPassword: "New password",
      confirmPassword: "Repeat new password",
      showPassword: "Show password",
      hidePassword: "Hide password",
    },
    errors: {
      invalid_email: "Enter a valid email, like name@example.com.",
      required: "This can't be empty.",
      password_too_short: "Use at least 10 characters.",
      passwords_dont_match: "The two passwords don't match.",
      invalid_credentials:
        "That email and password don't match. Try again, or reset your password.",
      email_not_confirmed:
        "Please confirm your email first. Check your inbox for our link.",
      link: "That link has expired or was already used. Log in, or ask for a new link.",
      rate_limited: "Too many tries. Wait a minute and try again.",
      same_password: "Choose a password that's different from your old one.",
      unknown: "Something went wrong. Please try again.",
    },
    logout: "Log out",
  },
  home: {
    title: "Home",
    greeting: "You're logged in as {email}.",
    greetingNamed: "Hi, {name}!",
    comingSoon: "Your accounts and transactions will appear here soon.",
    passwordUpdated: "Your password was changed.",
  },
  nav: { label: "Main", home: "Home", settings: "Settings" },
  currencies: {
    LAK: "Lao kip (₭)",
    USD: "US dollar ($)",
    THB: "Thai baht (฿)",
  },
  settings: {
    title: "Settings",
    profile: {
      title: "Profile",
      displayName: "Your name",
      displayNameHint: "Optional. Shown on your Home page.",
      baseCurrency: "Main currency",
      baseCurrencyHint:
        "Used for combined totals later. Amounts are always shown in their own currency.",
      timeZone: "Time zone",
      timeZoneHint: "Decides which day a late-night expense belongs to.",
      submit: "Save changes",
      submitting: "Saving…",
      saved: "Saved.",
    },
    account: {
      title: "Account",
      email: "Email",
      changePassword: "Change password",
    },
    errors: {
      name_too_long: "Use 60 characters or fewer.",
      invalid_currency: "Choose one of the listed currencies.",
      invalid_time_zone: "Choose a time zone from the list.",
      unknown: "Something went wrong. Please try again.",
    },
  },
} as const;
