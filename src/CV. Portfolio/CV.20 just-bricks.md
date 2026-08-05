---
title: Just Bricks
image: https://cdn.some.pics/deathau/6a72ce1f8e2ff.png
type: page
tags: [PHP,CS-Cart,MySQL,MariaDB,Smarty,JavaScript,PayPal,Payments,Fraud,Legacy Migration]
link: https://www.justbricks.com.au/
summary: A nine-year platform migration on a live LEGO store, and the anti-fraud suite built on top of it.
permalink: /cv.20/
template: cv
date: 2026-07-30
---

# Just Bricks

Just Bricks is one of Australia's larger independent LEGO retailers. When I picked up
their store it was running CS-Cart 4.5.2 on PHP 7.1 — a 2017-era platform, years past
security support, sitting on an upgrade path that everyone involved had been carefully
not looking at for a long time.

I took it to CS-Cart 4.20.1 on PHP 8.3.

## Fifteen upgrades, in order, on a live store

There is no jump from 4.5 to 4.20. Each version will only offer you the next one, so
the work is fifteen sequential major-version upgrades, plus two PHP major-version jumps
sequenced against which versions the platform would actually run on. All of it on a
store carrying 201,000 orders, 89,000 customers, 7,397 products and a 3.2 GB database,
which had to come out the other side intact.

The interesting decision was what to do with the collisions validator. CS-Cart warns you
which of a site's customisations each upgrade is about to overwrite, and you can skip
the check. Skipping it is much faster, and it silently destroys the customisations that
make the store the store. So I didn't — I used the validator's output at every step as a
list of things to review and re-apply. That is most of where the time went, and it's the
reason nothing was quietly lost.

Along the way: a Phinx migration that failed because of MySQL strict mode, the CS-Cart
4.11 product-variations data migration, missing primary keys across roughly 120 tables
that only surfaced under a newer MySQL, and a store-reopen mechanism that changed
underneath me partway up the path. I also delivered WebP image optimisation and rebuilt
the theme as a proper child of `responsive` rather than a fork, so the next upgrade is a
smaller job than this one was.

## A brand-new theme

Along with the updates, we designed a brand-new, modernised look for the website, and
it was up to me to take it from a set of figma designs to a fully-fledged theme. This
didn't just involve exporting CSS, but building new layouts, sourcing and adding images,
extrapolating for pages that *weren't* designed, and liasing with the client to make
sure they were happy with the end result.

And a lot of tweaking.

## Then the anti-fraud suite

With the platform current, the brief moved to card fraud.

**PayPal Advanced Card Payments.** The ask was a cardholder-name field without a
billing-address block, plus card metadata recorded against orders so staff could review
suspicious ones. Working through it, I established something the client hadn't expected:
under PayPal's standard Smart Buttons flow, guest card entry is routed through an
auto-created PayPal account, so the merchant never receives card data at all. That's why
the metadata wasn't there. Both requests turned out to be the same problem, and moving
to Card Fields solved both at once. Built with 3-D Secure, Apple Pay and Google Pay
wallet capture, and funding-source recording — entirely through hooks, under a house
rule of no core edits.

**Order IP geolocation.** Each order's stored IP is resolved to a country and city and
checked against the billing and shipping country, flagging mismatches for review. I
built it on the MaxMind GeoLite2 database already bundled with the platform, so it added
no runtime dependency, no per-query cost, and no customer data leaving the server —
with an automated, checksum-verified, atomically-swapped database refresh. CS-Cart's own
`fn_get_country_by_ip()` turned out to be IPv4-only, because it round-trips the address
through `long2ip(ip2long())`; I bypassed it so IPv6 orders resolve properly.

**Checkout hardening.** Inline on-blur validation, and blocking payment when a guest
checkout email already belongs to an account — offering an in-place login instead.

