import { createFileRoute } from "@tanstack/react-router";
import { useState, Fragment } from "react";
import { ChevronRight, ChevronDown, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/threat-events")({
  component: ThreatEventsPage,
});

type Severity = "Critical" | "High" | "Medium" | "Low";

const sevTone: Record<string, string> = {
  Critical: "bg-danger/15 text-danger",
  High: "bg-orange/15 text-orange",
  Medium: "bg-[#eddc7a]/15 text-[#eddc7a]",
  Low: "bg-muted/15 text-muted",
};

function ThreatEventsPage() {
  const {
    canonicalResult: state,
    canonicalIsLoading: isPending,
    canonicalError: error,
    canonicalSessionInput,
    processNextEvent,
    processAllEvents,
    resetAnalysis,
    canProcessNext,
  } = useAegisPath();

  const [filter, setFilter] = useState<"All" | Severity>("All");
  const [open, setOpen] = useState<number | null>(null);

  const eventCount = canonicalSessionInput.processedEventCount;
  const isCompleted = !canProcessNext;
  const remediationApplied = canonicalSessionInput.remediationActionId !== null;

  const detections = state?.detections || [];
  const rejectedEvents = state?.auditEntries?.filter(a => a.action === "validation_failed") || []; // Wait, the backend doesn't store rejected in auditEntries maybe? Ah, canonicalEngine returns activeDetections and rejectedEvents? No, wait. Did the canonicalResult have rejectedEvents? Let me check canonicalEngine.ts...

  // Wait, I should not assume canonicalResult has rejectedEvents unless I check. For now, I'll map from state.
  const rows = detections.map((d) => ({
    id: d.id,
    severity: (d.severity.charAt(0).toUpperCase() + d.severity.slice(1)) as Severity,
    type: d.title,
    source: d.graphHints?.sourceEntityId || "Unknown",
    target: d.graphHints?.targetEntityId || "Unknown",
    ts: "Synthetic Mode",
    status: "Investigating" as const,
    detail: d.description,
    mitreId: `${d.mitre.techniques.map((t: any) => t.id).join(", ")} — ${d.mitre.tactic.name}`,
    evidence: d.evidence,
    confidence: d.confidenceScore,
  }));

  const filteredRows = rows.filter((e) => filter === "All" || e.severity === filter);

  const buttonText = isPending
    ? "Processing..."
    : eventCount === 0
      ? "Process First Event"
      : "Process Next Event";

  return (
    <div className="space-y-4">
      {/* Controller */}
      <div className="flex flex-col gap-3 rounded-xl border border-border-app bg-panel p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[11.5px] uppercase tracking-wider text-muted font-bold">
                Analysis Pipeline
              </span>
              <span className="text-[14px] font-semibold text-text" aria-live="polite">
                {isCompleted ? "Ingestion Complete" : "Awaiting Events"}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-border-app" />
            <div className="flex flex-col">
              <span className="text-[11.5px] uppercase tracking-wider text-muted font-bold">
                Progress
              </span>
              <span
                className="text-[14px] font-mono text-text"
                role="progressbar"
              >
                {eventCount} / 4 events
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && !remediationApplied && (
              <>
                <button
                  disabled={isPending}
                  onClick={processNextEvent}
                  className="rounded-md bg-teal px-4 py-2 text-[13px] font-semibold text-bg transition-colors hover:bg-teal/90 disabled:opacity-50"
                >
                  {buttonText}
                </button>
                <button
                  disabled={isPending}
                  onClick={processAllEvents}
                  className="rounded-md border border-teal/50 bg-teal/10 px-4 py-2 text-[13px] font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-50"
                >
                  Process All
                </button>
              </>
            )}

            <button
              disabled={isPending}
              onClick={resetAnalysis}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-app bg-panel-2 px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-border-app hover:text-text disabled:opacity-50"
            >
              <RotateCcw
                className={`h-4 w-4 ${isPending && eventCount === 0 ? "animate-spin" : ""}`}
              />
              Reset Analysis
            </button>
          </div>
        </div>

        {error && <div className="text-[12.5px] font-medium text-danger">{error.message}</div>}
      </div>

      {/* Chokepoint Signal */}
      {eventCount >= 2 && !remediationApplied && (
        <div className="flex items-center gap-2 rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-[13px] text-orange">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">Chokepoint detected:</span> WST_02 → SVC_01
        </div>
      )}
      {remediationApplied && (
        <div className="flex items-center gap-2 rounded-lg border border-green/20 bg-green/10 px-4 py-3 text-[13px] text-green">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-semibold">Chokepoint disrupted:</span> WST_02 → SVC_01 is protected.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["All", "Critical", "High", "Medium"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              filter === f
                ? "border-teal/60 bg-teal/10 text-teal"
                : "border-border-app bg-panel text-muted hover:bg-panel-2"
            }`}
          >
            {f}
          </button>
        ))}
        <div className="ml-auto text-[11.5px] font-medium text-muted">
          {filteredRows.length} active events
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border-app bg-panel">
        <table className="w-full text-left text-[12.5px]">
          <thead className="bg-panel-2 text-[10.5px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              eventCount === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="text-[14px] font-semibold text-text">Awaiting Analysis</span>
                      <span className="text-[12px] text-muted">
                        Start processing events to build the active attack path from observed evidence.
                      </span>
                      <span className="text-[11.5px] font-medium text-muted">
                        0 of 4 events processed
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    {filter !== "All"
                      ? `No threat events match severity filter: ${filter}`
                      : "No threat events generated from processed events."}
                  </td>
                </tr>
              )
            ) : (
              filteredRows.map((r, i) => {
                const isOpen = open === i;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-border-app hover:bg-panel-2/60">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevTone[r.severity] || sevTone.Low}`}
                        >
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text">{r.type}</td>
                      <td className="px-4 py-3 font-mono text-muted">{r.source}</td>
                      <td className="px-4 py-3 font-mono text-muted">{r.target}</td>
                      <td className="px-4 py-3 font-mono text-muted">{r.ts}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-text">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${r.status === "Open" ? "bg-danger" : r.status === "Investigating" ? "bg-orange" : "bg-green"}`}
                          />
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setOpen(isOpen ? null : i)}
                          className="text-muted hover:text-text"
                          aria-label="Toggle details"
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-bg/60">
                        <td
                          colSpan={7}
                          className="border-t border-border-app px-4 py-4 text-[12px] text-muted space-y-2 text-left"
                        >
                          <div className="flex gap-6">
                            <div className="flex-1 space-y-2">
                              <div>
                                <span className="font-semibold text-text">Details:</span> {r.detail}
                              </div>
                              <div>
                                <span className="font-semibold text-text">MITRE ATT&CK:</span>{" "}
                                <span className="font-mono text-teal">{r.mitreId}</span>
                              </div>
                            </div>
                            {r.confidence && (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted mb-1">Confidence Score</span>
                                <div className="text-[24px] font-mono text-teal font-bold">{r.confidence}</div>
                              </div>
                            )}
                          </div>
                          {r.evidence && (
                            <div className="mt-3 border-t border-border-app/40 pt-3">
                              <span className="font-semibold text-text text-[11px] uppercase tracking-wider">Detection Evidence:</span>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(r.evidence as any[]).map((ev, idx) => (
                                  <div key={idx} className="bg-panel rounded border border-border-app p-2 text-[11px]">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-text uppercase tracking-wider">{ev.label}</span>
                                      <span className="font-mono text-muted/70">{ev.fieldPath}</span>
                                    </div>
                                    <div className="font-mono text-teal break-all">{String(ev.value)}</div>
                                    {ev.sourceEventId && (
                                      <div className="text-muted mt-1">Source Event: <span className="font-mono">{ev.sourceEventId}</span></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
