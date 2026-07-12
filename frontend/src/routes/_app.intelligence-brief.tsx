import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/intelligence-brief")({
  component: IntelligenceBriefPage,
});

import { useAegisPath } from "../context/AegisPathContext";

function IntelligenceBriefPage() {
  const { scenarioState, isLoading, isError, error, replayStep, remediationApplied } =
    useAegisPath();

  if (isLoading || !scenarioState) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-teal/40 bg-teal/8 px-4 py-3">
        <span className="text-[12.5px] font-semibold text-teal">Loading incident report...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/8 px-4 py-3">
        <span className="text-[12.5px] font-semibold text-danger">
          Error loading report: {error?.message}
        </span>
      </div>
    );
  }

  const incident = scenarioState.incidentReport;

  const reportStatus = remediationApplied
    ? "Threat Contained"
    : replayStep === 0
      ? "Report Pending"
      : replayStep === 4
        ? "Incident Confirmed"
        : "Investigation Active";

  let summaryText = "";
  if (replayStep === 0) {
    summaryText =
      "No threat events processed. Incident progression not confirmed. Awaiting event ingestion.";
  } else if (remediationApplied) {
    summaryText =
      "Patch WST_02 severed the chokepoint. Previously observed events remain historical facts. Onward propagation is disrupted and the threat is contained.";
  } else if (replayStep === 1) {
    summaryText = "Suspicious activity links USR_03 to WST_02. Investigation remains incomplete.";
  } else if (replayStep === 2) {
    summaryText =
      "Progression through WST_02 → SVC_01 is confirmed. Chokepoint is identified and remediation is available.";
  } else if (replayStep === 3) {
    summaryText =
      "Lateral movement through SRV_01 is confirmed. DC_01 has not yet been reached. Current risk is Critical.";
  } else if (replayStep === 4) {
    summaryText =
      "Full canonical attack path is confirmed. DC_01 was reached. The controlling chokepoint remains WST_02 → SVC_01.";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border-app bg-panel p-4 mb-4">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted">INCIDENT ID</div>
          <div className="mt-1 text-[13px] text-text font-mono">
            IR-{new Date(incident.generatedAt).getTime().toString().slice(-6)}
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">RISK RATING</div>
            <div
              className={`mt-1 text-[13px] font-bold ${scenarioState.score.label === "Critical" || scenarioState.score.label === "High" ? "text-danger" : "text-orange"}`}
            >
              {scenarioState.score.label} ({scenarioState.score.total})
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">PATH STATUS</div>
            <div
              className={`mt-1 text-[13px] font-bold ${remediationApplied ? "text-green" : replayStep === 0 ? "text-muted" : "text-danger"}`}
            >
              {scenarioState.pathStatus}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-[0.18em] text-muted">STATUS</div>
            <div
              className={`mt-1 text-[13px] font-bold ${remediationApplied ? "text-green" : replayStep === 0 ? "text-muted" : replayStep === 4 ? "text-danger" : "text-orange"}`}
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
            {replayStep < 2 ? (
              <>
                <dt className="text-muted">Status</dt>
                <dd className="col-span-2 text-text">Not Available</dd>
                <dt className="text-muted">Reason</dt>
                <dd className="col-span-2 text-text">Chokepoint not yet detected</dd>
              </>
            ) : !remediationApplied ? (
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
                <dd className="col-span-2 text-green font-bold">+{scenarioState.securityGain}</dd>
              </>
            )}
          </dl>
        </Section>

        <Section title="Attack Timeline" eyebrow="TIMELINE">
          <ol className="relative ml-3 border-l border-border-app">
            {scenarioState.activeEvents.length > 0 ? (
              scenarioState.activeEvents.map((t, i) => (
                <li key={t.id} className="mb-4 ml-4">
                  <span
                    className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] ${i === 1 ? "bg-danger text-danger" : "bg-teal text-teal"}`}
                  />
                  <div className="font-mono text-[11px] text-muted">
                    {new Date(t.timestamp).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="text-[12.5px] text-text">
                    {t.message}{" "}
                    {i === 1 && (
                      <span className="ml-1 text-[10px] font-bold text-danger uppercase">
                        [CHOKEPOINT]
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    Source: {t.source} · Node: {t.nodeId}
                  </div>
                </li>
              ))
            ) : (
              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-border-app" />
                <div className="text-[12.5px] text-text">Awaiting threat events</div>
                <div className="font-mono text-[11px] text-muted">
                  Begin the replay to build the incident timeline from observed evidence.
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
            {scenarioState.activeDetections.map((det) => (
              <tr key={det.detectionId} className="border-t border-border-app">
                <td className="py-2 text-muted">{det.detectionType}</td>
                <td className="py-2 font-mono text-text">{det.technique}</td>
                <td className="py-2 font-mono text-text">{det.nodeId}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${det.confidence === "High" ? "bg-danger/15 text-danger" : "bg-orange/15 text-orange"}`}
                  >
                    {det.confidence}
                  </span>
                </td>
              </tr>
            ))}
            {scenarioState.activeDetections.length === 0 && (
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
          {replayStep === 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Attack Path Unconfirmed
              </span>
              <span className="text-[13px] text-text">
                0% active path coverage. No lateral movement established.
              </span>
            </div>
          )}
          {replayStep >= 1 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Confirmed Progression
              </span>
              <span className="text-[13px] text-text font-mono">
                {replayStep === 1
                  ? "USR_03 → WST_02"
                  : replayStep === 2
                    ? "USR_03 → WST_02 → SVC_01"
                    : replayStep === 3
                      ? "USR_03 → WST_02 → SVC_01 → SRV_01"
                      : "USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01"}
              </span>
            </div>
          )}
          {replayStep >= 2 && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Controlling Chokepoint
              </span>
              <span className="text-[13px] text-text">
                WST_02 → SVC_01 identified as chokepoint.{" "}
                {remediationApplied && (
                  <span className="text-green font-bold ml-1">Path Severed.</span>
                )}
              </span>
            </div>
          )}
          {replayStep === 3 && !remediationApplied && (
            <div className="flex flex-col gap-1 rounded-md border border-border-app bg-bg/60 p-3">
              <span className="text-[11.5px] font-bold tracking-wide text-muted uppercase">
                Operational Meaning
              </span>
              <span className="text-[13px] text-text">
                Lateral movement established through SRV_01. DC_01 has not yet been reached.
              </span>
            </div>
          )}
          {remediationApplied && (
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
