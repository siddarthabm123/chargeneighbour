import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChargeNeighbour",
    short_name: "ChargeNeighbour",
    description: "Find nearby charging places and apply to share your charger.",
    start_url: "/#explore",
    display: "standalone",
    background_color: "#fafbf7",
    theme_color: "#173b2b",
    icons: [
      { src: "/images/app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/app-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
