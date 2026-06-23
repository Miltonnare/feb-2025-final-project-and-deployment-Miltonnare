import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/editor/", "/api/", "/admin/"],
    },
    sitemap: "http://localhost:3000/sitemap.xml",
  }
}
