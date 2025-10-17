// -----------------------------------------------------------------------------
// FILE: src/components/forms/shell/form-shell.tsx
// TYPE: Server Component
// PURPOSE: Shared shell for Create/Edit forms. Mirrors PageShell spacing & cards
//          but without table/view tooling. Accepts slots for alerts & footer actions.
// -----------------------------------------------------------------------------

import * as React from "react";

// Public props kept small and stable so resource pages stay tiny
export type FormShellProps = {
  /** Top-left small page title (outside the header card) */
  title: string;
  /** Big header inside the header card */
  headerTitle: string;
  /** Optional description text under the header title */
  headerDescription?: string;
  /** Optional icon node shown on the left inside the header card */
  headerIcon?: React.ReactNode;

  /** Optional alert area rendered below the header card (e.g., error summary) */
  alertSlot?: React.ReactNode;

  /** Main body content (usually a generic FormIsland that renders sections/fields) */
  children: React.ReactNode;

  /** Footer actions rendered in a sticky footer card */
  actions?: {
    /** Primary action area on the right (e.g., <SubmitButton />) */
    primary?: React.ReactNode;
    /** Secondary actions on the left (e.g., <Button variant="outline">Cancel</Button>) */
    secondaryLeft?: React.ReactNode;
    /** Optional extra actions on the right beside primary (e.g., Save Draft) */
    secondaryRight?: React.ReactNode;
  };

  /**
   * When true, the footer card becomes sticky within the scroll container.
   * Defaults to true.
   */
  stickyFooter?: boolean;

  /**
   * Optional wrapper to constrain max width of the form content.
   * Defaults to `max-w-5xl`.
   */
  contentMaxWidthClassName?: string;
};

export default function FormShell({
  title,
  headerTitle,
  headerDescription,
  headerIcon,
  alertSlot,
  children,
  actions,
  stickyFooter = true,
  contentMaxWidthClassName = "max-w-5xl",
}: FormShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Outer page padding (matches PageShell) */}
      <div className="w-full p-4 sm:p-6">
        {/* Small page title above everything for parity with list pages */}
        <div className={`mx-auto mb-6 ${contentMaxWidthClassName}`}>
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">{title}</h1>
        </div>

        {/* Inner container to center the header + form content */}
        <div className={`mx-auto space-y-6 ${contentMaxWidthClassName}`}>
          {/* Header card */}
          <section aria-labelledby="form-header" className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="flex-shrink-0 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                {headerIcon ?? (
                  <svg
                    className="h-6 w-6 text-gray-600 dark:text-gray-200"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h2
                  id="form-header"
                  className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100"
                >
                  {headerTitle}
                </h2>
                {headerDescription ? (
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{headerDescription}</p>
                ) : null}
              </div>
            </div>
          </section>

          {/* Optional alert region (e.g., error summary) */}
          {alertSlot ? (
            <section aria-live="polite" className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
              {alertSlot}
            </section>
          ) : null}

          {/* Main content */}
          <section aria-label="Form Content" className="rounded-lg bg-white p-0 shadow-sm dark:bg-gray-800">
            {/* Consumers typically render section cards within the island. Keep this container clean. */}
            {children}
          </section>

          {/* Footer actions */}
          <FooterActions sticky={stickyFooter}>
            <div className="flex flex-1 flex-wrap items-center gap-2">{actions?.secondaryLeft}</div>
            <div className="flex flex-wrap items-center gap-2">
              {actions?.secondaryRight}
              {actions?.primary}
            </div>
          </FooterActions>
        </div>
      </div>
    </div>
  );
}

function FooterActions({ sticky, children }: { sticky: boolean; children: React.ReactNode }) {
  // Sticky footer that stays visible while scrolling the page content.
  // Uses `position: sticky` with a bottom offset. Tailwind doesn't ship `bottom-0` for sticky,
  // so we attach it inline.
  return (
    <footer
      className={[
        "rounded-lg bg-white shadow-sm dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        sticky ? "sticky" : "",
      ].join(" ")}
      style={sticky ? { bottom: 0 } : undefined}
      aria-label="Form Actions"
    >
      <div className="flex flex-col items-start justify-between gap-4 px-4 py-3 sm:flex-row sm:items-center">
        {children}
      </div>
    </footer>
  );
}
