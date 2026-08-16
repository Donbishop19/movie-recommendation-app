import type { Metadata } from "next";
import { ImportView } from "./import-view";

export const metadata: Metadata = {
  title: "Import from Letterboxd — TellaMovie",
};

/** AC-1 of spec 0008: upload a Letterboxd ratings.csv and review the matched titles. */
export default async function OnboardingImportPage({
  searchParams,
}: PageProps<"/onboarding/import">) {
  const { importId } = await searchParams;
  const parsedImportId = importId ? Number(importId) : undefined;

  return (
    <ImportView
      resumeImportId={
        parsedImportId !== undefined && Number.isFinite(parsedImportId)
          ? parsedImportId
          : undefined
      }
    />
  );
}
