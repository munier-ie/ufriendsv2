import { Helmet } from 'react-helmet-async';

/**
 * PageMeta — Reusable SEO meta tag component for all public pages.
 * Uses react-helmet-async to inject <head> tags per route.
 *
 * @param {string}  title       - Page-specific title (brand suffix added automatically)
 * @param {string}  description - Meta description (150–160 chars recommended)
 * @param {string}  canonical   - Canonical URL for this page
 * @param {object}  schema      - Optional JSON-LD structured data object
 * @param {boolean} noIndex     - If true, adds noindex (for auth-gated pages)
 * @param {string}  ogImage     - Optional OG image override
 */
export default function PageMeta({
    title,
    description,
    canonical,
    schema,
    noIndex = false,
    ogImage = 'https://ufriends.com.ng/assets/og-image.png',
}) {
    const fullTitle = title
        ? `${title} | Ufriends IT Nigeria`
        : 'Ufriends IT — Buy Data, Airtime, Print NIN & BVN Slip, Modify NIN/BVN in Nigeria';

    const metaDesc =
        description ||
        'Ufriends IT is Nigeria\'s all-in-one VTU platform. Buy cheap data, airtime, print NIN slip, BVN slip, NIN/BVN modification, cable TV, electricity bills, exam pins and government services. Start for free.';

    const canonicalUrl = canonical || 'https://ufriends.com.ng/';

    return (
        <Helmet>
            {/* Primary SEO */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDesc} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Robots */}
            {noIndex
                ? <meta name="robots" content="noindex, nofollow" />
                : <meta name="robots" content="index, follow" />
            }

            {/* Geo targeting */}
            <meta name="geo.region" content="NG" />
            <meta name="geo.country" content="Nigeria" />
            <meta name="language" content="English" />

            {/* Open Graph */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Ufriends IT" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDesc} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:locale" content="en_NG" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={metaDesc} />
            <meta name="twitter:image" content={ogImage} />

            {/* JSON-LD Structured Data */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema, null, 2)}
                </script>
            )}
        </Helmet>
    );
}
