import { createFileRoute } from "@tanstack/react-router";
import { InkLoomStudio } from "../components/ink-loom-studio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ink Loom Studio — Brand Direction Workspace" },
      { name: "description", content: "Shape brand palettes, typography, layouts, motion, and messaging in one live creative workspace." },
      { property: "og:title", content: "Ink Loom Studio — Brand Direction Workspace" },
      { property: "og:description", content: "Shape brand palettes, typography, layouts, motion, and messaging in one live creative workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InkLoomStudio,
});
