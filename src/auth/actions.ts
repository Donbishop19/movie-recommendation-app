"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient, requireSession } from "@/auth/session";
import { createAdminClient } from "@/auth/admin-client";
import { authEnv } from "@/auth/env";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result } from "@/shared/result";
import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from "@/auth/constants";

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

export type DeleteAccountError =
  "confirmation_mismatch" | "unauthorized" | "unknown";
export type DeleteAccountState = Result<void, DeleteAccountError> | undefined;

/**
 * Deletes the caller's own account: `auth.users` via the Supabase Auth Admin API, which
 * cascades through `profiles` to every owned row (ratings, imports, feed items), per spec
 * 0010 AC-6. Only ever targets the authenticated caller's own id (AC-9), and requires the
 * confirmation phrase to match server side even though the UI already gates on it (AC-5).
 * Irreversible: does not run unless both checks pass.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const session = await requireSession();
  if (!session.ok) {
    return err("unauthorized");
  }

  const confirmation = String(formData.get("confirm") ?? "");
  if (confirmation !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
    return err("confirmation_mismatch");
  }

  const { userId } = session.value;

  try {
    Sentry.addBreadcrumb({
      category: "account",
      message: "Account deletion requested",
      data: { userId },
    });
    trackServer("account_deletion_completed", userId, {});

    const { error } = await createAdminClient().auth.admin.deleteUser(userId);
    if (error) {
      Sentry.captureException(error);
      return err("unknown");
    }
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }

  try {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  } catch (error) {
    Sentry.captureException(error);
  }

  revalidatePath("/", "layout");
  redirect("/signin");
}
