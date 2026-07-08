import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Play, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAegisPath, METRICS_BEFORE, METRICS_AFTER, REMEDIATION_BUNDLE } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/risk-simulation")({
  component: RiskSimulationPage,
});

function RiskSimulationPage() {
  // ─── WRITE to global context ──────────────────────────────────────────
  const { remediationApplied, applyRemediation, resetRemediation, metrics, remediationTimestamp } = useAegisPath();

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-[12.5px] font-semibold transition-all duration-500 ${
        remediationApplied
          ? "border-green/40 bg-green/8 text-green"
          : "border-danger/40 bg-danger/8 text-danger"
      }`}>
        {remediationApplied
          ? <><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Remediation Bundle Applied · WST_02 → SVC_01 path severed · Path status: Disrupted</>
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
            {REMEDIATION_BUNDLE.map((item) => (
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
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border-app bg-panel-2 py-2.5 text-[13px] font-bold text-text ring-1 ring-border-app hover:bg-panel transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Reset Simulation
            </button>
          ) : (
            <button
              id="apply-remediation-btn"
              onClick={applyRemediation}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold text-bg transition-colors hover:brightness-110"
              style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
            >
              <Play className="h-4 w-4 fill-current" /> Apply Remediation Bundle
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
              max={500}
              tone={metrics.riskScore < 200 ? "green" : metrics.riskScore < 350 ? "orange" : "red"}
              suffix=""
            />
            <MetricBar
              label="Blast Radius"
              value={metrics.blastRadius}
              max={100}
              tone={metrics.blastRadius < 35 ? "green" : metrics.blastRadius < 60 ? "orange" : "red"}
              suffix="%"
            />
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Path Status</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                remediationApplied ? "bg-green/15 text-green" : "bg-danger/15 text-danger"
              }`}>
                {remediationApplied && <span className="h-1 w-1 rounded-full bg-green" />}
                {metrics.pathStatus}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[12.5px] text-muted">Risk Level</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                remediationApplied ? "bg-orange/15 text-orange" : "bg-danger/15 text-danger"
              }`}>
                {metrics.riskLevel}
              </span>
            </div>
            {remediationApplied && (
              <div className="fade-up flex items-center justify-between rounded-md border border-green/40 bg-green/10 p-3">
                <span className="text-[12.5px] font-semibold text-green">Security Gain</span>
                <span className="font-mono text-[18px] font-bold text-green">+{METRICS_AFTER.securityGain}</span>
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
                <th className="py-2 pr-4">Baseline (Before)</th>
                <th className="py-2 pr-4" />
                <th className="py-2">After Patch WST_02</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Risk Score", String(METRICS_BEFORE.riskScore), String(METRICS_AFTER.riskScore)],
                ["Blast Radius", `${METRICS_BEFORE.blastRadius}%`, `${METRICS_AFTER.blastRadius}%`],
                ["Path Status", METRICS_BEFORE.pathStatus, METRICS_AFTER.pathStatus],
                ["Risk Level", METRICS_BEFORE.riskLevel, METRICS_AFTER.riskLevel],
                ["Security Gain", "0", `+${METRICS_AFTER.securityGain}`],
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
  label, value, max, tone, suffix,
}: {
  label: string; value: number; max: number;
  tone: "red" | "orange" | "green"; suffix: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const bg = { red: "bg-danger", orange: "bg-orange", green: "bg-green" }[tone];
  const txt = { red: "text-danger", orange: "text-orange", green: "text-green" }[tone];
  return (
    <div className="rounded-md border border-border-app bg-bg/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-muted">{label}</span>
        <span className={`text-[22px] font-bold tabular-nums ${txt}`}>{value}{suffix}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-panel-2">
        <div className={`h-full transition-all duration-700 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
