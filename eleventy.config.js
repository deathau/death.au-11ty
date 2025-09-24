import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import ExcerptGenerator from "./_scripts/excerptgenerator.js";
import markdownIt from "markdown-it";
import markdownItBracketedSpans from "markdown-it-bracketed-spans";
import markdownItAttrs from "markdown-it-attrs";
import cacheBuster from "@mightyplow/eleventy-plugin-cache-buster";

export default async function(eleventyConfig) {

  // Pass-through files
  eleventyConfig.addPassthroughCopy({"src/_static":"."});

  eleventyConfig.addFilter("excerpt", content =>
    new ExcerptGenerator().getExcerpt(content, 500)
  )

  eleventyConfig.addCollection("everything", async (collectionsApi) => 
    collectionsApi.getAll()
      .filter(item => item.data.date)
      .sort((a, b) => b.date - a.date)
  )

  eleventyConfig.addCollection("everything-reversed", async (collectionsApi) =>
    collectionsApi.getAll()
      .filter(item => item.data.date)
      .sort((a, b) => a.date - b.date)
  )
  
  // CV Collection
  eleventyConfig.addCollection("cv", collectionApi =>
    collectionApi.getFilteredByGlob("src/CV. Portfolio/*").filter(item =>
      !(item.data.draft || item.data.type == "draft")
    ).sort((a,b) => a.data.permalink.localeCompare(b.data.permalink))
  )

  eleventyConfig.addCollection("articles", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/B*.*/*")
    .sort((a,b) => b.data.permalink.localeCompare(a.data.permalink))
  })

  eleventyConfig.addCollection("notes", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/N. Notes/*")
    .sort((a,b) => b.data.permalink.localeCompare(a.data.permalink))
  })

  eleventyConfig.addCollection("authors", function (collectionsApi) {
		const hasAuthor = collectionsApi.getAllSorted().filter(function (item) {
			// Side-step tags and do your own filtering
			return "author" in item.data;
		});

    const authors = {}
    hasAuthor.forEach(item => {
      if(!authors[item.data.author]) authors[item.data.author] = []
      authors[item.data.author].push(item)
    })
    return authors
	});

  // Filters
  eleventyConfig.addFilter("formatDate", function(value) { 
    try{
      const date = new Date(value)
      if(date) return date.toISOString().replace('T', ' ').slice(0, -5)
      else throw 'Unrecognized data format'
    }
    catch(e) {
      console.error(`Could not convert "${value}"`, e)
      return value;
    }
  });

  eleventyConfig.addFilter("formatJustDate", function(value) { 
    try{
      const date = new Date(value)
      if(date) return date.toISOString().slice(0, 10)
      else throw 'Unrecognized data format'
    }
    catch(e) {
      console.error(`Could not convert "${value}"`, e)
      return value;
    }
  });

  eleventyConfig.addFilter("dateISOString", function(value) { 
    try{
      const date = new Date(value)
      if(date) return date.toISOString()
      else throw 'Unrecognized data format'
    }
    catch(e) {
      console.error(`Could not convert "${value}"`, e)
      return value;
    }
  });

  eleventyConfig.addFilter("concat", function(value, other) { 
    return value + '' + other
  });

  eleventyConfig.addFilter("merge", function(value, other) { 
    return { ...value, ...other }
  });

  eleventyConfig.addNunjucksShortcode("getVar", function(varString) {
    console.log(this.ctx)
    return this.ctx[varString];
  });


  // global data
  const metadata = {
    language: "en-AU",
    title: "Death.au's Domain",
    subtitle: "Thoughts, stories and ideas.",
    base: "https://death.id.au/",
    author: {
      name: "Death.au",
      email: "", // Optional
    }
  }

  eleventyConfig.addGlobalData("language", metadata.language)
  eleventyConfig.addGlobalData("title", metadata.title)
  eleventyConfig.addGlobalData("subtitle", metadata.subtitle)
  eleventyConfig.addGlobalData("base", metadata.base)

  eleventyConfig.addGlobalData("layout", metadata.layout)

  // Plugins

  //metadata for feeds
  const collection = {
    name: "everything-reversed", // iterate over `collections.everything`
    limit: 20,     // 0 means no limit
  }
  eleventyConfig.addPlugin(feedPlugin, { collection, metadata, type: "atom", outputPath: "/atom.xml" })
  // eleventyConfig.addPlugin(feedPlugin, { collection, metadata, type: "rss", outputPath: "/rss.xml" })
  eleventyConfig.addPlugin(feedPlugin, { collection, metadata, type: "json", outputPath: "/feed.json" })

  const markdownItOptions = {
    html: true,
    breaks: false,
    linkify: true
  }
  const markdownLib = markdownIt(markdownItOptions)
    .use(markdownItBracketedSpans)
    .use(markdownItAttrs)
  eleventyConfig.setLibrary('md', markdownLib)

  // const cacheBusterOptions = {};
  // eleventyConfig.addPlugin(cacheBuster(cacheBusterOptions));
}

export const config = {
  dir: {
    input: "src"
  },
  htmlTemplateEngine: "njk",
  markdownTemplateEngine: "njk",
  templateFormats: ["md","html","njk"]
}

