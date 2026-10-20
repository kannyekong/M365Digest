# CloudTweak Academy

CloudTweak Academy is the learning platform for **CloudTweak Technologies Limited**. It combines a public-facing Academy website with a student portal and administrative tools for managing training programmes, curriculum content, enrolments, payments, and learning progress.

This repository contains the Astro application used to deliver the website and Academy experience.

> **Project status:** This README documents the current application structure and known capabilities from the codebase. Exact production configuration, environment values, database policies, and deployment settings must be verified in the relevant private environments.

## Contents

- [Overview](#overview)
- [Key capabilities](#key-capabilities)
- [Technology stack](#technology-stack)
- [Application architecture](#application-architecture)
- [Academy learning model](#academy-learning-model)
- [Student registration and payment flow](#student-registration-and-payment-flow)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Available scripts](#available-scripts)
- [Development workflow](#development-workflow)
- [Security and payment principles](#security-and-payment-principles)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Contribution guidelines](#contribution-guidelines)

## Overview

CloudTweak Academy is designed to support practical, career-focused training in areas such as Microsoft 365 administration, cloud technologies, workplace productivity, and automation.

The application has three main surfaces:

1. **Public Academy website** — presents training programmes and their details so prospective learners can explore available courses.
2. **Student portal** — provides student registration and authentication, profile completion, programme checkout, course access, curriculum browsing, and learning progress.
3. **Administrative tools** — support management of Academy programmes, curriculum modules and lessons, resources, registrations, certificates, and related learning operations.

The project also contains supporting features for content publishing and interactive interfaces. See the source tree for the current implementation of each feature.

## Key capabilities

### Public Academy website

- Public programme discovery and course information.
- Programme detail pages driven by Academy programme data.
- Course descriptions, learning information, delivery details, and pricing where configured.
- Calls to action that direct prospective students into the student onboarding and enrolment journey.

### Student portal

- Student account registration, login, and email verification.
- Student profile completion, including confirmation of the name used for Academy records and certificates.
- Course overview pages with curriculum modules and lessons.
- Enrolment-aware course access and progress summaries.
- Lesson progress tracking for enrolled students.
- Course checkout through the existing Academy registration and payment flow.
- Student dashboard and course navigation.

### Curriculum and learning management

The Academy data model supports:

- Programmes and categories.
- Ordered curriculum modules and lessons.
- Lesson types: lesson, lab, project, assessment, and resource.
- Resources attached to lessons, including videos, documents, PDFs, spreadsheets, ZIP files, and links.
- Resource and lesson progress.
- Quizzes, questions, options, attempts, and results.
- Live sessions.
- Student course progress summaries.
- Certificates and certificate templates.

The exact student-facing experience depends on the data configured for each programme and the features implemented in the relevant pages and components.

### Administrative Academy tools

The admin area includes programme and curriculum management, including tools to create and maintain modules, lessons, and lesson resources. Additional Academy administration supports the learning and operational data represented in the application.

### Content and UI features

Dependencies and source files support features such as blog content, rich-text editing with Tiptap, charts, PDF generation, notifications/toasts, icons, and animated interfaces.

## Technology stack

| Area | Technology |
|---|---|
| Web framework | [Astro](https://astro.build/) |
| Rendering and deployment adapter | Astro server output with the Vercel adapter |
| Interactive UI | React |
| Styling | Tailwind CSS 4 with the Vite plugin |
| Backend services and database | Supabase |
| Authentication | Supabase Auth, accessed through project authentication helpers |
| Payments | Paystack, initialized through the server-side Academy registration flow |
| Rich-text editing | Tiptap |
| Charts | Recharts |
| Icons | Lucide Astro and Lucide React, plus React Icons |
| Validation and forms | Zod, React Hook Form, and resolvers |
| PDF capabilities | React PDF Renderer and pdf-lib |
| Language | TypeScript and JavaScript |
| Hosting configuration | Vercel adapter; deployment is managed outside this README |

Check `package.json` for the complete dependency list and the exact installed version ranges.

## Application architecture

The project uses Astro pages for routes and layouts, with React islands for interactive application experiences.

- **Astro pages** define route structure and compose layouts and components.
- **React islands** handle interactive flows such as registration forms, course overview, checkout, and other client-side interfaces.
- **Shared libraries** centralize authentication, Supabase access, Academy operations, and related business logic.
- **Supabase** provides the database and authentication services used by the application.
- **Server endpoints** perform sensitive operations that should not be trusted to the browser, including payment initialization and enrollment synchronization.

Astro is configured for server output and uses the Vercel adapter. Routes that require server execution should not be accidentally converted to static output without checking their runtime dependencies.

## Academy learning model

The principal learning entities represented in the application include:

- **Programme** — the course offering, identified by a title and slug, with publishing status, description, delivery details, pricing, registration availability, learning outcomes, prerequisites, and certificate settings.
- **Module** — an ordered section within a programme.
- **Lesson** — an ordered learning item within a module.
- **Resource** — supporting content attached to a lesson.
- **Enrollment** — the student's relationship with a programme and its access status.
- **Progress** — records of lesson and resource activity.
- **Quiz and attempt** — assessment content and student results.
- **Live session** — scheduled learning activity.
- **Certificate** — a record of programme completion or certification, including template and verification information.

The underlying Supabase schema and its migrations/policies are the authoritative source for database constraints. This README is not a substitute for the schema definitions.

## Student registration and payment flow

The intended student journey is:

1. A prospective student discovers a programme on the public Academy website.
2. The student chooses to register and enters the student portal's account onboarding flow.
3. The student creates an account and verifies their email when required.
4. The student completes their Academy profile.
5. The student reaches the intended programme checkout.
6. The application loads trusted programme and student data and requests payment initialization through the server-side Academy registration endpoint.
7. The student completes payment on Paystack's hosted authorization page.
8. Payment confirmation and enrollment access are reconciled through the established server-side payment and enrollment processes.

### Registration continuity

A known improvement area is preserving the course a student selected before signup or login. The planned solution is to carry a validated internal return destination through signup, login, email verification, and profile completion, then resume the appropriate course checkout after authentication.

The return destination must be validated to prevent open redirects. Existing registrations and pending payments should be recovered where possible rather than duplicated. Students who have no valid pending course intent should continue to the normal dashboard.

### Payment integrity

The client must not be treated as authoritative for payment status. The server-side registration and reconciliation flow, including verified Paystack webhook handling, should determine whether a payment has succeeded and whether course access can be granted.

## Repository structure

The following is a guide to the main areas of the repository. Individual files may change as the application evolves.

```text
.
├── public/                         # Static assets, logos, icons, and images
├── src/
│   ├── components/                 # Shared Astro and UI components
│   │   └── admin/academy/           # Academy administration and curriculum UI
│   ├── islands/                    # Interactive React islands
│   │   ├── student/                 # Student portal, course, and checkout UI
│   │   └── academy/                 # Academy-specific interactive features
│   ├── layouts/                    # Shared page layouts
│   ├── lib/                        # Authentication, Supabase, and Academy logic
│   ├── pages/                      # Astro routes and server API endpoints
│   │   ├── admin/                   # Administrative routes
│   │   ├── api/                     # Server-side API endpoints
│   │   └── student/                 # Student portal routes
│   ├── styles/                     # Global styles
│   └── types/                      # Shared TypeScript types
├── astro.config.mjs                # Astro, React, Tailwind, and Vercel setup
├── package.json                   # Scripts and dependencies
└── README.md
```

This tree is representative, not exhaustive. Use the repository itself to confirm current paths before making changes.

## Getting started

### Prerequisites

- A supported Node.js LTS release compatible with the installed Astro/Vite dependencies.
- npm.
- Access to the required Supabase project and its configured environment variables.
- Access to any external services needed for the feature being developed, such as Paystack or email delivery.
- Git and access to the repository.

### 1. Clone the repository

```bash
git clone https://github.com/kannyekong/M365Digest.git
cd M365Digest
```

### 2. Install dependencies

```bash
npm install
```

If the repository provides a committed lockfile, keep it in sync with dependency changes and prefer the package-manager command appropriate for that lockfile.

### 3. Configure environment variables

Create a local `.env` file based on the actual variables read by the application and the deployment environment. Do not copy production secrets into source control.

At minimum, inspect the Supabase client configuration and server API routes to identify the environment variables required by the features you intend to run. Server-only secrets must remain server-side.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed by Astro in the terminal.

### 5. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Environment configuration

Environment variable names and requirements can change as integrations evolve. Before running a feature, inspect the configuration code and the relevant API endpoint.

Known configuration areas include:

- **Supabase client configuration:** project URL and public/anonymous client key used by browser-facing clients.
- **Server-side Supabase operations:** server-only credentials such as the service-role key where explicitly required by trusted API routes.
- **Paystack:** server-side credentials and webhook configuration for payment initialization and verification.
- **Email delivery:** provider credentials and sender configuration if email delivery features are enabled.
- **Deployment:** Vercel project settings, build configuration, and any environment variables configured in the hosting dashboard.

Do not expose service-role keys, payment secret keys, webhook secrets, or other privileged credentials through public environment variables, browser bundles, commits, screenshots, or logs.

A local `.env.example` should only be added after the exact variable names and safe placeholder values have been verified against the current codebase.

## Available scripts

The current `package.json` defines these scripts:

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Astro development server |
| `npm run start` | Start the Astro development server |
| `npm run build` | Build the application |
| `npm run preview` | Preview the built application |
| `npm run astro` | Run the Astro CLI |

There is currently no dedicated `test` script declared in `package.json`. Check the scripts before assuming automated unit, integration, or end-to-end tests are available.

## Development workflow

To keep the stable branch safe, use a feature branch for each focused change.

```bash
# Get the latest remote references.
git fetch origin

# Switch to the stable branch and update it without creating a merge commit.
git switch main
git pull --ff-only origin main

# Create a focused branch for your change.
git switch -c feat/short-description

# Review changes before committing.
git status
git diff

# Commit and publish the feature branch.
git add <files-you-intend-to-commit>
git commit -m "Describe the change"
git push -u origin feat/short-description
```

Open a pull request against `main`, describe the behaviour changed, and include manual test steps or screenshots where appropriate. Avoid force-pushing shared branches, discarding uncommitted work, or merging changes before reviewing the diff and build results.

### Code conventions

- Use the existing Astro/React/TypeScript patterns in the relevant area.
- Keep payment initialization, authorization checks, and other sensitive operations on trusted server routes.
- Reuse existing Academy services and types where appropriate rather than duplicating business logic.
- Preserve light and dark theme support when changing UI.
- Add comments to functions and meaningful non-JSX logic where they improve maintainability; avoid unnecessary comments inside JSX markup.
- Keep changes focused and verify the affected user journey end to end.

## Security and payment principles

- Enforce authorization and data access rules in trusted server code and Supabase Row Level Security (RLS) policies.
- Never rely on client-supplied prices, enrollment status, or payment status as the authority for access.
- Validate route parameters, return destinations, and API request bodies.
- Do not expose privileged credentials to the browser.
- Use verified payment notifications and server-side reconciliation to confirm payments.
- Make registration and payment recovery idempotent where possible so refreshes and retries do not create duplicate registrations or charges.
- Avoid logging passwords, access tokens, payment secrets, or unnecessary personal data.

## Testing and verification

Before submitting a change:

1. Run `npm run build`.
2. Review `git diff` and `git status`.
3. Exercise the affected route in the local browser.
4. Test relevant loading, empty, error, and success states.
5. For authentication changes, test both new and existing student accounts, including email verification and profile completion where applicable.
6. For checkout changes, test pending registration recovery, already-enrolled students, payment cancellation/failure, and successful payment confirmation in a safe test environment.
7. Confirm that a student without a course intent still reaches the normal dashboard.
8. Check desktop and mobile layouts and light/dark themes for UI changes.

Do not treat a successful local build as proof that a production deployment, external integration, or complete browser journey has succeeded.

## Deployment

The project is configured for Astro server output with the Vercel adapter. Deployment is managed through the configured Vercel project and repository integration.

Before releasing:

- Confirm the intended commit is on the correct branch.
- Confirm the build succeeds.
- Verify required environment variables are configured for the target environment.
- Review deployment checks and logs.
- Smoke-test authentication, course discovery, checkout, and student access in the deployed environment.
- Confirm that payment and webhook configuration point to the correct environment.

Do not place credentials or private deployment details in this repository.

## Contributing

1. Identify the relevant route, component, or shared library before editing.
2. Create a focused feature or fix branch from the latest `main`.
3. Keep changes scoped and preserve existing behaviour unless a change is intentional.
4. Run the available build and verification steps.
5. Review the diff for unrelated edits, secrets, and generated files.
6. Open a pull request with a clear summary, testing notes, and any relevant screenshots.
7. Merge only after reviewing the proposed changes and required checks.

## Ownership

CloudTweak Academy is part of the CloudTweak Technologies Limited project ecosystem.

For project-specific questions, use the repository's issue and pull request discussions so implementation decisions and technical context remain traceable.
