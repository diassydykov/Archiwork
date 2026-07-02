"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/context";
import { getProjectSheets } from "@/lib/ai/sheets";
import type { SheetTitleKey } from "@/lib/ai/sheets";
import { getSheetGenerationOrder, sortSheetsForDisplay } from "@/lib/ai/sheet-order";
import {
  downloadAllSheetsPdf,
  downloadSheetPdf,
  downloadSpecificationPdf,
  printAllSheets,
  printSheet,
  printSpecification,
  sheetFileName,
} from "@/lib/pdf/sheet-export";
import {
  getVectorFloorLevel,
  layoutHasFloor,
  layoutSummaryForPrompt,
  layoutToDesignLock,
} from "@/lib/layout/summary";
import { isVectorSheet } from "@/lib/layout/render-sheet";
import {
  clearResultCache,
  hydrateVectorSheets,
  loadResultCache,
  saveResultCache,
  vectorSheetsNeedHydration,
} from "@/lib/project/result-cache";
import type { BuildingLayout } from "@/lib/layout/schema";
import type { ProjectDetails, ProjectSheetResult } from "@/types";

export default function ProjectResultPage() {
  return (
    <AuthGuard>
      <ResultContent />
    </AuthGuard>
  );
}

function ResultContent() {
  const { t } = useI18n();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [specification, setSpecification] = useState("");
  const [sheets, setSheets] = useState<ProjectSheetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"spec" | "sheets" | "done">("spec");
  const [sheetProgress, setSheetProgress] = useState({ current: 0, total: 0 });
  const [currentSheetTitle, setCurrentSheetTitle] = useState("");
  const [error, setError] = useState("");
  const [designLock, setDesignLock] = useState("");
  const [exporting, setExporting] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<
    "grok-imagine" | "stability" | null
  >(null);
  const [buildingLayout, setBuildingLayout] = useState<BuildingLayout | null>(
    null
  );

  const projectTitle =
    project?.buildingType === "residential"
      ? t("residentialProject")
      : t("commercialProject");

  const pdfFooter = t("pdfFooter");

  const displaySheets = project
    ? sortSheetsForDisplay(sheets, getProjectSheets(project))
    : sheets;

  const generatePackage = useCallback(
    async (projectData: ProjectDetails) => {
      setLoading(true);
      setError("");
      setSpecification("");
      setSheets([]);
      setDesignLock("");
      setBuildingLayout(null);
      setFallbackNotice(null);
      setPhase("spec");

      const sheetDefs = getSheetGenerationOrder(getProjectSheets(projectData));
      setSheetProgress({ current: 0, total: sheetDefs.length });

      try {
        const specRes = await fetch("/api/project/spec", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(projectData),
        });
        const specData = await specRes.json();
        if (!specRes.ok) throw new Error(specData.error || t("generationError"));

        const spec = specData.specification as string;
        setSpecification(spec);

        const layoutRes = await fetch("/api/project/layout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project: projectData, specification: spec }),
        });
        const layoutData = await layoutRes.json();
        if (!layoutRes.ok) {
          throw new Error(layoutData.error || t("generationError"));
        }

        const layoutCache = layoutData.layout as BuildingLayout;
        setBuildingLayout(layoutCache);

        const lock = layoutToDesignLock(layoutCache, projectData.buildingType);
        setDesignLock(lock);

        const layoutSummary = layoutSummaryForPrompt(layoutCache);

        setPhase("sheets");

        const specSummary = spec.slice(0, 600);
        const results: ProjectSheetResult[] = [];
        let referenceImageId: string | undefined;

        for (let i = 0; i < sheetDefs.length; i++) {
          const sheet = sheetDefs[i];
          setSheetProgress({ current: i + 1, total: sheetDefs.length });

          const floorLevel = getVectorFloorLevel(sheet.id);
          const useVector = isVectorSheet(sheet.id) && (
            sheet.id === "site_plan_map"
              ? !!projectData.mapSnapshot
              : floorLevel === null
                ? true
                : layoutHasFloor(layoutCache, floorLevel)
          );

          setCurrentSheetTitle(
            useVector ? t("generatingVectorSheet") : t(sheet.titleKey)
          );

          try {
            if (useVector) {
              const res = await fetch("/api/project/vector-sheet", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  project: projectData,
                  specification: spec,
                  layout: layoutCache,
                  sheetId: sheet.id,
                  floorLevel: floorLevel ?? 1,
                  sheetTitle: t(sheet.titleKey),
                  projectTitle,
                  mapSnapshot: projectData.mapSnapshot,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || t("generationError"));

              results.push({
                id: sheet.id,
                titleKey: sheet.titleKey,
                image: data.image,
                provider: "vector",
              });
              continue;
            }

            const res = await fetch("/api/project/sheet", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                project: projectData,
                sheet,
                specSummary,
                designLock: lock,
                layoutSummary,
                referenceImageId,
              }),
            });
            const data = await res.json();

            if (!res.ok) {
              throw new Error(
                data.errorCode === "LEONARDO_NO_TOKENS"
                  ? t("leonardoNoTokens")
                  : data.errorCode === "CONTENT_MODERATION"
                    ? t("contentModerationBlocked")
                    : data.error || t("generationError")
              );
            }

            if (data.fallbackFromLeonardo) {
              const provider = data.fallbackProvider as
                | "grok-imagine"
                | "stability"
                | undefined;
              setFallbackNotice(provider ?? "grok-imagine");
            }

            if (data.referenceImageId) {
              referenceImageId = data.referenceImageId as string;
            }

            results.push({
              id: sheet.id,
              titleKey: sheet.titleKey,
              image: data.image,
              provider: data.provider,
            });
          } catch (sheetErr) {
            results.push({
              id: sheet.id,
              titleKey: sheet.titleKey,
              image: "",
              error:
                sheetErr instanceof Error
                  ? sheetErr.message
                  : t("generationError"),
            });
          }

          setSheets([...results]);
        }

        setPhase("done");
        saveResultCache({
          specification: spec,
          designLock: lock,
          layout: layoutCache,
          sheets: results,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("generationError"));
      } finally {
        setLoading(false);
      }
    },
    [t, projectTitle]
  );

  useEffect(() => {
    const raw = sessionStorage.getItem("archiwork-current-project");
    if (!raw) {
      router.replace("/dashboard");
      return;
    }

    const parsed = JSON.parse(raw) as ProjectDetails;
    setProject(parsed);

    const title =
      parsed.buildingType === "residential"
        ? t("residentialProject")
        : t("commercialProject");

    const cached = loadResultCache();
    if (cached) {
      setSpecification(cached.specification);
      if (cached.designLock) setDesignLock(cached.designLock);
      if (cached.layout) setBuildingLayout(cached.layout);
      setSheets(cached.sheets);
      setPhase("done");

      if (cached.layout && vectorSheetsNeedHydration(cached.sheets)) {
        setLoading(true);
        hydrateVectorSheets(
          parsed,
          cached.layout,
          cached.specification,
          cached.sheets,
          {
            projectTitle: title,
            sheetTitle: (key) => t(key),
            errorLabel: t("generationError"),
          }
        )
          .then((hydrated) => {
            setSheets(hydrated);
            saveResultCache({
              specification: cached.specification,
              designLock: cached.designLock ?? "",
              layout: cached.layout!,
              sheets: hydrated,
            });
          })
          .finally(() => setLoading(false));
      }
      return;
    }

    generatePackage(parsed);
  }, [router, generatePackage, t]);

  const handleDownloadAllPdf = async () => {
    if (!project) return;
    setExporting(true);
    try {
      await downloadSpecificationPdf({
        projectTitle,
        specification,
        fileName: sheetFileName(projectTitle, t("specification")),
        footer: pdfFooter,
      });

      const validSheets = sheets.filter((s) => s.image);
      await downloadAllSheetsPdf({
        projectTitle,
        sheets: validSheets.map((s) => ({
          title: t(s.titleKey as SheetTitleKey),
          imageSrc: s.image,
          fileName: sheetFileName(projectTitle, t(s.titleKey as SheetTitleKey)),
        })),
        footer: pdfFooter,
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePrintAll = () => {
    const validSheets = sheets
      .filter((s) => s.image)
      .map((s) => ({
        title: t(s.titleKey as SheetTitleKey),
        imageSrc: s.image,
      }));

    printAllSheets({
      projectTitle,
      sheets: validSheets,
      footer: pdfFooter,
    });
  };

  if (!project) return null;

  return (
    <div
      className="flex min-h-screen flex-col px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
        <Header showLogout />

        <main className="flex flex-1 flex-col gap-8 py-8">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {projectTitle}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("projectPackageDesc")}
            </p>
          </div>

          {loading && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                }}
              />
              {phase === "spec" && (
                <p style={{ color: "var(--text-primary)" }}>
                  {t("generatingSpec")}
                </p>
              )}
              {phase === "sheets" && (
                <>
                  <p style={{ color: "var(--text-primary)" }}>
                    {t("generatingSheet")}: {currentSheetTitle}
                  </p>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {sheetProgress.current} {t("generatingProgress")}{" "}
                    {sheetProgress.total}
                  </p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {t("generatingHint")}
                  </p>
                </>
              )}
            </div>
          )}

          {error && !loading && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="mb-4" style={{ color: "#dc2626" }}>
                {error}
              </p>
              <Button onClick={() => generatePackage(project)}>
                {t("retry")}
              </Button>
            </div>
          )}

          {project.latitude != null && project.longitude != null && (
            <SiteBindingSection project={project} />
          )}

          {specification && (
            <section
              className="animate-fade-in rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("specification")}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    label={t("downloadSpecPdf")}
                    disabled={exporting}
                    onClick={() =>
                      downloadSpecificationPdf({
                        projectTitle,
                        specification,
                        fileName: sheetFileName(projectTitle, t("specification")),
                        footer: pdfFooter,
                      })
                    }
                  />
                  <ActionButton
                    label={t("printSpec")}
                    onClick={() =>
                      printSpecification({
                        projectTitle,
                        specification,
                        specTitle: t("specification"),
                        footer: pdfFooter,
                      })
                    }
                  />
                </div>
              </div>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text-secondary)" }}
              >
                {specification}
              </div>
            </section>
          )}

          {designLock && (
            <section
              className="animate-fade-in rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <h2
                className="mb-3 text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {t("designLockTitle")}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {designLock}
              </p>
            </section>
          )}

          {sheets.length > 0 && (
            <section className="animate-slide-up">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("drawings")}
                </h2>
                {phase === "done" && (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label={exporting ? t("exportingPdf") : t("downloadAllPdf")}
                      disabled={exporting}
                      onClick={handleDownloadAllPdf}
                    />
                    <ActionButton
                      label={t("printAll")}
                      onClick={handlePrintAll}
                    />
                  </div>
                )}
              </div>
              {fallbackNotice && (
                <p
                  className="mb-4 rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: "var(--bg-accent)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {fallbackNotice === "grok-imagine"
                    ? t("grokImagineFallback")
                    : t("stabilityFallback")}
                </p>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {displaySheets.map((sheet) => (
                  <SheetCard
                    key={sheet.id}
                    sheet={sheet}
                    projectTitle={projectTitle}
                    footer={pdfFooter}
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}

          {phase === "done" && !loading && (
            <>
              <p
                className="rounded-lg px-4 py-3 text-xs leading-relaxed"
                style={{
                  backgroundColor: "var(--bg-accent)",
                  color: "var(--text-muted)",
                }}
              >
                {t("disclaimerBlueprint")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearResultCache();
                    router.push("/dashboard");
                  }}
                >
                  {t("newProject")}
                </Button>
                <Button
                  onClick={() => {
                    clearResultCache();
                    generatePackage(project);
                  }}
                >
                  {t("retry")}
                </Button>
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

function SheetImage({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-auto w-full bg-white" />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1024}
      height={1024}
      className="h-auto w-full bg-white"
      unoptimized
    />
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        backgroundColor: "var(--bg-accent)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}

function SiteBindingSection({ project }: { project: ProjectDetails }) {
  const { t } = useI18n();
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (project.mapSnapshot || project.latitude == null) return;
    let cancelled = false;
    setCapturing(true);
    (async () => {
      try {
        const { captureMapSnapshot } = await import(
          "@/lib/maps/capture-map-snapshot"
        );
        const snap = await captureMapSnapshot(
          project.latitude!,
          project.longitude!
        );
        if (!cancelled) setFallbackUrl(snap.dataUrl);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setCapturing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.latitude, project.longitude, project.mapSnapshot]);

  if (project.latitude == null || project.longitude == null) return null;

  const mapSrc =
    project.mapSnapshot ??
    fallbackUrl ??
    `/api/maps/static?lat=${project.latitude}&lng=${project.longitude}&width=800&height=400`;

  return (
    <section
      className="animate-fade-in rounded-2xl p-6 sm:p-8"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <h2
        className="mb-4 text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {t("siteBinding")}
      </h2>
      {project.location && (
        <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          {project.location}
        </p>
      )}
      {capturing && !project.mapSnapshot && !fallbackUrl ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("mapCapturing")}
        </p>
      ) : loadError && !project.mapSnapshot && !fallbackUrl ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("mapSnapshotError")}
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mapSrc}
          alt={t("siteBinding")}
          className="w-full rounded-xl bg-[#e5e7eb] min-h-[200px]"
          onError={() => setLoadError(true)}
        />
      )}
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {t("mapCoords")}: {project.latitude!.toFixed(6)},{" "}
        {project.longitude!.toFixed(6)}
      </p>
    </section>
  );
}

function SheetCard({
  sheet,
  projectTitle,
  footer,
  t,
}: {
  sheet: ProjectSheetResult;
  projectTitle: string;
  footer: string;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const title = t(sheet.titleKey as SheetTitleKey);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    if (!sheet.image) return;
    setBusy(true);
    try {
      await downloadSheetPdf({
        title,
        projectTitle,
        imageSrc: sheet.image,
        fileName: sheetFileName(projectTitle, title),
        footer,
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    if (!sheet.image) return;
    printSheet({ title, projectTitle, imageSrc: sheet.image, footer });
  };

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </span>
          {sheet.provider === "vector" && (
            <span
              className="text-xs"
              style={{ color: "var(--accent)" }}
            >
              {t("vectorSheetBadge")}
            </span>
          )}
        </div>
        {sheet.image && (
          <div className="flex gap-2">
            <ActionButton
              label={busy ? t("exportingPdf") : t("downloadPdf")}
              disabled={busy}
              onClick={handleDownload}
            />
            <ActionButton label={t("printSheet")} onClick={handlePrint} />
          </div>
        )}
      </div>
      {sheet.image ? (
        <SheetImage src={sheet.image} alt={title} />
      ) : (
        <div
          className="flex min-h-[200px] items-center justify-center p-6 text-sm"
          style={{ color: "#dc2626" }}
        >
          {sheet.error || "—"}
        </div>
      )}
    </div>
  );
}
