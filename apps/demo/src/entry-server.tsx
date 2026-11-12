import { renderToString } from "react-dom/server";
import { GuidePage } from "./guide/GuidePage";
import { WorkbenchPage } from "./workbench/WorkbenchPage";

export { robotsTxt, sitemapXml } from "./seo/files";
export { llmsTxt } from "./seo/llms";

/** The front page as html. */
export const renderGuide = (): string => renderToString(<GuidePage />);

/** The workbench page as html. */
export const renderWorkbench = (): string => renderToString(<WorkbenchPage />);
