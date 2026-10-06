# TalentIQ Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Recruiters working during a career fair and recruiters reviewing candidates afterward are equally important users.

## Product Purpose

TalentIQ helps recruiters review career fair candidates using documented resume evidence. Comparing that evidence across saved candidates is the primary product priority. The dashboard also supports live check-in review, conversation capture, decisions, and follow-up.

## Operating Context

- Recruiters review candidate check-ins and resumes during the fair, then save candidates for later side-by-side comparison.
- Recruiters can record a candidate conversation and review its transcript when the local voice service is available.
- Continue, Waitlist, and Decline decisions open a candidate-specific email draft. Sending requires a separate recruiter action and a connected Gmail account.

## Capabilities and Constraints

- The web dashboard lists check-ins, displays resume content, filters candidates by resume evidence, and compares saved candidates by shared and other listed skills, experience, and projects.
- Generated filter suggestions and natural-language custom filters use AI to identify explicit resume evidence. Missing evidence is not a negative assessment of a candidate.
- Candidate comparisons describe evidence; they do not rank people or choose a winner.
- Candidate records come from the connected data source when available; the app can display cached or demo records when live data is unavailable.
- Custom filter text is saved in the current browser for reuse. Recruitment decisions and saved candidates are currently held in the page session.
- Production deployment, data retention, and account-level sharing requirements have not been established.

## Brand Commitments

The product name is TalentIQ. The existing interface uses career fair and recruitment terminology.

## Evidence on Hand

- The application contains working check-in, resume, filter, comparison, recording, transcript, decision, and email-draft flows in `index.html`, `app.js`, and `server.mjs`.
- `fallback-candidates.mjs` supplies demo candidate records when live records are unavailable. Demo content must not be presented as production evidence.
- `ACCESSIBILITY.md` records implementation checks and remaining accessibility work; it does not claim complete WCAG conformance.

## Product Principles

1. Make documented candidate evidence easy to compare before decisions.
2. Keep live fair work and later review equally usable.
3. Distinguish missing resume evidence from a negative assessment.
4. Keep recruitment decisions and email sending under recruiter control.

## Accessibility & Inclusion

The project targets WCAG 2.2 Level AA. The existing accessibility record documents partial checks and calls for further keyboard, screen reader, zoom, and high-contrast testing before claiming conformance.
