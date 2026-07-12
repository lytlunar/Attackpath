import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Play, RotateCcw, CheckCircle2, AlertTriangle, AlertOctagon, Loader2 } from "lucide-react";
import { useAegisPath, REMEDIATION_BUNDLE } from "../context/AegisPathContext";
import type { RemediationPreview } from "../lib/types";

export const Route = createFileRoute("/_app/risk-simulation")({
  component: RiskSimulationPage,
});

function RiskSimulationPage() {
  // ─── READ/WRITE to global context ──────────────────────────────────────────
  const {
    remediationApplied, applyRemediation, resetRemediation, metrics,
    remediationTimestamp, isLoading, isError, error, previewRemediation
  } = useAegisPath();

  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    if (!remediationApplied && metrics.pathStatus !== "Loading") {
      let active = true;
      setIsPreviewLoading(true);
      previewRemediation("patch_wst_02").then(res => {
        if (active) {
          setPreview(res);
          setIsPreviewLoading(false);
        }
      }).catch(err => {
        if (active) {
          console.error("Preview failed:", err);
          setIsPreviewLoading(false);
        }
      });
      return () => { active = false; };
    } else if (remediationApplied) {
      setPreview(null);
    }
  }, [remediationApplied, previewRemediation, metrics.pathStatus]);


  // Fallback string values for preview while loading
  const projectedScore = isPreviewLoading || !preview ? "—" : preview.projectedScore.total;
  const projectedRadius = isPreviewLoading || !preview ? "—" : preview.projectedBlastRadius.percentage + "%";
  const projectedStatus = isPreviewLoading || !preview ? "Loading" : preview.pathStatusAfter;
  const projectedLevel = isPreviewLoading || !preview ? "Loading" : preview.projectedScore.label;
  const projectedGain = isPreviewLoading || !preview ? "—" : preview.securityGain;

  // The metrics for the "After Patch WST_02" column in the table should either be
  // the actual remediated metrics if applied, or the previewed metrics if not applied.
  const afterScore = remediationApplied ? String(metrics.riskScore) : String(projectedScore);
  const afterRadius = remediationApplied ? `${metrics.blastRadius}%` : String(projectedRadius);
  const afterStatus = remediationApplied ? metrics.pathStatus : projectedStatus;
  const afterLevel = remediationApplied ? metrics.riskLevel : projectedLevel;
  const afterGain = remediationApplied ? `+${metrics.securityGain}` : (projectedGain !== "—" ? `+${projectedGain}` : "—");

  return (
    <div className="space-y-4">
      {/* ERROR BANNER */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/8 px-4 py-3">
          <AlertOctagon className="h-4 w-4 text-danger flex-shrink-0" />
          <span className="text-[12.5px] font-semibold text-danger">
            Data Unavailable: The attack path model failed to load.
          </span>
          {error && <span className="ml-auto font-mono text-[11px] text-danger/70">{error.message}</span>}
        </div>
      )}
      
      {/* Status Banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-[12.5px] font-semibold transition-all duration-500 ${
        remediationApplied
          ? "border-green/40 bg-green/8 text-green"
          : "border-danger/40 bg-danger/8 text-danger"
      }`}>
        {remediationApplied
          ? <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Remediation applied to the simulated attack model · WST_02 → SVC_01 path severed · Path status: Disrupted</>
          : <><AlertTriangle className="h-4 w-4 flex-shrink-0" /> Simulation ready · Active path: USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01</>
        }
        {remediationApplied && remediationTimestamp && (
          <span className="ml-auto font-mono text-[11px] text-green/70">
            Applied at {new Date(remediationTimestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* ── Remediation Bundle ── */}
        <section className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">REMEDIATION BUNDLE</div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Apply Patch to WST_02</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            The following actions target the chokepoint WST_02 and disrupt the active lateral movement path.
          </p>

          <div className="mt-4 space-y-3">
            {REMEDIATION_BUNDLE.filter(i => i.id !== "patch_wst_02").map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-md border p-3 transition-all duration-300 ${
                  remediationApplied
                    ? "border-green/30 bg-green/5"
                    : "border-border-app bg-bg/60"
                }`}
              >
                <div className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  remediationApplied ? "border-green bg-green" : "border-border-app bg-panel-2"
                }`}>
                  {remediationApplied && <span className="text-[8px] font-bold text-bg">✓</span>}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text">{item.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{item.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Apply / Reset button */}
          {remediationApplied ? (
            <button
              id="reset-simulation-btn"
              onClick={resetRemediation}
              disabled={isLoading}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border-app bg-panel-2 py-2.5 text-[13px] font-bold text-text ring-1 ring-border-app transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-panel"}`}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} 
              Reset Simulation
            </button>
          ) : (
            <button
              id="apply-remediation-btn"
              onClick={applyRemediation}
              disabled={isLoading || isPreviewLoading}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold text-bg transition-colors ${isLoading || isPreviewLoading ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}`}
              style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />} 
              Apply to Attack Model
            </button>
          )}
        </section>

        {/* ── Live Metrics ── */}
        <section className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">LIVE METRICS</div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Projected Posture</h2>
          <div className="mt-4 space-y-4">
            <MetricBar
              label="Risk Score"
              value={metrics.riskScore}
              max={100}
              tone={metrics.riskScore < 40 ? "green" : metrics.riskScore < 70 ? "orange" : "red"}
              suffix=""
              isLoading={isLoading}
            />
            <MetricBar
              label="Blast Radius"
              value={metrics.blastRadius}
              max={100}
              tone={metrics.blastRadius < 35 ? "green" : metrics.blastRadius < 60 ? "orange" : "red"}
              suffix="%"
              isLoading={isLoading}
            />
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Path Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isLoading ? "bg-teal/15 text-teal" : remediationApplied ? "bg-green/15 text-green" : "bg-danger/15 text-danger"
              }`}>
                {!isLoading && remediationApplied && <span className="h-1 w-1 rounded-full bg-green" />}
                {isLoading ? "LOADING" : metrics.pathStatus}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Risk Level</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isLoading ? "bg-teal/15 text-teal" : remediationApplied ? "bg-orange/15 text-orange" : "bg-danger/15 text-danger"
              }`}>
                {isLoading ? "LOADING" : metrics.riskLevel}
              </span>
            </div>
            {remediationApplied && (
              <div className="fade-up flex items-center justify-between rounded-md border border-green/40 bg-green/10 p-3">
                <span className="text-[12.5px] font-semibold text-green">Security Gain</span>
                <span className="font-mono text-[18px] font-bold text-green">
                  {isLoading ? "—" : `+${metrics.securityGain}`}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ── Before / After Comparison ── */}
        <section className="rounded-xl border border-border-app bg-panel p-5 xl:col-span-2">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">BEFORE / AFTER COMPARISON</div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Impact Analysis — Patch WST_02</h2>
          <table className="mt-4 w-full text-left text-[12.5px]">
            <thead className="text-[10.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2 pr-4">{remediationApplied ? "Baseline (Before)" : "Current"}</th>
                <th className="py-2 pr-4" />
                <th className="py-2">After Patch WST_02</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Risk Score", isLoading ? "—" : String(metrics.riskScore), afterScore],
                ["Blast Radius", isLoading ? "—" : `${metrics.blastRadius}%`, afterRadius],
                ["Path Status", isLoading ? "Loading" : metrics.pathStatus, afterStatus],
                ["Risk Level", isLoading ? "Loading" : metrics.riskLevel, afterLevel],
                ["Security Gain", "0", afterGain],
              ].map(([k, a, b]) => (
                <tr key={k} className="border-t border-border-app">
                  <td className="py-2.5 pr-4 text-muted">{k}</td>
                  <td className={`py-2.5 pr-4 font-mono ${remediationApplied ? "text-muted line-through" : "font-bold text-danger"}`}>{a}</td>
                  <td className="py-2.5 pr-4 text-muted"><ChevronRight className="h-3 w-3" /></td>
                  <td className={`py-2.5 font-mono font-bold ${remediationApplied ? "text-green" : "text-muted"}`}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function MetricBar({
  label, value, max, tone, suffix, isLoading
}: {
  label: string; value: number; max: number;
  tone: "red" | "orange" | "green"; suffix: string; isLoading: boolean;
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
        <div className={`h-full transition-all duration-700 ${isLoading ? "bg-transparent" : bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
