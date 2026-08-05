---
title: Area Safe Products
image: https://cdn.some.pics/deathau/6a72cda8d879b.png
type: page
tags: [PHP,CS-Cart,Smarty,MySQL,JavaScript,Stripe,B2B,eCommerce,Shipping]
link: https://www.areasafe.com.au/
summary: A three-path B2B checkout and freight engine, across two storefronts running from one backend.
permalink: /cv.21/
template: cv
date: 2026-03-25
---

# Area Safe Products

Area Safe Products sell road, traffic and public-safety equipment — bollards, wheel
stops, street furniture — across two brands: Area Safe Products and Astra
Street Furniture. Both storefronts run from a single CS-Cart backend.

I rebuilt their checkout and took it live in late March 2026.

## Three ways to buy the same thing

Most eCommerce checkouts have one job: take the money. This one has three, because the
customers aren't all the same kind of customer.

A member of the public buying a wheel stop pays by card. A council or contractor
specifying street furniture wants a **quote**, not an order. An established trade
customer wants to place the order **against their existing account** and be invoiced.
Same catalogue, same cart, three completely different outcomes — and the sales team
works the quotes and account orders that come out the other end.

The complication was that none of this sat on standard data structures. Order type and
flow were carried on non-standard fields, layered over a
heavily modified and by-then deprecated multi-step checkout addon. It was not a
greenfield build; it was a rebuild threaded through several years of accumulated custom
code, which is the harder and far more common real-world problem. I ended up writing a
report for my director explaining *why* the checkout was so resistant to change, which
was as useful to the client as the code.

## What went into it

- **`swim_checkout_options`** — a custom addon managing order type and the branching checkout flow.
- **A weight-and-freight rate engine**, built and loaded via SQL across the `shippings`, `destinations` and `shipping_rates` tables, with GST applied per rate area.
- **`swim_forklift_charge`** — a custom addon that automatically applies a tailgate-unload surcharge when any item in the cart exceeds 80 kg. If you're buying something that needs a truck with a lift on it, the checkout works that out rather than the customer discovering it later.
- **Stripe** with daily settlement, plus Purchase Order and Quote payment methods.
- **The Stair Nosing Calculator** — a small HTML/JS widget on the product page. Stair nosing is sold by length and you need a specific quantity for a specific staircase, so the customer enters their measurements, the widget computes what they need, and it goes straight into the cart. The client built this with an AI tool and then asked me to hook it up to actually add items to the shopping cart.

Later in the year I also spent time on the platform's reliability — the store had been
going down repeatedly, and tracking that down turned into a separate piece of work
involving PHP-FPM pool limits, memory saturation, and a fair amount of arguing with my
own monitoring about what it wasn't telling me.
