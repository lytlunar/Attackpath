import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Monitor, Cog, Server, Building2, Crown, ShieldCheck } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/attack-graph")({
  component: AttackGraphPage,
});

type NodeId = "USR_03" | "WST_02" | "SVC_01" | "SRV_01" | "DC_01";

const NODES: Record<
  NodeId,
  { x: number; y: number; label: string; type: string; details: string; icon: React.ReactNode; color: string; key?: boolean }
> = {
  USR_03: {
    x: 90, y: 200, label: "USR_03", type: "User Identity",
    details: "Compromised domain user. Entry point via credential phishing. MITRE T1078.",
    icon: <User className="h-5 w-5 text-blue" />,
    color: "border-blue/50 bg-blue/15",
  },
  WST_02: {
    x: 290, y: 200, label: "WST_02", type: "Workstation — Chokepoint",
    details: "Primary chokepoint. Unpatched CVE-2024-XXXX allows local privilege escalation. LSASS dump observed. Remediating here severs the entire downstream attack path. MITRE T1068, T1003.",
    icon: <Monitor className="h-5 w-5 text-danger" />,
    color: "border-danger/60 bg-danger/15",
    key: true,
  },
  SVC_01: {
    x: 490, y: 120, label: "SVC_01", type: "Service Account",
    details: "High-privilege service account (SPN present). Kerberoastable. Credentials cached in LSASS on WST_02. MITRE T1078.",
    icon: <Cog className="h-5 w-5 text-teal" />,
    color: "border-teal/50 bg-teal/15",
  },
  SRV_01: {
    x: 490, y: 280, label: "SRV_01", type: "Application Server",
    details: "Application server used as lateral movement pivot. SMB admin share exposure. Contains cached domain admin credentials. MITRE T1021.002.",
    icon: <Server className="h-5 w-5 text-orange" />,
    color: "border-orange/50 bg-orange/15",
  },
  DC_01: {
    x: 720, y: 200, label: "DC_01", type: "Domain Controller",
    details: "Crown jewel. Full domain compromise if reached. Protect via tiered admin model. Target of Golden Ticket and DCSync attacks.",
    icon: <Building2 className="h-5 w-5 text-orange" />,
    color: "border-gold/60 bg-orange/10",
  },
};

/** Which edges are severed when remediation is applied */
const CHOKEPOINT_EDGE_INDEX = 1; // WST_02 → SVC_01

const EDGES: [NodeId, NodeId][] = [
  ["USR_03", "WST_02"],
  ["WST_02", "SVC_01"],   // index 1 — chokepoint edge
  ["WST_02", "SRV_01"],
  ["SVC_01", "DC_01"],
  ["SRV_01", "DC_01"],
];

/** Nodes that become muted when remediation is applied */
const MUTED_NODE_IDS: NodeId[] = ["SVC_01", "SRV_01", "DC_01"];

function AttackGraphPage() {
  // ─── Read from global context (read-only) ────────────────────────────
  const { remediationApplied } = useAegisPath();

  const [selected, setSelected] = useState<NodeId>("WST_02");
  const sel = NODES[selected];
  const isMuted = remediationApplied && MUTED_NODE_IDS.includes(selected);

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-[12.5px] font-semibold transition-all duration-500 ${
        remediationApplied
          ? "border-green/40 bg-green/8 text-green"
          : "border-danger/40 bg-danger/8 text-danger"
      }`}>
        {remediationApplied ? (
          <><ShieldCheck className="h-4 w-4" /> WST_02 → SVC_01 edge severed · Downstream nodes isolated · Path: Disrupted</>
        ) : (
          <><span className="h-2 w-2 rounded-full bg-danger live-dot flex-shrink-0" /> Active attack path · Chokepoint: WST_02 — click to inspect</>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">

        {/* ── Graph canvas ── */}
        <section className="rounded-xl border border-border-app bg-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-muted">GRAPH</div>
              <h2 className="text-[16px] font-bold text-text">Attack Path Topology</h2>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
              remediationApplied
                ? "border-green/40 bg-green/10 text-green"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${remediationApplied ? "bg-green" : "bg-danger live-dot"}`} />
              {remediationApplied ? "PATH DISRUPTED" : "KEY NODE: WST_02"}
            </div>
          </div>

          <div className="relative rounded-lg border border-border-app bg-bg/60 p-4" style={{ height: 460 }}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 820 420">
              <defs>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#ef5b6c" />
                </marker>
                <marker id="arrow-severed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#D93A4644" />
                </marker>
              </defs>

              {EDGES.map(([a, b], i) => {
                const A = NODES[a], B = NODES[b];
                const isChokepoint = i === CHOKEPOINT_EDGE_INDEX;
                const isSevered = remediationApplied && isChokepoint;
                const isDownstream = remediationApplied && (i === 3 || i === 4); // SVC_01→DC_01, SRV_01→DC_01
                const isDimmed = isSevered || isDownstream;

                return (
                  <g key={i}>
                    <line
                      x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                      stroke={isDimmed ? "#D93A4440" : "#ef5b6c"}
                      strokeWidth={isSevered ? 2 : 2}
                      strokeDasharray={isSevered ? "4 6" : "6 4"}
                      markerEnd={isDimmed ? "url(#arrow-severed)" : "url(#arrow-active)"}
                    >
                      {!isDimmed && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0" to="-20"
                          dur={isChokepoint ? "0.5s" : "0.8s"}
                          repeatCount="indefinite"
                        />
                      )}
                    </line>
                    {isSevered && (
                      <text
                        x={(A.x + B.x) / 2}
                        y={(A.y + B.y) / 2 - 8}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#D93A4680"
                      >✕</text>
                    )}
                  </g>
                );
              })}
            </svg>

            {(Object.keys(NODES) as NodeId[]).map((id) => {
              const n = NODES[id];
              const nodeIsMuted = remediationApplied && MUTED_NODE_IDS.includes(id);

              return (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={`absolute flex flex-col items-center transition-all duration-500 hover:scale-110 ${nodeIsMuted ? "opacity-25 grayscale" : ""}`}
                  style={{ left: n.x - 28, top: n.y - 28 }}
                >
                  {id === "DC_01" && <Crown className="pulse-gold absolute -top-4 h-4 w-4 text-gold" />}
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border ${n.color} ${n.key && !remediationApplied ? "pulse-glow-red" : ""} ${selected === id ? "ring-2 ring-teal ring-offset-2 ring-offset-bg" : ""}`}>
                    {n.icon}
                  </div>
                  <div className="mt-1 font-mono text-[11px] font-bold text-text">{n.label}</div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger inline-block" /> Active edge</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger/30 inline-block" style={{ borderTop: "2px dashed #D93A4640" }} /> Severed edge</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-danger/20 border border-danger/50 inline-block" /> Chokepoint node</span>
            <span className="flex items-center gap-1.5"><span className="opacity-25">●</span> Isolated / muted node</span>
          </div>
        </section>

        {/* ── Node detail panel ── */}
        <aside className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">SELECTED NODE</div>
          <div className={`mt-2 flex items-center gap-3 transition-opacity duration-500 ${isMuted ? "opacity-40" : ""}`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${sel.color}`}>
              {sel.icon}
            </div>
            <div>
              <div className="font-mono text-[14px] font-bold text-text">{sel.label}</div>
              <div className="text-[11.5px] text-muted">{sel.type}</div>
            </div>
          </div>

          <p className={`mt-4 text-[12.5px] leading-relaxed text-muted transition-opacity duration-500 ${isMuted ? "opacity-40" : ""}`}>
            {sel.details}
          </p>

          {sel.key && !remediationApplied && (
            <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] font-semibold text-danger">
              This node is the chokepoint. Remediating here breaks the primary attack path.
            </div>
          )}

          {sel.key && remediationApplied && (
            <div className="mt-4 rounded-md border border-green/40 bg-green/10 px-3 py-2 text-[11.5px] font-semibold text-green">
              <ShieldCheck className="mb-1 h-4 w-4" /> WST_02 remediated. Edge to SVC_01 severed. Downstream nodes isolated.
            </div>
          )}

          {isMuted && (
            <div className="mt-3 rounded-md border border-border-app bg-panel-2 px-3 py-2 text-[11.5px] text-muted">
              This node is no longer reachable via the primary attack path after remediation.
            </div>
          )}

          {/* MITRE tags */}
          <div className="mt-5">
            <div className="mb-2 text-[10px] font-bold tracking-[0.18em] text-muted">MITRE ATT&CK</div>
            <div className="flex flex-wrap gap-1.5">
              {selected === "USR_03" && (
                <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1078</span>
              )}
              {selected === "WST_02" && (
                <>
                  <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1068</span>
                  <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1003</span>
                </>
              )}
              {selected === "SVC_01" && (
                <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1078</span>
              )}
              {selected === "SRV_01" && (
                <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1021.002</span>
              )}
              {selected === "DC_01" && (
                <>
                  <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1558.001</span>
                  <span className="rounded-md border border-teal/30 bg-teal/10 px-2 py-0.5 font-mono text-[11px] text-teal">T1003.006</span>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
