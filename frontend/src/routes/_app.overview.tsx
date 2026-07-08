import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertOctagon, Radar, Activity, Wrench, User, Monitor, Cog, Server, Building2, Crown,
  Plus, Play, RotateCcw, LayoutGrid, FileText, ChevronLeft, ChevronRight as CR,
} from "lucide-react";
import { useAegisPath, METRICS_BEFORE, METRICS_AFTER } from "../context/AegisPathContext";

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
  // ─── Read from global context (read-only) ────────────────────────────
  const { remediationApplied, metrics, applyRemediation, resetRemediation } = useAegisPath();

  const riskScore = useCountTo(metrics.riskScore);
  const blastRadius = useCountTo(metrics.blastRadius);

  return (
    <div className="space-y-6">
      {/* ALERT BANNER */}
      <div className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/8 px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-danger live-dot flex-shrink-0" />
        <span className="text-[12.5px] font-semibold text-danger">
          1 Critical Active Lateral Movement Path Detected
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted">
          Active path: USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01 · Chokepoint: WST_02
        </span>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Risk Score */}
        <MetricCard
          tint={remediationApplied ? "green" : "red"}
          label="RISK SCORE"
          value={
            <span className={`text-[42px] leading-none font-bold tabular-nums ${remediationApplied ? "text-green" : "text-danger"}`}>
              {riskScore}
            </span>
          }
          badge={
            remediationApplied
              ? <Pill tone="orange">Medium</Pill>
              : <Pill tone="red">Critical</Pill>
          }
          icon={<AlertOctagon className={`h-6 w-6 ${remediationApplied ? "text-green" : "text-danger"}`} />}
          subtitle={remediationApplied ? "Risk reduced" : "Active path risk"}
          progress={{ value: remediationApplied ? 24 : 100, tone: remediationApplied ? "green" : "red" }}
          delay={0}
        />

        {/* Blast Radius */}
        <MetricCard
          tint={remediationApplied ? "green" : "red"}
          label="BLAST RADIUS"
          value={
            <span className={`text-[42px] leading-none font-bold tabular-nums ${remediationApplied ? "text-green" : "text-danger"}`}>
              {blastRadius}%
            </span>
          }
          icon={<Radar className={`h-6 w-6 ${remediationApplied ? "text-green" : "text-danger"}`} />}
          subtitle="Potential domain impact"
          progress={{ value: blastRadius, tone: remediationApplied ? "green" : "red" }}
          delay={80}
        />

        {/* Path Status */}
        <MetricCard
          tint={remediationApplied ? "green" : "red"}
          label="PATH STATUS"
          value={
            <div className="flex items-center gap-2">
              <span className={`text-[32px] leading-none font-bold ${remediationApplied ? "text-green" : "text-danger"}`}>
                {metrics.pathStatus}
              </span>
              {remediationApplied ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" /> SECURED
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
              <polyline points="0,12 8,12 12,4 16,20 20,8 24,16 28,12 46,12"
                fill="none" stroke={remediationApplied ? "#32B86A" : "#D93A46"} strokeWidth="1.6" />
            </svg>
          }
          subtitle={<span className="font-mono text-[12px] text-muted">USR_03 → DC_01</span>}
          delay={160}
        />

        {/* Security Gain / Primary Fix */}
        <MetricCard
          tint="green"
          label={remediationApplied ? "SECURITY GAIN" : "PRIMARY FIX"}
          value={
            remediationApplied
              ? <span className="text-[42px] leading-none font-bold text-green tabular-nums">+{METRICS_AFTER.securityGain}</span>
              : <span className="whitespace-nowrap text-[28px] leading-none font-bold text-green">Patch WST_02</span>
          }
          icon={<Wrench className="h-6 w-6 text-green" />}
          subtitle={
            remediationApplied
              ? <span className="text-green font-semibold">Remediation applied</span>
              : <>Est. security gain: <span className="font-bold text-green">{METRICS_AFTER.securityGain}</span></>
          }
          delay={240}
        />
      </div>

      {/* MIDDLE ROW */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_1fr]">
        <AttackPathPanel simulated={remediationApplied} />
        <PlaybookPanel
          simulated={remediationApplied}
          onApply={applyRemediation}
          onReset={resetRemediation}
        />
      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MitrePanel />
        <EvidencePanel />
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

function Pill({ tone, children }: { tone: "red" | "orange" | "green" | "teal"; children: React.ReactNode }) {
  const map = {
    red: "bg-danger/15 text-danger",
    orange: "bg-orange/15 text-orange",
    green: "bg-green/15 text-green",
    teal: "bg-teal/15 text-teal",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[tone]}`}>
      {children}
    </span>
  );
}

function MetricCard({
  tint, label, value, icon, subtitle, progress, badge, delay = 0,
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
    green: "border-green/40 bg-[radial-gradient(circle_at_top_right,rgba(61,220,151,0.12),transparent_60%)]",
    orange: "border-orange/40 bg-[radial-gradient(circle_at_top_right,rgba(246,180,75,0.12),transparent_60%)]",
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
      <div className="mt-2 flex items-center gap-2">{value}{badge}</div>
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

function AttackPathPanel({ simulated }: { simulated: boolean }) {
  const nodes: {
    id: NodeId; label: string; icon: React.ReactNode;
    tint: string; extra?: React.ReactNode; muted?: boolean;
  }[] = [
    {
      id: "USR_03", label: "User Identity",
      icon: <User className="h-5 w-5 text-blue" />,
      tint: "bg-blue/15 border-blue/40",
    },
    {
      id: "WST_02", label: "Workstation",
      icon: <Monitor className="h-5 w-5 text-danger" />,
      tint: `bg-danger/15 border-danger/50 ${simulated ? "" : "pulse-glow-red"}`,
      extra: (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-danger px-2 py-0.5 text-[9px] font-bold tracking-widest text-white shadow">
          CHOKEPOINT
        </span>
      ),
    },
    {
      id: "SVC_01", label: "Service Account",
      icon: <Cog className="h-5 w-5 text-teal" />,
      tint: "bg-teal/15 border-teal/40",
      muted: simulated,
    },
    {
      id: "SRV_01", label: "Server",
      icon: <Server className="h-5 w-5 text-orange" />,
      tint: "bg-orange/15 border-orange/40",
      muted: simulated,
    },
    {
      id: "DC_01", label: "Domain Controller",
      icon: <Building2 className="h-5 w-5 text-orange" />,
      tint: "bg-orange/15 border-gold/50 shadow-[0_0_24px_-6px_rgba(244,201,93,0.7)]",
      extra: <Crown className="pulse-gold absolute -top-4 left-1/2 h-4 w-4 -translate-x-1/2 text-gold" />,
      muted: simulated,
    },
  ];

  return (
    <section className="fade-up rounded-xl border border-border-app bg-panel p-5" style={{ animationDelay: "320ms" }}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">ACTIVE ATTACK PATH</div>
          <h2 className="mt-1 text-[16px] font-bold text-text">Active Attack Path</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${simulated ? "bg-green/15 text-green" : "bg-danger/15 text-danger"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${simulated ? "bg-green" : "bg-danger live-dot"}`} />
          {simulated ? "Disrupted" : "Live"}
        </span>
      </div>

      <div className="rounded-lg border border-border-app bg-bg/60 p-6">
        <div className="flex items-stretch justify-between gap-1">
          {nodes.map((n, i) => (
            <div key={n.id} className="flex flex-1 items-center">
              <NodeBubble node={n} />
              {i < nodes.length - 1 && (
                <Edge severed={simulated && i === 1} fast={i === 1} />
              )}
            </div>
          ))}
        </div>
      </div>

      {simulated ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-green/40 bg-green/8 px-3 py-1.5 font-mono text-[12px] text-green">
          <span className="h-2 w-2 rounded-full bg-green" />
          WST_02 → SVC_01: Path severed · Downstream nodes isolated
        </div>
      ) : (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-danger/30 bg-danger/8 px-3 py-1.5 font-mono text-[12px] text-danger">
          <Plus className="h-3.5 w-3.5" />
          WST_02 → SVC_01: Privileged access pivot
        </div>
      )}
    </section>
  );
}

function NodeBubble({ node }: {
  node: { id: NodeId; label: string; icon: React.ReactNode; tint: string; extra?: React.ReactNode; muted?: boolean };
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`group relative flex flex-col items-center gap-2 transition-all duration-500 hover:scale-105 ${node.muted ? "opacity-25 grayscale" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {node.extra}
      <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${node.tint}`}>
        {node.id === "WST_02" && !node.muted && <span className="ring-pulse absolute inset-0 rounded-full" />}
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

function Edge({ severed, fast }: { severed: boolean; fast: boolean }) {
  return (
    <div className="relative mx-1 h-[2px] flex-1">
      <div className={severed ? "edge-severed h-full w-full" : fast ? "edge-flow-fast h-full w-full" : "edge-flow h-full w-full"} />
      {!severed && (
        <div
          className="packet absolute -top-1 h-2 w-2 rounded-full bg-danger shadow-[0_0_8px_#D93A46]"
          style={fast ? { animationDuration: "0.9s" } : undefined}
        />
      )}
      <CR className={`absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 ${severed ? "text-danger/30" : "text-danger"}`} />
      {severed && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14px] font-bold text-danger/60">✕</span>
      )}
    </div>
  );
}

/* ---------- playbook ---------- */

function PlaybookPanel({
  simulated,
  onApply,
  onReset,
}: {
  simulated: boolean;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <section className="fade-up rounded-xl border border-green/30 bg-panel p-5 shadow-[0_0_0_1px_rgba(61,220,151,0.12)]" style={{ animationDelay: "400ms" }}>
      <div className="text-[10px] font-bold tracking-[0.18em] text-muted">PLAYBOOK</div>
      <h3 className="mt-1 text-[16px] font-bold text-text">Recommended Remediation</h3>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        Patch <strong className="text-text">WST_02</strong> to eliminate the privileged access pivot into SVC_01 and prevent progression toward DC_01.
      </p>

      <div className="mt-4 rounded-lg border border-border-app bg-bg/60 p-3">
        <div className="mb-2 text-[10px] font-bold tracking-[0.18em] text-muted">IMPACT PREVIEW</div>
        <ImpactRow
          label="Risk Score"
          before={<span className={`font-mono text-[13px] ${simulated ? "text-muted line-through" : "text-danger font-bold"}`}>{METRICS_BEFORE.riskScore}</span>}
          after={<span className="font-mono text-[13px] font-bold text-green">{METRICS_AFTER.riskScore}</span>}
        />
        <ImpactRow
          label="Blast Radius"
          before={<span className={`font-mono text-[13px] ${simulated ? "text-muted line-through" : "text-danger font-bold"}`}>{METRICS_BEFORE.blastRadius}%</span>}
          after={<span className="font-mono text-[13px] font-bold text-green">{METRICS_AFTER.blastRadius}%</span>}
        />
        <ImpactRow
          label="Path Status"
          before={<Pill tone="red">Active</Pill>}
          after={<Pill tone="teal">Disrupted</Pill>}
        />
        <ImpactRow
          label="Risk Level"
          before={<Pill tone="red">Critical</Pill>}
          after={<Pill tone="orange">Medium</Pill>}
        />
      </div>

      {simulated && (
        <div className="fade-up mt-3 flex items-center justify-center gap-2 rounded-md border border-green/40 bg-green/10 py-2 text-[13px] font-bold text-green">
          +{METRICS_AFTER.securityGain} Security Gain
        </div>
      )}

      <button
        onClick={simulated ? onReset : onApply}
        style={simulated ? undefined : { backgroundColor: "#248A52", color: "#F4F1FA" }}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold transition-colors ${
          simulated
            ? "bg-panel-2 text-text ring-1 ring-border-app hover:bg-panel"
            : "hover:brightness-110"
        }`}
      >
        {simulated
          ? <><RotateCcw className="h-4 w-4" /> Reset Simulation</>
          : <><Play className="h-4 w-4 fill-current" /> Simulate Patch</>
        }
      </button>
    </section>
  );
}

function ImpactRow({ label, before, after }: { label: string; before: React.ReactNode; after: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-app/60 py-1.5 last:border-b-0">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-2">
        {before}
        <CR className="h-3 w-3 text-muted" />
        {after}
      </div>
    </div>
  );
}

/* ---------- bottom ---------- */

const MITRE = [
  { id: "T1078", name: "Valid Accounts", tone: "orange" as const, sev: "Medium" },
  { id: "T1021.002", name: "Remote Services: SMB/Windows Admin Shares", tone: "red" as const, sev: "High" },
  { id: "T1068", name: "Exploitation for Privilege Escalation", tone: "red" as const, sev: "High" },
  { id: "T1003", name: "OS Credential Dumping", tone: "orange" as const, sev: "Medium" },
];

function MitrePanel() {
  return (
    <section className="fade-up rounded-xl border border-border-app bg-panel p-5" style={{ animationDelay: "480ms" }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-teal" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-muted">MITRE COVERAGE</span>
        </div>
        <span className="text-[11px] text-muted">Showing 4 of 4 techniques</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {MITRE.map((m) => (
          <div key={m.id} className="rounded-lg border border-border-app bg-bg/50 p-3 hover:border-teal/30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[12px] font-bold text-teal">{m.id}</div>
                <div className="mt-1 text-[12.5px] text-text">{m.name}</div>
              </div>
              <Pill tone={m.tone}>{m.sev}</Pill>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-1">
        <button className="rounded-md border border-border-app bg-panel-2 p-1.5 hover:bg-panel"><ChevronLeft className="h-3.5 w-3.5 text-muted" /></button>
        <button className="rounded-md border border-border-app bg-panel-2 p-1.5 hover:bg-panel"><CR className="h-3.5 w-3.5 text-muted" /></button>
      </div>
    </section>
  );
}

const EVIDENCE = [
  { icon: <Monitor className="h-4 w-4 text-blue" />, msg: "WST_02 SMB session to SVC_01", ts: "May 19, 2024 13:42:11" },
  { icon: <Activity className="h-4 w-4 text-teal" />, msg: "Service account SVC_01 used for remote admin", ts: "May 19, 2024 13:38:07" },
  { icon: <AlertOctagon className="h-4 w-4 text-danger" />, msg: "DC_01 LDAP bind attempt from SRV_01", ts: "May 19, 2024 13:35:02" },
];

function EvidencePanel() {
  return (
    <section className="fade-up rounded-xl border border-border-app bg-panel p-5" style={{ animationDelay: "560ms" }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal" />
          <span className="text-[10px] font-bold tracking-[0.18em] text-muted">RECENT EVIDENCE</span>
        </div>
        <a className="text-[11px] font-semibold text-teal hover:underline" href="#">View all →</a>
      </div>
      <ul>
        {EVIDENCE.map((e, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-border-app/60 py-3 last:border-b-0 hover:bg-panel-2/60 -mx-2 px-2 rounded-md transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-panel-2">{e.icon}</div>
            <div className="min-w-0 flex-1 text-[13px] text-text">{e.msg}</div>
            <div className="font-mono text-[11px] text-muted">{e.ts}</div>
            <CR className="h-3.5 w-3.5 text-muted" />
          </li>
        ))}
      </ul>
    </section>
  );
}
