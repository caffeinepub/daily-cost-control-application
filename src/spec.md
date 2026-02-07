# Specification

## Summary
**Goal:** Enable admins/score-auth-admins to enter tournament scores by explicitly selecting both Player 1 and Player 2, and fix the member name dropdown so it scrolls properly on long lists (including mobile).

**Planned changes:**
- Update the Tournament → Enter Scores form: admins/score-auth-admins can select two participants via separate selectors labeled “Player 1” and “Player 2”, with validation preventing selecting the same member for both.
- Keep the existing non-admin flow unchanged: non-admin users select only an opponent while the caller remains Player 1.
- Add a backend entrypoint for admin/score-auth-admin score submission that accepts Player 1 + Player 2 principals plus match details, applying the same best-of-three validation and tournament state checks as the existing submission flow.
- Fix the member Select dropdown UI to have a consistent max height and vertical scrolling behavior across desktop and mobile, applying to both admin (Player 1/Player 2) and non-admin (opponent) selectors.

**User-visible outcome:** Admins can enter scores for any match by choosing Player 1 and Player 2 explicitly (with clear English validation if they pick the same person), while all users can reliably scroll long member lists in the score-entry dropdowns on desktop and mobile.
