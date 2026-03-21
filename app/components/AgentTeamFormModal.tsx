import { useEffect, useRef } from "react";
import type { useFetcher } from "react-router";

interface AgentTeamFetcherData {
  success?: boolean;
  teamId?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

interface EntryPointSkill {
  id: string;
  skillConfig: { name: string | null } | null;
}

interface AgentTeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryPointSkills: EntryPointSkill[];
  fetcher: ReturnType<typeof useFetcher<AgentTeamFetcherData>>;
  pluginId: string;
}

export default function AgentTeamFormModal({
  isOpen,
  onClose,
  entryPointSkills,
  fetcher,
  pluginId,
}: AgentTeamFormModalProps) {
  // Close modal on successful submission
  // Track previous fetcher.state via ref so we only close when transitioning
  // from a non-idle state (submitting/loading) back to idle with success.
  // Without this, reopening the modal would immediately close because
  // fetcher.data.success persists from the previous submission.
  const prevFetcherState = useRef(fetcher.state);
  useEffect(() => {
    if (
      prevFetcherState.current !== "idle" &&
      fetcher.state === "idle" &&
      fetcher.data?.success
    ) {
      onClose();
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, onClose]);

  if (!isOpen) return null;

  const errors = fetcher.data?.errors as
    | Record<string, string>
    | undefined;
  const isSubmitting = fetcher.state !== "idle";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Agent Team</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>
        <fetcher.Form method="post" action={`/plugins/${pluginId}`}>
          <input type="hidden" name="intent" value="create-agent-team" />

          <div className="form-group">
            <label htmlFor="modal-team-name">Name</label>
            <input
              id="modal-team-name"
              name="name"
              type="text"
              defaultValue=""
              key="new"
              required
            />
            {errors?.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-team-description">Description</label>
            <textarea
              id="modal-team-description"
              name="description"
              defaultValue=""
              key="desc-new"
            />
            {errors?.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="modal-team-orchestratorId">
              Orchestrator (Entry Point Skill)
            </label>
            <select
              id="modal-team-orchestratorId"
              name="orchestratorId"
              className="form-select"
              required
            >
              <option value="">-- Select --</option>
              {entryPointSkills.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.skillConfig?.name ?? "(unnamed)"}
                </option>
              ))}
            </select>
            {errors?.orchestratorId && (
              <div className="form-error">{errors.orchestratorId}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Agent Team"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}
