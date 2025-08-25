# VolleyBro Architecture

## Table of Contents

- **[Technology Stack](./tech-stack.md)** - Complete overview of the technology stack used in VolleyBro
  - [Core Technology Stack](./tech-stack.md#core-technology-stack) - Frontend, backend, and database technologies
  - [Architecture Patterns](./tech-stack.md#architecture-patterns) - InversifyJS dependency injection and Clean Architecture
  - [Development Tools](./tech-stack.md#development-tools) - Testing, linting, and development utilities
  - [PWA & Performance](./tech-stack.md#pwa--performance) - Progressive Web App and optimization tools
  - [Key Design Decisions](./tech-stack.md#key-design-decisions) - Rationale for technology choices
  - [Environment Configuration](./tech-stack.md#environment-configuration) - Required environment variables and setup

- **[Source Tree Structure](./source-tree.md)** - Comprehensive source code organization guide
  - [Clean Architecture Layers](./source-tree.md#clean-architecture-layers) - Five-layer separation of concerns
    - [Entities Layer](./source-tree.md#1-entities-layer-srcentities) - Domain entities and business logic
    - [Applications Layer](./source-tree.md#2-applications-layer-srcapplications) - Use cases and interfaces
    - [Infrastructure Layer](./source-tree.md#3-infrastructure-layer-srcinfrastructure) - External integrations
    - [Interface Layer](./source-tree.md#4-interface-layer-srcinterface) - API controllers
  - [Presentation Layer](./source-tree.md#presentation-layer) - UI components and Next.js App Router
    - [Next.js App Router](./source-tree.md#nextjs-app-router-srcapp) - Route organization and API endpoints
    - [React Components](./source-tree.md#react-components-srccomponents) - Component organization patterns
  - [Supporting Infrastructure](./source-tree.md#supporting-infrastructure) - Libraries, hooks, and utilities
  - [File Naming Conventions](./source-tree.md#file-naming-conventions) - Consistent naming standards

- **[Coding Standards](./coding-standards.md)** - Development guidelines and best practices
  - [Language & Framework Standards](./coding-standards.md#language--framework-standards) - TypeScript and formatting rules
  - [Clean Architecture Patterns](./coding-standards.md#clean-architecture-patterns) - Implementation patterns by layer
    - [Dependency Injection Patterns](./coding-standards.md#dependency-injection-patterns) - InversifyJS container usage
  - [React Component Standards](./coding-standards.md#react-component-standards) - Component structure and patterns
    - [State Management Patterns](./coding-standards.md#state-management-patterns) - Redux Toolkit and SWR usage
  - [API Route Standards](./coding-standards.md#api-route-standards) - Next.js API route conventions
  - [Styling Standards](./coding-standards.md#styling-standards) - Tailwind CSS and Motion usage
  - [File Organization Standards](./coding-standards.md#file-organization-standards) - Naming and structure conventions
  - [Security Standards](./coding-standards.md#security-standards) - Authentication and validation patterns

- **[Testing Strategy](./testing-strategy.md)** - Comprehensive testing approach and standards
  - [Current Testing Architecture](./testing-strategy.md#-current-testing-architecture) - Jest configuration and environment setup
  - [Development Rules & Code Quality](./testing-strategy.md#-development-rules--code-quality-requirements) - TDD flow and quality standards
    - [Test-Driven Development Flow](./testing-strategy.md#-test-driven-development-tdd-flow) - Red-Green-Refactor process
    - [Test Identifier Standards](./testing-strategy.md#-test-identifier-data-testid-standards) - data-testid conventions
    - [Production Environment Optimization](./testing-strategy.md#-production-environment-optimization) - Test attribute removal
  - [Testing Patterns](./testing-strategy.md#testing-patterns) - Mock strategies and best practices
    - [Mock Strategy & Best Practices](./testing-strategy.md#mock-strategy--best-practices) - Layered mocking approach
    - [Component Testing](./testing-strategy.md#component-testing) - React Testing Library patterns
    - [Use Case Testing](./testing-strategy.md#use-case-testing) - Business logic testing
  - [Technical Debt & Improvements](./testing-strategy.md#-technical-debt--improvement-directions) - Future testing enhancements

## Change Log

| Date       | Version | Description                                  | Author    |
| ---------- | ------- | -------------------------------------------- | --------- |
| 2025-08-14 | 1.0     | Initial brownfield architecture analysis doc | Architect |
| 2025-08-14 | 1.1     | Section splitting and English file renaming  | PO        |
| 2025-08-26 | 2.0     | Reorganized documents structure              | Andrew    |
