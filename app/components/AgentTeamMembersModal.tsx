import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

interface AgentTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginId: string;
  teamId: string;
  teamName: string;
  members: Array<{
    id: string;
    component: {
      id: string;
      skillConfig: { name: string } | null;
    };
  }>;
  agentComponents: Array<{
    id: string;
    skillConfig: { name: string } | null;
  }>;
}

type ViewState = { type: "list" } | { type: "add" };

export default function AgentTeamMembersModal({
  isOpen,
  onClose,
  pluginId,
  teamId,
  teamName,
  members,
  agentComponents,
}: AgentTeamMembersModalProps) {
  const [view, setView] = useState<ViewState>({ type: "list" });

  const addMemberFetcher = useFetcher<{
    success?: boolean;
    errors?: Record<string, string>;
    values?: Record<string, string>;
  }>();
  const removeMemberFetcher = useFetcher();

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView({ type: "list" });
    }
  }, [isOpen]);

  // Handle successful add member - go back to list
  const prevAddState = useRef(addMemberFetcher.state);
  useEffect(() => {
    if (
      prevAddState.current !== "idle" &&
      addMemberFetcher.state === "idle" &&
      addMemberFetcher.data?.success
    ) {
      setView({ type: "list" });
    }
    prevAddState.current = addMemberFetcher.state;
  }, [addMemberFetcher.state, addMemberFetcher.data]);

  if (!isOpen) return null;

  function renderBreadcrumb() {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "Members", onClick: () => setView({ type: "list" }) },
    ];

    if (view.type === "add") {
      parts.push({ label: "Add Member" });
    }

    return (
      <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1rem" }}>
        {parts.map((part, i) => (
          <span key={i}>
            {i > 0 && " / "}
            {part.onClick ? (
              <button
                type="button"
                onClick={part.onClick}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#2563eb",
                  padding: 0,
                  font: "inherit",
                  textDecoration: "underline",
                }}
              >
                {part.label}
              </button>
            ) : (
              <span style={{ fontWeight: 500 }}>{part.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  function renderList() {
    return (
      <div>
        <div className="component-list-header" style={{ marginBottom: "1rem" }}>
          <span style={{ fontWeight: 500 }}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setView({ type: "add" })}
          >
            Add Member
          </button>
        </div>
        {members.length > 0 ? (
          members.map((member) => (
            <div key={member.id} className="component-item">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span className="component-item-name">
                  {member.component.skillConfig?.name ?? "(unnamed)"}
                </span>
                <span className="badge badge-skill">WORKER + AGENT</span>
              </div>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  const name =
                    member.component.skillConfig?.name ?? "(unnamed)";
                  if (
                    window.confirm(
                      `Remove "${name}" from the team?`,
                    )
                  ) {
                    removeMemberFetcher.submit(
                      {
                        intent: "remove-agent-team-member",
                        teamId,
                        memberId: member.id,
                      },
                      {
                        method: "post",
                        action: `/plugins/${pluginId}`,
                      },
                    );
                  }
                }}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p className="card-description">No members yet.</p>
        )}
      </div>
    );
  }

  function renderAdd() {
    const errors = addMemberFetcher.data?.errors;
    const values = addMemberFetcher.data?.values;
    const isSubmitting = addMemberFetcher.state !== "idle";

    return (
      <div>
        <addMemberFetcher.Form
          method="post"
          action={`/plugins/${pluginId}`}
          style={{ maxWidth: "480px" }}
        >
          <input type="hidden" name="intent" value="add-agent-team-member" />
          <input type="hidden" name="teamId" value={teamId} />

          <div className="form-group">
            <label htmlFor="members-modal-componentId">Worker Skill (with Agent)</label>
            <select
              id="members-modal-componentId"
              name="componentId"
              defaultValue={values?.componentId ?? ""}
              className="form-select"
              required
            >
              <option value="">-- Select a Worker Skill --</option>
              {agentComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.skillConfig?.name ?? "(unnamed)"}
                </option>
              ))}
            </select>
            {errors?.componentId && (
              <div className="form-error">{errors.componentId}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Member"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setView({ type: "list" })}
            >
              Cancel
            </button>
          </div>
        </addMemberFetcher.Form>
      </div>
    );
  }

  function renderContent() {
    switch (view.type) {
      case "list":
        return renderList();
      case "add":
        return renderAdd();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "640px", maxHeight: "80vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Manage Members - {teamName}</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>
        {view.type !== "list" && renderBreadcrumb()}
        {renderContent()}
      </div>
    </div>
  );
}
