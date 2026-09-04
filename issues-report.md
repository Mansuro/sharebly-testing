# Known-Issue Verification

- Base URL: http://78.46.183.126:5173
- Checked at: 2026-09-04T10:58:31.994Z
- Authenticated session: no
- Verdicts: 0 pass · 0 fail · 19 skipped · 20 unknown

## Profile Management

### ⏭️ profile-avatar-missing

- Path: `/profile`
- Issue: No picture in the profile section even though a picture has been uploaded.
- Targeted rule: `avatarImageLoaded`
- _Skipped: auth required but no auth state available_

### ⏭️ profile-overload

- Path: `/profile`
- Issue: Too many colors; text does not highlight key information; risk of information overload.
- _Skipped: auth required but no auth state available_

### ⏭️ favorites-unclear-heading

- Path: `/profile/favorites`
- Issue: 'Results found' is not a clear message; needs clearer headings.
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-uniform-cards

- Path: `/profile/dashboard`
- Issue: Dashboard cards are too uniform; no visual hierarchy among key metrics.
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-sidebar-dominant

- Path: `/profile/dashboard`
- Issue: Open profile sidebar dominates; floating action buttons cluster creates cognitive overload.
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-cannot-publish

- Path: `/profile/dashboard`
- Issue: Content cannot be published from the dashboard; links and buttons are inactive.
- Targeted rule: `dashboardHasActionableButtons`
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-content-not-publishable

- Path: `/profile/dashboard`
- Issue: Content cannot be published.
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-no-user-guidance

- Path: `/profile/dashboard`
- Issue: Lack of clear user guidance; users need to understand from this page that they can post various things. The UX here is terrible.
- _Skipped: auth required but no auth state available_

### ⏭️ dashboard-double-calendar

- Path: `/profile/dashboard`
- Issue: Double pop-up calendar and Published buttons; confusing UX.
- _Skipped: auth required but no auth state available_

### ⏭️ workspace-unable-to-load

- Path: `/profile/my_workspace`
- Issue: 'Unable to load your posted orders' error shows alongside empty state — contradictory messaging.
- Targeted rule: `noErrorAlertVisible`
- _Skipped: auth required but no auth state available_

### ⏭️ workspace-confusing

- Path: `/profile/my_workspace`
- Issue: Absolutely confusing; very poor; users dropping off here.
- _Skipped: auth required but no auth state available_

### ⏭️ workspace-error-on-empty

- Path: `/profile/my_workspace`
- Issue: Error messages for non-existent content disrupt the UX.
- _Skipped: auth required but no auth state available_

### ⏭️ supporter-dashboard-no-feedback

- Path: `/profile/supporter_dashboard`
- Issue: After confirmation, user does not see what happened — no redirect or info.
- _Skipped: auth required but no auth state available_

## Settings

### ⏭️ settings-account-cannot-edit

- Path: `/settings/account`
- Issue: Cannot be edited. Error message shown.
- Targeted rule: `noErrorAlertVisible`
- _Skipped: auth required but no auth state available_

### ⏭️ settings-account-cannot-save

- Path: `/settings/account`
- Issue: Cannot edit the information. Cannot save.
- Targeted rule: `formFieldsEditable`
- _Skipped: auth required but no auth state available_

### ⏭️ settings-privacy-copy

- Path: `/settings/privacy`
- Issue: Confusing connections wording.
- _Skipped: auth required but no auth state available_

### ⏭️ settings-security-wrong-info

- Path: `/settings/security`
- Issue: Newly-created profile contains another user's information.
- _Skipped: auth required but no auth state available_

## Home

### ❓ home-zoom-distortion

- Path: `/`
- Issue: At 100% zoom, the web design is distorted and does not display properly.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-too-many-header-links

- Path: `/`
- Issue: Too many links in the header make users feel overwhelmed.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-slicer-broken

- Path: `/`
- Issue: The slicer isn't working.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-why-choose-us-broken

- Path: `/`
- Issue: 'Why choose us' section not working.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-marketplace-header

- Path: `/`
- Issue: Marketplace link can be removed from the header; users find it in profile.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-only-exchanges

- Path: `/`
- Issue: Only exchanges shown — tasks and other sections missing.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-map-hover-not-clickable

- Path: `/`
- Issue: Mouseover indicators on maps are not clickable; only navigation button is active.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ home-image-upload-broken

- Path: `/`
- Issue: Unable to upload an image; uploads are generally not possible.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/
- Generic failures:
  - **http-ok**: HTTP 0

## Task Management

### ❓ browse-task-missing-images

- Path: `/browse/task`
- Issue: Avatars, preview images, cover images, card images, listing images and thumbnails missing across galleries and upload preview.
- Targeted rule: `imagesActuallyLoaded`
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task
- Generic failures:
  - **http-ok**: HTTP 0
- Rule failed: **imagesActuallyLoaded** — skipped (nav failed: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task)

### ❓ browse-task-filters-irrelevant

- Path: `/browse/task`
- Issue: Filters do not include relevant options for narrowing down postings.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ task-details-undefined

- Path: `/browse/task/details/?~undefined`
- Issue: URL contains 'undefined'; nothing is displayed.
- Targeted rule: `noUndefinedOnPage`
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task/details/?~undefined
- Generic failures:
  - **http-ok**: HTTP 0
- Rule failed: **noUndefinedOnPage** — skipped (nav failed: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task/details/?~undefined)

### ❓ task-details-comments-locked

- Path: `/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9`
- Issue: Comments may not be enabled until the order has been completed.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ task-details-empty-but-calendar-shows

- Path: `/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9`
- Issue: No items available, but items are displayed in the calendar.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ task-details-calendar-no-close

- Path: `/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9`
- Issue: Calendar has no 'X' to close; personal calendar needs name and distinct style.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task/details/?~155556b5-c64c-4de4-94c7-8fdb746b98f9
- Generic failures:
  - **http-ok**: HTTP 0

### ⏭️ post-task-poor-design

- Path: `/post-task`
- Issue: Post-task page has unacceptably poor presentation; design is distorted.
- Targeted rule: `noHorizontalOverflow`
- _Skipped: auth required but no auth state available_

### ⏭️ post-task-form-overlap

- Path: `/post-task`
- Issue: Forms are not designed to cover or overlap the page.
- _Skipped: auth required but no auth state available_

## Category

### ❓ category-calendar-broken

- Path: `/category?query=Household%20%26%20Cleaning&ref_ctx_id=5262ad08-6bc2-4839-9d24-6621cfe24c1b`
- Issue: Calendar isn't displaying entries; no 'X' button to close the calendar.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/category?query=Household%20%26%20Cleaning&ref_ctx_id=5262ad08-6bc2-4839-9d24-6621cfe24c1b
- Generic failures:
  - **http-ok**: HTTP 0

## Suggestions

### ❓ suggestions-needs-search

- Path: `/suggestions`
- Issue: There must be a search function and an advanced-search option on this page.
- Targeted rule: `searchInputPresent`
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/suggestions
- Generic failures:
  - **http-ok**: HTTP 0
- Rule failed: **searchInputPresent** — skipped (nav failed: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/suggestions)

### ❓ suggestions-too-much-text

- Path: `/suggestions`
- Issue: Lists should not contain continuous text — only the most important info.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/suggestions
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ suggestions-detail-vs-list

- Path: `/suggestions`
- Issue: Search results should only include the most important information; additional text can live on the detail pages.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/suggestions
- Generic failures:
  - **http-ok**: HTTP 0

## Search

### ❓ search-breadcrumb-broken

- Path: `/search`
- Issue: Selecting 'Search' in the breadcrumb does not navigate; long load time.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/search
- Generic failures:
  - **http-ok**: HTTP 0

### ❓ search-results-no-empty-state

- Path: `/search/results?location_name=Current+location`
- Issue: If no matching offers, should display 'No matching offers' with alternatives; loading is slow.
- HTTP: 0 → final `blank`
- Navigation error: page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/search/results?location_name=Current+location
- Generic failures:
  - **http-ok**: HTTP 0
