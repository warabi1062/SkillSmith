import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

const ALL_ROLES = [
  { value: "TEMPLATE", label: "TEMPLATE" },
  { value: "REFERENCE", label: "REFERENCE" },
  { value: "EXAMPLE", label: "EXAMPLE" },
];

interface ComponentFile {
  id: string;
  filename: string;
  role: string;
  content: string;
  sortOrder: number;
}

interface FilesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  componentId: string;
  componentName: string;
  files: ComponentFile[];
}

type ViewState =
  | { type: "list" }
  | { type: "add" }
  | { type: "edit"; file: ComponentFile };

export default function FilesManagementModal({
  isOpen,
  onClose,
  componentId,
  componentName,
  files,
}: FilesManagementModalProps) {
  const [view, setView] = useState<ViewState>({ type: "list" });

  const addFileFetcher = useFetcher<{
    success?: boolean;
    errors?: Record<string, string>;
    values?: Record<string, string>;
  }>();
  const editFileFetcher = useFetcher<{
    success?: boolean;
    errors?: Record<string, string>;
    values?: Record<string, string>;
  }>();
  const deleteFileFetcher = useFetcher();

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView({ type: "list" });
    }
  }, [isOpen]);

  // Handle successful add file
  const prevAddFileState = useRef(addFileFetcher.state);
  useEffect(() => {
    if (
      prevAddFileState.current !== "idle" &&
      addFileFetcher.state === "idle" &&
      addFileFetcher.data?.success
    ) {
      setView({ type: "list" });
    }
    prevAddFileState.current = addFileFetcher.state;
  }, [addFileFetcher.state, addFileFetcher.data]);

  // Handle successful edit file
  const prevEditFileState = useRef(editFileFetcher.state);
  useEffect(() => {
    if (
      prevEditFileState.current !== "idle" &&
      editFileFetcher.state === "idle" &&
      editFileFetcher.data?.success
    ) {
      setView({ type: "list" });
    }
    prevEditFileState.current = editFileFetcher.state;
  }, [editFileFetcher.state, editFileFetcher.data]);

  if (!isOpen) return null;

  // Keep file data in sync with latest props
  const currentFile =
    view.type !== "list" && view.type !== "add" && "file" in view
      ? files.find((f) => f.id === view.file.id) ?? view.file
      : null;

  const availableRoles = ALL_ROLES;

  function renderBreadcrumb() {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "Files", onClick: () => setView({ type: "list" }) },
    ];

    if (view.type === "add") {
      parts.push({ label: "New File" });
    } else if (view.type === "edit" && currentFile) {
      parts.push({ label: currentFile.filename });
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
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setView({ type: "add" })}
          >
            Add File
          </button>
        </div>
        {files.length > 0 ? (
          files.map((file) => (
            <div key={file.id} className="component-item">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span className="component-item-name">{file.filename}</span>
                <span className="badge">
                  {file.role}
                </span>
              </div>
              <div className="detail-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setView({ type: "edit", file })}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this file?")) {
                      const fd = new FormData();
                      fd.set("intent", "delete-file");
                      fd.set("fileId", file.id);
                      deleteFileFetcher.submit(fd, {
                        method: "post",
                      });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="card-description">No files yet.</p>
        )}
      </div>
    );
  }

  function renderAddFile() {
    const errors = addFileFetcher.data?.errors;
    const values = addFileFetcher.data?.values;
    const isSubmitting = addFileFetcher.state !== "idle";

    return (
      <div>
        <addFileFetcher.Form
          method="post"
          style={{ maxWidth: "640px" }}
        >
          <input type="hidden" name="intent" value="create-file" />
          <input type="hidden" name="componentId" value={componentId} />
          <div className="form-group">
            <label htmlFor="files-modal-role">Role</label>
            <select
              id="files-modal-role"
              name="role"
              defaultValue={values?.role ?? ""}
              className="form-select"
              required
            >
              <option value="">-- Select Role --</option>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors?.role && <div className="form-error">{errors.role}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="files-modal-filename">Filename</label>
            <input
              id="files-modal-filename"
              name="filename"
              type="text"
              defaultValue={values?.filename ?? ""}
              required
            />
            {errors?.filename && (
              <div className="form-error">{errors.filename}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="files-modal-content">Content</label>
            <textarea
              id="files-modal-content"
              name="content"
              className="markdown-editor"
              defaultValue={values?.content ?? ""}
              placeholder="Write content in Markdown..."
            />
            {errors?.content && (
              <div className="form-error">{errors.content}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create File"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setView({ type: "list" })}
            >
              Cancel
            </button>
          </div>
        </addFileFetcher.Form>
      </div>
    );
  }

  function renderEditFile() {
    if (!currentFile) return null;
    const errors = editFileFetcher.data?.errors;
    const values = editFileFetcher.data?.values;
    const isSubmitting = editFileFetcher.state !== "idle";

    return (
      <div>
        <editFileFetcher.Form
          method="post"
          style={{ maxWidth: "640px" }}
        >
          <input type="hidden" name="intent" value="update-file" />
          <input type="hidden" name="fileId" value={currentFile.id} />
          <div className="form-group">
            <label>Role</label>
            <p className="card-description">
              <span className="badge">{currentFile.role}</span> (not editable)
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="files-modal-edit-filename">Filename</label>
            <input
              id="files-modal-edit-filename"
              name="filename"
              type="text"
              defaultValue={values?.filename ?? currentFile.filename}
              key={currentFile.id}
              required
            />
            {errors?.filename && (
              <div className="form-error">{errors.filename}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="files-modal-edit-content">Content</label>
            <textarea
              id="files-modal-edit-content"
              name="content"
              className="markdown-editor"
              defaultValue={values?.content ?? currentFile.content}
              key={`content-${currentFile.id}`}
              placeholder="Write content in Markdown..."
            />
            {errors?.content && (
              <div className="form-error">{errors.content}</div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setView({ type: "list" })}
            >
              Cancel
            </button>
          </div>
        </editFileFetcher.Form>
      </div>
    );
  }

  function renderContent() {
    switch (view.type) {
      case "list":
        return renderList();
      case "add":
        return renderAddFile();
      case "edit":
        return renderEditFile();
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "800px", maxHeight: "80vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Manage Files - {componentName}</h3>
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
