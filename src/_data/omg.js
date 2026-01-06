import Fetch from "@11ty/eleventy-fetch"
import * as cheerio from 'cheerio'
import moment from 'moment-timezone'

export default async function () {
  // https://api.omg.lol/#noauth-get-now-page-retrieve-/now-page
  let nowjson = await Fetch("https://api.omg.lol/address/deathau/now", {
      duration: "1d", // 1 day
      type: "json",
      directory: ".omgcache"
  })

  let webhtml = await Fetch("https://omg.lol/deathau", {
      duration: "1d", // 1 day
      type: "text",
      directory: ".omgcache"
  })
  const $ = cheerio.load(webhtml)
  let main = $('main')
  main.find('#footer').remove()

  let avatar = $('#profile-picture').attr('src')

  return {
    now: {
      ...nowjson.response.now,
      updatedISO: moment(nowjson.response.now.updated*1000).tz('Australia/Melbourne').format()
    },
    web: main.html(),
    avatar: avatar
  }
} 