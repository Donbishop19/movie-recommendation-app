"use client";

import { useState } from "react";
import { Home, Star, User } from "lucide-react";

import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardSkeleton,
  CardTitle,
} from "@/design-system/components/card";
import { Checkbox } from "@/design-system/components/checkbox";
import { Chip, ChipGroup } from "@/design-system/components/chip";
import { Container } from "@/design-system/components/container";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/design-system/components/dialog";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Grid, Stack } from "@/design-system/components/stack";
import { HeroSpotlight } from "@/design-system/components/hero-spotlight";
import { ImageFallback } from "@/design-system/components/image-fallback";
import { Input } from "@/design-system/components/input";
import { Label } from "@/design-system/components/label";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/design-system/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/components/select";
import { Skeleton } from "@/design-system/components/skeleton";
import { Spinner } from "@/design-system/components/spinner";
import {
  TabBar,
  TabBarAction,
  TabBarItem,
} from "@/design-system/components/tab-bar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/design-system/components/tabs";
import { toast } from "@/design-system/lib/toast-store";

const colorTokens = [
  {
    name: "canvas",
    var: "--color-canvas",
    hex: "#0c0a08",
    note: "page background",
  },
  {
    name: "surface",
    var: "--color-surface",
    hex: "#17140f",
    note: "card, panel",
  },
  {
    name: "border",
    var: "--color-border",
    hex: "#6b6148",
    note: "3:1 on surface",
  },
  {
    name: "muted",
    var: "--color-muted",
    hex: "#96897a",
    note: "5.8:1 on canvas",
  },
  {
    name: "body",
    var: "--color-body",
    hex: "#a79c89",
    note: "7.3:1 on canvas",
  },
  { name: "ink", var: "--color-ink", hex: "#f2ecdd", note: "16.8:1 on canvas" },
  {
    name: "accent",
    var: "--color-accent",
    hex: "#f5a524",
    note: "9.7:1 on canvas",
  },
  {
    name: "on-accent",
    var: "--color-on-accent",
    hex: "#1a1206",
    note: "9.1:1 on accent",
  },
  {
    name: "success",
    var: "--color-success",
    hex: "#5fbf6b",
    note: "8.6:1 on canvas",
  },
  {
    name: "error",
    var: "--color-error",
    hex: "#e5484d",
    note: "5.1:1 on canvas",
  },
] as const;

const spacingTokens = [
  "xxs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "section",
] as const;

/**
 * A manual QA fixture (AC-9): every base component and its key states, in one place. Tab through
 * it with the keyboard only to confirm focus rings and activation; not a page a visitor ever sees.
 */
export default function ComponentsShowcasePage() {
  const [invalidDemo, setInvalidDemo] = useState(true);

  return (
    <div>
      <NavBar
        logo="Design system"
        items={[
          { label: "Overview", href: "#colors", active: true },
          { label: "Components", href: "#buttons" },
        ]}
        actions={<Badge variant="accent">Dev only</Badge>}
      />
      <Container as="main" className="flex flex-col gap-section py-2xl">
        <Stack gap="xs">
          <h1 className="text-3xl font-medium text-ink">Component showcase</h1>
          <p className="max-w-(--container-2xl) text-body">
            Every base component in the design system, rendered with its
            default, disabled, error, and loading states where it has one. Tab
            through the whole page with the keyboard only and confirm every
            interactive element shows a visible amber focus ring and activates
            on Enter or Space.
          </p>
        </Stack>

        <section id="colors" className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">Color</h2>
          <Grid cols={4} gap="sm">
            {colorTokens.map((token) => (
              <Card key={token.name}>
                <div
                  className="h-16 rounded-t-md border-b border-border"
                  style={{ backgroundColor: `var(${token.var})` }}
                />
                <CardContent className="pt-sm">
                  <p className="text-sm font-medium text-ink">{token.name}</p>
                  <p className="text-xs text-muted">
                    {token.hex} · {token.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">Typography</h2>
          <Stack gap="sm">
            <p className="text-4xl font-medium text-ink">Text 4xl / heading</p>
            <p className="text-3xl font-medium text-ink">Text 3xl / heading</p>
            <p className="text-2xl font-medium text-ink">Text 2xl / heading</p>
            <p className="text-xl text-ink">Text xl</p>
            <p className="text-lg text-ink">Text lg</p>
            <p className="text-base text-body">Text base, the body copy size</p>
            <p className="text-sm text-body">
              Text sm, captions and secondary copy
            </p>
            <p className="text-xs text-muted">
              Text xs, the smallest, muted only
            </p>
          </Stack>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">Spacing</h2>
          <Stack gap="xs">
            {spacingTokens.map((step) => (
              <div key={step} className="flex items-center gap-sm">
                <span className="w-16 text-xs text-muted">{step}</span>
                <div
                  className="h-4 rounded-sm bg-accent"
                  style={{ width: `var(--spacing-${step})` }}
                />
              </div>
            ))}
          </Stack>
        </section>

        <section id="buttons" className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">Button</h2>
          <Stack direction="row" gap="sm" wrap>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
            <Button isLoading>Loading</Button>
          </Stack>
          <Stack direction="row" gap="sm" wrap align="center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Stack>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">
            Input, select, checkbox, radio
          </h2>
          <Grid cols={2} gap="lg">
            <Stack gap="xs">
              <Label htmlFor="showcase-input">Email</Label>
              <Input
                id="showcase-input"
                type="email"
                placeholder="you@example.com"
              />
            </Stack>
            <Stack gap="xs">
              <Label htmlFor="showcase-input-disabled">Disabled field</Label>
              <Input
                id="showcase-input-disabled"
                disabled
                placeholder="Disabled"
              />
            </Stack>
            <Stack gap="xs">
              <Label htmlFor="showcase-input-invalid">Password (invalid)</Label>
              <Input
                id="showcase-input-invalid"
                type="password"
                invalid={invalidDemo}
                aria-describedby="showcase-input-invalid-error"
                onChange={() => setInvalidDemo(false)}
              />
              {invalidDemo ? (
                <p
                  id="showcase-input-invalid-error"
                  className="text-xs text-error"
                >
                  Password must be at least 8 characters.
                </p>
              ) : null}
            </Stack>
            <Stack gap="xs">
              <Label htmlFor="showcase-select">Sort by</Label>
              <Select defaultValue="recent">
                <SelectTrigger id="showcase-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="rating">Highest rated</SelectItem>
                  <SelectItem value="title">Title, A to Z</SelectItem>
                </SelectContent>
              </Select>
            </Stack>
          </Grid>
          <Stack direction="row" gap="lg" wrap>
            <Stack direction="row" gap="xs" align="center">
              <Checkbox id="showcase-checkbox" defaultChecked />
              <Label htmlFor="showcase-checkbox">Remember me</Label>
            </Stack>
            <Stack direction="row" gap="xs" align="center">
              <Checkbox id="showcase-checkbox-disabled" disabled />
              <Label htmlFor="showcase-checkbox-disabled">
                Disabled option
              </Label>
            </Stack>
          </Stack>
          <RadioGroup defaultValue="swipe" aria-label="Onboarding path">
            <Stack direction="row" gap="xs" align="center">
              <RadioGroupItem id="showcase-radio-swipe" value="swipe" />
              <Label htmlFor="showcase-radio-swipe">Swipe to rate</Label>
            </Stack>
            <Stack direction="row" gap="xs" align="center">
              <RadioGroupItem id="showcase-radio-import" value="import" />
              <Label htmlFor="showcase-radio-import">
                Import from Letterboxd
              </Label>
            </Stack>
          </RadioGroup>
          <FormErrorSummary
            errors={[
              "Email is required.",
              "Password must be at least 8 characters.",
            ]}
          />
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">
            Card, skeleton, image fallback
          </h2>
          <Grid cols={3} gap="md">
            <Card>
              <CardHeader>
                <CardTitle>Blade Runner 2049</CardTitle>
                <CardDescription>Sci-fi · 2017 · 8.0</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageFallback
                  kind="poster"
                  label="Missing poster for Blade Runner 2049"
                  className="h-40 w-full"
                />
              </CardContent>
              <CardFooter>
                <Badge variant="accent">Recommended</Badge>
              </CardFooter>
            </Card>
            <CardSkeleton />
            <Card>
              <CardContent className="flex items-center gap-sm pt-lg">
                <ImageFallback
                  kind="avatar"
                  initials="AB"
                  label="Avatar for A. B."
                  className="size-12"
                />
                <div>
                  <p className="text-sm font-medium text-ink">Account avatar</p>
                  <p className="text-xs text-muted">Falls back to initials</p>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">
            Navigation: tabs, link
          </h2>
          <Tabs defaultValue="feed">
            <TabsList>
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="feed">
              Your personalized feed appears here.
            </TabsContent>
            <TabsContent value="search">
              Vibe search results appear here.
            </TabsContent>
            <TabsContent value="settings">
              Account and privacy settings.
            </TabsContent>
          </Tabs>
          <Stack direction="row" gap="lg">
            <Link href="#colors" variant="accent">
              Inline accent link
            </Link>
            <Link href="#colors" variant="nav">
              Nav style link
            </Link>
          </Stack>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">
            Dialog, toast, spinner, badge
          </h2>
          <Stack direction="row" gap="sm" wrap align="center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                  <DialogDescription>
                    This permanently removes your ratings, imports, and profile.
                    This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button variant="destructive">Delete account</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Saved",
                  description: "Your changes were saved.",
                  variant: "success",
                })
              }
            >
              Trigger success toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Something went wrong",
                  description: "Could not reach the server.",
                  variant: "error",
                })
              }
            >
              Trigger error toast
            </Button>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Skeleton className="h-8 w-24" />
            <Badge>Default</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="rating" className="gap-xxs">
              <Star className="size-3" aria-hidden="true" />
              7.8
            </Badge>
          </Stack>
        </section>

        <section id="mobile-shell" className="flex flex-col gap-md">
          <h2 className="text-xl font-medium text-ink">
            Mobile app shell: hero spotlight, chips, tab bar
          </h2>
          <p className="max-w-(--container-2xl) text-body">
            Spec 0007&apos;s three net new components. On the real onboarding
            and feed pages, `TabBar` is `fixed` to the viewport bottom; here it
            is pinned in place (`className=&quot;static&quot;`) so it sits
            inside the showcase flow instead of covering this page.
          </p>
          <div className="max-w-(--container-sm)">
            <HeroSpotlight
              title="Blade Runner 2049"
              releaseYear={2017}
              posterUrl={undefined}
              reason="Because you liked Arrival's slow burn sci-fi."
              action={
                <Stack direction="row" gap="sm" className="pt-xs">
                  <Button variant="secondary" size="sm">
                    Dislike
                  </Button>
                  <Button size="sm">Like</Button>
                </Stack>
              }
            />
          </div>
          <ChipGroup label="Categories demo">
            <Chip active>For You</Chip>
            <Chip>Trending</Chip>
            <Chip>Movies</Chip>
            <Chip>TV shows</Chip>
          </ChipGroup>
          <div className="max-w-(--container-sm) overflow-hidden rounded-lg border border-border">
            <TabBar className="static inset-auto">
              <TabBarItem
                href="#mobile-shell"
                label="Feed"
                icon={<Home className="size-5" aria-hidden="true" />}
              />
              <TabBarAction
                label="Account"
                icon={<User className="size-5" aria-hidden="true" />}
                action={() => {
                  toast({
                    title: "Sign out",
                    description: "Demo only, no session here.",
                  });
                }}
              />
            </TabBar>
          </div>
        </section>
      </Container>
    </div>
  );
}
