import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Monitor,
  User,
  Server,
  Cog,
  Building2,
  Crown,
  ShieldCheck,
} from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";
import { AegisPathModel } from "../data/aegisPathModel";

export const Route = createFileRoute("/_app/attack-graph")({
  component: AttackGraphPage,
});

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="h-full w-full" />,
  Monitor: <Monitor className="h-full w-full" />,
  Cog: <Cog className="h-full w-full" />,
  Server: <Server className="h-full w-full" />,
  Building2: <Building2 className="h-full w-full" />,
};

function getNodeColor(id: string, role: string) {
  if (role === "context") return "border-muted/30 text-muted";

  if (id === "USR_03") return "border-blue text-blue bg-blue/10";
  if (id === "WST_02") return "border-danger text-danger bg-danger/10";
  if (id === "SVC_01") return "border-teal text-teal bg-teal/10";
  if (id === "SRV_01") return "border-orange text-orange bg-orange/10";
  if (id === "DC_01") return "border-gold text-gold bg-gold/10";

  return "border-danger text-danger bg-danger/10";
}

function AttackGraphPage() {
  const {
    canonicalResult: state,
    canonicalSessionInput,
    applyCanonicalRemediation,
    resetCanonicalRemediation,
    canonicalIsLoading: isPending,
  } = useAegisPath();

  const [selectedId, setSelectedId] = useState<string>("WST_02");

  const eventCount = canonicalSessionInput.processedEventCount;
  const isNeutral = eventCount === 0;
  const remediationApplied = canonicalSessionInput.remediationActionId !== null;

  const activeNodes = state?.activeGraph?.nodes?.map(n => n.id) || [];
  const activeEdges = state?.activeGraph?.edges || [];

  const selNodeAnalysis = state?.activeGraph?.nodes?.find(n => n.id === selectedId) || null;
  const selContextNode = state?.contextGraph?.nodes?.find(n => n.id === selectedId) || null;
  const sel = selNodeAnalysis || selContextNode;
  const isMuted = !selNodeAnalysis && !isNeutral;

  const chokepointSource = "WST_02";

  return (
    <div className="space-y-4">
      {/* Topology Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border-app bg-panel p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[11.5px] uppercase tracking-wider text-muted font-bold">
              Topology View
            </span>
            <span className="text-[14px] font-semibold text-text">
              {isNeutral ? "Awaiting Data" : remediationApplied ? "Simulated State" : "Live Assessment"}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-border-app" />
          <div className="flex flex-col">
            <span className="text-[11.5px] uppercase tracking-wider text-muted font-bold">
              Path Status
            </span>
            <span className={`text-[14px] font-mono font-bold ${isNeutral ? "text-muted" : remediationApplied ? "text-green" : "text-danger"}`}>
              {isNeutral ? "Neutral" : remediationApplied ? "Mitigated" : "Critical"}
            </span>
          </div>
        </div>

        {remediationApplied && (
          <div className="flex items-center gap-2 rounded border border-green/30 bg-green/10 px-3 py-1.5 text-[12px] font-semibold text-green">
            <ShieldCheck className="h-4 w-4" />
            Path Disrupted
          </div>
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
              isNeutral
                ? "border-border-app bg-panel-2 text-muted"
                : remediationApplied
                  ? "border-green/40 bg-green/10 text-green"
                  : "border-danger/40 bg-danger/10 text-danger"
            }`}>
              {isNeutral ? (
                <>—</>
              ) : (
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${remediationApplied ? "bg-green" : "bg-danger live-dot"}`} />
                  {remediationApplied ? "PATH DISRUPTED" : `KEY NODE: ${chokepointSource}`}
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border-app bg-bg/60 p-4">
            <div className="relative mx-auto min-w-[1000px]" style={{ width: 1000, height: 620 }}>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 620">
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

              {(state?.contextGraph?.edges || []).map((edge, i) => {
                const A = state.contextGraph.nodes.find(n => n.id === edge.source);
                const B = state.contextGraph.nodes.find(n => n.id === edge.target);

                // fallback to static positions for layout
                const staticA = AegisPathModel.graphNodes.find(n => n.id === edge.source);
                const staticB = AegisPathModel.graphNodes.find(n => n.id === edge.target);

                if (!A || !B || !staticA || !staticB) return null;

                const edgeId = edge.id;

                const activeEdge = activeEdges.find(e => e.id === edgeId || (e.source === edge.source && e.target === edge.target));
                let isContext = !activeEdge;

                // Explicitly demote downstream edges to historical/context if remediation is applied
                const isHistorical = remediationApplied && (
                  (edge.source === "SVC_01" && edge.target === "SRV_01") ||
                  (edge.source === "SRV_01" && edge.target === "DC_01")
                );

                if (isHistorical) {
                  isContext = true;
                }

                // Instead of manually calculating severed logic, canonical API simply omits it from activeEdges.
                // We show severed purely visually if it was the remediation target but is now missing, though
                // canonical doesn't explicitly flag "severed" in activeGraph. It just drops it.
                // To keep the visual 'X', we can deduce it:
                const isSevered = remediationApplied && edge.source === "WST_02" && edge.target === "SVC_01";
                const isDimmedCritical = isSevered;

                let strokeColor = isNeutral ? "#88888855" : (isHistorical ? "#88888855" : (isContext ? "#88888833" : (isDimmedCritical ? "#D93A4660" : "#ef5b6c")));
                let markerUrl = isNeutral ? "none" : (isHistorical ? "url(#arrow-context)" : (isContext ? "none" : (isDimmedCritical ? "url(#arrow-severed)" : "url(#arrow-active)")));

                // Calculate exact start/end coordinates at node boundaries
                const dx = staticB.x - staticA.x;
                const dy = staticB.y - staticA.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;

                const isContextNodeA = isContext && !activeNodes.includes(A.id);
                const isContextNodeB = isContext && !activeNodes.includes(B.id);
                const radiusA = isContextNodeA ? 24 : 32;
                const radiusB = isContextNodeB ? 24 : 32;

                const startX = staticA.x + (dx / distance) * radiusA;
                const startY = staticA.y + (dy / distance) * radiusA;

                const paddingEnd = isContext || isNeutral ? 0 : 6;
                const endX = staticB.x - (dx / distance) * (radiusB + paddingEnd);
                const endY = staticB.y - (dy / distance) * (radiusB + paddingEnd);

                return (
                  <g key={i}>
                    <line
                      x1={startX} y1={startY} x2={endX} y2={endY}
                      stroke={strokeColor}
                      strokeWidth={isSevered ? 2.5 : (isContext || isNeutral ? 1.5 : 2)}
                      strokeDasharray={isSevered ? "6 6" : "6 4"}
                      markerEnd={markerUrl}
                    >
                      {!isDimmedCritical && !isContext && !isNeutral && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0" to="-20"
                          dur={"0.8s"}
                          repeatCount="indefinite"
                        />
                      )}
                    </line>
                    {isSevered && (
                      <g transform={`translate(${(staticA.x + staticB.x) / 2}, ${(staticA.y + staticB.y) / 2})`}>
                        <circle r="11" fill="#0f111a" stroke="#ef5b6c" strokeWidth="1.5" />
                        <text
                          y="4"
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="bold"
                          fill="#ef5b6c"
                        >✕</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {(state?.contextGraph?.nodes || []).map((n) => {
              const staticN = AegisPathModel.graphNodes.find(sn => sn.id === n.id);
              if (!staticN) return null;

              let isCritical = activeNodes.includes(n.id) && !isNeutral;
              
              // Force downstream nodes to be demoted if remediation is applied
              const isHistoricalNode = remediationApplied && ["SVC_01", "SRV_01", "DC_01"].includes(n.id);
              if (isHistoricalNode) {
                isCritical = false;
              }

              const isContext = !isCritical;

              // We mute nodes that were critical but lost reachability after remediation.
              const nodeIsMutedCritical = isHistoricalNode && !isNeutral;
              const isChokepointNode = n.id === chokepointSource;

              const offset = isContext ? 24 : 32;

              return (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className={`absolute flex flex-col items-center transition-all duration-500 hover:scale-110
                    ${nodeIsMutedCritical ? "opacity-40 grayscale" : ""}
                    ${isContext ? "opacity-60 hover:opacity-100" : ""}
                  `}
                  style={{ left: staticN.x - offset, top: staticN.y - offset, zIndex: isCritical ? 10 : 1 }}
                >
                  {n.id === "DC_01" && <Crown className={`pulse-gold absolute -top-5 h-5 w-5 text-gold ${isNeutral ? "opacity-50" : ""}`} />}

                  {isChokepointNode && !remediationApplied && !isNeutral && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-danger px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow shadow-danger/50">
                      CHOKEPOINT
                    </div>
                  )}

                  <div className={`relative flex items-center justify-center rounded-full border ${getNodeColor(n.id, isCritical ? "critical" : "context")}
                    ${isChokepointNode && !remediationApplied ? "pulse-glow-red" : ""}
                    ${selectedId === n.id ? "ring-2 ring-teal ring-offset-2 ring-offset-bg" : ""}
                    ${isContext ? "h-12 w-12 text-muted" : "h-16 w-16"}
                  `}>
                    <div className={isContext ? "scale-90" : "scale-110"}>
                      {iconMap[staticN.iconType] || <Monitor className="h-5 w-5" />}
                    </div>
                  </div>

                  <div className={`mt-1.5 font-mono font-bold ${isContext ? "text-[10px] text-muted" : "text-[12px] text-text"}`}>
                    {staticN.label}
                  </div>
                </button>
              );
            })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger inline-block" /> Active edge</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-danger/30 inline-block" style={{ borderTop: "2px dashed #D93A4640" }} /> Severed edge</span>
            <span className="flex items-center gap-1.5"><span className="h-[2px] w-6 bg-muted/40 inline-block" style={{ borderTop: "2px dashed #88888855" }} /> Historical edge</span>
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
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${getNodeColor(sel.id, isNeutral ? "context" : (selNodeAnalysis ? "critical" : "context"))}`}>
                  {(() => {
                    const sn = AegisPathModel.graphNodes.find(n => n.id === sel.id);
                    return iconMap[sn?.iconType || "Monitor"];
                  })()}
                </div>
                <div>
                  <div className="font-mono text-[14px] font-bold text-text">{sel.id}</div>
                  <div className="text-[11.5px] text-muted">{sel.type} · {isNeutral ? "—" : (selNodeAnalysis ? "Active" : "Context")}</div>
                </div>
              </div>

              <p className={`mt-4 text-[12.5px] leading-relaxed text-muted transition-opacity duration-500 ${isMuted ? "opacity-40" : ""}`}>
                {sel.description}
              </p>

              {sel.id === chokepointSource && !remediationApplied && !isNeutral && (
                <>
                  <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[11.5px] font-semibold text-danger">
                    This node is the chokepoint. Remediating here breaks the primary attack path.
                  </div>

                  {/* Remediation CTA */}
                  <div className="mt-6 rounded-lg border border-border-app bg-panel-2 p-4 text-center">
                    <button
                      onClick={() => applyCanonicalRemediation("patch_wst_02")}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 rounded border border-danger/50 bg-danger/20 px-4 py-2.5 text-[12px] font-bold text-danger transition-colors hover:bg-danger/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Applying..." : "Apply to Attack Model"}
                    </button>
                    <div className="mt-2.5 text-[10.5px] leading-relaxed text-muted">
                      Sever the chokepoint edge to isolate downstream nodes and disrupt the attack path.
                    </div>
                  </div>
                </>
              )}

              {sel.id === chokepointSource && remediationApplied && !isNeutral && (
                <>
                  <div className="mt-4 rounded-md border border-green/40 bg-green/10 px-3 py-2 text-[11.5px] font-semibold text-green">
                    <ShieldCheck className="mb-1 h-4 w-4 inline-block" /> {sel.id} remediated. Edge severed. Downstream nodes isolated.
                  </div>
                  <div className="mt-6 rounded-lg border border-border-app bg-panel-2 p-4 text-center">
                    <button
                      onClick={() => resetCanonicalRemediation()}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 rounded border border-border-app bg-bg px-4 py-2.5 text-[12px] font-bold text-text transition-colors hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Resetting..." : "Reset Simulation"}
                    </button>
                  </div>
                </>
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
