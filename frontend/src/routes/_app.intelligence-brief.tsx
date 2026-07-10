import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/intelligence-brief")({
  component: IntelligenceBriefPage,
});

const TIMELINE = [
  { ts: "2026-07-05 14:14", event: "Domain Escalation — DCSync / DRSUAPI activity targeting DC_01" },
  { ts: "2026-07-05 13:29", event: "Lateral Movement — Kerberos/SMB movement through SVC_01 toward SRV_01" },
  { ts: "2026-07-05 11:00", event: "Credential Dumping — LSASS MiniDump behavior on WST_02" },
  { ts: "2026-07-05 08:58", event: "Initial Access — AiTM token replay against USR_03" },
];

const IOCS = [
  { type: "Process / DLL", value: "comsvcs.dll", confidence: "High" },
  { type: "Memory Artifact", value: "LSASS MiniDump on WST_02", confidence: "High" },
  { type: "Protocol / Mvt", value: "Kerberos / SMB toward SRV_01", confidence: "Medium" },
  { type: "Replication", value: "DRSUAPI / DCSync activity", confidence: "High" },
];



function IntelligenceBriefPage() {
  return (
    <div className="space-y-4">
      <Section title="Executive Summary" eyebrow="REPORT">
        <p className="text-[13px] leading-relaxed text-muted">
          Analysis of the curated SOC event chain shows session token replay against <span className="font-mono text-text">USR_03</span>, credential dumping on <span className="font-mono text-text">WST_02</span>, lateral movement through <span className="font-mono text-text">SVC_01</span>, and escalation toward <span className="font-mono text-text">DC_01</span>. The controlling chokepoint remains WST_02 → SVC_01. Disrupting the chokepoint is projected to reduce risk from 500 to 120 in the simulation model.
        </p>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Observed Campaign Profile" eyebrow="ACTOR">
          <dl className="grid grid-cols-3 gap-y-3 text-[12.5px]">
            <dt className="text-muted">Attribution</dt><dd className="col-span-2 text-text">Unknown / Unattributed campaign</dd>
            <dt className="text-muted">Initial Access</dt><dd className="col-span-2 text-text">AiTM session token replay against USR_03</dd>
            <dt className="text-muted">Objective</dt><dd className="col-span-2 text-text">Credential exposure and domain escalation</dd>
            <dt className="text-muted">Techniques</dt><dd className="col-span-2 text-text">T1021, T1068, T1003.001, DCSync / DRSUAPI</dd>
            <dt className="text-muted">Signals</dt><dd className="col-span-2 text-text">comsvcs.dll MiniDump, Kerberos/SMB movement</dd>
          </dl>
        </Section>

        <Section title="Attack Timeline" eyebrow="TIMELINE">
          <ol className="relative ml-3 border-l border-border-app">
            {TIMELINE.map((t, i) => (
              <li key={i} className="mb-4 ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-teal shadow-[0_0_10px_#36c2b4]" />
                <div className="font-mono text-[11px] text-muted">{t.ts}</div>
                <div className="text-[12.5px] text-text">{t.event}</div>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      <Section title="Indicators of Compromise" eyebrow="IOCS">
        <table className="w-full text-left text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wider text-muted">
            <tr><th className="py-2">Type</th><th className="py-2">Value</th><th className="py-2">Confidence</th></tr>
          </thead>
          <tbody>
            {IOCS.map((ioc, i) => (
              <tr key={i} className="border-t border-border-app">
                <td className="py-2 text-muted">{ioc.type}</td>
                <td className="py-2 font-mono text-text">{ioc.value}</td>
                <td className="py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ioc.confidence === "High" ? "bg-danger/15 text-danger" : "bg-orange/15 text-orange"}`}>{ioc.confidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Strategic Assessment" eyebrow="ASSESSMENT">
        <div className="space-y-3">
          <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
            <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">Controlling Chokepoint</span>
            <span className="text-[13px] text-text">WST_02 → SVC_01 is the key transition where endpoint compromise becomes service-account exposure.</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
            <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">Operational Meaning</span>
            <span className="text-[13px] text-text">The active path creates an escalation route from USR_03 toward DC_01 through WST_02, SVC_01, and SRV_01.</span>
          </div>
          <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
            <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">Simulation Boundary</span>
            <span className="text-[13px] text-text">This brief identifies the risk pattern only. Projected remediation impact should be evaluated in Risk Simulation before operational execution.</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border-app bg-panel p-5">
      <div className="text-[10px] font-bold tracking-[0.18em] text-muted">{eyebrow}</div>
      <h2 className="mt-1 text-[16px] font-bold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
