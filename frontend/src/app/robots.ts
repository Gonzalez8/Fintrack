import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fintrack-quintela.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/welcome"],
        disallow: ["/api/", "/savings/", "/portfolio/", "/assets/", "/accounts/", "/transactions/", "/dividends/", "/interests/", "/tax/", "/settings/", "/profile/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
