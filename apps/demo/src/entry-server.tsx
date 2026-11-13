import { renderToString } from "react-dom/server";
import { DocsPage } from "./docs/DocsPage";
import { GuidePage } from "./guide/GuidePage";
import { WorkbenchPage } from "./workbench/WorkbenchPage";

export { robotsTxt, sitemapXml } from "./seo/files";
export { llmsTxt } from "./seo/llms";

/** The front page as html. */
export const renderGuide = (): string => renderToString(<GuidePage />);

/** The documentation page as html. */
export const renderDocs = (): string => renderToString(<DocsPage />);

/** The workbench page as html. */
export const renderWorkbench = (): string => renderToString(<WorkbenchPage />);
