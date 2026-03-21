import { useCallback } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useFetcher } from "react-router";
import InlineEditableField from "./InlineEditableField";

interface SkillNodeData {
  label: string;
  description: string | null;
  componentType: "SKILL";
  skillType: string | null;
  componentId: string;
  pluginId: string;
  [key: string]: unknown;
}

export default function SkillNode({
  id,
  data,
}: NodeProps & { data: SkillNodeData }) {
  const { label, description, skillType, componentId, pluginId } =
    data as SkillNodeData;
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
          skillType: skillType ?? "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, description, skillType, pluginId],
  );

  const handleSaveDescription = useCallback(
    (newDescription: string) => {
      fetcher.submit(
        {
          intent: "update-component",
          componentId,
          name: label,
          description: newDescription,
          skillType: skillType ?? "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, label, skillType, pluginId],
  );

  return (
    <div className="skill-node">
      <Handle type="target" position={Position.Top} />
      <div className="skill-node-header">
        <span className="skill-node-badge">SKILL</span>
        {skillType && (
          <span className="skill-node-skill-type">{skillType}</span>
        )}
      </div>
      <InlineEditableField
        value={label}
        onSave={handleSaveName}
        isLoading={isSaving}
        error={null}
        placeholder="(unnamed)"
        className="skill-node-title"
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
        className="skill-node-description"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
