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
