"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient } from "@/auth/session";
import { authEnv } from "@/auth/env";
import { ok, err, type Result } from "@/shared/result";

export type SignUpError = "email_taken" | "weak_password" | "unknown";
export type SignUpState = Result<void, SignUpError> | undefined;

export type SignInError = "invalid_credentials" | "unknown";
export type SignInState = Result<void, SignInError> | undefined;

function readCredentials(formData: FormData): {
  email: string;
  password: string;
} {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

/**
 * Creates an account with an email and password. On success the session cookie is set and
 * the caller redirects to `/onboarding`; a proxy correction sends an already onboarded caller
 * on to `/feed` (a brand new sign up is never onboarded, but the check stays authoritative).
 */
export async function signUpWithPassword(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const { email, password } = readCredentials(formData);

  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      if (
        error.code === "email_exists" ||
        error.code === "user_already_exists"
      ) {
        return err("email_taken");
      }
      if (error.code === "weak_password") {
        return err("weak_password");
      }
      Sentry.captureException(error);
      return err("unknown");
    }

    return ok(undefined);
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/** Signs in with an email and password, setting the session cookie on success. */
export async function signInWithPassword(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const { email, password } = readCredentials(formData);

  try {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.code === "invalid_credentials") {
        return err("invalid_credentials");
      }
      Sentry.captureException(error);
      return err("unknown");
    }

    return ok(undefined);
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Starts the Google OAuth handshake and redirects the browser to Supabase's consent flow.
 * Denial or failure lands back on `/auth/callback`, which routes to `/signin` with a message.
 */
export async function signInWithGoogle(): Promise<void> {
  let destination = "/signin?error=oauth_denied";

  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${authEnv.siteUrl}/auth/callback` },
    });

    if (error || !data.url) {
      Sentry.captureException(error ?? new Error("No OAuth URL returned"));
    } else {
      destination = data.url;
    }
  } catch (error) {
    Sentry.captureException(error);
  }

  redirect(destination);
}

/** Signs out the current session and returns the caller to `/signin`. */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  } catch (error) {
    Sentry.captureException(error);
  }

  revalidatePath("/", "layout");
  redirect("/signin");
}
