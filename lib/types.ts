export type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  system_prompt: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_iterations: number;
  recursion_limit: number;
  is_root: boolean;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type GraphNode = {
  id: string;
  label: string;
  description: string;
  is_root: boolean;
  is_enabled: boolean;
  model_provider: string;
  model_name: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  alias: string;
  description: string;
  is_enabled: boolean;
  memory_mode: string;
};

export type AgentGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type AgentPatch = Partial<
  Pick<
    Agent,
    | "name"
    | "slug"
    | "description"
    | "system_prompt"
    | "model_provider"
    | "model_name"
    | "temperature"
    | "max_iterations"
    | "recursion_limit"
    | "is_root"
    | "is_enabled"
  >
>;

export type TraceEvent = {
  id: string;
  run_id: string;
  parent_event_id: string | null;
  agent_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AgentRun = {
  id: string;
  root_agent_id: string;
  thread_id: string;
  status: string;
  input: string;
  output: string | null;
  started_at: string;
  finished_at: string | null;
};

export type RunResult = {
  run: AgentRun;
  events: TraceEvent[];
};

