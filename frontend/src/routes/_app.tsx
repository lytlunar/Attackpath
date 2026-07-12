import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Shield,
  Share2,
  CircleAlert,
  FileText,
  ScrollText,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import aegisLogo from "@/assets/aegispath-logo.png";
import { useAegisPath } from "../context/AegisPathContext";

function Phase3Toggle() {
  const { phase3Mode, togglePhase3Mode } = useAegisPath();
  return (
    <button
      onClick={togglePhase3Mode}
      className={`w-full flex items-center justify-between rounded-md border p-2 text-left transition-colors ${
        phase3Mode
          ? "border-teal/50 bg-teal/10 text-teal"
          : "border-border-app bg-panel-2 text-muted hover:border-border-app/80 hover:text-text"
      }`}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-bold tracking-wider">SYNTHETIC SIMULATION</span>
        <span className="text-[9.5px] opacity-80">Phase 3 Ingestion Mode</span>
      </div>
      <div className={`h-3 w-5 rounded-full border border-current p-0.5 transition-colors ${phase3Mode ? "bg-teal/20" : "bg-bg"}`}>
        <div className={`h-1.5 w-1.5 rounded-full bg-current transition-transform ${phase3Mode ? "translate-x-2" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  {
    to: "/overview",
    label: "Overview",
    icon: LayoutGrid,
    title: "Attack Path Overview",
    subtitle: "Live view of active exposure across your identity, endpoint, and directory tier.",
  },
  {
    to: "/threat-events",
    label: "Threat Events",
    icon: Shield,
    title: "Threat Events",
    subtitle: "Attack-path detections enriched with SOC telemetry and MITRE ATT&CK context.",
  },
  {
    to: "/attack-graph",
    label: "Attack Graph",
    icon: Share2,
    title: "Attack Graph",
    subtitle: "Interactive graph of the active attack path and lateral movement.",
  },
  {
    to: "/risk-simulation",
    label: "Risk Simulation",
    icon: CircleAlert,
    title: "Risk Simulation",
    subtitle: "Model remediation actions and see impact on risk in real time.",
  },
  {
    to: "/intelligence-brief",
    label: "Incident Report",
    icon: FileText,
    title: "Incident Report",
    subtitle: "State-driven report on the current campaign and threat actor.",
  },
  {
    to: "/audit-trail",
    label: "Audit Trail",
    icon: ScrollText,
    title: "Audit Trail",
    subtitle: "Chronological record of user and system activity across AegisPath.",
  },
] as const;

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => pathname.startsWith(n.to)) ?? NAV[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text">
      <Sidebar pathname={pathname} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title={current.title} subtitle={current.subtitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside
      className="flex h-full w-[200px] shrink-0 flex-col border-r border-border-app"
      style={{ backgroundColor: "#0B1024" }}
    >
      {/* Brand */}
      <div
        className="flex flex-col items-center gap-3 px-4 pt-7 pb-6"
        style={{ backgroundColor: "#0B1024", borderBottom: "1px solid #232A46" }}
      >
        <img
          src={aegisLogo}
          alt="AegisPath emblem"
          className="h-[108px] w-[108px] object-contain"
        />
        <div
          className="text-center text-[15px] uppercase"
          style={{
            fontFamily: '"Cinzel", serif',
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: "#D8DED9",
          }}
        >
          Aegis Path
        </div>
        <div
          className="text-center uppercase"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 600,
            fontSize: "10px",
            letterSpacing: "0.15em",
            color: "#9AA7A0",
            whiteSpace: "nowrap",
          }}
        >
          See • Simulate • Secure
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                active
                  ? "border border-transparent bg-[#252449] text-text"
                  : "border border-transparent text-muted hover:bg-panel-2 hover:text-text",
              ].join(" ")}
            >
              <Icon className={`h-4 w-4 ${active ? "text-[#9475F7]" : ""}`} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#9475F7]" />}
            </Link>
          );
        })}
      </nav>

      {/* Mode Switcher */}
      <div className="border-t border-border-app p-3">
        <Phase3Toggle />
      </div>

      {/* Threat Intel widget */}
      <div className="border-t border-border-app p-3">
        <div className="rounded-md border border-border-app bg-panel-2/60 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-teal" />
            <span className="text-[10px] font-bold tracking-[0.14em] text-muted">THREAT INTEL</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green/10 px-1.5 py-0.5 text-[9px] font-semibold text-green">
              <span className="h-1 w-1 rounded-full bg-green live-dot" /> Live
            </span>
          </div>
          <svg viewBox="0 0 120 32" className="mt-2 h-8 w-full">
            <path
              d="M0 22 L12 18 L24 24 L36 12 L48 16 L60 8 L72 14 L84 6 L96 12 L108 4 L120 10"
              fill="none"
              stroke="#3ddc97"
              strokeWidth="1.5"
            />
            <path
              d="M0 22 L12 18 L24 24 L36 12 L48 16 L60 8 L72 14 L84 6 L96 12 L108 4 L120 10 L120 32 L0 32 Z"
              fill="#3ddc97"
              opacity="0.15"
            />
          </svg>
          <div className="mt-1 text-[9.5px] text-muted">Feeds synced · 2 min ago</div>
        </div>

        {/* User */}
        <button className="mt-3 flex w-full items-center gap-2 rounded-md border border-transparent p-1.5 text-left hover:border-border-app hover:bg-panel-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
            AM
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-text">Alex Morgan</div>
            <div className="flex items-center gap-1 text-[9.5px] text-muted">
              <span className="h-1 w-1 rounded-full bg-green" />
              Security Analyst · Blue Team
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border-app bg-bg px-6 py-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight text-text">{title}</h1>
        <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button className="flex items-center gap-2 rounded-md border border-border-app bg-panel px-3 py-1.5 text-[12px] text-text hover:bg-panel-2">
          <Calendar className="h-3.5 w-3.5 text-muted" />
          Incident Window: Jul 5, 2026
        </button>
        <div className="flex items-center gap-2 rounded-md border border-border-app bg-panel px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted" />
          <input
            className="w-56 bg-transparent text-[12px] text-text placeholder:text-muted focus:outline-none"
            placeholder="Search assets, events…"
          />
          <kbd className="rounded border border-border-app bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            ⌘K
          </kbd>
        </div>
        <button className="rounded-md border border-border-app bg-panel p-1.5 hover:bg-panel-2">
          <Filter className="h-3.5 w-3.5 text-muted" />
        </button>
        <button className="flex items-center gap-1.5 rounded-md border border-border-app bg-panel px-3 py-1.5 text-[12px] text-text hover:bg-panel-2">
          Blue Team <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </button>
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
            AM
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-green" />
        </div>
      </div>
    </header>
  );
}
