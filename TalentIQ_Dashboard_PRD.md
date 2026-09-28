# TalentIQ Dashboard PRD

## 1. Product Goal

Build a simple recruiter-facing dashboard for **TalentIQ**, an AI-assisted career fair candidate capture and review platform.

The dashboard should help recruiters quickly review candidate records, search and filter candidates, inspect AI-generated summaries, update candidate status, and compare candidates after a career fair.

The product should support recruiter decision-making without automatically ranking, scoring, rejecting, or advancing candidates.

---

## 2. Primary User

- University recruiter
- Hiring manager
- Recruiting coordinator

---

## 3. Core Dashboard Features

### Candidate Table
Show a searchable list of candidates with useful columns such as:

- Name
- University
- Major
- Graduation date
- Relevant skills
- Recruiting event
- Recruiter
- Status
- Last updated

### Search
Allow recruiters to search candidates by:

- Name
- University
- Major
- Skills
- Notes
- Candidate summary

### Filters
Include simple filters for:

- Status
- University
- Major
- Graduation date
- Skills
- Recruiting event
- Recruiter

Statuses should include:

- New
- Reviewed
- Follow-Up
- Interview Requested
- Closed

### Candidate Detail View
Clicking a candidate should open a detailed view showing:

- Basic candidate information
- Resume
- Career interests
- Skills
- Relevant coursework
- Project experience
- Recruiter notes
- Candidate questions
- Follow-up questions
- Recommended next steps
- AI-generated candidate snapshot
- Missing-information flags
- Source / traceability references
- Recruiter approval status

### AI Summary Review
AI-generated summaries must be clearly marked as drafts until reviewed.

Recruiters must be able to:

- Edit the summary
- Approve it
- Reject it
- See the information used to generate it

### Candidate Comparison
Allow recruiters to select a small number of candidates and compare their information side-by-side.

Do not generate an automatic score or ranking.

---

## 4. Suggested Dashboard Layout

### Sidebar

- TalentIQ logo / name
- Dashboard
- Candidates
- Events
- Saved / Follow-Up
- Settings

### Top Bar

- Search
- Current recruiting event
- Recruiter profile

### Main Dashboard

Top summary cards:

- Total Candidates
- New Candidates
- Follow-Ups
- Interview Requests

Below the cards:

- Search bar
- Filters
- Candidate table

Candidate details can open in either:

- a right-side panel, or
- a dedicated candidate page

Keep the interface simple and fast rather than feature-heavy.

---

## 5. Design Direction

The website should use a **clean, high-contrast operations dashboard style inspired by J.B. Hunt's digital brand**. Use the official brand language as visual inspiration only; do not copy the J.B. Hunt layout, logo, or brand assets.

Use:

- A bright safety-yellow accent against charcoal and white
- Crisp, practical typography with clear hierarchy
- Clean white or near-white app surfaces with dark navigation
- Strong grid alignment, visible dividers, and generous but purposeful spacing
- Minimal rounded corners and restrained shadows
- High-contrast controls and clear status treatments
- Subtle 150–250 ms interaction transitions

Avoid:

- Reusing J.B. Hunt logos, imagery, slogans, or proprietary UI elements
- Dark SaaS ambient glows, brown lighting, or heavy glassmorphism
- Excessive gradients, large shadows, and decorative clutter
- Using yellow as a large background field; reserve it for calls to action, active states, and important highlights

---

## 6. Color Palette

Use J.B. Hunt's published digital brand colors as the foundation, adapted for TalentIQ. The official style guide identifies Brand Yellow `#FEDB00`, Digital Black `#211F20`, Brand Blue `#005DBA`, Icicle Blue `#E2E8F0`, and 10% Black `#E6E7E8`. TalentIQ should use the yellow and black as its main visual cues; blue is reserved for informational states.

### Core Colors

| Token | Color | Use |
|---|---|---|
| App Background | `#F7F7F5` | Main page background |
| Surface | `#FFFFFF` | Cards, tables, and panels |
| Sidebar / Digital Black | `#211F20` | Navigation and dark controls |
| Raised Dark Surface | `#2D2B2C` | Sidebar hover and secondary dark surfaces |
| Border | `#D7D7D5` | Default dividers and control borders |
| Strong Text | `#211F20` | Headings and primary content |
| Secondary Text | `#5D5B5C` | Supporting copy |
| Muted Text | `#7D7B7C` | Metadata and low-priority labels |
| Brand Yellow | `#FEDB00` | Primary actions, active navigation, and key highlights |
| Yellow Hover | `#E8C900` | Hover/pressed primary actions |
| Brand Blue | `#005DBA` | Informational states and links only |
| Soft Blue | `#E2E8F0` | Informational backgrounds |
| Success | `#287A4B` | Confirmed/saved states |
| Danger | `#B42318` | Destructive or error states |

### Background Treatment

Use flat, high-clarity surfaces. Do not use atmospheric glows. A faint neutral page tint or a restrained yellow rule can provide separation when needed, but content surfaces should remain primarily white.

---

## 7. Component Styling

### Cards

- Background: `#FFFFFF`
- Border: `1px solid #D7D7D5`
- Border radius: `8px–12px`
- Minimal, soft shadow only when needed for elevation
- Slightly darker border or pale neutral background on hover

### Primary Buttons

- Background: `#FEDB00`
- Text: `#211F20`
- Border radius: `6px–8px`
- Use dark focus rings with a yellow offset or yellow focus rings on dark surfaces

### Secondary Buttons

- White or transparent background
- Border: `#211F20` or `#D7D7D5` depending on emphasis
- Dark text

### Typography

Use a modern, highly legible sans-serif such as Inter, Arial, or a similar system sans-serif.

Hierarchy:

- Page title: large and bold
- Section title: medium-large
- Body: `#5D5B5C`
- Metadata: `#7D7B7C`

### Interaction

Keep interactions subtle:

- 150–250 ms transitions
- Clear hover and pressed colors
- Visible focus indicators
- No exaggerated scaling or animations

---

## 8. Accessibility

The interface should support:

- Keyboard navigation
- Visible focus states
- Properly labeled controls
- Sufficient contrast
- Responsive layout
- Zoom and reflow
- Clear validation and error messages

Aim for WCAG 2.2 AA.

---

## 9. Responsive Behavior

Primary target:

- Laptop / desktop recruiter dashboard

Also support:

- Tablet
- Mobile

On smaller screens:

- Collapse sidebar
- Stack dashboard cards
- Convert candidate table into cards or a horizontally scrollable table
- Keep search and filters accessible

---

## 10. Demo Data

Use synthetic candidate data during development.

Create enough demo candidates to make:

- search
- filters
- statuses
- comparison
- candidate detail views

feel realistic.

Do not use real candidate data.

---

## 11. MVP Priority

Build in this order:

1. Dashboard shell and navigation
2. Candidate table
3. Search and filters
4. Candidate detail view
5. Status updates
6. AI summary review UI
7. Candidate comparison
8. Responsive and accessibility polish

The goal is a polished, functional recruiter dashboard, not a massive recruiting platform.
