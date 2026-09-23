import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://ontourlive.co";

interface PageSeoProps {
  title: string;
  description: string;
  /** Path this page should be canonical for, e.g. "/" or "/waitlist". */
  path: string;
}

/**
 * Per-route title / description / canonical / Open Graph / Twitter Card tags.
 * The static tags in index.html remain the fallback for social crawlers that
 * do not execute JavaScript.
 */
const PageSeo = ({ title, description, path }: PageSeoProps) => {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;

  // The FAQPage JSON-LD lives statically in index.html so crawlers see it
  // without JavaScript, but its questions only exist on the landing page.
  // Rich Results flags FAQ markup with no matching visible content, so strip
  // it on every other route.
  useEffect(() => {
    if (path === "/") return;
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
    );
    const removed: Array<{ node: HTMLScriptElement; parent: Node; next: Node | null }> = [];
    for (const node of scripts) {
      try {
        if (JSON.parse(node.textContent || "{}")["@type"] === "FAQPage" && node.parentNode) {
          removed.push({ node, parent: node.parentNode, next: node.nextSibling });
          node.parentNode.removeChild(node);
        }
      } catch {
        /* ignore malformed blocks */
      }
    }
    return () => {
      for (const { node, parent, next } of removed) parent.insertBefore(node, next);
    };
  }, [path]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="On Tour Live" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ontourlive" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
};

export default PageSeo;
