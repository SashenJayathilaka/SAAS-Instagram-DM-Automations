# Referral dashboard reference contract

Reference: Create-Automation-LinktoDM-10-01-2026_05_37_AM.png (1560 × 1600).

- Page: pale gray background, full-width white rounded cards, restrained 14px text, 24px desktop card padding, 16px vertical gaps. AP3K sidebar remains outside this component.
- Main card: link/share row; email invite row; blue informational strip; black-to-gray coupon ticket split at its midpoint with white notches and dashed perforation; eligibility badge/action; compact Pro/Business price pills; gray eligibility panel; pale green four-line commission breakdown.
- Calculator: title left, large projected commission right; signup count and range control; three visual milestone markers without invented benefits. Estimate assumes each referral pays for 11 months.
- Summary: clicks, signups, subscribers, paid out, available and Withdraw button. A source summary table follows, then individual referral activity or centered empty state.
- AP3K terms: plain link pays 30% for 11 qualifying months. Personal promo requires paid plan and 10,000 Instagram followers, discounts first month 40%, pays 10% of first actual payment then 30% of next 10 months. Prices are $9 Pro and $29 Business. Calculate money in cents.
- Controls invoke real authorized server actions. Withdraw opens accessible PayPal email dialog and requests manual review; it never claims funds transferred. Existing legacy invoice credits display separately only when present.
- Mobile: share/email rows stack; buttons remain at least 40px; metric grid becomes two/three columns; coupon retains split layout; referral tables have contained horizontal scrolling; no page overflow.
- Dark: panel surfaces #17171c-ish, borders translucent white, text light, muted text sufficient contrast, ticket remains dark, status panels use transparent tinted dark surfaces.
- Accessibility: semantic headings, labeled email/range inputs, accessible icon links, visible keyboard focus, dialog focus management, pending states and error feedback, no color-only eligibility indicators.
