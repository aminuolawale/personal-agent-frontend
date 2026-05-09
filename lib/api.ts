import type { Agent, AgentGraph, AgentPatch, RunResult } from "./types";

const API_BASE_URL = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function seedDefaults(): Promise<{ status: string }> {
  return request("/api/admin/seed", { method: "POST" });
}

export function listAgents(): Promise<Agent[]> {
  return request("/api/agents");
}

export function getGraph(): Promise<AgentGraph> {
  return request("/api/graph");
}

export function updateAgent(agentId: string, patch: AgentPatch): Promise<Agent> {
  return request(`/api/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteConnection(connectionId: string): Promise<void> {
  return request(`/api/connections/${connectionId}`, { method: "DELETE" });
}

export function runAgent(rootAgentId: string, input: string, threadId: string): Promise<RunResult> {
  return request("/api/runs", {
    method: "POST",
    body: JSON.stringify({
      root_agent_id: rootAgentId,
      input,
      thread_id: threadId,
    }),
  });
}

