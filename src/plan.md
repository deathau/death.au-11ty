---
type: page
permalink: /.plan
layout: null
eleventyAllowMissingExtension: true
templateEngineOverride: njk
---

{{ omg.now.content | cleanPlanText | safe }}Last updated: {{ omg.now.updatedISO | formatDate }}
