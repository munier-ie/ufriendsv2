# Ufriends Search Console content analysis

## Scope and source

This analysis uses the Google Search Console export `ufriends.com.ng-Performance-on-Search-2026-10-06.zip`, filtered to Web search for the last 28 days. The daily chart covers 2026-09-06 through 2026-10-03. Query rows are a privacy-limited subset, so query totals do not reconcile to page or chart totals.

## Traffic change

| Period | Clicks | Impressions | CTR |
| --- | ---: | ---: | ---: |
| First 14 days | 15 | 177 | 8.47% |
| Last 14 days | 114 | 3,726 | 3.06% |
| Prior 7 days | 18 | 609 | 2.96% |
| Last 7 days | 96 | 3,117 | 3.08% |
| Full daily chart | 129 | 3,903 | 3.31% |

The last seven days produced 5.3 times as many clicks and 5.1 times as many impressions as the previous seven days. Visibility accelerated on 2026-09-29 and remained elevated through the end of the chart. CTR stayed close to 3%, which means the immediate opportunity is to improve snippets and intent match while protecting the new rankings.

## Most demanding keyword clusters

The grouped counts below use only queries that can be assigned confidently. Ambiguous queries such as `yes`, `modification`, and `how long will it take` are excluded.

| Priority | Search intent | Visible impressions | Visible clicks | Evidence and action |
| ---: | --- | ---: | ---: | --- |
| 1 | NIN modification and correction | 604+ | 14+ | Dominated by `nin modification` (311), `nin modifications` (203), and `nin self service` (11). Protect the service landing page and add narrower support content. |
| 2 | Brand: Ufriends | 62 | 10 | Strong 16.13% CTR, but the average position is 5.73. Consolidate `www` and non-`www` URLs and strengthen the homepage brand entity. |
| 3 | BVN modification and field correction | 59+ | 1 | Page-one positions with weak CTR. Exact demand includes portal, name, phone, meaning, and update timing. |
| 4 | BVN retrieval and recovery | 40+ | 0 | Several recovery variants have positions from 7 to 20, but broad retrieval terms rank much lower. Consolidate duplicate recovery posts and publish a distinct lost-SIM route. |
| 5 | NIN name correction | 34 | 0 | Exact questions already average positions around 8–9. A focused answer should improve CTR. |
| 6 | BVN slip, PDF, sample, and printing | 28 | 1 | `bvn slip pdf` ranks at 7.5 and `bvn slip sample` at 9 with no clicks. Create a format-and-printing guide and improve the existing slip page snippet. |
| 7 | POS terminal acquisition | 12 | 0 | The existing POS guide has 134 page impressions and 1.49% CTR. Improve it rather than create a competing broad POS article. |

## Highest-volume individual queries

| Query | Clicks | Impressions | CTR | Position |
| --- | ---: | ---: | ---: | ---: |
| nin modification | 7 | 311 | 2.25% | 7.46 |
| nin modifications | 4 | 203 | 1.97% | 8.63 |
| ufriends | 10 | 62 | 16.13% | 5.73 |
| how to correct my nin name online in nigeria | 0 | 20 | 0% | 8.40 |
| name modification | 1 | 19 | 5.26% | 8.74 |
| bvn modification portal | 0 | 16 | 0% | 7.00 |
| how to modify my nin online | 0 | 16 | 0% | 9.75 |
| bvn modification | 1 | 12 | 8.33% | 7.00 |
| nin self service | 3 | 11 | 27.27% | 3.09 |
| can i correct my nin name online | 0 | 10 | 0% | 8.00 |
| nin modification online | 0 | 8 | 0% | 7.38 |
| nin details correction | 0 | 8 | 0% | 9.12 |
| i forgot my bvn number | 0 | 8 | 0% | 11.38 |
| bvn slip pdf | 0 | 6 | 0% | 7.50 |
| how long does it take for bvn update to reflect | 0 | 6 | 0% | 8.17 |
| can bvn be changed | 0 | 6 | 0% | 19.83 |

## Page findings

| Page | Clicks | Impressions | CTR | Position | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| `/blog/how-to-modify-bvn-nigeria` | 31 | 1,491 | 2.08% | 6.11 | Protect and improve the title/description. This is the leading organic page. |
| `/nin-modification-nigeria` | 31 | 1,093 | 2.84% | 8.01 | Protect as the main commercial landing page. Link all NIN support articles back to it. |
| `/blog/bvn-slip-lost-...` | 15 | 450 | 3.33% | 8.88 | Keep as the main slip/recovery article. Add links to the new PDF/printing guide. |
| `/blog/forgot-your-bvn-...` | 3 | 424 | 0.71% | 9.14 | High-priority CTR rewrite. Merge two overlapping retrieval posts into this URL. |
| `/blog/how-to-get-pos-terminal-nigeria` | 2 | 134 | 1.49% | 8.28 | Keep and improve. Do not publish another broad POS guide. |
| `/blog/subandgain-vs-ufriends-...` | 0 | 95 | 0% | 5.98 | Keep; rewrite snippet because the rank is already strong. |
| `/blog/alrahuz-vs-ufriends-...` | 0 | 76 | 0% | 8.22 | Keep; rewrite snippet and verify comparison facts. |
| `/blog/maskawasub-vs-ufriends-...` | 0 | 27 | 0% | 9.85 | Keep for now; improve snippet and monitor another 28 days. |

The homepage appears separately as `https://www.ufriends.com.ng/` and `https://ufriends.com.ng/`. Their combined performance is 40 clicks and 210 impressions, but the split indicates a hostname canonicalisation/redirect issue worth fixing.

## Implemented content plan

The site had **35 published blog posts before this work**. The final catalogue has **34 posts**:

- 7 focused new articles were added.
- 8 existing duplicate articles were retired and permanently redirected.
- 3 additional search intents were merged into stronger existing guides instead of creating thin competing URLs.

This covers all 10 planned search-intent opportunities while avoiding keyword cannibalisation.

### Seven focused new articles

| Title | Why it was chosen from GSC |
| --- | --- |
| **How to Correct Your NIN Name Online in Nigeria** | Name-correction variants produced 34 visible impressions, including 20 for the exact long question and 10 for `can I correct my NIN name online`. |
| **BVN Modification Portal: How to Modify BVN Details** | `bvn modification portal` produced 16 impressions at average position 7; related modification variants add further page-one demand. |
| **How Long Does a BVN Update Take to Reflect?** | The exact timing query produced 6 impressions at position 8.17, with related timing variants bringing the visible cluster to 9 impressions. |
| **Can a BVN Number Be Changed? What You Can Correct** | `can bvn be changed` produced 6 impressions, while related number-change questions showed the same uncertainty and needed a clear distinction between the BVN and its editable details. |
| **How to Change Your BVN Phone Number After Losing a SIM** | The report contains direct questions about changing the number linked to a BVN. This is a high-intent task that is materially different from retrieving the BVN. |
| **How to Change or Correct Your BVN Name in Nigeria** | Name-change and correction variants produced about 11 visible impressions and already ranked around positions 7–11. |
| **BVN Slip PDF Sample: Details, Picture, and Printing Guide** | Slip, PDF, sample, picture, and printing variants produced 28 visible impressions; `bvn slip pdf` and `bvn slip sample` were already on page one but had no clicks. |

Each new article directly answers a query found in the Search Console export. Titles, descriptions, headings, and body copy use the relevant search language naturally. The articles explain the user's next step before presenting a contextual Ufriends call to action, distinguish assistance from approval by NIMC or the banking system, and avoid guaranteeing outcomes or timelines.

### Three planned intents merged into established guides

| Search intent | Destination | Why this is more useful |
| --- | --- | --- |
| NIN modification rejected, refund, and next steps | `nin-modification-portal-nigeria` | Keeps rejection, payment, status, and resubmission guidance in the main NIN modification guide. |
| How long NIN modification takes and status meanings | `nin-modification-portal-nigeria` | Prevents two pages from competing for the same broad NIN modification searches. |
| Retrieve BVN without the registered phone number | `forgot-your-bvn-simple-ways-to-recover-check-and-print-your-bvn-slip-in-minutes` | Gives users the registered-line route, lost-SIM route, and bank-assisted recovery in one guide. |

## Completed consolidation and redirects

The absence statement below means the retired URL did not appear in the 28-day `Pages.csv` export; it does not prove the page has never received traffic or links. Permanent redirects preserve any discoverable URL signals and prevent visitors from reaching a dead page.

| Existing article | Recommended destination | Reason |
| --- | --- | --- |
| `how-to-print-nin-slip-online-instantly-using-only-your-phone` | `how-to-print-nin-slip-online-nigeria` | Same task and audience; no row in the Pages export. |
| `how-to-retrieve-bvn-with-phone-number-nigeria` | `forgot-your-bvn-simple-ways-to-recover-check-and-print-your-bvn-slip-in-minutes` | Overlaps the visible recovery page; no separate page row. |
| `how-to-retrieve-your-bvn-using-your-phone-number-and-link-it-correctly-to-your-accounts` | `forgot-your-bvn-simple-ways-to-recover-check-and-print-your-bvn-slip-in-minutes` | Same retrieval intent with an added linkage section; no separate page row. |
| `nin-correction-guide-how-to-fix-wrong-name-phone-number-or-date-of-birth-safely` | `nin-modification-portal-nigeria` | Broad duplicate of the modification guide; the commercial landing page currently owns the demand. |
| `nin-slip-vs-bvn-slip-what-each-one-is-used-for-and-when-you-actually-need-them` | `nin-vs-bvn-difference-nigeria` | Both explain the same two identifiers and use cases. |
| `how-to-start-selling-vtu-airtime-data-and-exam-pins-from-one-website-without-big-capital` | `how-to-start-vtu-business-nigeria` | Same beginner/reseller intent; no separate page row. |
| `best-way-to-buy-cheap-exam-pins-airtime-and-data-from-one-trusted-vtu-platform` | `best-vtu-website-nigeria-2026` | Broad platform-selection intent duplicates the comparison guide. |
| `top-7-reasons-your-nin-or-bvn-gets-rejected-during-kyc-and-how-to-fix-each-one` | `bvn-details-not-matching-your-nin-how-to-correct-name-phone-and-date-of-birth-the-right-way` | Reduces identity-content overlap around mismatch and failed verification searches. |

### Optional archive or merge candidates

| Existing article | Recommendation | Reason |
| --- | --- | --- |
| `e-wallet-vs-virtual-account-nigeria` | Archive with `410 Gone`, or retain only if it supports a current product funnel | No row in the Pages export and no matching query demand in the report. |
| `vtpass-vs-ufriends-best-nin-bvn-slip-platform` | Merge into `best-vtu-website-nigeria-2026` or keep for one more reporting cycle | No page row, while three other competitor pages have impressions. |
| `buy-cheap-airtel-data-online-nigeria` | Merge into `cheapest-data-plans-nigeria-2026` if it remains impression-free | No page row; possible overlap with the cross-network guide. |
| `buy-cheap-glo-data-plans-nigeria-2026` | Merge into `cheapest-data-plans-nigeria-2026` if it remains impression-free | No page row; possible overlap with the cross-network guide. |

These eight source articles were removed from the active catalogue and sitemap, and every old slug now has a permanent redirect to the destination shown above.

## Visitor value and conversion review

The seven new articles and two expanded hub articles were reviewed against four questions:

| Test | Result |
| --- | --- |
| Does it answer a real searched question? | Yes. Each page maps to visible GSC wording such as `bvn modification portal`, `how long does it take for bvn update to reflect`, `can bvn be changed`, `bvn slip pdf`, and NIN name-correction variants. |
| Is it useful rather than padded? | Yes. Articles include document checklists, decision paths, delay or rejection causes, safety warnings, and clear next steps. |
| Could it confuse visitors? | Reduced. The copy separates a BVN number from editable BVN details, distinguishes retrieval from phone-number modification, and states that Ufriends assists while authorised institutions control database approval. |
| Can it convert responsibly? | It is designed to. Calls to action appear after the answer, match the visitor's task, and direct users to relevant Ufriends identity services without promising guaranteed approval. Actual conversion should be measured after publication rather than guaranteed in advance. |

The focused pages contain approximately 830–1,060 words each, with short paragraphs, step lists, safety guidance, official references, and contextual internal links. The expanded NIN modification hub contains about 1,800 words and the consolidated BVN recovery hub about 1,350 words, so the merged topics retain substantive guidance rather than disappearing.

The final review also removed legacy claims that could confuse visitors, including fixed 15-second delivery promises, guaranteed security language, unsupported direct-database claims, and wording that implied Ufriends controls NIMC or BVN approval. The shared article template now displays the Ufriends IT byline and uses a more accurate pre-order call to action.

## Prioritised next actions

1. Deploy the verified content and redirect changes, then submit the updated sitemap in Search Console.
2. Add a permanent non-`www` to `www` redirect and verify canonical tags.
3. Compare another 28-day GSC export by landing page and query to measure CTR and cannibalisation.
4. Reconsider the four optional archive or merge candidates only after the next reporting cycle provides more evidence.
