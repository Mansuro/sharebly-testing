# Sharebly Route Verification Report

Generated: 2026-08-31T13:06:33.991Z
Base URL: http://78.46.183.126:5173
Total routes: 130

## Summary

| Verdict | Count |
|---|---|
| unknown | 108 |
| unverifiable | 13 |
| blocked | 9 |

## 🚫 Blocked (known broken, kept for traceability) (9)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| stripe-pay | `/profile/stripe-pay` | StripePay | P0 | Route marked blocked in routes.json — known broken or defunct. |
| profile-badge | `/profile/badge` | ProfileBadge | P2 | Route marked blocked in routes.json — known broken or defunct. |
| support-tickets | `/profile/support/tickets` | SupportTicketsPage | P1 | Route marked blocked in routes.json — known broken or defunct. |
| ticket-history | `/profile/support/tickets/history` | TicketHistoryPage | P2 | Route marked blocked in routes.json — known broken or defunct. |
| ticket-room | `/profile/support/tickets/:id` | TicketRoomPage | P1 | Route marked blocked in routes.json — known broken or defunct. |
| bids | `/bids` | BidsPage | P0 | Route marked blocked in routes.json — known broken or defunct. |
| supporters | `/supporters` | SupportersPage | P2 | Route marked blocked in routes.json — known broken or defunct. |
| post-calendar | `/calendar/post` | PostCalendarPage | P1 | Route marked blocked in routes.json — known broken or defunct. |
| post-proposal | `/calendar/post-proposal` | PostProposalPage | P1 | Route marked blocked in routes.json — known broken or defunct. |

## ⏭️  Unverifiable (parameterized, no sample_path) (13)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| organization-public-profile | `/profile/organization/:slug` | OrganizationPublicProfilePage | P1 | Parameterized route — no sample_path provided in routes.json. |
| service-order | `/profile/service_progress/:order_id/:post_id` | ServiceOrderPage | P0 | Parameterized route — no sample_path provided in routes.json. |
| service-details | `/browse/task/details/task-workspace/:id` | ServiceDetails | P0 | Parameterized route — no sample_path provided in routes.json. |
| task-workspace | `/browse/task/details/task-workspace/:id` | TaskWorkspace | P0 | Parameterized route — no sample_path provided in routes.json. |
| browse-post-by-type | `/browse/:type` | BrowsePost | P0 | Parameterized route — no sample_path provided in routes.json. |
| exchange-request | `/browse/exchange/request/:post_id/:user_id` | ExchangeRequest | P0 | Parameterized route — no sample_path provided in routes.json. |
| service-progress | `/profile/service_progress/:order_id/:post_id` | ServiceProgress | P0 | Parameterized route — no sample_path provided in routes.json. |
| blog-details | `/blog/:id` | BlogDetails | P2 | Parameterized route — no sample_path provided in routes.json. |
| details-send-proposal | `/browse-tasks/details/send_proposal/:task_id` | SendProposalPage | P2 | Parameterized route — no sample_path provided in routes.json. |
| offer-send-offer | `/browse/offer/send_offer/:id` | SendOfferPage | P2 | Parameterized route — no sample_path provided in routes.json. |
| calendar-view-2 | `/calendar_view/:tid/:sid/:cid/:title/:keyword` | CalendarViewPage | P2 | Parameterized route — no sample_path provided in routes.json. |
| billing-payment-payments-2 | `/profile/billing_payment/payments/:slugs` | PaymentsPage | P2 | Parameterized route — no sample_path provided in routes.json. |
| my-workspace-supporters | `/profile/my_workspace/supporters/:post_id` | SupportersPage | P2 | Parameterized route — no sample_path provided in routes.json. |

## ❓ No browser check (HTTP only) (108)

| Route | Path | Component | Priority | Notes |
|---|---|---|---|---|
| home | `/` | HomePage | P0 |  |
| login | `/login` | LoginPage | P0 |  |
| signup | `/Signup` | SignupPage | P0 |  |
| forgot-password | `/forgot-password` | ForgotPassword | P1 |  |
| change-password | `/ChangePassword` | ChangePassword | P1 |  |
| payment-flow | `/PaymentFlow` | PaymentFlow | P0 |  |
| about | `/about` | AboutPage | P2 |  |
| ip-policy | `/ip_policy` | IpPolicyPage | P2 |  |
| privacy-policy | `/privacy_policy` | PrivacyPolicyPage | P2 |  |
| terms-of-service | `/terms_of_service` | TermsOfServicePage | P2 |  |
| work-agreements | `/work_agreements` | WorkAgreementPage | P2 |  |
| contact-us | `/contact_us` | ContactUsPage | P2 |  |
| help-faq | `/help_faq` | HelpFaqPage | P2 |  |
| settings-profile | `/settings/profile` | ProfileSettingRoot | P1 |  |
| settings-account | `/settings/account` | AccountSettingRoot | P1 |  |
| settings-payment | `/settings/payment` | PaymentSettingPage | P1 |  |
| settings-privacy | `/settings/privacy` | PrivacySettingPage | P2 |  |
| settings-security | `/settings/security` | SecuritySettingPage | P1 |  |
| settings-kyc | `/settings/kyc_verification` | KycSettingPage | P0 |  |
| settings-notifications | `/settings/notifications` | NotificationSettingPage | P2 |  |
| settings-subscriptions | `/settings/subscriptions` | SubscriptionSettingPage | P1 |  |
| profile | `/profile` | ProfilePage | P0 |  |
| profile-organization | `/profile/organization` | OrganizationProfilePage | P1 |  |
| discover-contributors | `/profile/discover_contributors` | DiscoverContributorsPage | P1 |  |
| collaborator-hub | `/profile/collaborator_hub` | CollaboratorHubPage | P1 |  |
| organization-workspace | `/profile/organization_workspace` | OrganizationWorkspacePage | P1 |  |
| collaboration-request | `/profile/collaboration_request` | CollaborationRequestPage | P1 |  |
| invite-to-order | `/profile/invite_to_order` | InviteToOrderPage | P1 |  |
| organization-member-invitation | `/profile/organization_invites` | OrganizationMemberInvitation | P1 |  |
| favorites | `/profile/favorites` | FavoritePage | P2 |  |
| my-proposals | `/profile/my-tasks/proposals` | MyProposalPage | P0 |  |
| featured-listing | `/profile/featured_listing` | FeaturedListingPage | P1 |  |
| pin-listing-checkout | `/profile/featured_listing/payment` | PinListingCheckoutPage | P1 |  |
| my-tasks | `/profile/my-tasks` | MyTaskPage | P0 |  |
| my-applied | `/profile/my_applied` | MyAppliedPage | P1 |  |
| create-service | `/profile/create_service` | CreateService | P0 |  |
| my-exchanges | `/profile/my_exchanges` | MyExchanges | P0 |  |
| exchange-progress | `/profile/exchange_progress` | ExchangeProgressPage | P0 |  |
| exchange-details | `/profile/exchange_progress/details` | ExchangeDetailsPage | P0 |  |
| my-workspace | `/profile/my_workspace` | MyWorkSpacePage | P1 |  |
| manage-proposal-detail | `/profile/Manage_proposal_detail` | MangeProposalDetailPage | P0 |  |
| manage-work-progress | `/profile/work_progress` | ManageWorkProgress | P0 |  |
| addons-catalog | `/profile/addon_catalog` | AddonsCatalogPage | P1 |  |
| addon-history | `/profile/my_addon_history` | AddonHistoryPage | P2 |  |
| addon-checkout | `/profile/addon_catalog/checkout` | AddonCheckoutPage | P1 |  |
| subscription-checkout | `/profile/subscriptions/checkout` | SubscriptionCheckoutPage | P1 |  |
| withdraw | `/profile/billing_payment/withdraw_fund` | WithdrawPage | P0 |  |
| add-fund | `/profile/billing_payment/add_fund` | AddFundPage | P0 |  |
| billing-payment | `/profile/billing_payment` | BillingPaymentPage | P1 |  |
| payment | `/profile/billing_payment` | PaymentPage | P0 |  |
| payment-success | `/profile/billing_payment/connect_success` | PaymentSuccess | P0 |  |
| stripe-connect-success | `/profile/billing_payment/connect_success` | StripeConnectSuccessPage | P0 |  |
| stripe-checkout | `/profile/subscriptions/checkout` | StripeCheckout | P0 |  |
| payment-history | `/profile/payment-history` | PaymentHistoryPage | P1 |  |
| proposals | `/profile/my-tasks/proposals` | ProposalsPage | P0 |  |
| browse-tasks | `/browse-tasks` | BrowseTaskPage | P0 |  |
| task-list | `/task_list` | TaskList | P1 |  |
| post-task | `/post-task` | PostTasks | P0 |  |
| featured-tasks | `/featured-tasks` | FeaturedTask | P1 |  |
| category | `/category` | CategoryPage | P1 |  |
| task-details | `/browse/task/details/` | TaskDetails | P0 |  |
| browse-post | `/browse` | BrowsePost | P0 |  |
| request-proposal | `/browse/request/details/proposal` | RequestProposalPage | P0 |  |
| request-details | `/browse/request/details` | RequestDetails | P0 |  |
| request-progress | `/profile/my_workspace/request_progress` | RequestProgressPage | P0 |  |
| exchange-details-marketplace | `/browse/exchange/details` | ExchangeDetails | P0 |  |
| resource-details | `/browse/resource/details` | ResourceDetails | P1 |  |
| resource-request | `/browse/resource/details/send_request/` | ResourceRequest | P1 |  |
| request-submitted | `/browse/resource/details/send_request/request-submitted` | RequestSubmitted | P1 |  |
| work-progress | `/profile/work_progress` | WorkProgressPage | P0 |  |
| supporter-dashboard | `/profile/supporter_dashboard` | SupporterDashboard | P1 |  |
| supporter-work-progress | `/profile/supporter_dashboard/work_progress` | SupporterWorkProgress | P1 |  |
| featured-tasks-services | `/featured_tasks_services` | FeaturedTasksServices | P1 |  |
| newest-tasks-services | `/newest_tasks_services` | NewestTasksServices | P2 |  |
| recommended-tasks-services | `/recommended_tasks_services` | RecommendedTasksServices | P2 |  |
| global-calendar-view | `/calendar` | GlobalCalendarViewPage | P1 |  |
| notifications | `/notifications` | NotificationPage | P1 |  |
| suggestions | `/suggestions` | Suggestions | P2 |  |
| blog | `/blog` | BlogPage | P2 |  |
| help | `/help` | HelpPage | P2 |  |
| support | `/support` | SupportPage | P2 |  |
| faq | `/faq` | FAQPage | P2 |  |
| offer-details | `/browse/offer/details` | DetailsPage | P2 |  |
| calendar-view | `/calendar_view` | CalendarViewPage | P2 |  |
| messages | `/chat_room` | Messages | P0 |  |
| faq-2 | `/FAQ` | FaqPage | P2 |  |
| my-calendar | `/my_calendar` | MyCalendarPage | P1 |  |
| add-fund-checkout | `/profile/billing_payment/add_fund/checkout` | CheckoutPage | P2 |  |
| billing-payment-payments | `/profile/billing_payment/payments` | PaymentsPage | P2 |  |
| payments-checkout | `/profile/billing_payment/payments/checkout` | CheckoutPage | P2 |  |
| profile-confirm-proposal | `/profile/confirm-proposal` | ConfirmProposalPage | P2 |  |
| dashboard | `/profile/dashboard` | DashboardPage | P0 |  |
| profile-invite-member | `/profile/invite_member` | InviteMemberPage | P2 |  |
| profile-manage-workprogress | `/profile/manage_workprogress` | ManageWorkprogressPage | P2 |  |
| profile-my-progress | `/profile/my-progress` | MyProgressPage | P2 |  |
| profile-my-proposal | `/profile/my-proposal` | MyProposalPage | P2 |  |
| my-services | `/profile/my-service` | MyServicePage | P0 |  |
| premier-support | `/profile/premium_support/` | PremierSupport | P2 |  |
| profile-proposal-details | `/profile/proposal_details` | ProposalDetailsPage | P2 |  |
| profile-room | `/profile/room` | RoomPage | P2 |  |
| profile-subscriptions | `/profile/subscriptions` | SubscriptionsPage | P2 |  |
| profile-view | `/profile/view` | ViewPage | P2 |  |
| public-profile | `/public_profile` | PublicProfilePage | P2 |  |
| search-result | `/search/results` | SearchResultPage | P0 |  |
| send-proposal | `/send_proposal` | SendProposalPage | P2 |  |
| settings | `/settings` | SettingsPage | P2 |  |
| top-experts | `/top_experts` | TopExpertsPage | P2 |  |
| wallet | `/wallet` | WalletPage | P2 |  |
