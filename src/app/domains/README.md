# Business domain boundaries

`core` owns application infrastructure: authentication, HTTP concerns, language,
notifications, private media, and security infrastructure.

`domains` owns business contracts and data access used by independent route features.
Each directory is a named business capability with an explicit `index.ts` public API.
Consumers import this public API; domain internals import nearby implementation files.
Domains must not import feature pages or other domains' private implementation.

Route screens and their workflows remain in `features`. The reception patient picker
is a reception workflow component and belongs to that feature. The specialization
selector is a presentation component of the doctor-profile domain, shared by doctor
and administrative review screens. Neither is a business-agnostic Shared primitive.

Services used exclusively by a single feature live in that feature's `services`
directory. Administrative doctor reviews, specialization-request reviews, medical
specialization management, superadmin management, and role/permission management
are owned by `features/admin/services`. Doctor reception account management belongs
to `features/doctor-receptions/services`; reception practice access belongs to
`features/reception/services`. SecurityGovernanceApi manages administrative roles;
authentication and authorization infrastructure remains in `core/auth`.

No API endpoint, authentication policy, state lifetime, or request/response contract
changes as part of relocating these capabilities.
