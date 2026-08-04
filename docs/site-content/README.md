# Docs site content — ready to drop into the landing page

This folder is the **content deliverable** for building a Paystack-style docs
page on the TRAKA landing page. It pairs with the build spec in
`docs/DEVELOPER_DOCS_SITE.md`.

Two things live here:

1. **`pages/`** — the actual documentation pages (`.mdx`), ready to copy into
   the landing page's docs router (e.g. `app/docs/**/page.mdx`).
2. **`_examples/`** — the shared code-sample library the pages reference.

## What you need to implement (components)

The pages use three custom MDX components. Wire them in the MDX provider:

| Component | Props | Behavior |
| --------- | ----- | -------- |
| `<Tabs>` / `<Tab label="...">` | `label` | Language tabs (curl / Node / Python). Purely presentational. |
| `<OpenApi>` | `specUrl` | Renders the OpenAPI spec (Redocly / Scalar / Stoplight Elements). Points at `/openapi.yaml`. |
| `# _examples/<file>` comments | — | Placeholder inside code fences; replace with the real file content (or import the file via the MDX bundler). |

Standard markdown (fenced code, tables, blockquotes) is used everywhere else so
pages degrade gracefully even before components exist.

## Frontmatter schema

```yaml
---
title: Page title            # sidebar + <h1>
description: SEO description
weight: 1                    # ordering in the sidebar
---
```

## Navigation / ordering

| weight | Route | Page |
| ------ | ----- | ---- |
| 1 | `/docs` | overview |
| 2 | `/docs/getting-started` | getting-started |
| 3 | `/docs/authentication` | authentication |
| 10 | `/docs/orders` | orders (create) |
| 11 | `/docs/orders/bulk` | orders/bulk |
| 12 | `/docs/orders/track` | orders/track |
| 13 | `/docs/orders/update-recipient` | orders/update-recipient |
| 14 | `/docs/orders/confirm` | orders/confirm |
| 20 | `/docs/rides` | rides |
| 30 | `/docs/pricing-and-limits` | pricing-and-limits |
| 31 | `/docs/api-keys` | api-keys |
| 40 | `/docs/errors` | errors |
| 50 | `/docs/webhooks/overview` | webhooks/overview |
| 51 | `/docs/webhooks/payloads` | webhooks/payloads |
| 52 | `/docs/webhooks/verification` | webhooks/verification |
| 53 | `/docs/webhooks/delivery` | webhooks/delivery |
| 60 | `/docs/api-reference` | api-reference |
| 70 | `/docs/changelog` | changelog |

## `_examples/` manifest

| File | Used by |
| ----- | ------- |
| `create-order.curl` / `.node.ts` / `.python.py` | orders |
| `bulk-orders.curl` | orders/bulk |
| `track-order.curl` | orders/track |
| `update-recipient.curl` | orders/update-recipient |
| `confirm-delivery.curl` | orders/confirm |
| `book-ride.curl` | rides |
| `create-api-key.curl` | getting-started, api-keys |
| `create-webhook.curl` | webhooks/overview |
| `verify-webhook.node.ts` / `.python.py` | webhooks/verification |

> Keep `_examples/` in sync with `docs/PARTNER_INTEGRATION.md` — the guide is
> the source of truth for all payloads and behavior.

## Source of truth

- API behavior: `docs/PARTNER_INTEGRATION.md`
- Machine-readable spec: `swagger.yaml` (served as `/openapi.yaml` for `<OpenApi>`)
- Build blueprint: `docs/DEVELOPER_DOCS_SITE.md`

## Copy checklist

- [ ] Copy `pages/**` into the landing page docs route.
- [ ] Copy `_examples/**` into a content code-samples folder.
- [ ] Serve `swagger.yaml` as `/openapi.yaml` (or import it into the MDX).
- [ ] Implement `<Tabs>`/`<Tab>`, `<OpenApi>`, and the `CodeBlock` component
      from `docs/DEVELOPER_DOCS_SITE.md`.
- [ ] Add `/openapi.yaml` and `/docs/**` to the sitemap; submit to Search Console.
