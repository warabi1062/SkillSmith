import { useEffect, useRef, useState } from "react";
import type { useFetcher } from "react-router";

interface ComponentFetcherData {
  success?: boolean;
  componentId?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

interface ComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  componentType?: "SKILL" | "AGENT";
  initialValues?: {
    componentId: string;
    name: string;
    description: string;
    skillType: string;
    type: string;
  };
  fetcher: ReturnType<typeof useFetcher<ComponentFetcherData>>;
  pluginId: string;
}

export default function ComponentFormModal({
  isOpen,
  onClose,
  mode,
  componentType,
  initialValues,
  fetcher,
  pluginId,
}: ComponentFormModalProps) {
  const [selectedType, setSelectedType] = useState(
    componentType ?? initialValues?.type ?? "SKILL",
  );

  // Reset selectedType when modal opens with new props
  useEffect(() => {
    if (isOpen) {
      setSelectedType(componentType ?? initialValues?.type ?? "SKILL");
    }
  }, [isOpen, componentType, initialValues?.type]);

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
  const intent = mode === "create" ? "create-component" : "update-component";
  const isSkill = selectedType === "SKILL";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === "create" ? "New Component" : "Edit Component"}
          </h3>
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
          <input type="hidden" name="intent" value={intent} />
          {mode === "edit" && initialValues?.componentId && (
            <input
              type="hidden"
              name="componentId"
              value={initialValues.componentId}
            />
          )}

          <div className="form-group">
            <label htmlFor="modal-type">Type</label>
            {mode === "create" ? (
              <select
                id="modal-type"
                name="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="form-select"
              >
                <option value="SKILL">Skill</option>
                <option value="AGENT">Agent</option>
              </select>
            ) : (
              <>
                <input type="hidden" name="type" value={selectedType} />
                <span
                  className={`badge ${isSkill ? "badge-skill" : "badge-agent"}`}
                >
                  {selectedType}
                </span>
              </>
            )}
            {errors?.type && <div className="form-error">{errors.type}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-name">Name</label>
            <input
              id="modal-name"
              name="name"
              type="text"
              defaultValue={initialValues?.name ?? ""}
              key={initialValues?.componentId ?? "new"}
              required
            />
            {errors?.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-description">
              Description{!isSkill ? " (required)" : ""}
            </label>
            <textarea
              id="modal-description"
              name="description"
              defaultValue={initialValues?.description ?? ""}
              key={`desc-${initialValues?.componentId ?? "new"}`}
              required={!isSkill}
            />
            {errors?.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          {isSkill && (
            <div className="form-group">
              <label htmlFor="modal-skillType">Skill Type</label>
              <select
                id="modal-skillType"
                name="skillType"
                defaultValue={initialValues?.skillType ?? ""}
                key={`st-${initialValues?.componentId ?? "new"}`}
                className="form-select"
              >
                <option value="">-- Select --</option>
                <option value="ENTRY_POINT">Entry Point</option>
                <option value="WORKER">Worker</option>
              </select>
              {errors?.skillType && (
                <div className="form-error">{errors.skillType}</div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Component"
                  : "Save Changes"}
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
