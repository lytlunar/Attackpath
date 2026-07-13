import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, AlertTriangle, Play, RotateCcw, Loader2 } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/risk-simulation")({
  component: RiskSimulationPage,
});

const REMEDIATION_BUNDLE = [
  {
    id: "patch_wst_02",
    label: "Patch WST_02 (Primary)",
    description: "Apply emergency patch to mitigate credential caching vulnerability.",
  },
  {
    id: "rotate_svc_01",
    label: "Rotate SVC_01 Credentials",
    description: "Force immediate rotation and revocation of active service account sessions.",
  },
  {
    id: "isolate_srv_01",
    label: "Isolate SRV_01",
    description: "Network quarantine the pivot server pending forensic analysis.",
  },
];

function RiskSimulationPage() {
  const {
    canonicalResult: state,
    canonicalSessionInput,
    canonicalIsLoading: isLoading,
    applyCanonicalRemediation,
    resetCanonicalRemediation,
    processNextEvent,
  } = useAegisPath();

  const isRemediated = canonicalSessionInput.remediationActionId !== null;
  const eventCount = canonicalSessionInput.processedEventCount;

  const currentScore = state?.priorityScore.score || 0;
  const currentBand = state?.priorityScore.band || "Not Calculated";
  const currentBlastRadius = state?.blastRadius?.percentage || 0;
  const currentStatus = state?.pathStatus || "Awaiting Data";
  const securityGain = state?.securityGain || 0;

  const canApplyRemediation = eventCount > 1 && !isRemediated;
  const remediationTimestamp = state?.auditEntries?.find(e => e.action === "remediation_applied")?.timestamp;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-[13px] font-semibold transition-colors ${
          eventCount === 0
            ? "border-teal/40 bg-teal/10 text-teal"
            : isRemediated
              ? "border-green/40 bg-green/10 text-green"
              : "border-danger/40 bg-danger/10 text-danger"
        }`}
      >
        {isRemediated ? (
          <>
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Remediation applied to the simulated
            attack model — WST_02 → SVC_01 path severed — Path status: Disrupted
          </>
        ) : eventCount === 0 ? (
          <>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Ready for analysis — Start processing events to evaluate risk.
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Simulation ready — Critical attack path detected.
          </>
        )}
        {isRemediated && remediationTimestamp && (
          <span className="ml-auto font-mono text-[11px] text-green/70">
            Applied at {new Date(remediationTimestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Remediation Bundle */}
        <section className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">
            REMEDIATION BUNDLE
          </div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Apply Patch to WST_02</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            The following actions target the chokepoint WST_02 and disrupt the active lateral
            movement path.
          </p>

          <div className="mt-4 space-y-3">
            {REMEDIATION_BUNDLE.filter((i) => i.id !== "patch_wst_02").map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-md border p-3 transition-all duration-300 ${
                  isRemediated ? "border-green/30 bg-green/5" : "border-border-app bg-bg/60"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isRemediated ? "border-green bg-green" : "border-border-app bg-panel-2"
                  }`}
                >
                  {isRemediated && <span className="text-[8px] font-bold text-bg">✓</span>}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text">{item.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{item.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Apply / Reset button */}
          {eventCount === 0 ? (
            <button
              onClick={() => processNextEvent()}
              disabled={isLoading}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold text-bg transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
              style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              Start Analysis
            </button>
          ) : isRemediated ? (
            <button
              onClick={() => resetCanonicalRemediation()}
              disabled={isLoading}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border-app bg-panel-2 py-2.5 text-[13px] font-bold text-text ring-1 ring-border-app transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-panel"}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset Remediation
            </button>
          ) : canApplyRemediation ? (
            <button
              onClick={() => applyCanonicalRemediation("patch_wst_02")}
              disabled={isLoading}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold text-bg transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
              style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              Apply to Attack Model
            </button>
          ) : (
            <div className="mt-5 space-y-2">
              <button
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold opacity-40"
                style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
              >
                <Play className="h-4 w-4 fill-current" />
                Apply to Attack Model
              </button>
              <p className="text-center text-[11.5px] text-muted">
                Available after the WST_02 → SVC_01 chokepoint is detected.
              </p>
            </div>
          )}
        </section>

        {/* Live Metrics */}
        <section className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">LIVE METRICS</div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Projected Posture</h2>
          <div className="mt-4 space-y-4">
            <MetricBar
              label="Risk Score"
              value={currentScore}
              max={100}
              tone={currentScore < 40 ? "green" : currentScore < 70 ? "orange" : "red"}
              suffix=""
              isLoading={isLoading || eventCount === 0}
            />
            <MetricBar
              label="Asset Exposure Reach"
              value={currentBlastRadius}
              max={100}
              tone={
                currentBlastRadius < 35 ? "green" : currentBlastRadius < 60 ? "orange" : "red"
              }
              suffix="%"
              isLoading={isLoading || eventCount === 0}
            />
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Path Status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isLoading || eventCount === 0
                    ? "bg-teal/15 text-teal"
                    : isRemediated
                      ? "bg-green/15 text-green"
                      : "bg-danger/15 text-danger"
                }`}
              >
                {!isLoading && isRemediated && (
                  <span className="h-1 w-1 rounded-full bg-green" />
                )}
                {isLoading ? "LOADING" : eventCount === 0 ? "Awaiting Events" : currentStatus}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Risk Level</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isLoading || eventCount === 0
                    ? "bg-teal/15 text-teal"
                    : isRemediated
                      ? "bg-orange/15 text-orange"
                      : "bg-danger/15 text-danger"
                }`}
              >
                {isLoading ? "LOADING" : currentBand}
              </span>
            </div>
            {isRemediated ? (
               <div className="fade-up flex items-center justify-between rounded-md border border-green/40 bg-green/10 p-3">
                 <span className="text-[12.5px] font-semibold text-green">Security Gain</span>
                 <span className="font-mono text-[18px] font-bold text-green">
                   {isLoading ? "—" : `+${securityGain}`}
                 </span>
               </div>
             ) : (
               <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
                 <span className="text-[12.5px] font-semibold text-muted">Security Gain</span>
                 <span className="font-mono text-[18px] font-bold text-muted">{isLoading || eventCount === 0 ? "—" : "0"}</span>
               </div>
             )}
          </div>
        </section>

        {/* Factor Analysis */}
        <section className="rounded-xl border border-border-app bg-panel p-5 xl:col-span-2">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">
            ATTACK PATH PRIORITY SCORE BREAKDOWN
          </div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Factor Analysis</h2>
          {eventCount === 0 || isLoading ? (
            <div className="mt-4 p-4 text-center text-sm text-muted bg-panel-2 border border-border-app rounded-md">
              Awaiting data to perform factor analysis...
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {(state?.priorityScore?.factors || []).map(f => (
                   <div key={f.id} className="p-3 border border-border-app rounded-md bg-panel-2 flex flex-col justify-between">
                      <div className="text-[11px] font-semibold text-muted mb-1 leading-tight">{f.label}</div>
                      <div className="text-[18px] font-mono font-bold text-text">{f.contribution} <span className="text-[11px] text-muted font-sans font-normal">/ {f.weight}</span></div>
                   </div>
                ))}
              </div>
              {state?.priorityScore.limitations && state.priorityScore.limitations.length > 0 && (
                <div className="mt-4 p-3 bg-panel-2 border border-border-app rounded text-xs text-muted">
                   <div className="font-semibold text-text mb-2">Model Limitations:</div>
                   <ul className="list-disc pl-4 space-y-1">
                      {state.priorityScore.limitations.map((l, i) => (
                         <li key={i}>{l}</li>
                      ))}
                   </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  max,
  tone,
  suffix,
  isLoading,
}: {
  label: string;
  value: number;
  max: number;
  tone: "red" | "orange" | "green";
  suffix: string;
  isLoading: boolean;
}) {
  const pct = isLoading ? 0 : Math.min(100, (value / max) * 100);
  const bg = { red: "bg-danger", orange: "bg-orange", green: "bg-green" }[tone];
  const txt = { red: "text-danger", orange: "text-orange", green: "text-green" }[tone];
  return (
    <div className="rounded-md border border-border-app bg-bg/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <span className={`text-[22px] font-bold tabular-nums ${isLoading ? "text-muted" : txt}`}>
          {isLoading ? "—" : `${value}${suffix}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
        <div
          className={`h-full transition-all duration-700 ${isLoading ? "bg-transparent" : bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}