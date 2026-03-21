import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

const ALL_ROLES = [
  { value: "MAIN", label: "MAIN" },
  { value: "TEMPLATE", label: "TEMPLATE" },
  { value: "REFERENCE", label: "REFERENCE" },
  { value: "EXAMPLE", label: "EXAMPLE" },
  { value: "OUTPUT_SCHEMA", label: "OUTPUT_SCHEMA" },
];

const FIELD_TYPES = [
  { value: "TEXT", label: "TEXT" },
  { value: "ENUM", label: "ENUM" },
  { value: "LIST", label: "LIST" },
  { value: "TABLE", label: "TABLE" },
  { value: "GROUP", label: "GROUP" },
];

interface OutputSchemaField {
  id: string;
  name: string;
  fieldType: string;
  required: boolean;
  description: string | null;
  enumValues: string | null;
  placeholder: string | null;
  sortOrder: number;
}

interface ComponentFile {
  id: string;
  filename: string;
  role: string;
  content: string;
  sortOrder: number;
  outputSchemaFields: OutputSchemaField[];
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
  | { type: "edit"; file: ComponentFile }
  | { type: "fields"; file: ComponentFile }
  | { type: "field-add"; file: ComponentFile }
  | { type: "field-edit"; file: ComponentFile; field: OutputSchemaField };

export default function FilesManagementModal({
  isOpen,
  onClose,
  componentId,
  componentName,
  files,
}: FilesManagementModalProps) {
  const [view, setView] = useState<ViewState>({ type: "list" });
  const [fieldTypeSelection, setFieldTypeSelection] = useState<string>("");

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
  const addFieldFetcher = useFetcher<{
    success?: boolean;
    errors?: Record<string, string>;
    values?: Record<string, string | boolean>;
  }>();
  const editFieldFetcher = useFetcher<{
    success?: boolean;
    errors?: Record<string, string>;
    values?: Record<string, string | boolean>;
  }>();
  const deleteFieldFetcher = useFetcher();
  const reorderFieldFetcher = useFetcher();

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView({ type: "list" });
    }
  }, [isOpen]);

  // Reset fieldTypeSelection when entering field-add or field-edit views
  useEffect(() => {
    if (view.type === "field-add") {
      setFieldTypeSelection("");
    } else if (view.type === "field-edit") {
      setFieldTypeSelection(view.field.fieldType);
    }
  }, [view]);

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

  // Handle successful add field - go back to fields view
  const prevAddFieldState = useRef(addFieldFetcher.state);
  useEffect(() => {
    if (
      prevAddFieldState.current !== "idle" &&
      addFieldFetcher.state === "idle" &&
      addFieldFetcher.data?.success
    ) {
      if (view.type === "field-add") {
        setView({ type: "fields", file: view.file });
      }
    }
    prevAddFieldState.current = addFieldFetcher.state;
  }, [addFieldFetcher.state, addFieldFetcher.data, view]);

  // Handle successful edit field - go back to fields view
  const prevEditFieldState = useRef(editFieldFetcher.state);
  useEffect(() => {
    if (
      prevEditFieldState.current !== "idle" &&
      editFieldFetcher.state === "idle" &&
      editFieldFetcher.data?.success
    ) {
      if (view.type === "field-edit") {
        setView({ type: "fields", file: view.file });
      }
    }
    prevEditFieldState.current = editFieldFetcher.state;
  }, [editFieldFetcher.state, editFieldFetcher.data, view]);

  if (!isOpen) return null;

  // Keep file data in sync with latest props
  const currentFile =
    view.type !== "list" && view.type !== "add" && "file" in view
      ? files.find((f) => f.id === view.file.id) ?? view.file
      : null;

  const hasMain = files.some((f) => f.role === "MAIN");
  const availableRoles = hasMain
    ? ALL_ROLES.filter((r) => r.value !== "MAIN")
    : ALL_ROLES;

  function renderBreadcrumb() {
    const parts: { label: string; onClick?: () => void }[] = [
      { label: "Files", onClick: () => setView({ type: "list" }) },
    ];

    if (view.type === "add") {
      parts.push({ label: "New File" });
    } else if (view.type === "edit" && currentFile) {
      parts.push({ label: currentFile.filename });
    } else if (view.type === "fields" && currentFile) {
      parts.push({
        label: currentFile.filename,
        onClick: () => setView({ type: "edit", file: currentFile }),
      });
      parts.push({ label: "Fields" });
    } else if (view.type === "field-add" && currentFile) {
      parts.push({
        label: currentFile.filename,
        onClick: () => setView({ type: "edit", file: currentFile }),
      });
      parts.push({
        label: "Fields",
        onClick: () => setView({ type: "fields", file: currentFile }),
      });
      parts.push({ label: "New Field" });
    } else if (view.type === "field-edit" && currentFile) {
      parts.push({
        label: currentFile.filename,
        onClick: () => setView({ type: "edit", file: currentFile }),
      });
      parts.push({
        label: "Fields",
        onClick: () => setView({ type: "fields", file: currentFile }),
      });
      parts.push({ label: view.field.name });
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
                <span
                  className={`badge${file.role === "MAIN" ? " badge-skill" : ""}`}
                >
                  {file.role}
                </span>
              </div>
              <div className="detail-actions">
                {file.role === "OUTPUT_SCHEMA" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setView({ type: "fields", file })}
                  >
                    Manage Fields
                  </button>
                )}
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
                    const message =
                      file.role === "OUTPUT_SCHEMA"
                        ? "This file has OUTPUT_SCHEMA role. Deleting it will also remove all associated OutputSchemaField data. Are you sure?"
                        : "Are you sure you want to delete this file?";
                    if (window.confirm(message)) {
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

  function renderFields() {
    if (!currentFile) return null;
    const fields = currentFile.outputSchemaFields;

    return (
      <div>
        <div className="component-list-header" style={{ marginBottom: "1rem" }}>
          <span style={{ fontWeight: 500 }}>
            {fields.length} field{fields.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setView({ type: "field-add", file: currentFile })}
          >
            Add Field
          </button>
        </div>
        {fields.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={index === 0}
                        title="Move up"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("intent", "reorder-field");
                          fd.set("fieldId", field.id);
                          fd.set("direction", "up");
                          reorderFieldFetcher.submit(fd, {
                            method: "post",
                          });
                        }}
                      >
                        up
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={index === fields.length - 1}
                        title="Move down"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("intent", "reorder-field");
                          fd.set("fieldId", field.id);
                          fd.set("direction", "down");
                          reorderFieldFetcher.submit(fd, {
                            method: "post",
                          });
                        }}
                      >
                        down
                      </button>
                    </div>
                  </td>
                  <td>{field.name}</td>
                  <td>
                    <span className="badge">{field.fieldType}</span>
                    {field.fieldType === "ENUM" && field.enumValues && (
                      <span
                        className="card-description"
                        style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}
                      >
                        ({field.enumValues})
                      </span>
                    )}
                  </td>
                  <td>{field.required ? "Yes" : "No"}</td>
                  <td>{field.description ?? "-"}</td>
                  <td>
                    <div className="detail-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          setView({
                            type: "field-edit",
                            file: currentFile,
                            field,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (
                            window.confirm(`Delete field "${field.name}"?`)
                          ) {
                            const fd = new FormData();
                            fd.set("intent", "delete-field");
                            fd.set("fieldId", field.id);
                            deleteFieldFetcher.submit(fd, {
                              method: "post",
                            });
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="card-description">
            No fields defined yet. Add a field to define the output schema.
          </p>
        )}
      </div>
    );
  }

  function renderFieldAdd() {
    if (!currentFile) return null;
    const errors = addFieldFetcher.data?.errors;
    const values = addFieldFetcher.data?.values;
    const isSubmitting = addFieldFetcher.state !== "idle";

    return (
      <div>
        <addFieldFetcher.Form
          method="post"
          style={{ maxWidth: "640px" }}
        >
          <input type="hidden" name="intent" value="create-field" />
          <input type="hidden" name="fileId" value={currentFile.id} />
          <div className="form-group">
            <label htmlFor="field-modal-name">Name</label>
            <input
              id="field-modal-name"
              name="name"
              type="text"
              defaultValue={(values?.name as string) ?? ""}
              required
            />
            {errors?.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="field-modal-type">Field Type</label>
            <select
              id="field-modal-type"
              name="fieldType"
              defaultValue={(values?.fieldType as string) ?? ""}
              className="form-select"
              required
              onChange={(e) => setFieldTypeSelection(e.target.value)}
            >
              <option value="">-- Select Type --</option>
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors?.fieldType && (
              <div className="form-error">{errors.fieldType}</div>
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="required"
                defaultChecked={
                  values?.required !== undefined
                    ? Boolean(values.required)
                    : true
                }
              />{" "}
              Required
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="field-modal-description">Description</label>
            <textarea
              id="field-modal-description"
              name="description"
              defaultValue={(values?.description as string) ?? ""}
              placeholder="Describe this field..."
              rows={3}
            />
            {errors?.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          {fieldTypeSelection === "ENUM" && (
            <div className="form-group">
              <label htmlFor="field-modal-enumValues">Enum Values</label>
              <input
                id="field-modal-enumValues"
                name="enumValues"
                type="text"
                defaultValue={(values?.enumValues as string) ?? ""}
                placeholder="value1, value2, value3"
              />
              <p
                className="card-description"
                style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}
              >
                Comma-separated list of allowed values.
              </p>
              {errors?.enumValues && (
                <div className="form-error">{errors.enumValues}</div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="field-modal-placeholder">Placeholder</label>
            <input
              id="field-modal-placeholder"
              name="placeholder"
              type="text"
              defaultValue={(values?.placeholder as string) ?? ""}
              placeholder="Optional placeholder text"
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Field"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setView({ type: "fields", file: currentFile })
              }
            >
              Cancel
            </button>
          </div>
        </addFieldFetcher.Form>
      </div>
    );
  }

  function renderFieldEdit() {
    if (view.type !== "field-edit" || !currentFile) return null;
    // Get fresh field data from currentFile
    const freshField =
      currentFile.outputSchemaFields.find((f) => f.id === view.field.id) ??
      view.field;
    const errors = editFieldFetcher.data?.errors;
    const values = editFieldFetcher.data?.values;
    const isSubmitting = editFieldFetcher.state !== "idle";

    return (
      <div>
        <editFieldFetcher.Form
          method="post"
          style={{ maxWidth: "640px" }}
        >
          <input type="hidden" name="intent" value="update-field" />
          <input type="hidden" name="fieldId" value={freshField.id} />
          <div className="form-group">
            <label htmlFor="field-modal-edit-name">Name</label>
            <input
              id="field-modal-edit-name"
              name="name"
              type="text"
              defaultValue={(values?.name as string) ?? freshField.name}
              key={freshField.id}
              required
            />
            {errors?.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="field-modal-edit-type">Field Type</label>
            <select
              id="field-modal-edit-type"
              name="fieldType"
              defaultValue={
                (values?.fieldType as string) ?? freshField.fieldType
              }
              key={`ft-${freshField.id}`}
              className="form-select"
              required
              onChange={(e) => setFieldTypeSelection(e.target.value)}
            >
              <option value="">-- Select Type --</option>
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors?.fieldType && (
              <div className="form-error">{errors.fieldType}</div>
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="required"
                defaultChecked={
                  values?.required !== undefined
                    ? Boolean(values.required)
                    : freshField.required
                }
                key={`req-${freshField.id}`}
              />{" "}
              Required
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="field-modal-edit-description">Description</label>
            <textarea
              id="field-modal-edit-description"
              name="description"
              defaultValue={
                (values?.description as string) ??
                freshField.description ??
                ""
              }
              key={`desc-${freshField.id}`}
              placeholder="Describe this field..."
              rows={3}
            />
            {errors?.description && (
              <div className="form-error">{errors.description}</div>
            )}
          </div>

          {fieldTypeSelection === "ENUM" && (
            <div className="form-group">
              <label htmlFor="field-modal-edit-enumValues">Enum Values</label>
              <input
                id="field-modal-edit-enumValues"
                name="enumValues"
                type="text"
                defaultValue={
                  (values?.enumValues as string) ??
                  freshField.enumValues ??
                  ""
                }
                key={`ev-${freshField.id}`}
                placeholder="value1, value2, value3"
              />
              <p
                className="card-description"
                style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}
              >
                Comma-separated list of allowed values.
              </p>
              {errors?.enumValues && (
                <div className="form-error">{errors.enumValues}</div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="field-modal-edit-placeholder">Placeholder</label>
            <input
              id="field-modal-edit-placeholder"
              name="placeholder"
              type="text"
              defaultValue={
                (values?.placeholder as string) ??
                freshField.placeholder ??
                ""
              }
              key={`ph-${freshField.id}`}
              placeholder="Optional placeholder text"
            />
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
              onClick={() =>
                setView({ type: "fields", file: currentFile })
              }
            >
              Cancel
            </button>
          </div>
        </editFieldFetcher.Form>
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
      case "fields":
        return renderFields();
      case "field-add":
        return renderFieldAdd();
      case "field-edit":
        return renderFieldEdit();
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
