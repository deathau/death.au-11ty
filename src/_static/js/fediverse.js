/*/
Type: file
Content-Type: application/javascript
Title: Fediverse script
permalink: /js/fediverse.js/
/**/

const SUBSCRIBE_LINK_REL = 'http://ostatus.org/schema/1.0/subscribe'
const AVATAR_LINK_REL = 'http://webfinger.net/rel/avatar'

class FediSocial extends HTMLElement {
  constructor() {
    // Always call super first in constructor
    super();
  }

  connectedCallback() {
    const data = JSON.parse(localStorage.getItem('fedi-social') || '{}')

    let img;
    if(data.avatar) {
      img = document.createElement('img')
      img.src = data.avatar || "https://upload.wikimedia.org/wikipedia/commons/9/93/Fediverse_logo_proposal.svg"
    }
    else {
      img = document.createElement('i')
      img.classList.add('omg-icon', 'omg-fediverse')
    }

    const summary = document.createElement('summary')
    summary.appendChild(img)

    const details = document.createElement('details')
    details.appendChild(summary)

    // popup
    const div = document.createElement('div')
    div.classList.add('card', 'popover')

    if(data.id) {
      //logout
      const p = document.createElement('p')
      p.innerHTML = `Hey again, ${data.name} 👋`
      div.appendChild(p)

      const button = document.createElement('button')
      button.innerText = "Forget me"
      button.addEventListener('click', ev => { localStorage.clear(); window.location.reload() })
      div.appendChild(button)

    }
    else {
      const p = document.createElement('p')
      p.innerHTML = "Hey 👋, <br />please enter your fediverse / mastodon handle below. "

      const form = document.createElement('form')
      form.addEventListener('submit', this.login)

      const input = document.createElement('input')
      input.type = 'text'
      input.name = 'handle'
      input.placeholder = '@user@domain.social'
      form.appendChild(input)

      const button = document.createElement('input')
      button.type = 'submit'
      button.value = 'Submit'
      form.appendChild(button)
      
      div.appendChild(p)
      div.appendChild(form)
    }

    details.appendChild(div)
    this.appendChild(details)
  }

  login(ev) {
    ev.preventDefault()
    const input = this.elements['handle'].value
    let handle = input.trim().replace(/^@/,'')
    const split = handle.split('@')
    if(split.length == 2) {
      const resource = `acct:${handle}`
      const domain = split[1]
      
      // look up remote user via webfinger
      const url = `https://${domain}/.well-known/webfinger?resource=${resource}`
      return fetch(url, {headers: {
        'Accept': 'application/json'
      }}).then(async result => {
        const json = await result.json()
        console.log(json)
        
        const template = json.links.find(link => link.rel && link.rel == SUBSCRIBE_LINK_REL)?.template
        const avatar = json.links.find(link => link.rel && link.rel == AVATAR_LINK_REL)?.href
        const id = json.links.find(link => link.rel && link.rel == "self" && link.type == "application/activity+json")?.href

        const data = { id, template, avatar, name: input }
        localStorage.setItem('fedi-social', JSON.stringify(data))
        window.location.reload()
      })
      .catch(e => {
        console.error(e)
        this.parentElement.querySelector('p').innerHTML = `Sorry, we couldn't find details for ${input}.\n\nTo interact with posts, try searching for their url on ${domain} (or in your fediverse client of choice)`
        return null
      })
    }
    else {
      this.parentElement.querySelector('p').innerHTML = `Please enter your fediverse address in @user@domain.social format`
    }
  }

  clicked(ev) {
    ev.preventDefault()
    console.log("Ow! You clicked me!")
  }
}

customElements.define('fedi-social', FediSocial)

function renderReplies(status, replies, replyContainer, template, sharingUrl) {
  const repliesToThis = replies.filter(d => d.in_reply_to_id == status.id);

  repliesToThis.forEach(reply => {
    const article = template.content.cloneNode(true);

    const permalink = sharingUrl ? sharingUrl.replace("{uri}", reply.uri) : reply.url

    article.querySelector('.avatar').src = reply.account.avatar
    article.querySelector('a.name').href = reply.account.url
    article.querySelector('.name').innerText = reply.account.display_name
    article.querySelector('a.permalink').href = permalink
    article.querySelector('time.dt-published').datetime = reply.created_at
    article.querySelector('time.dt-published').innerText = luxon.DateTime.fromISO(reply.created_at).toRelative()
    
    const contentEl = article.querySelector('.reply-content')
    contentEl.innerHTML = reply.content
    // TODO: images
    if(reply.media_attachments && reply.media_attachments.length > 0)
    for(let att in reply.media_attachments.filter(a => a.type == "image")) {
      const attachment = reply.media_attachments[att];
      const imgLink = document.createElement('a')
      imgLink.href = attachment.remote_url
      imgLink.target = "_blank"
      const img = document.createElement('img')
      img.src = attachment.preview_url
      if(attachment.description) img.alt = img.title = attachment.description
      imgLink.appendChild(img)
      contentEl.appendChild(imgLink)
    }

    
    article.querySelector('a.source').href = permalink
    article.querySelectorAll('.fedi-social a').forEach(a => a.href = permalink)
    article.querySelector('.application').innerText = reply.application.name
    article.querySelector('.replies-count').innerText = reply.replies_count
    article.querySelector('.favourites-count').innerText = reply.favourites_count
    article.querySelector('.reblogs-count').innerText = reply.reblogs_count

    if(reply.replies_count > 0) {
      const section = document.createElement('section')
      section.classList.add('replies')
      renderReplies(reply, replies, section, template, sharingUrl)
      article.querySelector('article').appendChild(section)
    }

    replyContainer.appendChild(article)
  })
}

async function loadContext(status, replyContainer, template, sharingUrl) {
  try{
    const res = await fetch(`https://monrepos.casa/api/v1/statuses/${status.id}/context`, {
      headers: {
        'Authorization': 'Basic Ym90OjJuUmZhTGJ1c3cyaFhA'
      }
    })
    const json = await res.json()
    
    if(json && json.descendants && json.descendants.length > 0){
      const h1 = document.createElement('h1')
      h1.innerText = "Replies"
      replyContainer.appendChild(h1)
      
      renderReplies(status, json.descendants, replyContainer, template, sharingUrl)
    }
  }
  catch(ex){
    console.error(ex)
  }
}

function fediverse() {
  const data = JSON.parse(localStorage.getItem('fedi-social') || '{}')
  document.querySelectorAll("a.external_url:not([href='{external_url}'])").forEach(async (el) => {

    const orig_href = el.href
    let href = data.template ? data.template.replace("{uri}", orig_href) : orig_href
    el.href = href

    try{
      const res = await fetch(`https://monrepos.casa/api/v2/search?type=statuses&q=${orig_href}`, {
        headers: {
          'Authorization': 'Basic Ym90OjJuUmZhTGJ1c3cyaFhA'
        }
      })
      const json = await res.json()
      const status = json?.statuses?.find(s => s.uri == orig_href)

      if(status) {
        const innerHTML = `
          <a href='${href}' target="_blank"><i class="fa fa-comment"></i> ${status?.replies_count}</a>
          <a href='${href}' target="_blank"><i class="fa fa-star"></i> ${status?.favourites_count}</a>
          <a href='${href}' target="_blank"><i class="fa fa-retweet"></i> ${status?.reblogs_count}</a>
        `

        const span = document.createElement('span')
        span.classList.add('fedi-social')
        span.innerHTML = innerHTML

        el.insertAdjacentElement('afterend', span)
        el.remove()
        el = span

        const replyContainer = document.getElementById('fedi-social-replies')
        const template = document.getElementById('fedi-social-reply')
        if(replyContainer && template && status.replies_count > 0) loadContext(status, replyContainer, template, data.template)
      }
    }
    catch(ex){
      console.error(ex)
    }

    if(!data.template) {
      el.addEventListener('click', ev =>{
        ev.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        document.querySelector('fedi-social summary').click()
      })
    }
  })
}