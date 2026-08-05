---
title: Canvas Factory
image: https://cdn.some.pics/deathau/6a72cd308b8b3.png
type: page
tags: [JavaScript,GA4,Google Tag Manager,Analytics,CS-Cart,PHP,Debugging]
link: https://www.thecanvasfactory.com.au/
summary: Ecommerce analytics for a store that doesn't sell products — it sells sizes.
permalink: /cv.22/
template: cv
date: 2026-06-12
---

# Canvas Factory

Canvas Factory print wall art — you pick an image, pick a size, and they print and ship
it. They run CS-Cart across Australian, New Zealand and US storefronts, and I was
brought in to implement GA4 and Google Tag Manager ecommerce tracking across all of it.

Which sounds routine, and wasn't, because of one structural fact: **the store doesn't
sell products.**

## Selling sizes, not products

The images come from external licensing providers — Getty, Alamy and others — at a scale
approaching 100,000 images. They aren't CS-Cart products. They don't have product IDs,
they aren't in the catalogue, and they can't be, because the catalogue would be
meaningless at that size and would need to track someone else's inventory.

What the store actually sells is a *size of a print of an image*. GA4's ecommerce model,
meanwhile, very much wants a product with an ID and a category. So the job became
designing a mapping: a composite item-ID scheme of `{source}_{art_image_id}` that stays
stable across sessions and providers, and a category hierarchy that GA4 would accept and
that the client's marketing team could actually read in a report.

## Two bugs worth mentioning

**An `add_to_cart` event that had never once fired in production.** The listener existed
on the upgraded site, so it worked in every environment anyone tested in. It was missing
entirely from live. Nobody had noticed, because the absence of an event doesn't look
like anything — the reports just quietly had a hole where the most important step of the
funnel should be.

**Event integrity across an iframe boundary.** The canvas configurator — where the
customer crops and positions their image — is an iframe maintained by a third-party
developer, so events had to cross a `postMessage` handoff between two codebases, only
one of which I controlled. Debugging that meant establishing, for each event, whether it
was fired at all, fired twice, fired with the wrong payload, or fired into a listener
that had already been torn down. It's a good reminder that in analytics work the bug is
almost never in the analytics.

All of the tracking work shipped, and the client and marketing company involved were
very happy with the results.
