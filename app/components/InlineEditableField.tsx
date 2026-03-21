import { useState, useRef, useEffect, useCallback } from "react";

interface InlineEditableFieldProps {
  value: string;
  onSave: (newValue: string) => void;
  isLoading: boolean;
  error: string | null;
  placeholder: string;
  multiline?: boolean;
  className?: string;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

export default function InlineEditableField({
  value,
  onSave,
  isLoading,
  error,
  placeholder,
  multiline = false,
  className,
  onEditStart,
  onEditEnd,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync editValue when value prop changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    if (isLoading) return;
    setIsEditing(true);
    setEditValue(value);
    onEditStart?.();
  }, [isLoading, value, onEditStart]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    onEditEnd?.();
  }, [value, onEditEnd]);

  const saveAndClose = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
    onEditEnd?.();
  }, [editValue, value, onSave, onEditEnd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelEditing();
      } else if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        saveAndClose();
      }
    },
    [cancelEditing, saveAndClose, multiline],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (isEditing) {
    const sharedProps = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      value: editValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setEditValue(e.target.value),
      onBlur: saveAndClose,
      onKeyDown: handleKeyDown,
      onMouseDown: handleMouseDown,
      disabled: isLoading,
      placeholder,
      className: `inline-editable-input ${className ?? ""}`.trim(),
    };

    return (
      <div className="inline-editable-field">
        {multiline ? (
          <textarea {...sharedProps} rows={2} />
        ) : (
          <input type="text" {...sharedProps} />
        )}
        {isLoading && (
          <span className="inline-editable-loading" aria-label="Saving">
            ...
          </span>
        )}
        {error && <div className="inline-editable-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="inline-editable-field">
      <span
        className={`inline-editable-display ${className ?? ""} ${!value ? "inline-editable-placeholder" : ""}`.trim()}
        onClick={startEditing}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            startEditing();
          }
        }}
      >
        {value || placeholder}
      </span>
      {error && <div className="inline-editable-error">{error}</div>}
    </div>
  );
}
