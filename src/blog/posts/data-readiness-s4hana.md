---
title: "Data readiness: the quiet thing that derails S/4HANA projects"
description: "Migrations rarely fail on the technology. They fail on the data — duplicates, gaps and inconsistencies that surface too late. Here is how to get ahead of it."
date: "2026-06-03"
category: "Data & migration"
readingTime: "6 min read"
sources:
  - title: "SAP Community — Why data readiness is the biggest success factor in S/4HANA migrations"
    url: "https://community.sap.com/t5/business-transformation-blog-posts/why-data-readiness-is-the-biggest-success-factor-in-sap-s-4hana-migrations/ba-p/14355173"
  - title: "SAP — Release & maintenance information (support.sap.com)"
    url: "https://support.sap.com/en/release-upgrade-maintenance.html"
---

When an SAP migration goes badly, the post-mortem almost never says "the software didn't work." It says something quieter and more uncomfortable: *the data wasn't ready.*

This is a well-recognised pattern, and SAP's own guidance is blunt about it — data readiness is repeatedly identified as the single biggest factor in whether a migration succeeds or stumbles. Yet it is consistently the most underestimated part of a programme, because it is invisible until it is expensive.

## Why data is where projects quietly break

The problem is that the data looks fine. It has been running the business for years. Nobody notices the cracks until you try to move it into a new structure that is far less forgiving than the old one.

The usual culprits are unglamorous:

- **Duplicates** — the same customer, vendor or material existing several times under slightly different records.
- **Gaps** — incomplete master data that the old system tolerated and the new one will not.
- **Inconsistencies** — the same thing recorded different ways across regions, business units or eras of the system.
- **Orphaned history** — transactional data that no longer reconciles cleanly.

Individually, each is minor. In aggregate, across millions of records, they are the difference between a clean cutover and a go-live weekend nobody wants to relive.

## The trap: leaving it to the migration

The instinct is to treat data as a migration-phase problem — something to deal with when the technical move happens. By then it is the worst possible time. The team is under deadline pressure, the issues are surfacing in bulk, and fixing them competes directly with the cutover itself. This is precisely the moment when external day-rates spike, because the work is urgent and the in-house team is already at capacity.

## Getting ahead of it

Data readiness is one of the clearest examples of work an in-house team can — and should — own early. It does not require the migration to have started. It requires structure and a head start:

1. **Profile before you cleanse.** Understand the shape of the problem — where the duplicates, gaps and inconsistencies actually live — before anyone touches a record.
2. **Standardise the definitions.** Agree what a "complete" customer, vendor or material record looks like, so cleansing has a target.
3. **Fix at source where you can.** The earlier a record is corrected in the live system, the less there is to untangle under cutover pressure.
4. **Build a reconciliation habit.** Establish how you will prove, at each stage, that the data still ties out.

None of this is specialist build work. It is structured, methodical knowledge work — exactly the kind that benefits from a repeatable approach, and exactly the kind a well-prepared team can carry without billing it externally.

Our Data Cleanse & Master Data toolkits exist for this: a structured way to find the problems early, while there is still time and budget to fix them calmly. The teams that treat data readiness as an early, in-house responsibility are the ones whose go-live weekends are uneventful — which, in this work, is the highest compliment there is.
