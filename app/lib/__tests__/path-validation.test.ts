import { describe, expect, it } from "vitest";
import { isSafeFilename, isWithinDirectory } from "../path-validation.server";

describe("isSafeFilename", () => {
  it("returns true for a simple filename", () => {
    expect(isSafeFilename("template.md")).toBe(true);
  });

  it("returns true for another simple filename", () => {
    expect(isSafeFilename("reference.md")).toBe(true);
  });

  it("returns true for a filename with subdirectory", () => {
    expect(isSafeFilename("sub/file.md")).toBe(true);
  });

  it("returns false for path traversal with ../", () => {
    expect(isSafeFilename("../etc/passwd")).toBe(false);
  });

  it("returns false for path traversal in the middle", () => {
    expect(isSafeFilename("foo/../../bar")).toBe(false);
  });

  it("returns false for an absolute path", () => {
    expect(isSafeFilename("/etc/passwd")).toBe(false);
  });

  it("returns false for a string containing a null byte", () => {
    expect(isSafeFilename("file\0.md")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isSafeFilename("")).toBe(false);
  });
});

describe("isWithinDirectory", () => {
  it("returns true for a path inside the base directory", () => {
    expect(isWithinDirectory("/foo/bar/baz.txt", "/foo/bar")).toBe(true);
  });

  it("returns true when the resolved path equals the base directory", () => {
    expect(isWithinDirectory("/foo/bar", "/foo/bar")).toBe(true);
  });

  it("returns false for a path outside the base directory", () => {
    expect(isWithinDirectory("/foo/other/baz.txt", "/foo/bar")).toBe(false);
  });

  it("returns false for a directory that is a prefix but not a parent", () => {
    expect(isWithinDirectory("/foo/barbaz/file.txt", "/foo/bar")).toBe(false);
  });
});
