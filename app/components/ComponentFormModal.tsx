import { useEffect, useRef } from "react";
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
  fetcher: ReturnType<typeof useFetcher<ComponentFetcherData>>;
  pluginId: string;
}

export default function ComponentFormModal({
  isOpen,
  onClose,
  fetcher,
  pluginId,
}: ComponentFormModalProps) {
  // Close modal on successful submission
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
          <h3>New Component</h3>
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
          <input type="hidden" name="intent" value="create-component" />
          {/* typeは固定でSKILL */}
          <input type="hidden" name="type" value="SKILL" />

          <div className="form-group">
            <label htmlFor="modal-name">Name</label>
            <input
              id="modal-name"
              name="name"
              type="text"
              defaultValue=""
              key="new"
              required
            />
            {errors?.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="modal-description">Description</label>
            <textarea
              id="modal-description"
              name="description"
              defaultValue=""
              key="desc-new"
            />
            {errors?.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="modal-skillType">Skill Type</label>
            <select
              id="modal-skillType"
              name="skillType"
              defaultValue=""
              key="st-new"
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

          {errors?.type && <div className="form-error">{errors.type}</div>}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Component"}
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
