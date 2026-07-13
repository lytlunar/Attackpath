import { createFileRoute } from "@tanstack/react-router";
import { AlertOctagon } from "lucide-react";
import { useAegisPath } from "../context/AegisPathContext";

export const Route = createFileRoute("/_app/intelligence-brief")({
  component: IntelligenceBriefPage,
});

function IntelligenceBriefPage() {
  const { canonicalResult: state, canonicalSessionInput, canonicalIsLoading: isLoading } = useAegisPath();

  const isRemediated = canonicalSessionInput.remediationActionId !== null;
  const eventCount = canonicalSessionInput.processedEventCount;

  const currentScore = state?.priorityScore.score || 0;
  const currentBand = state?.priorityScore.band || "Not Calculated";
  const currentStatus = state?.pathStatus || "Awaiting Data";

  const reportStatus = isRemediated
    ? "Remediated"
    : eventCount === 0
      ? "Pending"
      : eventCount === 4
        ? "Critical"
        : "Investigating";

  const auditEntries = state?.auditEntries || [];

  const summaryText = isRemediated
    ? "The active lateral movement path was successfully disrupted. WST_02 was patched, severing the connection to SVC_01 and neutralizing the threat before it could reach the domain controller."
    : eventCount === 0
      ? "No events have been processed yet. Awaiting initial telemetry to generate incident report."
      : eventCount === 4
        ? "A critical attack path has been confirmed. The threat actor has established lateral movement and is positioned to compromise the domain controller. Immediate remediation is required."
        : "An active attack path is currently under investigation. Progression through the network has been detected, but the domain controller has not yet been reached.";

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border-app bg-panel p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border-app bg-panel-2">
            <AlertOctagon className={`h-6 w-6 ${isRemediated ? "text-green" : eventCount === 0 ? "text-muted" : "text-danger"}`} />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">REPORT ID</div>
            <div className="text-[16px] font-mono font-bold text-text">INC-2026-07-05</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">RISK SCORE</div>
            <div
              className={`mt-1 text-[13px] font-bold ${isRemediated ? "text-green" : eventCount === 0 ? "text-muted" : "text-danger"}`}
            >
              {currentBand} ({currentScore})
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">PATH STATUS</div>
            <div
              className={`mt-1 text-[13px] font-bold ${isRemediated ? "text-green" : eventCount === 0 ? "text-muted" : "text-danger"}`}
            >
              {currentStatus}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">STATUS</div>
            <div
              className={`mt-1 text-[13px] font-bold ${isRemediated ? "text-green" : eventCount === 0 ? "text-muted" : eventCount === 4 ? "text-danger" : "text-orange"}`}
            >
              {reportStatus}
            </div>
          </div>
        </div>
      </div>

      <Section title="Executive Summary" eyebrow="REPORT">
        <p className="text-[13px] leading-relaxed text-muted">{summaryText}</p>
      </Section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Remediation Status" eyebrow="RESPONSE OUTCOME">
          <dl className="grid grid-cols-3 gap-y-3 text-[12.5px]">
            {eventCount < 2 ? (
              <>
                <dt className="text-muted">Status</dt>
                <dd className="col-span-2 text-text">Not Available</dd>
                <dt className="text-muted">Reason</dt>
                <dd className="col-span-2 text-text">Chokepoint not yet detected</dd>
              </>
            ) : !isRemediated ? (
              <>
                <dt className="text-muted">Primary Action</dt>
                <dd className="col-span-2 text-text font-mono">Patch WST_02</dd>
                <dt className="text-muted">Status</dt>
                <dd className="col-span-2 text-orange font-bold">Available / Not Applied</dd>
              </>
            ) : (
              <>
                <dt className="text-muted">Action</dt>
                <dd className="col-span-2 text-text font-mono">Patch WST_02</dd>
                <dt className="text-muted">Status</dt>
                <dd className="col-span-2 text-green font-bold">Applied</dd>
                <dt className="text-muted">Chokepoint</dt>
                <dd className="col-span-2 text-text font-mono">WST_02 → SVC_01</dd>
                <dt className="text-muted">Result</dt>
                <dd className="col-span-2 text-text">Disrupted</dd>
                <dt className="text-muted">Security Gain</dt>
                <dd className="col-span-2 text-green font-bold">+{state?.securityGain}</dd>
              </>
            )}
          </dl>
        </Section>

        <Section title="Audit Trail" eyebrow="TIMELINE">
          <ol className="relative ml-3 border-l border-border-app">
            {auditEntries.length > 0 ? (
              auditEntries.map((a, i) => (
                <li key={i} className="mb-4 ml-4">
                  <span
                    className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] ${
                      a.action === "remediation_applied" ? "bg-green text-green" :
                      a.action === "event_processed" ? "bg-danger text-danger" :
                      "bg-teal text-teal"
                    }`}
                  />
                  <div className="font-mono text-[11px] text-muted">
                    {new Date(a.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="text-[12.5px] text-text">
                    {a.action === "remediation_applied" ? "Remediation Applied" :
                     a.action === "event_processed" ? `Threat Event Processed: ${a.details.eventId}` :
                     "Analysis Started"}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {a.action === "remediation_applied" ? "Path mitigated." :
                     a.action === "event_processed" ? `Event triggered graph derivation.` :
                     "Engine initialized."}
                  </div>
                </li>
              ))
            ) : (
              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-border-app" />
                <div className="text-[12.5px] text-text">Awaiting audit events</div>
                <div className="font-mono text-[11px] text-muted">
                  Begin processing events to build the incident timeline.
                </div>
              </li>
            )}
          </ol>
        </Section>
      </div>

      <Section title="Detections & Evidence" eyebrow="OBSERVED INDICATORS">
        <table className="w-full text-left text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wider text-muted">
            <tr>
              <th className="py-2">Type</th>
              <th className="py-2">Technique</th>
              <th className="py-2">Asset</th>
              <th className="py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {(state?.activeDetections || []).map((det) => (
              <tr key={det.id} className="border-t border-border-app">
                <td className="py-2 text-muted">{det.title}</td>
                <td className="py-2 font-mono text-text">{det.classification.mitreAttackId}</td>
                <td className="py-2 font-mono text-text">{det.graphHints?.targetEntityId || "Unknown"}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${det.classification.confidence === "High" ? "bg-danger/15 text-danger" : "bg-orange/15 text-orange"}`}
                  >
                    {det.classification.confidence}
                  </span>
                </td>
              </tr>
            ))}
            {(!state?.activeDetections || state.activeDetections.length === 0) && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted">
                  No evidence processed
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Strategic Assessment" eyebrow="ASSESSMENT">
        <div className="space-y-3">
          {eventCount === 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Attack Path Unconfirmed
              </span>
              <span className="text-[13px] text-text">
                0% active path coverage. No lateral movement established.
              </span>
            </div>
          )}
          {eventCount >= 1 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Confirmed Progression
              </span>
              <span className="text-[13px] text-text font-mono">
                {eventCount === 1
                  ? "USR_03 → WST_02"
                  : eventCount === 2
                    ? "USR_03 → WST_02 → SVC_01"
                    : eventCount === 3
                      ? "USR_03 → WST_02 → SVC_01 → SRV_01"
                      : "USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01"}
              </span>
            </div>
          )}
          {eventCount >= 2 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Controlling Chokepoint
              </span>
              <span className="text-[13px] text-text">
                WST_02 → SVC_01 identified as chokepoint.{" "}
                {isRemediated && (
                  <span className="text-green font-bold ml-1">Path Severed.</span>
                )}
              </span>
            </div>
          )}
          {eventCount === 3 && !isRemediated && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Operational Meaning
              </span>
              <span className="text-[13px] text-text">
                Lateral movement established through SRV_01. DC_01 has not yet been reached.
              </span>
            </div>
          )}
          {isRemediated && (
            <div className="flex flex-col gap-1 rounded-md border border-green/40 bg-green/10 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-green uppercase">
                Path Status
              </span>
              <span className="text-[13px] text-green font-bold">
                Disrupted. Downstream propagation prevented.
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-app bg-panel p-5">
      <div className="text-[10px] font-bold tracking-[0.18em] text-muted">{eyebrow}</div>
      <h2 className="mt-1 text-[16px] font-bold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
