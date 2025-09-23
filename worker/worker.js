/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import YAML from 'yaml'
import moment from 'moment-timezone'
import { ColorTranslator } from  'colortranslator'


// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(req, env, ctx) {
    // You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
    const url = new URL(req.url);

    // log the incoming request info
    console.info(`${new Date().toISOString()} 📥 ${req.method} ${req.url}`)

    // CORS route (for now, any domain has access)
    if(req.method === "OPTIONS") {
      const headers = {
        'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': true
      }
      let h
      if (h = req.headers.get('Access-Control-Request-Headers')) 
        headers['Access-Control-Allow-Headers'] = 'Accept, Content-Type, Authorization, Signature, Digest, Date, Host'
      return new Response('', { status: 204, headers })
    }
    else if(req.method === "POST" && url.pathname.startsWith("/status.lol")) {
      const body = await req.json()
      return handleLol(body, env)
    }
    else if(req.method === "GET" && url.pathname.startsWith("/apget")) {
      const href = url.searchParams.get('url')
      if(!href) return new Response('"url" parameter required', { status: 400, headers: { "Content-Type": "text/plain" }})

      return fetch(url, {
        method: "GET",
        headers: {
          'Accept': 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
        }
      })
    }
		
		return new Response(
			`This is a worker to accept POST requests at /status.lol from a status.lol webhook`,
			{ headers: { "Content-Type": "text/html" } }
		);
  },
};

async function handleLol(body, env) {
  /* incoming: {
    status_emoji: '🧪',
    status_text: 'This is a test.',
    posted: 1715234767,
    id: '663c67cf3344e',
    url: 'https://status.lol/deathau/663c67cf3344e'
  } */

  // get the url (and username) from the incoming data
  const url = new URL(body.url);
  const username = url.pathname.substring(1).split('/')[0]

  // get the full data of the status.lol post
  const statusres = (await fetch(`https://api.omg.lol/address/${username}/statuses/${body.id}`))
  if(!statusres.ok) return statusres
  const status = (await statusres.json()).response.status

  // the full data does not include background color -_- so get the full list as well.
  const statuslistres = (await fetch(`https://api.omg.lol/address/${username}/statuses`))
  if(!statuslistres.ok) return statuslistres
  const statuslist = (await statuslistres.json()).response.statuses
  const fullstatus = statuslist.find(s => s.id == body.id)

  // check that the incoming data matches what we got from status.lol
  if(status.id != body.id) {
    console.error("Error: Incoming status does not match retrieved status!", body, status)
    return new Response(JSON.stringify({body,status}, null, 2), {status:500})
  }

  // create a "title" for the status
  const title = status.emoji + ' ' + status.content.match(/((\s*\S+){10})([\s\S]*)/)[1].replaceAll('\n', ' ') + '...'

  // this is the frontmatter data we're adding to the markdown file
  let frontmatter = {
    id: status.id,
    title,
    date: moment(status.created*1000).tz('Australia/Melbourne').format(),
    location: `/${(status.created * 1000).toString(36)}`,
    permalink: `/n.${(status.created * 1000).toString(36)}/`,
    emoji: status.emoji,
    background: status.background || fullstatus?.background || null,
    external_url: status.external_url,
    status_url: `https://${status.address}.status.lol/${status.id}`,
    tags:[],
    author: username
  }
  if(frontmatter.background)
    frontmatter.dark_background = frontmatter.background ? darkColor(frontmatter.background) : null

  // this is the content
  let content = /**/status.content/*/body.status_text//*/// can switch for testing

  // let's get funky with the hashtags
  content.match(/#\w+/g)?.filter((v,i,a) => a.indexOf(v) === i)?.forEach(hashtag => {
    const tag = hashtag.substring(1)
    const nonPascal = tag.replace(/([a-z])([A-Z])/g, "$1 $2")
    const kebab = tag.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    frontmatter.tags.push(nonPascal)
    content = content.replaceAll(hashtag, `[${hashtag}](/tag/${kebab}){.tag}`)
  })

  // and similarly with fediverse mentions
  const mentions = content.match(/@[\w\-]+@[\w\-]+\.\S+/)?.filter((v,i,a) => a.indexOf(v) === i)
  if(mentions) for(let mention of mentions) {
    try{
      const handle = mention.substring(1)
      const domain = handle.substring(handle.indexOf('@') + 1)
      const webfinger = await (await fetch(`https://${domain}/.well-known/webfinger?resource=acct:${handle}`)).json()
      if(webfinger) {
        const link = webfinger.links?.find(l => l.rel == "http://webfinger.net/rel/profile-page")?.href
                  || webfinger.links?.find(l => l.rel == "me" || l.rel == "self")?.href
                  || webfinger.aliases && webfinger.aliases.length > 0 ? webfinger.aliases[0] : undefined

        if(link) content = content.replaceAll(mention, `[${mention}](${link}){.mention target="_blank"}`)
      }
    }
    catch(err) { console.error(err) }
  }

  const yamlOptions = {
    collectionStyle: 'flow',
    simpleKeys: true
  }
  let frontmatterString = YAML.stringify(frontmatter, null, yamlOptions)
  // weblog has some quirks with its yaml interpretation
  frontmatterString = frontmatterString
    .replace(/{\n/, '').replace(/}\n/, '').replace(/^\s\s/gm, '').replace(/,$/gm, '')
    .replace(/\ntags: \[\]$/m, '')
    .replace(/^tags: \[ (.*) \]$/m, "tags: $1")
    .replace(/^title: "(.*)"$/m, "title: $1")

  // this is the actual markdown
  let markdown = `---\n${frontmatterString}---\n\n${content}\n`

  // make sure we have the env variables defined
  if(env.FORGEJO_TOKEN && env.FORGEJO_URL && env.GIT_REPO) {
    // the url to push the file to the repo in `/weblog/status/{whatever the location is}.md`
    let pushurl = `${env.FORGEJO_URL}api/v1/repos/${env.GIT_REPO}/contents/weblog/status${frontmatter.location}.md`
    
    // just return the result of this request
    return await fetch(pushurl, {
      method: "POST",
      body: JSON.stringify({
        content: btoa(unescape(encodeURIComponent(markdown))), // the markdown content as base64
        message: `Added status ${frontmatter.location}` // the commit message
      }),
      headers: {
        'Authorization': `token ${env.FORGEJO_TOKEN}`, // require the auth token
        'Content-Type': 'application/json' // the content type is required for this api
      }
    })
  }
  else if(env.GITHUB_TOKEN && env.GITHUB_REPO) {
    // the url to push the file to the repo in `/weblog/status/{whatever the location is}.md`
    let pushurl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/src/N. Notes${frontmatter.location}.md`
    
    // just return the result of this request
    return await fetch(pushurl, {
      method: "PUT",
      body: JSON.stringify({
        content: btoa(unescape(encodeURIComponent(markdown))), // the markdown content as base64
        message: `Added status ${frontmatter.location}` // the commit message
      }),
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`, // require the auth token
        'Content-Type': 'application/vnd.github.v3+json', // the content type is required for this api
        'User-Agent': 'status.death-au.workers.dev' // github requires a user agent
      }
    })
  }

  return new Response(markdown, { status: 400 })
}

function darkColor(hex) {
  let color = new ColorTranslator(hex)

  // invert
  color.setR(255 - color.R)
  color.setG(255 - color.G)
  color.setB(255 - color.B)

  // hue shift
  // yes, I know it should be 180 but 200 looks better
  color.setH((color.H + 200) % 360)

  return color.HEX
}