# Accessibility evidence — dashboard v1

Tested 2026-09-29 against the project's WCAG 2.2 Level AA target. This is an implementation and test record, not a claim of complete WCAG conformance.

| Requirement | Implementation and test result |
| --- | --- |
| Keyboard-only use | Navigation and actions use native buttons, links, and form controls. The skip link targets the candidate list. Opening detail views places focus on their Back button; closing the resume drawer returns focus to the visible microphone control, then to the resume trigger after the closing animation. The resume and email conversation scroll regions are keyboard-focusable. Browser interaction checks confirmed the record view and resume-drawer focus behavior. |
| Clear focus states | Keyboard focus has a visible blue 3px outline on buttons, links, inputs, textareas, and focusable scroll regions. |
| Labeled form controls | Filter and email fields have explicit labels. Icon-only candidate resume, resume drawer, microphone, and close controls have accessible names. Filter-chip states and result groups are named for assistive technology. |
| Sufficient color contrast | Checked key text and control boundaries against their backgrounds: muted text on white 5.70:1, focus blue on white 6.41:1 and yellow 4.69:1, filter input border on white 4.64:1, and filter-chip border on the light surface 4.33:1. These exceed the applicable 4.5:1 text or 3:1 non-text minimums. |
| Readable error messages | An empty custom-filter submission gives a text error, marks the input invalid, and focuses it. Error messages use an alert live region; typing clears the stale error and invalid state. Other loading and result messages use a polite status region. |
| Responsive zoom and reflow | At a 320 CSS-pixel browser viewport, Logs and the raw-resume screen had no horizontal page overflow (305px usable content width and 305px scroll width with a vertical scrollbar). Record and resume-drawer layouts were also checked at 320px; the drawer leaves room for the microphone. Long candidate names and descriptions wrap. Reduced-motion preferences shorten transitions and animations. |

## Test results

- `npm test`: 36 passed, 0 failed.
- axe-core 4.13.0 in Chrome: 0 automated violations on Logs, Saved, record, open resume drawer, raw-resume detail, and email dialog states. Initial semantic table and detail-landmark findings were corrected before the final scans. Some dynamic states had one axe “incomplete” check requiring human review.
- Browser interaction checks: invalid filter text is announced through an alert region; typing clears the error; opening a detail screen hides the dashboard-only sidebar; closing the resume drawer restores focus to a visible control.
- Browser reflow checks: 320px viewport on Logs and raw-resume detail; both measured no horizontal page scroll after remediation.
- Saved comparison check: two saved candidate cards rendered as two columns on desktop and one column at a 320px viewport; the 320px view had no horizontal page scroll and axe-core reported 0 automated violations.

## Remediation completed

- Replaced invalid table-role host elements with valid ones and added a main landmark to each detail view.
- Added visible focus treatment and keyboard access to independently scrollable resume and conversation content.
- Improved form-error association, focus, and announcement; increased form-control border contrast.
- Removed the 320px body minimum width that caused horizontal overflow and allowed candidate names to wrap.
- Hid dashboard-only navigation from detail views and kept the resume drawer and microphone separated at narrow widths.

## Known limitations and next checks

- Automated scans do not prove full WCAG 2.2 AA conformance. Complete keyboard-only and screen-reader walkthroughs (including VoiceOver/NVDA), browser zoom at 200% and 400%, and high-contrast/forced-colors testing remain to be performed.
- Connected Gmail conversations, microphone permission and live recording/transcript states, and external authentication flows were not end-to-end audited because they require connected services and/or hardware permissions.
- Contrast measurements cover the key colors and controls listed above, not every possible dynamic or third-party state.
- The candidate list uses ARIA table semantics. A screen-reader walkthrough should confirm its row and column announcements and whether a native HTML table would be clearer.

The next accessibility gate should record assistive-technology results, remediate any findings, and update this file before asserting WCAG 2.2 Level AA conformance.
