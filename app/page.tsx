"use client";

import { Check, Database, GitBranch, Link2Off, Play, RefreshCw, Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AgentGraph } from "../components/AgentGraph";
import { MandelbrotMark } from "../components/MandelbrotMark";
import {
  deleteConnection,
  getGraph,
  listAgents,
  runAgent,
  seedDefaults,
  updateAgent,
} from "../lib/api";
import type { Agent, AgentGraph as AgentGraphType, GraphEdge, RunResult } from "../lib/types";

type LoadState = "idle" | "loading" | "error";

const emptyGraph: AgentGraphType = { nodes: [], edges: [] };

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [graph, setGraph] = useState<AgentGraphType>(emptyGraph);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState<string>("");
  const [runInput, setRunInput] = useState("Say hello using the default worker.");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents.find((agent) => agent.is_root) ?? null,
    [agents, selectedAgentId],
  );

  const selectedConnection = useMemo(
    () => graph.edges.find((edge) => edge.id === selectedConnectionId) ?? null,
    [graph.edges, selectedConnectionId],
  );

  const rootAgent = useMemo(
    () => agents.find((agent) => agent.is_root) ?? selectedAgent,
    [agents, selectedAgent],
  );

  async function refresh() {
    setLoadState("loading");
    setMessage("");
    try {
      const [agentList, graphData] = await Promise.all([listAgents(), getGraph()]);
      setAgents(agentList);
      setGraph(graphData);
      setSelectedAgentId((current) => current ?? agentList.find((agent) => agent.is_root)?.id ?? agentList[0]?.id ?? null);
      setLoadState("idle");
    } catch (error) {
      setLoadState("error");
      setMessage(error instanceof Error ? error.message : "Could not load agent data.");
    }
  }

  async function handleSeed() {
    setMessage("");
    try {
      await seedDefaults();
      await refresh();
      setMessage("Default planner and Hello World worker are seeded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not seed defaults.");
    }
  }

  async function handleSaveAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAgent) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsSaving(true);
    setMessage("");
    try {
      await updateAgent(selectedAgent.id, {
        name: String(form.get("name") ?? ""),
        slug: String(form.get("slug") ?? ""),
        description: String(form.get("description") ?? ""),
        system_prompt: String(form.get("system_prompt") ?? ""),
        model_provider: String(form.get("model_provider") ?? "mock"),
        model_name: String(form.get("model_name") ?? "mock-planner"),
        temperature: Number(form.get("temperature") ?? 0.2),
        max_iterations: Number(form.get("max_iterations") ?? 8),
        recursion_limit: Number(form.get("recursion_limit") ?? 4),
        is_enabled: form.get("is_enabled") === "on",
      });
      await refresh();
      setMessage("Agent saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save agent.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect(connection: GraphEdge) {
    setMessage("");
    try {
      await deleteConnection(connection.id);
      setSelectedConnectionId(null);
      await refresh();
      setMessage(`Disconnected ${connection.alias}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disconnect agents.");
    }
  }

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const agent = selectedAgent ?? rootAgent;
    if (!agent || runInput.trim().length === 0) {
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setMessage("");
    try {
      const result = await runAgent(agent.id, runInput.trim(), "ui-thread");
      setRunResult(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not run agent.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main>
      <div className="page">
        <header className="site-header">
          <div className="identity">
            <MandelbrotMark />
          </div>
          <nav className="top-nav" aria-label="Main navigation">
            <a href="#graph"><span>01.</span>Graph</a>
            <a href="#editor"><span>02.</span>Editor</a>
            <a href="#run"><span>03.</span>Run</a>
            <a href="#settings"><span>04.</span>Settings</a>
          </nav>
        </header>

        <section className="hero">
          <p className="eyebrow">Personal planner runtime</p>
          <h1>Planner agents for delegated personal work.</h1>
          <p className="intro">
            Configure a root planner, attach worker planners, inspect the delegation graph, and run the
            recursive agent tree against a Neon-backed LangGraph runtime.
          </p>
        </section>

        <section className="status-strip" id="settings">
          <p>
            <strong>Root planner:</strong> {rootAgent?.name ?? "Not seeded"}.
            <strong> Agents:</strong> {agents.length}.
            <strong> Connections:</strong> {graph.edges.length}.
          </p>
          <div className="status-actions">
            <button className="text-button" type="button" onClick={() => void refresh()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="text-button" type="button" onClick={() => void handleSeed()}>
              <Database size={14} /> Seed defaults
            </button>
          </div>
        </section>

        {message ? (
          <p className={`notice ${loadState === "error" ? "is-error" : ""}`}>
            {loadState === "error" ? "Backend error: " : ""}
            {message}
          </p>
        ) : null}

        <section className="workspace" id="graph">
          <div className="graph-panel" aria-label="Planner graph">
            {graph.nodes.length > 0 ? (
              <AgentGraph
                graph={graph}
                selectedAgentId={selectedAgent?.id ?? null}
                selectedConnectionId={selectedConnectionId}
                onSelectAgent={(agentId) => {
                  setSelectedAgentId(agentId);
                  setSelectedConnectionId(null);
                }}
                onSelectConnection={setSelectedConnectionId}
              />
            ) : (
              <div className="empty-state">
                <GitBranch size={24} />
                <p>No agents are loaded. Seed the default planner to begin.</p>
              </div>
            )}
          </div>

          <aside className="side-panel" id="editor">
            <h2>Selected item</h2>
            <p className="lede">Edit planner text, model settings, and delegation edges.</p>

            {selectedConnection ? (
              <ConnectionPanel connection={selectedConnection} graph={graph} onDisconnect={handleDisconnect} />
            ) : null}

            {selectedAgent ? (
              <AgentEditor agent={selectedAgent} isSaving={isSaving} onSubmit={handleSaveAgent} />
            ) : (
              <p>Select or seed an agent to edit it.</p>
            )}
          </aside>
        </section>

        <section className="run-console" id="run">
          <div>
            <h2>Run console</h2>
            <p className="lede">Run the selected planner and inspect the trace from planner to worker.</p>
          </div>
          <form className="run-form" onSubmit={handleRun}>
            <textarea
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              rows={3}
              aria-label="Run input"
            />
            <button className="primary-button" type="submit" disabled={!selectedAgent || isRunning}>
              <Play size={14} /> {isRunning ? "Running" : "Run selected agent"}
            </button>
          </form>

          {runResult ? (
            <div className="run-output">
              <div>
                <h3>Output</h3>
                <p>{runResult.run.output}</p>
              </div>
              <div>
                <h3>Trace</h3>
                <ol className="trace-list">
                  {runResult.events.map((event) => (
                    <li key={event.id}>
                      <span>{event.event_type}</span>
                      <code>{formatPayload(event.payload)}</code>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}
        </section>

        <footer className="site-footer">
          <p>Designed for recursive planners. Built on LangGraph, LangChain, FastAPI, Next.js, and Neon.</p>
        </footer>
      </div>
    </main>
  );
}

function ConnectionPanel({
  connection,
  graph,
  onDisconnect,
}: {
  connection: GraphEdge;
  graph: AgentGraphType;
  onDisconnect: (connection: GraphEdge) => void;
}) {
  const source = graph.nodes.find((node) => node.id === connection.source);
  const target = graph.nodes.find((node) => node.id === connection.target);

  return (
    <section className="connection-panel">
      <h2>Selected connection</h2>
      <dl>
        <dt>Parent</dt>
        <dd>{source?.label ?? connection.source}</dd>
        <dt>Worker planner</dt>
        <dd>{target?.label ?? connection.target}</dd>
        <dt>Tool alias</dt>
        <dd>
          <code>{connection.alias}</code>
        </dd>
        <dt>Memory</dt>
        <dd>{connection.memory_mode}</dd>
      </dl>
      <button className="danger-button" type="button" onClick={() => onDisconnect(connection)}>
        <Link2Off size={16} /> Disconnect agents
      </button>
    </section>
  );
}

function AgentEditor({
  agent,
  isSaving,
  onSubmit,
}: {
  agent: Agent;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="agent-form" onSubmit={onSubmit} key={agent.id}>
      <h2>{agent.is_root ? "Root planner" : "Worker planner"}</h2>
      <label>
        Name
        <input name="name" defaultValue={agent.name} />
      </label>
      <label>
        Slug
        <input name="slug" defaultValue={agent.slug} />
      </label>
      <label>
        Description
        <textarea name="description" defaultValue={agent.description} rows={3} />
      </label>
      <label>
        System prompt
        <textarea name="system_prompt" defaultValue={agent.system_prompt} rows={8} />
      </label>
      <div className="form-grid">
        <label>
          Provider
          <input name="model_provider" defaultValue={agent.model_provider} />
        </label>
        <label>
          Model
          <input name="model_name" defaultValue={agent.model_name} />
        </label>
        <label>
          Temperature
          <input name="temperature" type="number" step="0.1" min="0" max="2" defaultValue={agent.temperature} />
        </label>
        <label>
          Max iterations
          <input name="max_iterations" type="number" min="1" max="64" defaultValue={agent.max_iterations} />
        </label>
        <label>
          Recursion limit
          <input name="recursion_limit" type="number" min="1" max="16" defaultValue={agent.recursion_limit} />
        </label>
        <label className="checkbox-label">
          <input name="is_enabled" type="checkbox" defaultChecked={agent.is_enabled} />
          Enabled
        </label>
      </div>
      <button className="primary-button" type="submit" disabled={isSaving}>
        {isSaving ? <RefreshCw size={16} /> : <Save size={16} />}
        {isSaving ? "Saving" : "Save agent"}
      </button>
      <p className="saved-note">
        <Check size={14} /> Workers use the same planner schema as the root planner.
      </p>
    </form>
  );
}

function formatPayload(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload);
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
