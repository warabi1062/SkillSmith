import { useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useFetcher } from "react-router";
import InlineEditableField from "./InlineEditableField";

interface AgentNodeData {
  label: string;
  description: string | null;
  componentType: "AGENT";
  skillType: null;
  componentId: string;
  pluginId: string;
  [key: string]: unknown;
}

export default function AgentNode({
  id,
  data,
}: NodeProps & { data: AgentNodeData }) {
  const { label, description, componentId, pluginId } =
    data as AgentNodeData;
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const { setNodes } = useReactFlow();

  const handleEditStart = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: false } : n)),
    );
  }, [id, setNodes]);

  const handleEditEnd = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: true } : n)),
    );
  }, [id, setNodes]);

  const handleSaveName = useCallback(
    (name: string) => {
      fetcher.submit(
        {
          intent: "update-component",
          componentId,
          name,
          description: description ?? "",
          skillType: "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, description, pluginId],
  );

  const handleSaveDescription = useCallback(
    (newDescription: string) => {
      fetcher.submit(
        {
          intent: "update-component",
          componentId,
          name: label,
          description: newDescription,
          skillType: "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, label, pluginId],
  );

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-header">
        <span className="agent-node-badge">AGENT</span>
      </div>
      <InlineEditableField
        value={label}
        onSave={handleSaveName}
        isLoading={isSaving}
        error={null}
        placeholder="(unnamed)"
        className="agent-node-title"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <InlineEditableField
        value={description ?? ""}
        onSave={handleSaveDescription}
        isLoading={isSaving}
        error={null}
        placeholder="(no description)"
        multiline
        className="agent-node-description"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
