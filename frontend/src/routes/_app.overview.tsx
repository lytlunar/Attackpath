import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  Radar,
  Activity,
  Wrench,
  User,
  Monitor,
  Cog,
  Server,
  Building2,
  Crown,
  Play,
  RotateCcw,
  LayoutGrid,
  FileText,
  ChevronLeft,
  ChevronRight as CR,
} from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/overview")({
  component: OverviewPage,
});

type NodeId = "USR_03" | "WST_02" | "SVC_01" | "SRV_01" | "DC_01";

const NODE_TIPS: Record<NodeId, string> = {
  USR_03: "Compromised domain user credentials. Entry point. MITRE: T1078",
  WST_02: "Primary chokepoint. LSASS credential cache. MITRE: T1068, T1003",
  SVC_01: "High-privilege service account. MITRE: T1078",
  SRV_01: "Lateral movement pivot. MITRE: T1021",
  DC_01: "Crown jewel. Full domain compromise if reached.",
};

function useCountTo(target: number, duration = 1200) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const from = fromRef.current;
    prevTarget.current = target;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(from + (target - from) * eased);
      setValue(current);
      fromRef.current = current;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

function OverviewPage() {
  const {
    canonicalResult: state,
    canonicalIsLoading: isLoading,
    canonicalIsError: isError,
    canonicalError: error,
    canonicalSessionInput,
    applyCanonicalRemediation,
    resetCanonicalRemediation,
    processNextEvent,
  } = useAegisPath();

  const isRemediated = canonicalSessionInput.remediationActionId !== null;
  const eventCount = canonicalSessionInput.processedEventCount;

  const currentScore = state?.priorityScore.score || 0;
  const currentBand = state?.priorityScore.band || "Not Calculated";
  const currentReach = state?.blastRadius?.percentage || 0;
  const currentStatus = state?.pathStatus || "Awaiting Analysis";
  const currentGain = state?.securityGain || 0;

  const riskScore = useCountTo(currentScore);
  const blastRadius = useCountTo(currentReach);

  return (
    <div className="space-y-6">
      {/* ERROR BANNER */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/8 px-4 py-3">
          <AlertOctagon className="h-4 w-4 text-danger flex-shrink-0" />
          <span className="text-[12.5px] font-semibold text-danger">
            Data Unavailable: The attack path model failed to load.
          </span>
          {error && (
            <span className="ml-auto font-mono text-[11px] text-danger/70">{error.message}</span>
          )}
        </div>
      )}
      {/* ALERT BANNER */}
      {!isLoading && !isError && state && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
            isRemediated
              ? "border-green/40 bg-green/8 text-green"
              : eventCount === 0
                ? "border-teal/40 bg-teal/8 text-teal"
                : "border-danger/40 bg-danger/8 text-danger"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full flex-shrink-0 ${
              isRemediated ? "bg-green" : eventCount === 0 ? "bg-teal" : "bg-danger live-dot"
            }`}
          />
          <span className="text-[12.5px] font-semibold">
            {isRemediated
              ? "Critical route disrupted — exposure reduced"
              : eventCount === 0
                ? "Ready for analysis — no events processed"
                : "Critical attack path detected"}
          </span>
          <span
            className={`ml-auto font-mono text-[11px] ${isRemediated ? "text-green/70" : "text-muted"}`}
          >
            {isRemediated
              ? "Path: Disrupted"
              : eventCount === 0
                ? "Awaiting initial event"
                : `Active edges: ${state.activeGraph?.edges?.length || 0}`}
          </span>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Risk Score */}
        <MetricCard
          tint={isRemediated ? "green" : "red"}
          label="ATTACK PATH PRIORITY SCORE"
          value={
            isLoading ? (
              <span className="text-[42px] leading-none font-bold text-muted">—</span>
            ) : eventCount === 0 ? (
              <span className="text-[42px] leading-none font-bold text-muted">—</span>
            ) : (
              <span
                className={`text-[42px] leading-none font-bold tabular-nums ${isRemediated ? "text-green" : "text-danger"}`}
              >
                {riskScore}
              </span>
            )
          }
          badge={
            isLoading ? (
              <Pill tone="teal">Loading</Pill>
            ) : eventCount === 0 ? (
              <Pill tone="teal">None</Pill>
            ) : isRemediated ? (
              <Pill tone="orange">{currentBand}</Pill>
            ) : (
              <Pill tone="red">{currentBand}</Pill>
            )
          }
          icon={
            <AlertOctagon
              className={`h-6 w-6 ${isRemediated ? "text-green" : "text-danger"}`}
            />
          }
          subtitle={isRemediated ? "Risk reduced" : "Active path risk"}
          progress={{
            value: isLoading || isError ? 0 : currentScore,
            tone: isRemediated ? "green" : "red",
          }}
          delay={0}
        />

        {/* Blast Radius */}
        <MetricCard
          tint={isRemediated ? "green" : "red"}
          label="ASSET EXPOSURE REACH"
          value={
            isLoading || eventCount === 0 ? (
              <span className="text-[42px] leading-none font-bold text-muted">—</span>
            ) : (
              <span
                className={`text-[42px] leading-none font-bold tabular-nums ${isRemediated ? "text-green" : "text-danger"}`}
              >
                {blastRadius}%
              </span>
            )
          }
          icon={
            <Radar className={`h-6 w-6 ${isRemediated ? "text-green" : "text-danger"}`} />
          }
          subtitle="Downstream entities reachable"
          progress={{
            value: isLoading || isError ? 0 : blastRadius,
            tone: isRemediated ? "green" : "red",
          }}
          delay={80}
        />

        {/* Path Status */}
        <MetricCard
          tint={isRemediated ? "green" : "red"}
          label="PATH STATUS"
          value={
            <div className="flex items-center gap-2">
              <span
                className={`text-[32px] leading-none font-bold ${isRemediated ? "text-green" : isLoading ? "text-muted" : "text-danger"}`}
              >
                {isLoading ? "—" : currentStatus}
              </span>
              {isLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">
                  LOADING
                </span>
              ) : isRemediated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> SECURED
                </span>
              ) : eventCount === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-teal">
                  AWAITING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-danger">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger live-dot" /> LIVE
                </span>
              )}
            </div>
          }
          icon={
            <svg viewBox="0 0 46 24" className="h-6 w-[46px]">
              <polyline
                points="0,12 8,12 12,4 16,20 20,8 24,16 28,12 46,12"
                fill="none"
                stroke={isLoading || eventCount === 0 ? "currentColor" : isRemediated ? "#32B86A" : "#D93A46"}
                strokeWidth="1.6"
                className={isLoading || eventCount === 0 ? "text-muted" : ""}
              />
            </svg>
          }
          subtitle={<span className="font-mono text-[12px] text-muted">Analysis Engine</span>}
          delay={160}
        />

        {/* Security Gain / Primary Fix */}
        <MetricCard
          tint="green"
          label={isRemediated ? "SECURITY GAIN" : "PRIMARY REMEDIATION"}
          value={
            isLoading || eventCount === 0 ? (
              <span className="text-[42px] leading-none font-bold text-muted">—</span>
            ) : isRemediated ? (
              <span className="text-[42px] leading-none font-bold text-green tabular-nums">
                +{currentGain}
              </span>
            ) : (
              <span className="whitespace-nowrap text-[28px] leading-none font-bold text-green">
                Patch WST_02
              </span>
            )
          }
          icon={<Wrench className="h-6 w-6 text-green" />}
          subtitle={
            isLoading || eventCount === 0 ? (
              <span className="text-muted">Not Available</span>
            ) : isRemediated ? (
              <span className="text-green font-semibold">Remediation applied</span>
            ) : (
              <span className="text-muted">Available to apply</span>
            )
          }
          delay={240}
        />
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_1fr]">
        <AttackPathPanel
          isRemediated={isRemediated}
          state={state}
        />
        <PlaybookPanel
          isRemediated={isRemediated}
          onApply={() => applyCanonicalRemediation("patch_wst_02")}
          onReset={resetCanonicalRemediation}
          onStart={processNextEvent}
          isLoading={isLoading}
          eventCount={eventCount}
          metrics={{
            riskScore: currentScore,
            blastRadius: currentReach,
            riskLevel: currentBand,
            pathStatus: currentStatus,
            securityGain: currentGain,
          }}
        />
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MitrePanel activeDetections={state?.activeDetections || []} />
        <EvidencePanel activeDetections={state?.activeDetections || []} />
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

function Pill({
  tone,
  children,
}: {
  tone: "red" | "orange" | "green" | "teal";
  children: React.ReactNode;
}) {
  const map = {
    red: "bg-danger/15 text-danger",
    orange: "bg-orange/15 text-orange",
    green: "bg-green/15 text-green",
    teal: "bg-teal/15 text-teal",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  tint,
  label,
  value,
  icon,
  subtitle,
  progress,
  badge,
  delay = 0,
}: {
  tint: "red" | "teal" | "green" | "orange";
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtitle: React.ReactNode;
  progress?: { value: number; tone: "red" | "teal" | "green" };
  badge?: React.ReactNode;
  delay?: number;
}) {
  const tintMap = {
    red: "border-danger/40 bg-[radial-gradient(circle_at_top_right,rgba(239,91,108,0.14),transparent_60%)] shadow-[0_0_0_1px_rgba(239,91,108,0.15),0_10px_40px_-20px_rgba(239,91,108,0.6)]",
    teal: "border-teal/40 bg-[radial-gradient(circle_at_top_right,rgba(54,194,180,0.12),transparent_60%)]",
    green:
      "border-green/40 bg-[radial-gradient(circle_at_top_right,rgba(61,220,151,0.12),transparent_60%)]",
    orange:
      "border-orange/40 bg-[radial-gradient(circle_at_top_right,rgba(246,180,75,0.12),transparent_60%)]",
  };
  const progTone = { red: "bg-danger", teal: "bg-teal", green: "bg-green" };
  return (
    <div
      className={`fade-up relative overflow-hidden rounded-xl border ${tintMap[tint]} bg-panel p-4 transition-all duration-500`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold tracking-[0.18em] text-muted">{label}</div>
        <div className="opacity-90">{icon}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {value}
        {badge}
      </div>
      <div className="mt-1 text-[12px] text-muted">{subtitle}</div>
      {progress && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-panel-2">
          <div
            className={`h-full rounded-full ${progTone[progress.tone]} transition-all duration-700`}
            style={{ width: `${progress.value}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- attack path ---------- */

function AttackPathPanel({
  isRemediated,
  state,
}: {
  isRemediated: boolean;
  state?: import("../lib/canonicalEngine").CanonicalAnalysisResult;
}) {
  const nodes: {
    id: NodeId;
    label: string;
    icon: React.ReactNode;
    tint: string;
  }[] = [
    {
      id: "USR_03",
      label: "User Identity",
      icon: <User className="h-5 w-5 text-blue" />,
      tint: "bg-blue/15 border-blue/40",
    },
    {
      id: "WST_02",
      label: "Workstation",
      icon: <Monitor className="h-5 w-5 text-danger" />,
      tint: "bg-danger/15 border-danger/50 pulse-glow-red",
    },
    {
      id: "SVC_01",
      label: "Service Account",
      icon: <Cog className="h-5 w-5 text-teal" />,
      tint: "bg-teal/15 border-teal/40",
    },
    {
      id: "SRV_01",
      label: "Server",
      icon: <Server className="h-5 w-5 text-orange" />,
      tint: "bg-orange/15 border-orange/40",
    },
    {
      id: "DC_01",
      label: "Domain Controller",
      icon: <Building2 className="h-5 w-5 text-orange" />,
      tint: "bg-orange/15 border-gold/50 shadow-[0_0_24px_-6px_rgba(244,201,93,0.7)]",
    },
  ];

  const hasEdge = (src: string, tgt: string) => {
    return state?.activeGraph?.edges?.some(e => e.source === src && e.target === tgt) || false;
  };

  return (
    <section
      className="fade-up rounded-xl border border-border-app bg-panel p-5"
      style={{ animationDelay: "320ms" }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">
            ATTACK PATH
          </div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Attack Path Topology</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${isRemediated ? "bg-green/15 text-green" : (state?.activeGraph?.edges?.length || 0) === 0 ? "bg-teal/15 text-teal" : "bg-danger/15 text-danger"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isRemediated ? "bg-green" : (state?.activeGraph?.edges?.length || 0) === 0 ? "bg-teal" : "bg-danger live-dot"}`}
          />
          {isRemediated ? "Disrupted" : (state?.activeGraph?.edges?.length || 0) === 0 ? "Awaiting Events" : "Live"}
        </span>
      </div>

      <div className="relative rounded-lg border border-border-app bg-bg/60 p-6 overflow-hidden">
        {state && (
          <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ zIndex: 0 }}>
            {(state.contextGraph?.edges ?? []).map((edge) => {
              const nodeIndices: Record<string, number> = { "USR_03": 0, "WST_02": 1, "SVC_01": 2, "SRV_01": 3, "DC_01": 4 };
              const srcIdx = nodeIndices[edge.source];
              const tgtIdx = nodeIndices[edge.target];
              if (srcIdx === undefined || tgtIdx === undefined) return null;

              const getX = (idx: number) => `${10 + (idx * 20)}%`;
              const isActive = hasEdge(edge.source, edge.target);

              return (
                <line
                  key={edge.id}
                  x1={getX(srcIdx)}
                  y1="50%"
                  x2={getX(tgtIdx)}
                  y2="50%"
                  stroke={isActive ? "#ef5b6c" : "#232A46"}
                  strokeWidth={isActive ? "2" : "1"}
                  strokeDasharray={isActive ? "6 4" : "4 4"}
                />
              );
            })}
          </svg>
        )}
        <div className="relative flex items-stretch justify-between gap-1 z-10">
          {nodes.map((n, i) => {
            const inContext = state ? (state.contextGraph?.nodes ?? []).some(cn => cn.id === n.id) : true;
            const inActive = state ? (state.activeGraph?.nodes ?? []).some(an => an.id === n.id) : false;
            const muted = !inActive && state && (state.activeGraph?.edges?.length || 0) > 0;

            return (
              <div key={n.id} className={`flex ${i < nodes.length - 1 ? 'flex-1' : ''} items-center`}>
                <NodeBubble node={{ ...n, muted: muted as boolean }} />
                {i < nodes.length - 1 && (
                  <div className="flex-1 mx-1 opacity-0">
                    <div className="h-2 w-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NodeBubble({
  node,
}: {
  node: {
    id: NodeId;
    label: string;
    icon: React.ReactNode;
    tint: string;
    muted?: boolean;
  };
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`group relative flex flex-col items-center gap-2 transition-all duration-500 hover:scale-105 ${node.muted ? "opacity-40 grayscale" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${node.tint}`}
      >
        {node.id === "WST_02" && !node.muted && (
          <span className="ring-pulse absolute inset-0 rounded-full" />
        )}
        {node.icon}
      </div>
      <div className="text-center">
        <div className="font-mono text-[12px] font-bold text-text">{node.id}</div>
        <div className="text-[10px] text-muted">{node.label}</div>
      </div>
      {hover && (
        <div className="absolute top-full z-20 mt-1 w-56 rounded-md border border-border-app bg-panel-2 p-2 text-[11px] leading-snug text-text shadow-lg">
          {NODE_TIPS[node.id]}
        </div>
      )}
    </div>
  );
}

/* ---------- playbook ---------- */

function PlaybookPanel({
  isRemediated,
  onApply,
  onReset,
  onStart,
  isLoading,
  eventCount,
  metrics,
}: {
  isRemediated: boolean;
  onApply: () => void;
  onReset: () => void;
  onStart: () => void;
  isLoading: boolean;
  eventCount: number;
  metrics: {
    riskScore: number;
    blastRadius: number | string;
    riskLevel: string;
    pathStatus: string;
    securityGain: number;
  };
}) {
  return (
    <section
      className="fade-up rounded-xl border border-green/30 bg-panel p-5 shadow-[0_0_0_1px_rgba(61,220,151,0.12)]"
      style={{ animationDelay: "400ms" }}
    >
      <div className="text-[10px] font-bold tracking-[0.18em] text-muted">PLAYBOOK</div>
      <h3 className="mt-1 text-[16px] font-bold text-text">Recommended Remediation</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        Patch <strong className="text-text">WST_02</strong> to eliminate the privileged access pivot
        into SVC_01 and prevent progression toward DC_01.
      </p>

      <div className="mt-4 rounded-lg border border-border-app bg-bg/60 p-3">
        <div className="mb-2 text-[10px] font-bold tracking-[0.18em] text-muted">
          CURRENT POSTURE
        </div>
        <ImpactRow
          label="Risk Score"
          before={
            isLoading || eventCount === 0 ? (
              <span className="text-muted">—</span>
            ) : (
              <span
                className={`font-mono text-[13px] ${isRemediated ? "text-green font-bold" : "text-danger font-bold"}`}
              >
                {metrics.riskScore}
              </span>
            )
          }
        />
        <ImpactRow
          label="Asset Exposure Reach"
          before={
            isLoading || eventCount === 0 ? (
              <span className="text-muted">—</span>
            ) : (
              <span
                className={`font-mono text-[13px] ${isRemediated ? "text-green font-bold" : "text-danger font-bold"}`}
              >
                {metrics.blastRadius}%
              </span>
            )
          }
        />
        <ImpactRow
          label="Path Status"
          before={
            isLoading ? (
              <Pill tone="teal">Loading</Pill>
            ) : isRemediated ? (
              <Pill tone="teal">{metrics.pathStatus}</Pill>
            ) : eventCount === 0 ? (
              <Pill tone="teal">{metrics.pathStatus}</Pill>
            ) : (
              <Pill tone="red">{metrics.pathStatus}</Pill>
            )
          }
        />
        <ImpactRow
          label="Risk Level"
          before={
            isLoading || eventCount === 0 ? (
              <Pill tone="teal">Not Calculated</Pill>
            ) : isRemediated ? (
              <Pill tone="orange">{metrics.riskLevel}</Pill>
            ) : (
              <Pill tone="red">{metrics.riskLevel}</Pill>
            )
          }
        />
      </div>

      {isRemediated && (
        <div className="fade-up mt-3 flex items-center justify-center gap-2 rounded-md border border-green/40 bg-green/10 py-2 text-[13px] font-bold text-green">
          +{metrics.securityGain} Security Gain
        </div>
      )}

      {eventCount === 0 ? (
        <button
          onClick={onStart}
          style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold transition-colors hover:brightness-110"
        >
          <Play className="h-4 w-4 fill-current" /> Start Analysis
        </button>
      ) : isRemediated ? (
        <button
          onClick={onReset}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-panel-2 py-2.5 text-[13px] font-bold text-text ring-1 ring-border-app transition-colors hover:bg-panel"
        >
          <RotateCcw className="h-4 w-4" /> Reset Remediation
        </button>
      ) : eventCount > 1 ? (
        <button
          onClick={onApply}
          style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold transition-colors hover:brightness-110"
        >
          <Play className="h-4 w-4 fill-current" /> Apply to Attack Model
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <button
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold opacity-40"
            style={{ backgroundColor: "#248A52", color: "#F4F1FA" }}
          >
            <Play className="h-4 w-4 fill-current" /> Apply to Attack Model
          </button>
          <p className="text-center text-[11px] text-muted">
            More context required
          </p>
        </div>
      )}
    </section>
  );
}

function ImpactRow({ label, before }: { label: string; before: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-app/60 py-1.5 last:border-b-0">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-2">{before}</div>
    </div>
  );
}

/* ---------- bottom ---------- */

function MitrePanel({
  activeDetections,
}: {
  activeDetections: any[];
}) {
  const activeTechniques = Array.from(new Set(activeDetections.map((d) => d.mitreTechniqueId)));

  return (
    <section
      className="fade-up rounded-xl border border-border-app bg-panel p-5"
      style={{ animationDelay: "480ms" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-teal" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-muted">MITRE COVERAGE</span>
        </div>
        <span className="text-[11px] text-muted">
          Observed Techniques
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {activeTechniques.length > 0 ? (
          activeTechniques.map((id) => (
            <div
              key={id}
              className="rounded-lg border border-border-app bg-bg/50 p-3 hover:border-teal/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[12px] font-bold text-teal">{id}</div>
                </div>
                <Pill tone="orange">Observed</Pill>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-[12px] text-muted text-center py-4">
            No techniques observed yet.
          </div>
        )}
      </div>
    </section>
  );
}

function EvidencePanel({ activeDetections }: { activeDetections: any[] }) {
  const visibleEvidence = activeDetections.flatMap(d => d.evidence).slice(0, 3);

  return (
    <section
      className="fade-up rounded-xl border border-border-app bg-panel p-5"
      style={{ animationDelay: "560ms" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-muted">
            RECENT EVIDENCE
          </span>
        </div>
      </div>
      <ul>
        {visibleEvidence.length > 0 ? (
          visibleEvidence.map((e, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 border-b border-border-app/60 py-3 last:border-b-0 hover:bg-panel-2/60 -mx-2 px-2 rounded-md transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-panel-2">
                <AlertOctagon className="h-4 w-4 text-danger" />
              </div>
              <div className="min-w-0 flex-1 text-[13px] text-text">{String(e.value || e)}</div>
            </li>
          ))
        ) : (
          <div className="text-[12px] text-muted text-center py-4">No evidence collected yet.</div>
        )}
      </ul>
    </section>
  );
}
