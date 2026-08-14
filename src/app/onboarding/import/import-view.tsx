"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, CircleAlert } from "lucide-react";
import {
  uploadLetterboxdImport,
  getImportReview,
  resolveAmbiguousImportRow,
  completeCsvImport,
  type ImportSummary,
  type ImportRowView,
  type ResolveChoice,
} from "@/app/actions/imports";
import { MoviePoster } from "@/movies/movie-poster";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardSkeleton,
} from "@/design-system/components/card";
import { Button } from "@/design-system/components/button";
import { Badge } from "@/design-system/components/badge";
import { Stack } from "@/design-system/components/stack";
import { Link } from "@/design-system/components/link";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Spinner } from "@/design-system/components/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/design-system/components/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/design-system/components/radio-group";
import { Label } from "@/design-system/components/label";
import { toast } from "@/design-system/lib/toast-store";
import { cn } from "@/design-system/lib/cn";

export interface ImportViewProps {
  resumeImportId?: number;
}

const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  invalid_file_type: "That file isn't a .csv file.",
  file_too_large: "That file is larger than the 2MB limit.",
  invalid_header:
    "That doesn't look like a Letterboxd ratings export (unexpected columns).",
  empty_file: "That file has no rows to import.",
  row_limit_exceeded:
    "That file has more than 500 rows; split it and import in batches.",
  unauthorized: "Your session expired. Sign in again and retry.",
  unknown: "Something went wrong. Try again.",
};

type AmbiguousRow = Extract<ImportRowView, { matchStatus: "ambiguous" }>;
type MatchedRow = Extract<ImportRowView, { matchStatus: "matched" }>;

/** The upload screen, then the matched/ambiguous/unmatched review, all one flow. Spec 0008. */
export function ImportView({ resumeImportId }: ImportViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [summary, setSummary] = useState<ImportSummary | undefined>(undefined);
  const [isResuming, setIsResuming] = useState(resumeImportId !== undefined);
  const [resumeError, setResumeError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [activeRowId, setActiveRowId] = useState<number | undefined>(undefined);
  const [resolvingRowId, setResolvingRowId] = useState<number | undefined>(
    undefined,
  );
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (resumeImportId === undefined) {
      return;
    }
    // Hydrating an in progress review by importId; state only changes after the awaited call,
    // the standard fetch-on-mount shape.
    void (async () => {
      const result = await getImportReview(resumeImportId);
      if (!result.ok) {
        setResumeError(true);
        setIsResuming(false);
        return;
      }
      setSummary(result.value);
      setIsResuming(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpload(fileArg?: File) {
    const file = fileArg ?? fileInputRef.current?.files?.[0];
    if (!file || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadError(undefined);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadLetterboxdImport(formData);
    setIsUploading(false);

    if (!result.ok) {
      setUploadError(
        UPLOAD_ERROR_MESSAGES[result.error] ?? UPLOAD_ERROR_MESSAGES.unknown,
      );
      return;
    }

    setSummary(result.value);
    router.replace(`/onboarding/import?importId=${result.value.importId}`);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void handleUpload(event.dataTransfer.files?.[0]);
  }

  async function handleResolve(rowId: number, choice: ResolveChoice) {
    setResolvingRowId(rowId);
    const result = await resolveAmbiguousImportRow(rowId, choice);
    setResolvingRowId(undefined);

    if (!result.ok) {
      toast({
        variant: "error",
        title: "Couldn't save that choice",
        description: "Try again.",
      });
      return;
    }

    setActiveRowId(undefined);
    setSummary((prev) =>
      prev
        ? applyResolution(prev, rowId, result.value.matchStatus, choice)
        : prev,
    );
  }

  async function handleComplete() {
    if (!summary || isCompleting) {
      return;
    }
    setIsCompleting(true);
    const result = await completeCsvImport(summary.importId);
    setIsCompleting(false);

    if (!result.ok) {
      toast({
        variant: "error",
        title: "Couldn't finish onboarding",
        description: "Try again.",
      });
      return;
    }

    router.replace("/feed");
  }

  if (isResuming) {
    return (
      <Stack gap="md" align="center" className="w-full max-w-(--container-sm)">
        <CardSkeleton className="w-full" />
      </Stack>
    );
  }

  if (resumeError) {
    return (
      <Stack
        gap="md"
        align="center"
        className="w-full max-w-(--container-sm) text-center"
      >
        <FormErrorSummary
          title="Couldn't load that import"
          errors={[
            "Check your connection and try again, or start a new upload.",
          ]}
        />
        <Button
          onClick={() => {
            setResumeError(false);
            router.replace("/onboarding/import");
          }}
        >
          Start a new upload
        </Button>
      </Stack>
    );
  }

  if (!summary) {
    return (
      <Card className="w-full text-left">
        <CardHeader>
          <UploadIcon className="size-6 text-accent" aria-hidden="true" />
          <CardTitle>Import your Letterboxd ratings</CardTitle>
          <CardDescription>
            Export your ratings from Letterboxd (Settings, Import &amp; Export,
            Export your data), then upload the <code>ratings.csv</code> file
            from the zip. Up to 500 rows, 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormErrorSummary errors={uploadError ? [uploadError] : []} />
          <label
            htmlFor="letterboxd-csv"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className={cn(
              "mt-sm flex flex-col items-center gap-xs rounded-md border border-dashed border-border bg-canvas px-lg py-xl text-center",
              "transition-colors duration-(--duration-base) ease-standard hover:border-accent focus-within:border-accent",
              isUploading ? "pointer-events-none opacity-70" : "cursor-pointer",
            )}
          >
            {isUploading ? (
              <>
                <Spinner size="md" />
                <span className="text-sm font-medium text-ink">Uploading…</span>
              </>
            ) : (
              <>
                <UploadIcon className="size-8 text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-ink">
                  Choose your ratings.csv
                </span>
                <span className="text-xs text-muted">or drag it here</span>
              </>
            )}
          </label>
          <input
            ref={fileInputRef}
            id="letterboxd-csv"
            type="file"
            accept=".csv"
            className="sr-only"
            disabled={isUploading}
            onChange={() => void handleUpload()}
          />
        </CardContent>
      </Card>
    );
  }

  const ambiguousRows = summary.rows.filter(
    (row): row is AmbiguousRow => row.matchStatus === "ambiguous",
  );
  const matchedRows = summary.rows.filter(
    (row): row is MatchedRow => row.matchStatus === "matched",
  );
  const unmatchedRows = summary.rows.filter(
    (row) => row.matchStatus === "unmatched",
  );
  const activeRow = ambiguousRows.find((row) => row.id === activeRowId);

  return (
    <Stack gap="lg" className="w-full text-left">
      <Stack gap="xxs">
        <h1 className="text-2xl font-medium text-ink">Review your import</h1>
        <p className="text-sm text-body">
          {summary.matchedCount} matched · {summary.ambiguousCount} need your
          help · {summary.unmatchedCount} not found
        </p>
      </Stack>

      {ambiguousRows.length > 0 ? (
        <Stack gap="sm">
          <h2 className="text-sm font-medium text-ink">
            Needs your help ({ambiguousRows.length})
          </h2>
          <ul className="flex flex-col gap-xs">
            {ambiguousRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-sm rounded-md border border-border bg-surface p-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.rawTitle}
                  </p>
                  {row.rawYear ? (
                    <p className="text-xs text-muted">{row.rawYear}</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveRowId(row.id)}
                >
                  Pick a match
                </Button>
              </li>
            ))}
          </ul>
        </Stack>
      ) : null}

      {matchedRows.length > 0 ? (
        <Stack gap="sm">
          <h2 className="text-sm font-medium text-ink">
            Matched ({matchedRows.length})
          </h2>
          <ul className="flex flex-col gap-xs">
            {matchedRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-sm rounded-md border border-border bg-surface p-sm"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-canvas">
                  <MoviePoster
                    posterUrl={row.movie.posterUrl}
                    title={row.movie.title}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.movie.title}
                  </p>
                  {row.movie.releaseYear ? (
                    <p className="text-xs text-muted">
                      {row.movie.releaseYear}
                    </p>
                  ) : null}
                </div>
                <Badge variant="success">Matched</Badge>
              </li>
            ))}
          </ul>
        </Stack>
      ) : null}

      {unmatchedRows.length > 0 ? (
        <Stack gap="sm">
          <h2 className="text-sm font-medium text-ink">
            Not found ({unmatchedRows.length})
          </h2>
          <ul className="flex flex-col gap-xs">
            {unmatchedRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-sm rounded-md border border-border bg-surface p-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.rawTitle}
                  </p>
                  {row.rawYear ? (
                    <p className="text-xs text-muted">{row.rawYear}</p>
                  ) : null}
                </div>
                <Badge>Not found</Badge>
              </li>
            ))}
          </ul>
        </Stack>
      ) : null}

      {summary.matchedCount > 0 ? (
        <Button
          type="button"
          size="lg"
          isLoading={isCompleting}
          onClick={() => void handleComplete()}
        >
          Continue to your feed
        </Button>
      ) : (
        <Stack
          gap="xs"
          align="center"
          className="rounded-md border border-border bg-surface p-md text-center"
        >
          <div className="flex items-center gap-xs text-body">
            <CircleAlert className="size-4" aria-hidden="true" />
            <p className="text-sm">
              Nothing matched yet, so there&apos;s nothing to build a feed from.
            </p>
          </div>
          <Link href="/onboarding/swipe" variant="accent">
            Try swipe onboarding instead
          </Link>
        </Stack>
      )}

      <Dialog
        open={activeRow !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setActiveRowId(undefined);
          }
        }}
      >
        {activeRow ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Which one is &quot;{activeRow.rawTitle}&quot;?
              </DialogTitle>
              <DialogDescription>
                {activeRow.rawYear
                  ? `You logged this as ${activeRow.rawYear}. `
                  : ""}
                Pick the right one, or mark it not found.
              </DialogDescription>
            </DialogHeader>
            <CandidatePicker
              row={activeRow}
              pending={resolvingRowId === activeRow.id}
              onResolve={(choice) => void handleResolve(activeRow.id, choice)}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </Stack>
  );
}

function CandidatePicker({
  row,
  pending,
  onResolve,
}: {
  row: AmbiguousRow;
  pending: boolean;
  onResolve: (choice: ResolveChoice) => void;
}) {
  const [selected, setSelected] = useState<string>("unmatched");

  return (
    <Stack gap="md">
      <RadioGroup value={selected} onValueChange={setSelected}>
        {row.candidates.map((candidate) => (
          <div key={candidate.id} className="flex items-center gap-sm">
            <RadioGroupItem
              value={candidate.id}
              id={`candidate-${candidate.id}`}
            />
            <div className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-canvas">
              <MoviePoster
                posterUrl={candidate.posterUrl}
                title={candidate.title}
              />
            </div>
            <Label htmlFor={`candidate-${candidate.id}`} className="flex-1">
              {candidate.title}
              {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
            </Label>
          </div>
        ))}
        <div className="flex items-center gap-sm">
          <RadioGroupItem value="unmatched" id="candidate-unmatched" />
          <Label htmlFor="candidate-unmatched">None of these</Label>
        </div>
      </RadioGroup>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          isLoading={pending}
          onClick={() =>
            onResolve(
              selected === "unmatched" ? "unmatched" : { movieId: selected },
            )
          }
        >
          Confirm
        </Button>
      </DialogFooter>
    </Stack>
  );
}

function applyResolution(
  summary: ImportSummary,
  rowId: number,
  matchStatus: "matched" | "unmatched",
  choice: ResolveChoice,
): ImportSummary {
  const rows = summary.rows.map((row): ImportRowView => {
    if (row.id !== rowId || row.matchStatus !== "ambiguous") {
      return row;
    }
    if (matchStatus === "matched" && choice !== "unmatched") {
      const movie = row.candidates.find((c) => c.id === choice.movieId);
      if (movie) {
        return {
          id: row.id,
          rawTitle: row.rawTitle,
          rawYear: row.rawYear,
          matchStatus: "matched",
          movie,
        };
      }
    }
    return {
      id: row.id,
      rawTitle: row.rawTitle,
      rawYear: row.rawYear,
      matchStatus: "unmatched",
    };
  });

  return {
    ...summary,
    rows,
    matchedCount:
      matchStatus === "matched"
        ? summary.matchedCount + 1
        : summary.matchedCount,
    unmatchedCount:
      matchStatus === "unmatched"
        ? summary.unmatchedCount + 1
        : summary.unmatchedCount,
    ambiguousCount: summary.ambiguousCount - 1,
  };
}
