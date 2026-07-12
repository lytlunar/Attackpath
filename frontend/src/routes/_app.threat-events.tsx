import { createFileRoute } from "@tanstack/react-router";
import { useState, Fragment } from "react";
import { ChevronRight, ChevronDown, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";
import { AegisPathModel } from "../data/aegisPathModel";

export const Route = createFileRoute("/_app/threat-events")({
  component: ThreatEventsPage,
});

type Severity = "Critical" | "High" | "Medium" | "Low";

const nodeToMitreKey: Record<string, keyof typeof AegisPathModel.mitreMappings> = {
  USR_03: "USR_03",
  WST_02: "WST_02_dumping",
  SVC_01: "SVC_01_abuse",
  DC_01: "DC_01_escalation",
};

const sevTone: Record<string, string> = {
  Critical: "bg-danger/15 text-danger",
  High: "bg-orange/15 text-orange",
  Medium: "bg-[#eddc7a]/15 text-[#eddc7a]",
  Low: "bg-muted/15 text-muted",
};

function ThreatEventsPage() {
  const {
    scenarioState,
    replayStep,
    advanceReplay,
    restartReplay,
    isReplayPending,
    remediationApplied,
  } = useAegisPath();

  const [filter, setFilter] = useState<"All" | Severity>("All");
  const [open, setOpen] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeEvents = scenarioState?.activeEvents || [];

  const rows = activeEvents.map((evt) => {
    const mitreMapping = AegisPathModel.mitreMappings[nodeToMitreKey[evt.nodeId]];
    return {
      id: evt.id,
      severity: evt.severity as Severity,
      type:
        evt.id === "evt_001"
          ? "Initial Access"
          : evt.id === "evt_002"
            ? "Credential Dumping"
            : evt.id === "evt_003"
              ? "Lateral Movement"
              : "Domain Escalation",
      source: evt.sourceNodeId || evt.source,
      target: evt.targetNodeId || evt.nodeId,
      ts: `Jul 5, 2026 ${evt.timestamp.substring(11, 16)} UTC`,
      status: "Investigating" as const,
      detail: evt.message,
      mitreId: mitreMapping ? `${mitreMapping.technique} — ${mitreMapping.name}` : "Unknown",
    };
  });

  const filteredRows = rows.filter((e) => filter === "All" || e.severity === filter);

  const isCompleted = scenarioState?.replay.status === "Completed" || replayStep === 4;

  const handleNextAction = () => {
    if (isReplayPending) return;
    setErrorMsg(null);
    try {
      advanceReplay();
    } catch (err) {
      setErrorMsg("The replay action could not be completed. Please try again.");
    }
  };

  const handleRestart = async () => {
    if (isReplayPending) return;
    setErrorMsg(null);
    setOpen(null);
    try {
      await restartReplay();
    } catch (err) {
      setErrorMsg("The replay action could not be completed. Please try again.");
    }
  };

  const buttonText = isReplayPending
    ? replayStep === 0
      ? "Starting..."
      : "Processing..."
    : replayStep === 0
      ? "Process First Event"
      : "Process Next Event";

  return (
    <div className="space-y-4">
      {/* Replay Controller */}
      <div className="flex flex-col gap-3 rounded-xl border border-border-app bg-panel p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[11.5px] uppercase tracking-wider text-muted font-bold">
                Replay Status
              </span>
              <span className="text-[14px] font-semibold text-text" aria-live="polite">
                {scenarioState?.replay.status || "Loading"}
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
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={replayStep}
                aria-label="Replay Events Progress"
              >
                {replayStep} / 4 events
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCompleted && !remediationApplied && (
              <button
                disabled={isReplayPending}
                onClick={handleNextAction}
                className="rounded-md bg-teal px-4 py-2 text-[13px] font-semibold text-bg transition-colors hover:bg-teal/90 disabled:opacity-50"
              >
                {buttonText}
              </button>
            )}

            <button
              disabled={isReplayPending}
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-app bg-panel-2 px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:bg-border-app hover:text-text disabled:opacity-50"
              aria-label="Restart Replay"
            >
              <RotateCcw
                className={`h-4 w-4 ${isReplayPending && replayStep === 0 ? "animate-spin" : ""}`}
              />
              {isReplayPending && replayStep === 0 ? "Restarting..." : "Restart Replay"}
            </button>
          </div>
        </div>

        {errorMsg && <div className="text-[12.5px] font-medium text-danger">{errorMsg}</div>}
      </div>

      {/* Chokepoint Signal */}
      {replayStep >= 2 && !remediationApplied && (
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
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="text-[14px] font-semibold text-text">Awaiting replay</span>
                    <span className="text-[12px] text-muted">
                      Start the replay to process the first threat event and build the attack path
                      from observed evidence.
                    </span>
                    <span className="text-[11.5px] font-medium text-muted">
                      0 of 4 events processed
                    </span>
                  </div>
                </td>
              </tr>
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
                          <div>
                            <span className="font-semibold text-text">Details:</span> {r.detail}
                          </div>
                          <div>
                            <span className="font-semibold text-text">MITRE ATT&CK:</span>{" "}
                            <span className="font-mono text-teal">{r.mitreId}</span>
                          </div>
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
