import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/audit-trail")({
  component: AuditTrailPage,
});

type Result = "Success" | "Failure" | "Warning";
type Entry = { ts: string; user: string; action: string; resource: string; ip: string; result: Result; dynamic?: boolean };

/** Static baseline entries — never changes */
const STATIC_ENTRIES: Entry[] = [
  { ts: "2024-05-19 13:42:11", user: "amorgan", action: "View Attack Graph", resource: "/attack-graph", ip: "10.20.4.11", result: "Success" },
  { ts: "2024-05-19 13:40:02", user: "amorgan", action: "Run Simulation", resource: "WST_02 patch", ip: "10.20.4.11", result: "Success" },
  { ts: "2024-05-19 13:35:02", user: "system", action: "Detect", resource: "DC_01 LDAP bind", ip: "10.20.7.14", result: "Warning" },
  { ts: "2024-05-19 13:22:07", user: "system", action: "Detect", resource: "Kerberoasting SVC_01", ip: "10.20.4.22", result: "Warning" },
  { ts: "2024-05-19 12:58:20", user: "jchen", action: "Login", resource: "AegisPath UI", ip: "10.20.3.9", result: "Success" },
  { ts: "2024-05-19 12:45:11", user: "jchen", action: "Export Report", resource: "Intelligence Brief", ip: "10.20.3.9", result: "Success" },
  { ts: "2024-05-19 12:12:59", user: "system", action: "Detect", resource: "LSASS dump WST_02", ip: "10.20.4.22", result: "Warning" },
  { ts: "2024-05-19 11:58:20", user: "svc_ingest", action: "Ingest", resource: "SIEM feed batch #4419", ip: "10.20.9.2", result: "Success" },
  { ts: "2024-05-19 11:44:02", user: "system", action: "Detect", resource: "Golden Ticket DC_01", ip: "10.20.4.22", result: "Warning" },
  { ts: "2024-05-19 11:12:07", user: "rking", action: "Update Rule", resource: "Detection: T1003", ip: "10.20.3.44", result: "Success" },
  { ts: "2024-05-19 10:48:33", user: "rking", action: "Login", resource: "AegisPath UI", ip: "10.20.3.44", result: "Failure" },
  { ts: "2024-05-19 10:48:41", user: "rking", action: "Login", resource: "AegisPath UI", ip: "10.20.3.44", result: "Success" },
  { ts: "2024-05-19 09:30:00", user: "system", action: "Sync", resource: "Threat Intel Feed", ip: "10.20.9.2", result: "Success" },
  { ts: "2024-05-19 09:15:22", user: "amorgan", action: "Login", resource: "AegisPath UI", ip: "10.20.4.11", result: "Success" },
  { ts: "2024-05-18 22:07:44", user: "usr_03", action: "Execute", resource: "invoice_042.docm", ip: "10.20.4.88", result: "Failure" },
  { ts: "2024-05-18 18:00:00", user: "svc_ingest", action: "Ingest", resource: "SIEM feed batch #4418", ip: "10.20.9.2", result: "Success" },
  { ts: "2024-05-18 17:12:03", user: "jchen", action: "Acknowledge Alert", resource: "SMB Brute Force", ip: "10.20.3.9", result: "Success" },
];

function AuditTrailPage() {
  // ─── Read from global context (read-only) ────────────────────────────
  const { remediationApplied, remediationTimestamp } = useAegisPath();

  const [user, setUser] = useState("all");
  const [action, setAction] = useState("all");

  /**
   * Dynamic entry injected at the top when remediation is applied.
   * This represents the live simulation action logged in real time.
   */
  const dynamicEntry: Entry | null = useMemo(() => {
    if (!remediationApplied || !remediationTimestamp) return null;
    const d = new Date(remediationTimestamp);
    const pad = (n: number) => String(n).padStart(2, "0");
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return {
      ts,
      user: "amorgan",
      action: "Apply Remediation",
      resource: "WST_02 — Remediation Bundle",
      ip: "10.20.4.11",
      result: "Success",
      dynamic: true,
    };
  }, [remediationApplied, remediationTimestamp]);

  /** All entries — dynamic on top if remediation applied */
  const allEntries: Entry[] = useMemo(() => {
    return dynamicEntry ? [dynamicEntry, ...STATIC_ENTRIES] : STATIC_ENTRIES;
  }, [dynamicEntry]);

  const users = useMemo(() => ["all", ...Array.from(new Set(allEntries.map((e) => e.user)))], [allEntries]);
  const actions = useMemo(() => ["all", ...Array.from(new Set(allEntries.map((e) => e.action)))], [allEntries]);

  const rows = allEntries.filter(
    (e) => (user === "all" || e.user === user) && (action === "all" || e.action === action)
  );

  return (
    <div className="space-y-4">
      {/* Dynamic alert banner when remediation applied */}
      {remediationApplied && (
        <div className="fade-up flex items-center gap-3 rounded-lg border border-green/40 bg-green/8 px-4 py-3 text-[12.5px] font-semibold text-green">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          Remediation simulation logged · WST_02 Remediation Bundle applied by amorgan
          {remediationTimestamp && (
            <span className="ml-auto font-mono text-[11px] text-green/70">
              {new Date(remediationTimestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-app bg-panel p-3">
        <Select label="User" value={user} onChange={setUser} options={users} />
        <Select label="Action" value={action} onChange={setAction} options={actions} />
        <input
          type="date"
          className="rounded-md border border-border-app bg-panel-2 px-2 py-1.5 text-[12px] text-text"
          defaultValue="2024-05-19"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11.5px] text-muted">{rows.length} entries</span>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-teal/40 bg-teal/10 px-3 py-1.5 text-[12px] font-semibold text-teal hover:bg-teal/15">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border-app bg-panel">
        <table className="w-full text-left text-[12.5px]">
          <thead className="bg-panel-2 text-[10.5px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={`border-t border-border-app hover:bg-panel-2/60 transition-colors ${
                  r.dynamic
                    ? "bg-green/5 ring-1 ring-inset ring-green/20"
                    : i % 2 ? "bg-bg/30" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-muted">
                  {r.ts}
                  {r.dynamic && (
                    <span className="ml-2 rounded-full bg-green/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-green">LIVE</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text">{r.user}</td>
                <td className={`px-4 py-2.5 font-medium ${r.dynamic ? "text-green" : "text-text"}`}>{r.action}</td>
                <td className="px-4 py-2.5 text-muted">{r.resource}</td>
                <td className="px-4 py-2.5 font-mono text-muted">{r.ip}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.result === "Success"
                      ? "bg-green/15 text-green"
                      : r.result === "Warning"
                      ? "bg-orange/15 text-orange"
                      : "bg-danger/15 text-danger"
                  }`}>
                    {r.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-[11.5px] text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border-app bg-panel-2 px-2 py-1.5 text-[12px] text-text focus:outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
