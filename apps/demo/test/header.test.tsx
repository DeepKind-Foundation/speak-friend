import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Header } from "../src/site/Header";

afterEach(cleanup);

describe("Header", () => {
  it("links the pages relative to the front page", () => {
    render(<Header current="guide" />);
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("href")).toBe("./");
    expect(screen.getByRole("link", { name: "Workbench" }).getAttribute("href")).toBe("./workbench/");
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("aria-current")).toBe("page");
  });

  it("links the pages relative to the documentation", () => {
    render(<Header current="docs" />);
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("href")).toBe("../");
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe("./");
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Workbench" }).getAttribute("href")).toBe("../workbench/");
  });

  it("links the documentation from the other pages", () => {
    render(<Header current="guide" />);
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe("./docs/");
    cleanup();
    render(<Header current="workbench" />);
    expect(screen.getByRole("link", { name: "Docs" }).getAttribute("href")).toBe("../docs/");
  });

  it("links the pages relative to the workbench", () => {
    render(<Header current="workbench" />);
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("href")).toBe("../");
    expect(screen.getByRole("link", { name: "Workbench" }).getAttribute("href")).toBe("./");
    expect(screen.getByRole("link", { name: "Workbench" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("aria-current")).toBeNull();
  });
});
