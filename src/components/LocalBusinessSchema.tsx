import { Helmet } from "react-helmet-async";

/**
 * LocalBusiness structured data for On Tour Live.
 * Shared by the full home page and the coming-soon page so the details
 * are available at the site's main address either way.
 */
export default function LocalBusinessSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "On Tour Live",
          url: "https://app.ontourlive.co",
          description:
            "Booking platform connecting artists and venues. Sydney first, launching September 2026.",
          email: "hello@ontour.live",
          areaServed: { "@type": "City", name: "Sydney" },
          address: {
            "@type": "PostalAddress",
            addressLocality: "Sydney",
            addressRegion: "NSW",
            addressCountry: "AU",
          },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "hello@ontour.live",
            areaServed: "AU",
            availableLanguage: "English",
          },
          sameAs: [
            "https://www.instagram.com/ontour.live",
            "https://www.facebook.com/ontour.live",
            "https://www.tiktok.com/@ontour.live",
          ],
        })}
      </script>
    </Helmet>
  );
}
