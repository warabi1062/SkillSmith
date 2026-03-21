// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import InlineEditableField from "../InlineEditableField";

afterEach(() => {
  cleanup();
});

function renderField(overrides: Partial<Parameters<typeof InlineEditableField>[0]> = {}) {
  const defaultProps = {
    value: "Test Value",
    onSave: vi.fn(),
    isLoading: false,
    error: null,
    placeholder: "Enter text",
    ...overrides,
  };
  const result = render(<InlineEditableField {...defaultProps} />);
  return { ...result, props: defaultProps };
}

describe("InlineEditableField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("display mode", () => {
    it("renders the value as text", () => {
      renderField({ value: "Hello" });
      expect(screen.getByText("Hello")).toBeTruthy();
    });

    it("renders placeholder when value is empty", () => {
      renderField({ value: "", placeholder: "Enter name" });
      expect(screen.getByText("Enter name")).toBeTruthy();
    });

    it("applies placeholder class when value is empty", () => {
      renderField({ value: "", placeholder: "Enter name" });
      const display = screen.getByText("Enter name");
      expect(display.className).toContain("inline-editable-placeholder");
    });
  });

  describe("switching to edit mode", () => {
    it("switches to edit mode on click", () => {
      renderField({ value: "Hello" });
      fireEvent.click(screen.getByText("Hello"));
      expect(screen.getByDisplayValue("Hello")).toBeTruthy();
    });

    it("calls onEditStart when entering edit mode", () => {
      const onEditStart = vi.fn();
      renderField({ value: "Hello", onEditStart });
      fireEvent.click(screen.getByText("Hello"));
      expect(onEditStart).toHaveBeenCalledTimes(1);
    });

    it("does not switch to edit mode when isLoading", () => {
      renderField({ value: "Hello", isLoading: true });
      fireEvent.click(screen.getByText("Hello"));
      expect(screen.queryByDisplayValue("Hello")).toBeNull();
    });
  });

  describe("saving", () => {
    it("calls onSave on blur with changed value", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave });

      fireEvent.click(screen.getByText("Hello"));
      const input = screen.getByDisplayValue("Hello");
      fireEvent.change(input, { target: { value: "World" } });
      fireEvent.blur(input);

      expect(onSave).toHaveBeenCalledWith("World");
    });

    it("calls onSave on Enter for single-line input", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave });

      fireEvent.click(screen.getByText("Hello"));
      const input = screen.getByDisplayValue("Hello");
      fireEvent.change(input, { target: { value: "World" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onSave).toHaveBeenCalledWith("World");
    });

    it("does not call onSave on Enter for multiline input", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave, multiline: true });

      fireEvent.click(screen.getByText("Hello"));
      const textarea = screen.getByDisplayValue("Hello");
      fireEvent.change(textarea, { target: { value: "World" } });
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not call onSave when value is unchanged", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave });

      fireEvent.click(screen.getByText("Hello"));
      fireEvent.blur(screen.getByDisplayValue("Hello"));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("trims whitespace before comparing and saving", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave });

      fireEvent.click(screen.getByText("Hello"));
      const input = screen.getByDisplayValue("Hello");
      fireEvent.change(input, { target: { value: "  Hello  " } });
      fireEvent.blur(input);

      expect(onSave).not.toHaveBeenCalled();
    });

    it("calls onEditEnd on blur", () => {
      const onEditEnd = vi.fn();
      renderField({ value: "Hello", onEditEnd });

      fireEvent.click(screen.getByText("Hello"));
      fireEvent.blur(screen.getByDisplayValue("Hello"));

      expect(onEditEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelling", () => {
    it("cancels editing on Escape without saving", () => {
      const onSave = vi.fn();
      renderField({ value: "Hello", onSave });

      fireEvent.click(screen.getByText("Hello"));
      const input = screen.getByDisplayValue("Hello");
      fireEvent.change(input, { target: { value: "Changed" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onSave).not.toHaveBeenCalled();
      // Should be back in display mode
      expect(screen.getByText("Hello")).toBeTruthy();
    });

    it("calls onEditEnd on Escape", () => {
      const onEditEnd = vi.fn();
      renderField({ value: "Hello", onEditEnd });

      fireEvent.click(screen.getByText("Hello"));
      fireEvent.keyDown(screen.getByDisplayValue("Hello"), { key: "Escape" });

      expect(onEditEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading state", () => {
    it("shows loading indicator when isLoading and in edit mode", () => {
      const { rerender } = render(
        <InlineEditableField
          value="Hello"
          onSave={vi.fn()}
          isLoading={false}
          error={null}
          placeholder="Enter"
        />,
      );

      fireEvent.click(screen.getByText("Hello"));
      expect(screen.getByDisplayValue("Hello")).toBeTruthy();

      rerender(
        <InlineEditableField
          value="Hello"
          onSave={vi.fn()}
          isLoading={true}
          error={null}
          placeholder="Enter"
        />,
      );

      expect(screen.getByLabelText("Saving")).toBeTruthy();
      expect((screen.getByDisplayValue("Hello") as HTMLInputElement).disabled).toBe(true);
    });
  });

  describe("error display", () => {
    it("shows error message in display mode", () => {
      renderField({ value: "Hello", error: "Name is required" });
      expect(screen.getByText("Name is required")).toBeTruthy();
    });

    it("shows error message in edit mode", () => {
      renderField({ value: "Hello", error: "Name is required" });
      fireEvent.click(screen.getByText("Hello"));
      expect(screen.getByText("Name is required")).toBeTruthy();
    });
  });

  describe("drag interference prevention", () => {
    it("stops mouseDown propagation on input", () => {
      renderField({ value: "Hello" });
      fireEvent.click(screen.getByText("Hello"));

      const input = screen.getByDisplayValue("Hello");
      const mouseDownEvent = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      const stopPropagation = vi.spyOn(mouseDownEvent, "stopPropagation");
      input.dispatchEvent(mouseDownEvent);

      expect(stopPropagation).toHaveBeenCalled();
    });
  });

  describe("multiline rendering", () => {
    it("renders textarea when multiline is true", () => {
      renderField({ value: "Hello", multiline: true });
      fireEvent.click(screen.getByText("Hello"));
      const textarea = screen.getByDisplayValue("Hello");
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("renders input when multiline is false", () => {
      renderField({ value: "Hello", multiline: false });
      fireEvent.click(screen.getByText("Hello"));
      const input = screen.getByDisplayValue("Hello");
      expect(input.tagName).toBe("INPUT");
    });
  });
});
