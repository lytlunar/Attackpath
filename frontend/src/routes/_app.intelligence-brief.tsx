import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/intelligence-brief")({
  component: IntelligenceBriefPage,
});

const TIMELINE = [
  { ts: "May 19, 13:35", event: "DCSync attempt against DC_01 from SRV_01" },
  { ts: "May 19, 13:22", event: "Kerberoasting: TGS-REQ for SVC_01 in RC4-HMAC" },
  { ts: "May 19, 12:12", event: "LSASS memory dumped on WST_02" },
  { ts: "May 19, 11:44", event: "Golden ticket issuance observed" },
  { ts: "May 18, 22:07", event: "Initial phishing payload executed by USR_03" },
];

const IOCS = [
  { type: "SHA256", value: "9f2c…a1e4b7", confidence: "High" },
  { type: "Domain", value: "cdn-updater[.]tools", confidence: "High" },
  { type: "IP", value: "203.0.113.42", confidence: "Medium" },
  { type: "Mutex", value: "Global\\svc_ldr_1", confidence: "Medium" },
];

const ACTIONS = [
  { priority: "P0", text: "Patch WST_02 (CVE-2024-XXXX) within 24 hours." },
  { priority: "P0", text: "Rotate SVC_01 credentials and invalidate all Kerberos tickets." },
  { priority: "P1", text: "Enforce SMB signing and disable NTLMv1 domain-wide." },
  { priority: "P1", text: "Segment SRV_01 into privileged tier network." },
  { priority: "P2", text: "Add detection rule for lsass.exe MiniDump via comsvcs.dll." },
];

function IntelligenceBriefPage() {
  return (
    <div className="space-y-4">
      <Section title="Executive Summary" eyebrow="REPORT">
        <p className="text-[13px] leading-relaxed text-muted">
          An adversary consistent with the tactics of <span className="font-semibold text-text">APT-Nightshade</span> has
          established a foothold via phished user <span className="font-mono text-text">USR_03</span>, escalated on the
          unpatched workstation <span className="font-mono text-text">WST_02</span>, and pivoted to the
          high-privilege service account <span className="font-mono text-text">SVC_01</span>. Reaching
          <span className="font-mono text-text"> DC_01</span> would result in full domain compromise. Immediate patching
          of the chokepoint (WST_02) reduces projected risk from 500 to 120.
        </p>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Threat Actor Profile" eyebrow="ACTOR">
          <dl className="grid grid-cols-3 gap-y-3 text-[12.5px]">
            <dt className="text-muted">Alias</dt><dd className="col-span-2 text-text">APT-Nightshade (a.k.a. Iron Kite)</dd>
            <dt className="text-muted">Origin</dt><dd className="col-span-2 text-text">State-aligned, Eurasia</dd>
            <dt className="text-muted">Motive</dt><dd className="col-span-2 text-text">Espionage, credential harvesting</dd>
            <dt className="text-muted">TTPs</dt><dd className="col-span-2 text-text">T1078 · T1068 · T1003 · T1021.002 · T1558</dd>
            <dt className="text-muted">Toolset</dt><dd className="col-span-2 text-text">Mimikatz variant, custom loader, LOLBAS</dd>
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

      <Section title="Recommended Actions" eyebrow="PLAYBOOK">
        <ol className="space-y-2">
          {ACTIONS.map((a, i) => (
            <li key={i} className="flex items-start gap-3 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="font-mono text-[12px] font-bold text-muted">{i + 1}.</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${a.priority === "P0" ? "bg-danger/15 text-danger" : a.priority === "P1" ? "bg-orange/15 text-orange" : "bg-teal/15 text-teal"}`}>{a.priority}</span>
              <span className="text-[13px] text-text">{a.text}</span>
            </li>
          ))}
        </ol>
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
