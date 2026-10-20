import type { MetadataRoute } from "next";
import { siteUrl } from "./lib/settings";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/hosts", "/features", "/pilot", "/privacy", "/terms"].map(
    (path) => ({
      url: `${siteUrl()}${path}`,
      changeFrequency: "monthly",
      priority: path ? 0.6 : 1,
    }),
  );
}
