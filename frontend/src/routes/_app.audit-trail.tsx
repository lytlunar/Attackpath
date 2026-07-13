import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ShieldCheck, Download, AlertTriangle } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/audit-trail")({
  component: AuditTrailPage,
});

type Result = "Success" | "Warning" | "Failure" | "Info";
interface Entry {
  id: string;
  ts: string;
  isoTs?: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
  result: Result;
  dynamic?: boolean;
}

const STATIC_ENTRIES: Entry[] = [
  { id: "s1", ts: "2026-07-05 15:42:11", user: "system", action: "Detection Model Updated", resource: "Path Probability Recalculated", ip: "10.20.4.22", result: "Info" },
  { id: "s2", ts: "2026-07-05 15:42:11", user: "system", action: "Alert Dispatched", resource: "SOC P1 Incident Created", ip: "10.20.4.22", result: "Success" },
  { id: "s3", ts: "2026-07-05 15:42:10", user: "system", action: "Graph Generation", resource: "Attack Path Computed", ip: "10.20.4.22", result: "Info" },
  { id: "s4", ts: "2026-07-05 14:14:33", user: "system", action: "Domain Escalation Detected", resource: "DCSync / DRSUAPI targeting DC_01", ip: "10.20.4.22", result: "Warning" },
  { id: "s5", ts: "2026-07-05 13:29:03", user: "system", action: "Lateral Movement Mapped", resource: "Kerberos/SMB toward SRV_01", ip: "10.20.4.22", result: "Warning" },
  { id: "s6", ts: "2026-07-05 11:00:03", user: "system", action: "Credential Dumping Confirmed", resource: "LSASS MiniDump on WST_02", ip: "10.20.4.22", result: "Warning" },
  { id: "s7", ts: "2026-07-05 08:58:40", user: "system", action: "Initial Access Recorded", resource: "AiTM replay against USR_03", ip: "10.20.4.22", result: "Warning" },
];

function AuditTrailPage() {
  const { canonicalResult: state, canonicalSessionInput, canonicalIsLoading: isLoading, canonicalError: isError } = useAegisPath();

  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const isRemediated = canonicalSessionInput.remediationActionId !== null;
  const remediationTimestamp = state?.auditEntries?.find(e => e.action === "remediation_applied")?.timestamp;

  const allEntries: Entry[] = useMemo(() => {
    const dynamicMapped: Entry[] = (state?.auditEntries || []).map(e => ({
      id: e.id,
      ts: formatDate(e.timestamp),
      isoTs: e.timestamp,
      user: "System Analysis",
      action: e.title || e.action,
      resource: e.description || JSON.stringify(e.details),
      ip: "internal-engine",
      result: e.action === "remediation_applied" ? "Success" : "Info",
      dynamic: true,
    }));

    const dynamicIds = new Set(dynamicMapped.map(e => e.id));

    dynamicMapped.sort((a, b) => {
      const timeA = new Date(a.isoTs || a.ts).getTime();
      const timeB = new Date(b.isoTs || b.ts).getTime();
      const validA = isNaN(timeA) ? 0 : timeA;
      const validB = isNaN(timeB) ? 0 : timeB;
      return validB - validA;
    });

    const staticRemaining = STATIC_ENTRIES.filter(e => !dynamicIds.has(e.id));

    return [...dynamicMapped, ...staticRemaining];
  }, [state]);

  const users = useMemo(() => ["all", ...Array.from(new Set(allEntries.map((e) => e.user)))], [allEntries]);
  const actions = useMemo(() => ["all", ...Array.from(new Set(allEntries.map((e) => e.action)))], [allEntries]);

  const rows = allEntries.filter(
    (e) => (userFilter === "all" || e.user === userFilter) && (actionFilter === "all" || e.action === actionFilter)
  );

  return (
    <div className="space-y-4">
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-[12px] font-semibold text-danger">
          <AlertTriangle className="h-4 w-4" /> Error loading recent audit history. Displaying last valid state.
        </div>
      )}

      {/* Mode Header */}
      <div className="flex items-center gap-2 rounded-lg border px-4 py-3 text-[14px] font-bold border-teal/40 bg-teal/10 text-teal">
        <ShieldCheck className="h-5 w-5" />
        Security Audit Trail
      </div>

      {/* Dynamic alert banner when remediation applied */}
      {isRemediated && !isError && (
        <div className="fade-up flex items-center gap-3 rounded-lg border border-green/40 bg-green/8 px-4 py-3 text-[12.5px] font-semibold text-green">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          Remediation action logged — Target: WST_02
          {remediationTimestamp && (
            <span className="ml-auto font-mono text-[11px] text-green/70">
              {formatDate(remediationTimestamp)}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-app bg-panel p-3">
        <Select label="User" value={userFilter} onChange={setUserFilter} options={users} />
        <Select label="Action" value={actionFilter} onChange={setActionFilter} options={actions} />
        <input
          type="date"
          className="rounded-md border border-border-app bg-panel-2 px-2 py-1.5 text-[12px] text-text"
          defaultValue="2026-07-05"
        />
        <div className="ml-auto flex items-center gap-2">
          {isLoading && (
            <span className="mr-2 text-[11px] font-medium text-muted">Syncing...</span>
          )}
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
                key={r.id}
                className={`border-t border-border-app hover:bg-panel-2/60 transition-colors ${
                  r.dynamic
                    ? "bg-green/5 ring-1 ring-inset ring-green/20"
                    : i % 2 ? "bg-bg/30" : ""
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-muted">
                  {r.ts}
                  {r.dynamic && (
                    <span className="ml-2 rounded-full bg-teal/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-teal">LIVE</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text">{r.user}</td>
                <td className={`px-4 py-2.5 font-medium ${r.dynamic ? "text-teal" : "text-text"}`}>{r.action}</td>
                <td className="px-4 py-2.5 text-muted">{r.resource}</td>
                <td className="px-4 py-2.5 font-mono text-muted">{r.ip}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.result === "Success"
                      ? "bg-green/15 text-green"
                      : r.result === "Warning"
                      ? "bg-orange/15 text-orange"
                      : r.result === "Info"
                      ? "bg-teal/15 text-teal"
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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).replace(",", "");
}
