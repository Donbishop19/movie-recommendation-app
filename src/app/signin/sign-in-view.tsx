"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
} from "@/auth/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/design-system/components/tabs";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { Button } from "@/design-system/components/button";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Stack } from "@/design-system/components/stack";

const SIGN_UP_ERROR_MESSAGE: Record<string, string> = {
  email_taken: "That email is already registered. Try signing in instead.",
  weak_password: "Choose a longer, less predictable password.",
  unknown: "Something went wrong creating your account. Please try again.",
};

const SIGN_IN_ERROR_MESSAGE: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  unknown: "Something went wrong signing you in. Please try again.",
};

export interface SignInViewProps {
  initialOauthDenied: boolean;
}

/** The client half of `/signin`: two credential forms plus the Google entry point. */
export function SignInView({ initialOauthDenied }: SignInViewProps) {
  const router = useRouter();
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    undefined,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    undefined,
  );

  useEffect(() => {
    if (signInState?.ok || signUpState?.ok) {
      router.replace("/onboarding");
    }
  }, [signInState, signUpState, router]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack gap="lg">
          {initialOauthDenied ? (
            <FormErrorSummary
              title="Google sign in didn't go through"
              errors={[
                "That request was cancelled or failed. Try again below.",
              ]}
            />
          ) : null}

          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form action={signInAction}>
                <Stack gap="md">
                  <FormErrorSummary
                    errors={
                      signInState?.ok === false
                        ? [SIGN_IN_ERROR_MESSAGE[signInState.error]]
                        : []
                    }
                  />
                  <Stack gap="xs">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </Stack>
                  <Button
                    type="submit"
                    isLoading={signInPending}
                    className="w-full"
                  >
                    Sign in
                  </Button>
                </Stack>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form action={signUpAction}>
                <Stack gap="md">
                  <FormErrorSummary
                    errors={
                      signUpState?.ok === false
                        ? [SIGN_UP_ERROR_MESSAGE[signUpState.error]]
                        : []
                    }
                  />
                  <Stack gap="xs">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </Stack>
                  <Stack gap="xs">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                  </Stack>
                  <Button
                    type="submit"
                    isLoading={signUpPending}
                    className="w-full"
                  >
                    Create account
                  </Button>
                </Stack>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-sm text-xs text-muted">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            or
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <form action={signInWithGoogle}>
            <Button type="submit" variant="secondary" className="w-full">
              Continue with Google
            </Button>
          </form>
        </Stack>
      </CardContent>
    </Card>
  );
}
