import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Monitor, Cog, Server, Building2, Crown, ShieldCheck, Database, Radar } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";
import { AegisPathModel } from "../data/aegisPathModel";

export const Route = createFileRoute("/_app/attack-graph")({
  component: AttackGraphPage,
});

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="h-5 w-5" />,
  Monitor: <Monitor className="h-5 w-5" />,
  Cog: <Cog className="h-5 w-5" />,
  Server: <Server className="h-5 w-5" />,
  Building2: <Building2 className="h-5 w-5" />,
  Database: <Database className="h-5 w-5" />,
  Radar: <Radar className="h-5 w-5" />
};

function getNodeColor(id: string, role: string) {
  if (role !== "critical") return "border-border-app bg-panel-2 text-muted";
  
  if (id === "WST_02") return "border-danger/60 bg-danger/15 text-danger";
  if (id === "SVC_01") return "border-teal/50 bg-teal/15 text-teal";
  if (id === "SRV_01") return "border-orange/50 bg-orange/15 text-orange";
  if (id === "DC_01") return "border-gold/60 bg-orange/10 text-orange";
  // USR_03
  return "border-blue/50 bg-blue/15 text-blue";
}

function AttackGraphPage() {
  const { remediationApplied } = useAegisPath();
  const [selectedId, setSelectedId] = useState<string>("WST_02");

  const sel = AegisPathModel.graphNodes.find(n => n.id === selectedId);
  const isMuted = remediationApplied && AegisPathModel.criticalPath.includes(selectedId) && ["SVC_01", "SRV_01", "DC_01"].includes(selectedId);

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
        {/* Graph canvas */}
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
                <marker id="arrow-context" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#88888844" />
                </marker>
              </defs>

              {AegisPathModel.graphEdges.map((edge, i) => {
                const A = AegisPathModel.graphNodes.find(n => n.id === edge.source);
                const B = AegisPathModel.graphNodes.find(n => n.id === edge.target);
                
                if (!A || !B) return null;

                const isChokepoint = edge.role === "chokepoint";
                const isSevered = remediationApplied && isChokepoint;
                const isDownstream = remediationApplied && ["SVC_01", "SRV_01"].includes(edge.source); 
                const isDimmedCritical = isSevered || isDownstream;
                
                const isContext = edge.role === "context";

                let strokeColor = "#ef5b6c";
                let markerUrl = "url(#arrow-active)";
                
                if (isContext) {
                  strokeColor = "#88888833";
                  markerUrl = "url(#arrow-context)";
                } else if (isDimmedCritical) {
                  strokeColor = "#D93A4440";
                  markerUrl = "url(#arrow-severed)";
                }

                return (
                  <g key={i}>
                    <line
                      x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                      stroke={strokeColor}
                      strokeWidth={isSevered ? 2 : (isContext ? 1.5 : 2)}
                      strokeDasharray={isSevered ? "4 6" : "6 4"}
                      markerEnd={markerUrl}
                    >
                      {!isDimmedCritical && !isContext && (
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

            {AegisPathModel.graphNodes.map((n) => {
              const nodeIsMutedCritical = remediationApplied && ["SVC_01", "SRV_01", "DC_01"].includes(n.id);
              const isContext = n.role === "context";
              const isCritical = n.role === "critical";
              const isChokepointNode = n.id === "WST_02";
              const offset = isContext ? 20 : 28;

              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`absolute flex flex-col items-center transition-all duration-500 hover:scale-110 
                    ${nodeIsMutedCritical ? "opacity-25 grayscale" : ""}
                    ${isContext ? "opacity-50 hover:opacity-100" : ""}
                  `}
                  style={{ left: n.x - offset, top: n.y - offset, zIndex: isCritical ? 10 : 1 }}
                >
                  {n.id === "DC_01" && <Crown className="pulse-gold absolute -top-4 h-4 w-4 text-gold" />}
                  
                  {isChokepointNode && !remediationApplied && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-danger px-1.5 py-0.5 text-[8px] font-black tracking-wider text-white shadow shadow-danger/50">
                      CHOKEPOINT
                    </div>
                  )}

                  <div className={`relative flex items-center justify-center rounded-full border ${getNodeColor(n.id, n.role)} 
                    ${isChokepointNode && !remediationApplied ? "pulse-glow-red" : ""} 
                    ${selectedId === n.id ? "ring-2 ring-teal ring-offset-2 ring-offset-bg" : ""}
                    ${isContext ? "h-10 w-10 text-muted" : "h-14 w-14"}
                  `}>
                    <div className={isContext ? "scale-75" : ""}>
                      {iconMap[n.iconType] || <Monitor className="h-5 w-5" />}
                    </div>
                  </div>
                  
                  <div className={`mt-1 font-mono font-bold ${isContext ? "text-[9px] text-muted" : "text-[11px] text-text"}`}>
                    {n.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger inline-block" /> Active edge</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger/30 inline-block" style={{ borderTop: "2px dashed #D93A4640" }} /> Severed edge</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-muted/30 inline-block" style={{ borderTop: "2px dashed #88888833" }} /> Context edge</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-danger/20 border border-danger/50 inline-block" /> Chokepoint node</span>
            <span className="flex items-center gap-1.5"><span className="opacity-25">●</span> Muted / Context</span>
          </div>
        </section>

        {/* Node detail panel */}
        <aside className="rounded-xl border border-border-app bg-panel p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">SELECTED NODE</div>
          {sel && (
            <>
              <div className={`mt-2 flex items-center gap-3 transition-opacity duration-500 ${isMuted ? "opacity-40" : ""}`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${getNodeColor(sel.id, sel.role)}`}>
                  {iconMap[sel.iconType]}
                </div>
                <div>
                  <div className="font-mono text-[14px] font-bold text-text">{sel.id}</div>
                  <div className="text-[11.5px] text-muted">{sel.type} · {sel.status}</div>
                </div>
              </div>

              <p className={`mt-4 text-[12.5px] leading-relaxed text-muted transition-opacity duration-500 ${isMuted ? "opacity-40" : ""}`}>
                {sel.description}
              </p>

              {sel.id === "WST_02" && !remediationApplied && (
                <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] font-semibold text-danger">
                  This node is the chokepoint. Remediating here breaks the primary attack path.
                </div>
              )}

              {sel.id === "WST_02" && remediationApplied && (
                <div className="mt-4 rounded-md border border-green/40 bg-green/10 px-3 py-2 text-[11.5px] font-semibold text-green">
                  <ShieldCheck className="mb-1 h-4 w-4 inline-block" /> WST_02 remediated. Edge to SVC_01 severed. Downstream nodes isolated.
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
                <div className="flex flex-col gap-2">
                  {(() => {
                    const mitreKeys = Object.keys(AegisPathModel.mitreMappings).filter(k => k.startsWith(sel.id));
                    if (mitreKeys.length > 0) {
                      return mitreKeys.map(k => {
                        const m = AegisPathModel.mitreMappings[k as keyof typeof AegisPathModel.mitreMappings];
                        return (
                          <div key={k} className="rounded-md border border-border-app bg-panel-2 p-2">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {m.technique.split(" / ").map(t => (
                                <span key={t} className="rounded border border-teal/30 bg-teal/10 px-1.5 py-0.5 font-mono text-[10px] text-teal">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <div className="text-[11px] font-semibold text-text">{m.name}</div>
                            <div className="text-[10px] text-muted mt-0.5">{m.description}</div>
                          </div>
                        );
                      });
                    }
                    return (
                      <div className="text-[11.5px] italic text-muted">
                        No direct MITRE technique mapped.
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
