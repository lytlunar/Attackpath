import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_app/threat-events")({
  component: ThreatEventsPage,
});

type Severity = "Critical" | "High" | "Medium";
type Row = {
  severity: Severity;
  type: string;
  source: string;
  target: string;
  ts: string;
  status: "Open" | "Investigating" | "Contained";
  detail: string;
};

const EVENTS: Row[] = [
  { severity: "Critical", type: "DCSync Attempt", source: "SRV_01", target: "DC_01", ts: "May 19, 2024 13:35:02", status: "Open", detail: "Replication request from non-DC principal detected via directory replication rights." },
  { severity: "Critical", type: "Pass-the-Hash", source: "WST_02", target: "SVC_01", ts: "May 19, 2024 13:34:41", status: "Investigating", detail: "NTLM hash reuse observed originating from WST_02 LSASS cache." },
  { severity: "High", type: "SMB Brute Force", source: "203.0.113.42", target: "WST_02", ts: "May 19, 2024 13:30:18", status: "Contained", detail: "1,204 failed authentications over SMB in 90s window." },
  { severity: "High", type: "Kerberoasting", source: "USR_03", target: "SVC_01", ts: "May 19, 2024 13:22:07", status: "Open", detail: "SPN enumeration followed by TGS-REQ for RC4-HMAC service tickets." },
  { severity: "High", type: "LDAP Enumeration", source: "WST_02", target: "DC_01", ts: "May 19, 2024 13:18:44", status: "Open", detail: "Recursive LDAP query enumerating privileged group membership." },
  { severity: "Medium", type: "Suspicious Login", source: "USR_03", target: "WST_02", ts: "May 19, 2024 12:55:11", status: "Investigating", detail: "Interactive logon from unusual geolocation outside baseline." },
  { severity: "Medium", type: "Scheduled Task Created", source: "SVC_01", target: "SRV_01", ts: "May 19, 2024 12:41:03", status: "Open", detail: "Task registered to execute powershell.exe -enc via TaskScheduler." },
  { severity: "High", type: "Credential Dump", source: "WST_02", target: "LSASS", ts: "May 19, 2024 12:12:59", status: "Contained", detail: "MiniDump of lsass.exe via comsvcs.dll observed." },
  { severity: "Medium", type: "New Local Admin", source: "SVC_01", target: "SRV_01", ts: "May 19, 2024 11:58:20", status: "Investigating", detail: "Local Administrators group modified with new principal SVC_01." },
  { severity: "Critical", type: "Golden Ticket", source: "WST_02", target: "DC_01", ts: "May 19, 2024 11:44:02", status: "Open", detail: "TGT with unusually long lifetime and encryption downgrade to RC4." },
];

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
        <div className="ml-auto text-[11.5px] text-muted">{rows.length} events</div>
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
                    <td colSpan={7} className="border-t border-border-app px-4 py-3 text-[12px] text-muted">
                      {r.detail}
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
