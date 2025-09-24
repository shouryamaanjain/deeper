import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Moon,
  Pause,
  Play,
  RotateCw,
  Sparkles,
  Sun,
  TriangleAlert,
} from "lucide-react";

type Phase =
  | "idle"
  | "analyzing"
  | "decomposing"
  | "researching"
  | "aggregating"
  | "synthesizing"
  | "completed"
  | "error";

type SubQueryStatus = "queued" | "active" | "completed" | "failed";

type SubQuery = {
  id: string;
  text: string;
  status: SubQueryStatus;
  progress: number;
  sources: number;
  confidence?: number;
  snippet?: string;
  startedAt?: number;
  endedAt?: number;
};

type ActivityItem = {
  t: number;
  msg: string;
};

function useThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);
  return { dark, setDark } as const;
}

export default function DeeperApp() {
  const { dark, setDark } = useThemeToggle();
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [overall, setOverall] = useState(0);
  const [eta, setEta] = useState<number | undefined>();
  const [subqueries, setSubqueries] = useState<SubQuery[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reportMd, setReportMd] = useState<string>("");
  const [reportJson, setReportJson] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const addActivity = (msg: string) =>
    setActivity((a) => [{ t: Date.now(), msg }, ...a].slice(0, 200));

  const complexityScore = useMemo(() => {
    const factors = [
      /\bcompare|vs\b/i.test(query) ? 0.2 : 0,
      /\btrend|latest|recent\b/i.test(query) ? 0.2 : 0,
      /\bhistory|historical|timeline\b/i.test(query) ? 0.15 : 0,
      /\bforecast|future|prediction\b/i.test(query) ? 0.15 : 0,
      /\bexpert|opinion|insight\b/i.test(query) ? 0.15 : 0,
      query.split(/[,;:.!?]/).length > 2 ? 0.15 : 0,
    ];
    return Math.min(1, 0.3 + factors.reduce((a, b) => a + b, 0));
  }, [query]);

  const desiredSubqueryCount = useMemo(() => {
    return Math.min(10, Math.max(5, Math.round(5 + complexityScore * 5)));
  }, [complexityScore]);

  function generateSubqueries(q: string): SubQuery[] {
    const seeds = [
      "Direct answer",
      "Context/background",
      "Comparative analysis",
      "Recent developments",
      "Expert insights",
      "Industry-specific angle",
      "Historical context",
      "Future implications",
      "Validation & fact-checking",
      "Related topics expansion",
    ];
    const items = seeds.slice(0, desiredSubqueryCount).map((s, i) => ({
      id: `${Date.now()}-${i}`,
      text: `${s}: ${q}`,
      status: i < 5 ? "queued" : "queued",
      progress: 0,
      sources: 0,
    }));
    return items;
  }

  const controllerRef = useRef<AbortController | null>(null);

  async function startResearch() {
    if (!query.trim()) return;
    setReportMd("");
    setReportJson(null);
    setPaused(false);
    setOverall(0);
    setEta(undefined);
    setActivity([]);
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    setPhase("analyzing");
    addActivity("Analyzing query complexity...");

    const subs = generateSubqueries(query);
    setSubqueries(subs);

    if (demoMode) {
      runDemo(subs);
      return;
    }

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      addActivity(`Generated ${data.subqueries} sub-queries`);
      setPhase("decomposing");
      connectStream(data.sessionId);
    } catch (e) {
      setPhase("error");
      addActivity("Failed to start research session.");
    }
  }

  function connectStream(id: string) {
    const ev = new EventSource(`/api/stream/${id}`);
    ev.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.type === "status") setPhase(payload.phase);
      if (payload.type === "activity") addActivity(payload.message);
      if (payload.type === "overall_progress") {
        setOverall(payload.percent);
        setEta(payload.etaSeconds);
      }
      if (payload.type === "subqueries") setSubqueries(payload.items);
      if (payload.type === "subquery_update")
        setSubqueries((list) =>
          list.map((sq) =>
            sq.id === payload.id
              ? {
                  ...sq,
                  status: payload.status ?? sq.status,
                  progress: payload.progress ?? sq.progress,
                  sources: payload.sources ?? sq.sources,
                  snippet: payload.snippet ?? sq.snippet,
                  confidence: payload.confidence ?? sq.confidence,
                }
              : sq
          )
        );
      if (payload.type === "final_report") {
        setReportMd(payload.reportMd);
        setReportJson(payload.reportJson ?? null);
      }
    };
    ev.onerror = () => {
      addActivity("Stream connection lost. Retrying...");
      ev.close();
      setTimeout(() => connectStream(id), 1000);
    };
  }

  function runDemo(seed: SubQuery[]) {
    setPhase("decomposing");
    addActivity(`Generated ${seed.length} sub-queries`);

    setTimeout(() => {
      setPhase("researching");
      addActivity("Parallel execution started (speed model)...");

      const start = Date.now();
      const local = seed.map((s, i) => ({ ...s, status: "active" as const, startedAt: Date.now() + i * 200 }));
      setSubqueries(local);

      const timers: number[] = [];

      function updateOverall() {
        setOverall((local.reduce((a, b) => a + b.progress, 0) / (local.length || 1)) | 0);
        const avgRate = local.reduce((a, b) => a + b.progress, 0) / (local.length || 1);
        const speed = avgRate / ((Date.now() - start) / 1000 + 1);
        const remaining = Math.max(0, 100 - avgRate);
        const etaS = remaining / Math.max(0.5, speed);
        setEta(Math.round(etaS));
      }

      local.forEach((sq, idx) => {
        const interval = window.setInterval(() => {
          if (paused) return;
          sq.progress = Math.min(100, sq.progress + 2 + Math.random() * 4);
          if (Math.random() < 0.3 && sq.progress < 95) sq.sources += 1;
          if (Math.random() < 0.2) sq.snippet = generateSnippet(query, sq.text);
          setSubqueries((prev) => prev.map((p) => (p.id === sq.id ? { ...sq } : p)));
          updateOverall();
          if (sq.progress >= 100) {
            sq.status = "completed";
            sq.endedAt = Date.now();
            setSubqueries((prev) => prev.map((p) => (p.id === sq.id ? { ...sq } : p)));
            window.clearInterval(interval);
          }
        }, 120 + Math.random() * 120);
        timers.push(interval);
      });

      const doneWatcher = window.setInterval(() => {
        if (local.every((x) => x.progress >= 100)) {
          window.clearInterval(doneWatcher);
          setPhase("aggregating");
          addActivity("Aggregating all research responses...");
          setTimeout(() => {
            setPhase("synthesizing");
            addActivity("Sending consolidated data to GPT-5 for synthesis...");
            setTimeout(() => {
              const md = synthesizeDemoReport(query, local);
              setReportMd(md);
              setReportJson({ query, subqueries: local, generatedAt: new Date().toISOString() });
              setPhase("completed");
              setOverall(100);
              setEta(0);
              addActivity("Research completed. Report ready.");
            }, 1800);
          }, 1200);
        }
      }, 400);
    }, 900);
  }

  function generateSnippet(q: string, sq: string) {
    const bits = [
      "Identified key sources with strong consensus.",
      "Contrasting viewpoints suggest nuanced interpretation.",
      "Preliminary data indicates an upward trend.",
      "Expert commentary highlights emerging risks.",
      "Multiple sources confirm historical baseline.",
    ];
    return `${sq.split(":")[0]} — ${bits[Math.floor(Math.random() * bits.length)]}`;
  }

  function synthesizeDemoReport(q: string, items: SubQuery[]) {
    const done = items.filter((i) => i.status === "completed").length;
    return `# Research Report\n\n**Executive Summary**\n\nWe conducted parallel research for: \n\n> ${q}\n\n${done} threads completed successfully with comprehensive coverage including background, comparisons, recent developments, expert insights, and validation.\n\n**Methodology**\n\n- Automatic complexity analysis determined ${items.length} sub-queries.\n- Executed concurrently with streaming updates and real-time progress.\n- Aggregated findings and synthesized via GPT-5.\n\n**Highlights**\n\n${items
      .slice(0, 5)
      .map((i) => `- ${i.text} — ${i.sources} sources, ~${Math.round((i.confidence ?? 0.85) * 100)}% confidence.`)
      .join("\n")}\n\n**Bibliography**\n\nSee structured JSON export for consolidated citations.`;
  }

  const overallColor =
    phase === "completed"
      ? "bg-green-500"
      : phase === "error"
      ? "bg-red-500"
      : phase === "researching"
      ? "bg-blue-500"
      : "bg-yellow-500";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={18} />
            <span className="font-semibold">Deeper</span>
            <Badge variant="outline" className="ml-2">Parallel Deep Research</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sun size={14} />
              <Switch checked={dark} onCheckedChange={setDark} />
              <Moon size={14} />
            </div>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Demo mode</span>
              <Switch checked={demoMode} onCheckedChange={setDemoMode} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Ask anything</CardTitle>
              <div className="text-sm text-muted-foreground">We will intelligently decompose your query and run parallel deep research with real-time progress.</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., What are the latest developments, risks, and future outlook of open-weight AI models vs closed-weight models?"
                  className="flex-1"
                />
                <Button size="lg" onClick={startResearch} className="group">
                  <span>Research</span>
                  <ArrowRight className="ml-1 transition-transform group-hover:translate-x-0.5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPaused((p) => !p)}
                  disabled={phase === "idle" || phase === "completed"}
                >
                  {paused ? (
                    <span className="inline-flex items-center gap-2"><Play size={16} /> Resume</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><Pause size={16} /> Pause</span>
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Complexity score: <b>{Math.round(complexityScore * 100)}</b></span>
                <span>Sub-queries: <b>{desiredSubqueryCount}</b></span>
                <span>ETA: <b>{eta ? `${eta}s` : "–"}</b></span>
                <span>Session: <b>{sessionId ?? "–"}</b></span>
              </div>

              <div className="mt-2">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <div className="inline-flex items-center gap-2">
                    {phase === "researching" && <CircleDot className="text-blue-500 animate-pulse" size={14} />}
                    {phase === "completed" && <CheckCircle2 className="text-green-500" size={14} />}
                    {phase === "error" && <TriangleAlert className="text-red-500" size={14} />}
                    <span className="uppercase tracking-wide text-muted-foreground">Overall Progress</span>
                  </div>
                  <span className="text-muted-foreground">{overall}%</span>
                </div>
                <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden")}>
                  <div
                    className={cn("h-full transition-all duration-300", overallColor)}
                    style={{ width: `${overall}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sub-queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {subqueries.map((sq) => (
                  <div key={sq.id} className={cn("rounded-lg border p-3", sq.status === "failed" && "border-red-500/40")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium line-clamp-2">{sq.text}</div>
                        <div className="text-xs text-muted-foreground">{sq.sources} sources • {sq.progress | 0}%</div>
                      </div>
                      <Badge
                        className={cn(
                          sq.status === "active" && "bg-blue-600",
                          sq.status === "completed" && "bg-green-600",
                          sq.status === "queued" && "bg-yellow-600",
                          sq.status === "failed" && "bg-red-600"
                        )}
                      >
                        {sq.status}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <Progress value={sq.progress} />
                    </div>
                    {sq.snippet && (
                      <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground line-clamp-3">
                        {sq.snippet}
                      </div>
                    )}
                  </div>
                ))}
                {subqueries.length === 0 && (
                  <div className="text-sm text-muted-foreground">No sub-queries yet. Enter a query and click Research.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="report">
                <TabsList>
                  <TabsTrigger value="report">Report</TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="report" className="prose prose-invert max-w-none">
                  {reportMd ? (
                    <pre className="whitespace-pre-wrap text-sm leading-6">{reportMd}</pre>
                  ) : (
                    <div className="text-sm text-muted-foreground">Report will appear here after synthesis.</div>
                  )}
                </TabsContent>
                <TabsContent value="sources">
                  <div className="text-sm text-muted-foreground">Citations and bibliography will be compiled in the final output.</div>
                </TabsContent>
                <TabsContent value="json">
                  <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(
                      {
                        query,
                        sessionId,
                        phase,
                        overall,
                        eta,
                        subqueries,
                        reportJson,
                      },
                      null,
                      2
                    )}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activity.length === 0 && (
                  <div className="text-sm text-muted-foreground">No activity yet. Start a research session to see live updates.</div>
                )}
                {activity.map((a, i) => (
                  <div key={a.t + "-" + i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity size={14} className="text-primary" />
                    <span>{new Date(a.t).toLocaleTimeString()} — {a.msg}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full">
                <RotateCw size={16} className="mr-2" /> Rerun with alternative formulations
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline">Export Markdown</Button>
                <Button variant="outline">Export JSON</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
