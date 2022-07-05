import ErrorPage from "next/error"
import { getPageData, fetchAPI, getGlobalData } from "utils/api"
import Sections from "@/components/sections"
import Seo from "@/components/elements/seo"
import { useRouter } from "next/router"
import Layout from "@/components/layout"
import { getLocalizedPaths } from "utils/localize"

// The file is called [[...slug]].js because we're using Next's
// optional catch all routes feature. See the related docs:
// https://nextjs.org/docs/routing/dynamic-routes#optional-catch-all-routes

const DynamicPage = ({ sections, metadata, preview, global, pageContext }) => {
  const router = useRouter()

  // Check if the required data was provided
  if (!router.isFallback && !sections?.length) {
    return <ErrorPage statusCode={404} />
  }

  // Loading screen (only possible in preview mode)
  if (router.isFallback) {
    return <div className="container">Loading...</div>
  }

  // Merge default site SEO settings with page specific SEO settings
  if (metadata.shareImage?.data == null) {
    delete metadata.shareImage
  }
  const metadataWithDefaults = {
    ...global.attributes.metadata,
    ...metadata,
  }

  return (
    <Layout global={global} pageContext={pageContext}>
      {/* Add meta tags for SEO*/}
      <Seo metadata={metadataWithDefaults} />
      {/* Display content sections */}
      <Sections sections={sections} preview={preview} />
    </Layout>
  )
}

export async function getStaticPaths(context) {
  // Get all pages from Strapi
  console.log(context, "context for the getstaticpaths");
  const pages = await context.locales.reduce(
    async (currentPagesPromise, locale) => {
      // function runs twice for the number of locals present 2x for en and fr
      const currentPages = await currentPagesPromise
      const localePages = await fetchAPI("/pages", {
        locale,
        fields: ["slug", "locale"],
      })
      console.log(locale, "locale for the run");
      console.log(currentPages, "data returned from the currentpages promise")
      console.log(localePages, "data returned from the fetch requrest")
      return [...currentPages, ...localePages.data]
    },
    Promise.resolve([])
  )
  console.log(pages, "pages being created");

  const paths = pages.map((page) => {
    const { slug, locale } = page.attributes
    // Decompose the slug that was saved in Strapi
    const slugArray = !slug ? false : slug.split("/")
    console.log(slugArray);
    return {
      params: { slug: slugArray },
      // Specify the locale to render
      locale,
    }
  })

  return { paths, fallback: true }
}

export async function getStaticProps(context) {
  const { params, locale, locales, defaultLocale, preview = null } = context

  const globalLocale = await getGlobalData(locale)
  // Fetch pages. Include drafts if preview mode is on
  console.log(globalLocale, "global data");
  const pageData = await getPageData({
    slug: (!params.slug ? [""] : params.slug).join("/"),
    locale,
    preview,
  })
  console.log(pageData, "pageData");

  if (pageData == null) {
    // Giving the page no props will trigger a 404 page
    return { props: {} }
  }

  // We have the required page data, pass it to the page component
  const { contentSections, metadata, localizations, slug } = pageData.attributes

  const pageContext = {
    locale,
    locales,
    defaultLocale,
    slug,
    localizations,
  }

  const localizedPaths = getLocalizedPaths(pageContext)
  console.log(localizedPaths, "localized paths")
  console.log(pageContext, "page context");
  return {
    props: {
      preview,
      sections: contentSections,
      metadata,
      global: globalLocale.data,
      pageContext: {
        ...pageContext,
        localizedPaths,
      },
    },
  }
}

export default DynamicPage
