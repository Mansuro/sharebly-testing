# Workflow Scenario Verification

- Base URL: http://78.46.183.126:5173
- Checked at: 2026-08-30T11:32:51.095Z
- Authenticated session: no
- Verdicts: 0 pass · 3 fail · 5 skipped · 0 unknown

## Authentication

### ❌ auth-email-login — Email login via navbar modal

- Open the navbar login modal, submit credentials, confirm the modal closes and the session is authenticated.
- Steps: 0/8 passed · 140ms
- Failed step #1 (`goto`): page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/

## Home Flow

### ❌ home-browse-tasks-entry — Home to Browse Tasks

- Land on the home page and navigate into the Browse Tasks list.
- Steps: 0/6 passed · 246ms
- Failed step #1 (`goto`): page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/

## Task Management

### ❌ task-browse-search — Browse Tasks search input present

- Visit the Browse Tasks page and verify a search input is present and usable.
- Steps: 0/4 passed · 128ms
- Failed step #1 (`goto`): page.goto: net::ERR_CONNECTION_REFUSED at http://78.46.183.126:5173/browse/task

### ⏭️ task-create-flow — Task creation form loads

- Authenticated user can open the post-task form and see editable inputs.
- _auth required but no auth state available_
- Steps: 0/4 passed · 0ms

### ⏭️ task-favorite-list — Favorites list opens

- Authenticated user can navigate to their favorites page and see the results heading.
- _auth required but no auth state available_
- Steps: 0/4 passed · 0ms

## Service Management

### ⏭️ service-browse — My Services page loads

- Authenticated user can open their My Services page and the page renders. (Sharebly has no public 'browse services' page; /profile/my-service is the closest real surface.)
- _auth required but no auth state available_
- Steps: 0/4 passed · 0ms

## Profile Management

### ⏭️ profile-view — View Profile

- Authenticated user can open their profile page and see the profile container.
- _auth required but no auth state available_
- Steps: 0/4 passed · 0ms

### ⏭️ profile-edit-form-editable — Edit Profile form is editable

- Authenticated user can reach the account settings page and see at least one editable input.
- _auth required but no auth state available_
- Steps: 0/4 passed · 0ms
