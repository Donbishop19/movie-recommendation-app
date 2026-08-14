"use client";

import { useActionState, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import { Stack } from "@/design-system/components/stack";
import { Link } from "@/design-system/components/link";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/design-system/components/dialog";
import {
  signOut,
  deleteAccount,
  type DeleteAccountError,
} from "@/auth/actions";
import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from "@/auth/constants";

const DELETE_ERROR_MESSAGE: Record<DeleteAccountError, string> = {
  confirmation_mismatch: `Type "${DELETE_ACCOUNT_CONFIRMATION_PHRASE}" exactly to confirm.`,
  unauthorized: "Your session expired. Sign in again and retry.",
  unknown: "Something went wrong deleting your account. Please try again.",
};

export interface AccountViewProps {
  email: string;
}

/** The Danger zone's type to confirm delete flow (AC-5 through AC-9 of spec 0010). */
function DeleteAccountDialog() {
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  const canDelete = confirmation === DELETE_ACCOUNT_CONFIRMATION_PHRASE;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This permanently removes your account, your ratings, your imports,
            and your feed history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form action={action}>
          <Stack gap="md">
            <FormErrorSummary
              errors={
                state?.ok === false ? [DELETE_ERROR_MESSAGE[state.error]] : []
              }
            />
            <Stack gap="xs">
              <Label htmlFor="delete-confirm">
                Type {DELETE_ACCOUNT_CONFIRMATION_PHRASE} to confirm
              </Label>
              <Input
                id="delete-confirm"
                name="confirm"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </Stack>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                disabled={!canDelete}
                isLoading={pending}
              >
                Delete my account
              </Button>
            </DialogFooter>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The account screen's content: account info, sign out, and the legal section (AC-1). */
export function AccountView({ email }: AccountViewProps) {
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <h1 className="text-2xl font-medium text-ink">Account</h1>
        <p className="text-body">Manage your account and its data.</p>
      </Stack>

      <Card>
        <CardHeader>
          <CardTitle>Signed in as</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="md">
            <p className="text-body">{email}</p>
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="xs">
            <Link href="/privacy" variant="accent">
              Privacy policy
            </Link>
            <Link href="/terms" variant="accent">
              Terms of service
            </Link>
          </Stack>
        </CardContent>
      </Card>

      <Card className="border-error/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="sm">
            <p className="text-body">
              Deleting your account permanently removes your profile, ratings,
              imports, and feed history. This cannot be undone.
            </p>
            <DeleteAccountDialog />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
