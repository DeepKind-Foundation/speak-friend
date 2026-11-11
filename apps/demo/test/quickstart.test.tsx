import { cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { quickStart } from "../src/guide/quickstart";
import { GuidePage } from "../src/guide/GuidePage";
import { WorkbenchPage } from "../src/workbench/WorkbenchPage";

afterEach(cleanup);

describe("quick start", () => {
  it("answers the question in a short declarative paragraph", () => {
    const words = quickStart.answer.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(75);
  });

  it("shows a complete example", () => {
    for (const needle of ["TourProvider", "TourGuide", "data-tour", "memoryStore", "styles.css"]) {
      expect(quickStart.code).toContain(needle);
    }
  });
});

describe("GuidePage content", () => {
  it("has one h1, the question as an h2, a props table and links to the packages", () => {
    render(<GuidePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "How do I add a page tour to a React app?" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Props of TourGuide" });
    for (const prop of ["labels", "position", "theme", "announce", "headingLevel", "closeOnEscape"]) {
      expect(within(table).getByText(prop)).toBeTruthy();
    }
    expect(screen.getByRole("link", { name: "speak-friend on npm" }).getAttribute("href")).toBe(
      "https://www.npmjs.com/package/speak-friend",
    );
    expect(screen.getByRole("link", { name: "speak-friend-react on npm" })).toBeTruthy();
  });
});

describe("server rendering", () => {
  it("puts the real content of both pages into the html", () => {
    const guide = renderToString(<GuidePage />);
    expect(guide).toContain("Page tours that leave the page usable.");
    expect(guide).toContain("pnpm");
    expect(guide).not.toContain('role="dialog"');
    const workbench = renderToString(<WorkbenchPage />);
    expect(workbench).toContain("Customise the guide");
    expect(workbench).toContain("TourGuide");
  });
});
