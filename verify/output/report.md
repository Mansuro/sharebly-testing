# Sharebly Route Verification Report

Generated: 2026-05-28T19:29:00.333Z
Base URL: http://78.46.183.126:5173
Total routes: 106

## Summary

| Verdict | Count |
|---|---|
| not-found | 57 |
| pass | 42 |
| variant-works | 7 |

## ✅ Working routes (42)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| home | `/` | HomePage | P0 | 7 console errors |
| login | `/login` | LoginPage | P0 |  |
| signup | `/Signup` | SignupPage | P0 |  |
| forgot-password | `/forgot-password` | ForgotPassword | P1 |  |
| change-password | `/ChangePassword` | ChangePassword | P1 | 5 console errors |
| payment-flow | `/PaymentFlow` | PaymentFlow | P0 | 5 console errors |
| about | `/about` | AboutPage | P2 | 5 console errors |
| ip-policy | `/ip_policy` | IpPolicyPage | P2 | 5 console errors |
| privacy-policy | `/privacy_policy` | PrivacyPolicyPage | P2 | 5 console errors |
| terms-of-service | `/terms_of_service` | TermsOfServicePage | P2 | 5 console errors |
| work-agreements | `/work_agreements` | WorkAgreementPage | P2 | 5 console errors |
| contact-us | `/contact_us` | ContactUsPage | P2 | 5 console errors |
| help-faq | `/help_faq` | HelpFaqPage | P2 | 5 console errors |
| settings-profile | `/settings/profile` | ProfileSettingRoot | P1 | 6 console errors |
| settings-account | `/settings/account` | AccountSettingRoot | P1 | 5 console errors |
| settings-payment | `/settings/payment` | PaymentSettingPage | P1 | 6 console errors |
| settings-privacy | `/settings/privacy` | PrivacySettingPage | P2 | 5 console errors |
| settings-security | `/settings/security` | SecuritySettingPage | P1 | 5 console errors |
| settings-kyc | `/settings/kyc_verification` | KycSettingPage | P0 | 5 console errors |
| settings-notifications | `/settings/notifications` | NotificationSettingPage | P2 | 5 console errors |
| settings-subscriptions | `/settings/subscriptions` | SubscriptionSettingPage | P1 | 5 console errors |
| profile | `/profile` | ProfilePage | P0 | 13 console errors |
| profile-organization | `/profile/organization` | OrganizationProfilePage | P1 | 7 console errors |
| organization-workspace | `/profile/organization/workspace` | OrganizationWorkspacePage | P1 | 11 console errors |
| organization-public-profile | `/profile/organization/:id` | OrganizationPublicProfilePage | P1 | 11 console errors |
| organization-member-invitation | `/profile/organization/member-invitation` | OrganizationMemberInvitation | P1 | 11 console errors |
| organization-invitation | `/profile/organization/invitation` | OrganizationInvitationPage | P1 | 11 console errors |
| favorites | `/profile/favorites` | FavoritePage | P2 | 5 console errors |
| my-tasks | `/profile/my-tasks` | MyTaskPage | P0 | 7 console errors |
| browse-tasks | `/browse-tasks` | BrowseTaskPage | P0 | 11 console errors |
| task-list | `/task_list` | TaskList | P1 | 5 console errors |
| post-task | `/post-task` | PostTasks | P0 | 5 console errors |
| featured-tasks | `/featured-tasks` | FeaturedTask | P1 | 5 console errors |
| category | `/category` | CategoryPage | P1 | 5 console errors |
| browse-post | `/browse` | BrowsePost | P0 | 5 console errors |
| global-calendar-view | `/calendar` | GlobalCalendarViewPage | P1 | 5 console errors |
| notifications | `/notifications` | NotificationPage | P1 | 5 console errors |
| suggestions | `/suggestions` | Suggestions | P2 | 6 console errors |
| blog | `/blog` | BlogPage | P2 | 6 console errors |
| help | `/help` | HelpPage | P2 | 5 console errors |
| support | `/support` | SupportPage | P2 | 5 console errors |
| faq | `/faq` | FAQPage | P2 | 5 console errors |

## 🔄 Working under a different path (fix routes.json) (7)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| discover-contributors | ~~/profile/discover-contributors~~ → `/profile/discover_contributors` | DiscoverContributorsPage | P1 | Primary path 404s. Variant works: /profile/discover_contributors |
| collaborator-hub | ~~/profile/collaborator-hub~~ → `/profile/collaborator_hub` | CollaboratorHubPage | P1 | Primary path 404s. Variant works: /profile/collaborator_hub |
| collaboration-request | ~~/profile/collaboration-request~~ → `/profile/collaboration_request` | CollaborationRequestPage | P1 | Primary path 404s. Variant works: /profile/collaboration_request |
| invite-to-order | ~~/profile/invite-to-order~~ → `/profile/invite_to_order` | InviteToOrderPage | P1 | Primary path 404s. Variant works: /profile/invite_to_order |
| featured-listing | ~~/profile/featured-listing~~ → `/profile/featured_listing` | FeaturedListingPage | P1 | Primary path 404s. Variant works: /profile/featured_listing |
| create-service | ~~/profile/create-service~~ → `/profile/create_service` | CreateService | P0 | Primary path 404s. Variant works: /profile/create_service |
| my-exchanges | ~~/profile/my-exchanges~~ → `/profile/my_exchanges` | MyExchanges | P0 | Primary path 404s. Variant works: /profile/my_exchanges |

## ❌ Not found (404) (57)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| my-proposals | `/profile/my-proposals` | MyProposalPage | P0 | Primary path 404s. No variant worked either. |
| pin-listing-checkout | `/profile/pin-listing/checkout` | PinListingCheckoutPage | P1 | Primary path 404s. No variant worked either. |
| my-applied | `/profile/my-applied` | MyAppliedPage | P1 | Primary path 404s. No variant worked either. |
| my-services | `/profile/my-services` | MyServicePage | P0 | Primary path 404s. No variant worked either. |
| exchange-progress | `/profile/exchange/:id/progress` | ExchangeProgressPage | P0 | Primary path 404s. No variant worked either. |
| exchange-details | `/profile/exchange/:id` | ExchangeDetailsPage | P0 | Primary path 404s. No variant worked either. |
| my-workspace | `/profile/workspace` | MyWorkSpacePage | P1 | Primary path 404s. No variant worked either. |
| dashboard | `/dashboard` | DashboardPage | P0 | Primary path 404s. No variant worked either. |
| manage-proposal-detail | `/profile/proposals/:id/manage` | MangeProposalDetailPage | P0 | Primary path 404s. No variant worked either. |
| manage-work-progress | `/profile/work-progress/manage` | ManageWorkProgress | P0 | Primary path 404s. No variant worked either. |
| addons-catalog | `/profile/addons` | AddonsCatalogPage | P1 | Primary path 404s. No variant worked either. |
| addon-history | `/profile/addons/history` | AddonHistoryPage | P2 | Primary path 404s. No variant worked either. |
| addon-checkout | `/profile/addons/checkout` | AddonCheckoutPage | P1 | Primary path 404s. No variant worked either. |
| subscription-checkout | `/profile/subscription/checkout` | SubscriptionCheckoutPage | P1 | Primary path 404s. No variant worked either. |
| stripe-pay | `/profile/stripe-pay` | StripePay | P0 | Primary path 404s. No variant worked either. |
| withdraw | `/profile/withdraw` | WithdrawPage | P0 | Primary path 404s. No variant worked either. |
| add-fund | `/profile/add-fund` | AddFundPage | P0 | Primary path 404s. No variant worked either. |
| billing-payment | `/profile/billing` | BillingPaymentPage | P1 | Primary path 404s. No variant worked either. |
| payment | `/profile/payment` | PaymentPage | P0 | Primary path 404s. No variant worked either. |
| payment-success | `/profile/payment/success` | PaymentSuccess | P0 | Primary path 404s. No variant worked either. |
| stripe-connect-success | `/profile/stripe-connect/success` | StripeConnectSuccessPage | P0 | Primary path 404s. No variant worked either. |
| stripe-checkout | `/profile/stripe-checkout` | StripeCheckout | P0 | Primary path 404s. No variant worked either. |
| payment-history | `/profile/payment/history` | PaymentHistoryPage | P1 | Primary path 404s. No variant worked either. |
| profile-badge | `/profile/badge` | ProfileBadge | P2 | Primary path 404s. No variant worked either. |
| proposals | `/profile/proposals` | ProposalsPage | P0 | Primary path 404s. No variant worked either. |
| support-tickets | `/profile/support/tickets` | SupportTicketsPage | P1 | Primary path 404s. No variant worked either. |
| ticket-history | `/profile/support/tickets/history` | TicketHistoryPage | P2 | Primary path 404s. No variant worked either. |
| ticket-room | `/profile/support/tickets/:id` | TicketRoomPage | P1 | Primary path 404s. No variant worked either. |
| bids | `/bids` | BidsPage | P0 | Primary path 404s. No variant worked either. |
| service-order | `/service-order/:id` | ServiceOrderPage | P0 | Primary path 404s. No variant worked either. |
| service-details | `/service/:id` | ServiceDetails | P0 | Primary path 404s. No variant worked either. |
| task-details | `/task/:id` | TaskDetails | P0 | Primary path 404s. No variant worked either. |
| task-workspace | `/task/:id/workspace` | TaskWorkspace | P0 | Primary path 404s. No variant worked either. |
| browse-post-by-type | `/browse/:type` | BrowsePost | P0 | Primary path 404s. No variant worked either. |
| request-proposal | `/request-proposal` | RequestProposalPage | P0 | Primary path 404s. No variant worked either. |
| request-details | `/request/:id` | RequestDetails | P0 | Primary path 404s. No variant worked either. |
| request-progress | `/request/:id/progress` | RequestProgressPage | P0 | Primary path 404s. No variant worked either. |
| exchange-request | `/exchange-request` | ExchangeRequest | P0 | Primary path 404s. No variant worked either. |
| exchange-details-marketplace | `/exchange/:id` | ExchangeDetails | P0 | Primary path 404s. No variant worked either. |
| resource-details | `/resource/:id` | ResourceDetails | P1 | Primary path 404s. No variant worked either. |
| resource-request | `/resource-request` | ResourceRequest | P1 | Primary path 404s. No variant worked either. |
| request-submitted | `/request-submitted` | RequestSubmitted | P1 | Primary path 404s. No variant worked either. |
| work-progress | `/work-progress/:id` | WorkProgressPage | P0 | Primary path 404s. No variant worked either. |
| service-progress | `/service-progress/:id` | ServiceProgress | P0 | Primary path 404s. No variant worked either. |
| supporters | `/supporters` | SupportersPage | P2 | Primary path 404s. No variant worked either. |
| supporter-dashboard | `/supporter/dashboard` | SupporterDashboard | P1 | Primary path 404s. No variant worked either. |
| supporter-work-progress | `/supporter/work-progress/:id` | SupporterWorkProgress | P1 | Primary path 404s. No variant worked either. |
| featured-tasks-services | `/featured` | FeaturedTasksServices | P1 | Primary path 404s. No variant worked either. |
| newest-tasks-services | `/newest` | NewestTasksServices | P2 | Primary path 404s. No variant worked either. |
| recommended-tasks-services | `/recommended` | RecommendedTasksServices | P2 | Primary path 404s. No variant worked either. |
| search-result | `/search` | SearchResultPage | P0 | Primary path 404s. No variant worked either. |
| post-calendar | `/calendar/post` | PostCalendarPage | P1 | Primary path 404s. No variant worked either. |
| my-calendar | `/calendar/my` | MyCalendarPage | P1 | Primary path 404s. No variant worked either. |
| post-proposal | `/calendar/post-proposal` | PostProposalPage | P1 | Primary path 404s. No variant worked either. |
| messages | `/messages` | Messages | P0 | Primary path 404s. No variant worked either. |
| blog-details | `/blog/:slug` | BlogDetails | P2 | Primary path 404s. No variant worked either. |
| premier-support | `/premier-support` | PremierSupport | P2 | Primary path 404s. No variant worked either. |
