# P0 portal audit (before implementation)

## Active architecture

- `app.routes.ts` lazy-loads PortalLayout for authenticated healthcare routes and Workspace for `workspace/:area`. Account/actor/permission guards own access; URLs will remain unchanged.
- PortalLayout owns desktop navigation, collapse persistence, mobile drawer, logout and the sole reception practice selector. AppHeader owns account details and language switching. MobileNavigation is presentational: PortalLayout supplies filtered primary links; More opens the sidebar.
- Workspace is one OnPush route component. Its module grid repeats navigation and its header foregrounds email, phone, role and secure-session details. Permission booleans are captured at creation while reservation/queue paths are computed. There is no loaded appointment/queue summary; claiming next patients, counts or no bookings would be unsupported.
- ReceptionPracticeContext owns active assignments, selected practice, load/error state and delegated permissions. App initializes/clears it when the session owner changes; PortalLayout also calls its cached initializer. Sidebar links currently use any-assignment permissions; current-practice tasks must use `allows` instead.
- WorkspaceSidebar and SidebarService have no consumers outside their own directory/spec. They maintain an unfiltered duplicate doctor/patient link list and obsolete CSS, including important declarations.
- PageHeader is the shared heading implementation. Global Bootstrap, Cairo/Manrope, neutral surfaces and logical CSS are the incumbent visual conventions. MobileNavigation already has safe-area padding and the app shell reserves its height.

## Refactor plan

1. Extract existing permitted role links into a typed application navigation source, retaining existing permission predicates and compact mobile order.
2. Replace workspace module grid/header account deck with role-specific daily tasks; reception first, doctor second, patient third. Reuse existing routes and supported booking query parameters. Keep one Workspace component and feature-local task metadata.
3. Group sidebar links into daily, health, clinic management, finance and account sections; keep secondary functions available there rather than repeating the directory on Home.
4. Remove confirmed unused sidebar and service. Replace obsolete workspace markup/styles entirely. Preserve the existing footer edit.
5. Add behavior tests and bilingual translations; verify shell, role tasks, restricted permissions, context switching, mobile More, RTL/LTR and widths.

## Baseline validation

`npm run check:architecture` fails before changes: cross-feature import in admin routes; private reservation imports/template typing bypass in public-doctors; Shared/domain dependency in PortalLayout; existing important declarations in admin revenue, healthcare workspace, obsolete sidebar and global styles. P0 will remove violations in affected files; unrelated violations will be reported without expanding into P1.

## Data and scope decisions

- Use task-based shortcuts instead of fake analytics. Opening reservations does not claim that the existing list is filtered to today.
- New reception booking may use the existing `date` and `practiceId` parameters; the reservation component already opens its editor from these. Only render when the selected assignment grants creation.
- Patient booking uses doctor discovery. Clinic setup remains reachable for doctors, without inferring that a doctor has no clinics from permission data.
- Keep authentication, API contracts, feature internals and guards unchanged.
