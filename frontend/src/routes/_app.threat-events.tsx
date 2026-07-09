import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { AegisPathModel } from "../data/aegisPathModel";

export const Route = createFileRoute("/_app/threat-events")({
  component: ThreatEventsPage,
});

type Severity = "Critical" | "High" | "Medium";
type Row = {
  id: string;
  severity: Severity;
  type: string;
  source: string;
  target: string;
  ts: string;
  status: "Open" | "Investigating" | "Contained";
  detail: string;
  mitreId: string;
};

const nodeToMitreKey: Record<string, keyof typeof AegisPathModel.mitreMappings> = {
  "USR_03": "USR_03",
  "WST_02": "WST_02_dumping",
  "SVC_01": "SVC_01_abuse",
  "DC_01": "DC_01_escalation"
};

const EVENTS: Row[] = AegisPathModel.threatEvents.map(evt => {
  const mitreMapping = AegisPathModel.mitreMappings[nodeToMitreKey[evt.node]];
  return {
    id: evt.id,
    severity: evt.severity as Severity,
    type: evt.id === "evt_001" ? "Initial Access" : 
          evt.id === "evt_002" ? "Credential Dumping" : 
          evt.id === "evt_003" ? "Lateral Movement" : "Domain Escalation",
    source: evt.source,
    target: evt.node,
    ts: `Jul 5, 2026 ${evt.timestamp.substring(11, 16)} UTC`,
    status: "Investigating",
    detail: evt.message,
    mitreId: `${mitreMapping.technique} — ${mitreMapping.name}`
  };
});

const sevTone: Record<Severity, string> = {
  Critical: "bg-danger/15 text-danger",
  High: "bg-orange/15 text-orange",
  Medium: "bg-[#eddc7a]/15 text-[#eddc7a]",
};

function ThreatEventsPage() {
  const [filter, setFilter] = useState<"All" | Severity>("All");
  const [open, setOpen] = useState<number | null>(null);
  const rows = EVENTS.filter((e) => filter === "All" || e.severity === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["All", "Critical", "High", "Medium"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              filter === f ? "border-teal/60 bg-teal/10 text-teal" : "border-border-app bg-panel text-muted hover:bg-panel-2"
            }`}>{f}</button>
        ))}
        <div className="ml-auto text-[11.5px] font-medium text-muted">{rows.length} core events in active path</div>
      </div>

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
            {rows.map((r, i) => (
              <>
                <tr key={i} className="border-t border-border-app hover:bg-panel-2/60">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevTone[r.severity]}`}>{r.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-text">{r.type}</td>
                  <td className="px-4 py-3 font-mono text-muted">{r.source}</td>
                  <td className="px-4 py-3 font-mono text-muted">{r.target}</td>
                  <td className="px-4 py-3 font-mono text-muted">{r.ts}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-text">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.status === "Open" ? "bg-danger" : r.status === "Investigating" ? "bg-orange" : "bg-green"}`} />
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setOpen(open === i ? null : i)} className="text-muted hover:text-text">
                      {open === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
                {open === i && (
                  <tr className="bg-bg/60">
                    <td colSpan={7} className="border-t border-border-app px-4 py-4 text-[12px] text-muted space-y-2">
                      <div><span className="font-semibold text-text">Details:</span> {r.detail}</div>
                      <div><span className="font-semibold text-text">MITRE ATT&CK:</span> <span className="font-mono text-teal">{r.mitreId}</span></div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
