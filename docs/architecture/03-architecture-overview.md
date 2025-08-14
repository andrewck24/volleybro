# 🏗️ 架構概覽

## Clean Architecture 五層分離

```text
┌─────────────────────────────────────────────────┐
│                Presentation Layer                │
│   src/app/ (Pages) + src/components/ (UI)       │
├─────────────────────────────────────────────────┤
│                Interface Layer                   │  
│              src/app/api/ (Controllers)         │
├─────────────────────────────────────────────────┤
│               Application Layer                  │
│  src/applications/usecases/ + repositories/     │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer                │
│   src/infrastructure/ (DB, Services, DI)       │
├─────────────────────────────────────────────────┤
│                 Domain Layer                     │
│           src/entities/ (Business Logic)        │
└─────────────────────────────────────────────────┘
```

## 技術棧架構圖

```text
Frontend Stack:
┌─────────────┬─────────────┬─────────────────────┐
│  React 19   │  Next.js 15 │    TypeScript      │
├─────────────┼─────────────┼─────────────────────┤
│ Tailwind CSS│ Shadcn/UI   │    Motion/React    │
├─────────────┼─────────────┼─────────────────────┤
│Redux Toolkit│     SWR     │   React Hook Form  │
└─────────────┴─────────────┴─────────────────────┘

Backend Stack:
┌─────────────┬─────────────┬─────────────────────┐
│  MongoDB    │  Mongoose   │    NextAuth.js v5   │
├─────────────┼─────────────┼─────────────────────┤
│ InversifyJS │  Clean Arch │      Google OAuth   │
├─────────────┼─────────────┼─────────────────────┤
│    Jest     │   Serwist   │    Bundle Analyzer  │
└─────────────┴─────────────┴─────────────────────┘
```

---
