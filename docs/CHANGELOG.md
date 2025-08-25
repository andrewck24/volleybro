# [0.9.0](https://github.com/andrewck24/volleybro/compare/v0.8.2...v0.9.0) (2025-08-25)


### Bug Fixes

* **landing:** add SSR placeholder for CTA Button to prevent hydration mismatch ([254e107](https://github.com/andrewck24/volleybro/commit/254e1073ca9da4bcd59b49022012be79c450db89))
* **landing:** remove legacy features.tsx and restore inline exports ([0c3a1a6](https://github.com/andrewck24/volleybro/commit/0c3a1a612f311eb617aca7bb9de4bcbddbbe3d04))
* **landing:** resolve animate-pulse visibility issue in FeatureDemoImage ([ff55497](https://github.com/andrewck24/volleybro/commit/ff55497e58bb987536b6725d9bb23e02ed534865))
* **landing:** resolve FeatureDemoImage hydration mismatch and optimize image loading ([2212ae6](https://github.com/andrewck24/volleybro/commit/2212ae624a25c3305b6057b2733bc9819136782e))
* **landing:** resolve TypeScript export issue in features components ([041ae91](https://github.com/andrewck24/volleybro/commit/041ae91cc1aae971c97100e5902f665aa73cacbd))
* **tests:** update CTA button text in hero component tests ([3f8cf57](https://github.com/andrewck24/volleybro/commit/3f8cf57e7e2e163cd873d68663acf76bc5ae2c47))
* **ui:** resolve FlipWords animation logic bug when currentWord becomes out of sync ([fd30edc](https://github.com/andrewck24/volleybro/commit/fd30edcde1ff4e7247e1ea0bfe223a98f3a5e75f)), closes [#256](https://github.com/andrewck24/volleybro/issues/256)
* **ui:** resolve React Hooks rules violations in FlipWords components ([c8fdf33](https://github.com/andrewck24/volleybro/commit/c8fdf333c3bf296d1ea2ad266e9dde3eb674479f))


### Features

* **landing:** decouple header/hero and unify CTA button ([38b5b76](https://github.com/andrewck24/volleybro/commit/38b5b76d06e82b686ffe5e30be7e07e5b596750a))
* **landing:** finalize Highlights component with responsive dual-layout architecture ([65dcb23](https://github.com/andrewck24/volleybro/commit/65dcb23053c2c3d39e5aaf671f52d7eeea1d2e48))
* **landing:** implement AnalyticsSection with data analysis features ([c984df6](https://github.com/andrewck24/volleybro/commit/c984df6c8a00d4c7a5e14daf97fbd7246c977fd6))
* **landing:** implement CTASection with TDD and comprehensive QA review ([3e40ce9](https://github.com/andrewck24/volleybro/commit/3e40ce99426d955a9651aa2e10614252e8da24f3))
* **landing:** implement Features component with RecordingSection functionality ([0d2281a](https://github.com/andrewck24/volleybro/commit/0d2281ab55cdfe2cbe22f84d438fd54659d79b57))
* **landing:** implement header glassmorphism effect with mobile optimization ([ed9d5f0](https://github.com/andrewck24/volleybro/commit/ed9d5f0cde86af7c5b979f8f51e063ca8f6566c2))
* **landing:** implement hero section optimization with CSS code splitting ([b7b8dba](https://github.com/andrewck24/volleybro/commit/b7b8dba57c95aa322d8a00c35984866bad99dbde))
* **landing:** implement Highlights component with TDD methodology ([1c65d33](https://github.com/andrewck24/volleybro/commit/1c65d33a282ce30f9f64cd792725da27ecada3b3))
* **landing:** implement TeamManagementSection with team feature cards ([a61850e](https://github.com/andrewck24/volleybro/commit/a61850ef6d5e25797266f3508e2edf4886bb1ace))
* **landing:** improve CTA Button type safety and Hero RWD layout ([46b317a](https://github.com/andrewck24/volleybro/commit/46b317a4c227527a523ff262c84e5f916ecb243a))
* **landing:** modularize Hero component with 7 sub-components ([10ae90e](https://github.com/andrewck24/volleybro/commit/10ae90e6ede4c35b47c16f3f9b1e6c47093778a0))
* **landing:** refactor header layout with preview badge integration ([2d756fa](https://github.com/andrewck24/volleybro/commit/2d756fad54866de11216de71309663ff15947b08))
* upgrade BMad framework to v4.39.0 ([c49d138](https://github.com/andrewck24/volleybro/commit/c49d138b2a0beb0e3cfd6fd8fbbd2b09a9c701d7))


### Performance Improvements

* **landing:** implement LazyMotion architecture for 42% motion bundle reduction ([4b1dd8b](https://github.com/andrewck24/volleybro/commit/4b1dd8b31172e69ee7e660db13a5665e07c9821b))
* **landing:** optimize FeatureDemoImage theme-dependent value calculations ([37a3ab0](https://github.com/andrewck24/volleybro/commit/37a3ab0af63c6056ed6a66a17e4cbdcedb7df1a6)), closes [#256](https://github.com/andrewck24/volleybro/issues/256)
* **ui:** optimize FlipWords components with LazyMotion and SSR compatibility ([56087d0](https://github.com/andrewck24/volleybro/commit/56087d0573f75621b0e4391c5fee0feed9e7bccb))

## [0.8.2](https://github.com/andrewck24/volleybro/compare/v0.8.1...v0.8.2) (2025-08-14)


### Bug Fixes

* **auth:** resolve ObjectId serialization causing team page failures ([91ade6c](https://github.com/andrewck24/volleybro/commit/91ade6c6d11a4cae3823e269df61cef447942047)), closes [#239](https://github.com/andrewck24/volleybro/issues/239)

## [0.8.1](https://github.com/andrewck24/volleybro/compare/v0.8.0...v0.8.1) (2025-08-07)


### Bug Fixes

* **header:** adjust header height to accommodate safe area insets ([6a52884](https://github.com/andrewck24/volleybro/commit/6a528842c1305b3c33086a358a0cc27df526fe94))
* **header:** increase z-index of header for improved visibility ([2ae6dbb](https://github.com/andrewck24/volleybro/commit/2ae6dbb38d54b318d63b1d7786a52ab6280795af))
* **ui:** remove fixed padding from Card in PanelContent ([7f40f45](https://github.com/andrewck24/volleybro/commit/7f40f45e41568fd273f320ca7f943f40327bbed8)), closes [#214](https://github.com/andrewck24/volleybro/issues/214)

# [0.8.0](https://github.com/andrewck24/volleybro/compare/v0.7.0...v0.8.0) (2025-08-01)


### Bug Fixes

* **comp:** adjust styles for `NewRecordForm` and `Calendar` components ([e53574e](https://github.com/andrewck24/volleybro/commit/e53574e47512e332fb1870f67e4616eab2d0f30e))
* **record:** adjust setIndex logic in initialize reducer ([378f9a1](https://github.com/andrewck24/volleybro/commit/378f9a1566d0fb5a29bfcb940b18327c30ccc433))
* **record:** correct params type for Next.js 15 page component ([6eef140](https://github.com/andrewck24/volleybro/commit/6eef140d1466f2364927d5a77320e66d553303b6))
* **record:** ensure proper handling of empty team stats in getTeamsStats function ([c475a80](https://github.com/andrewck24/volleybro/commit/c475a803ce289f9e7e216537256622fe30d48fe3))
* **record:** update setEditingEntryStatus to include setIndex in payload ([45da66a](https://github.com/andrewck24/volleybro/commit/45da66ac9a512fd11ebd96b7a758b8ba5d566866))
* **styles:** remove redundant overflow-y-scroll from body styles ([7450a60](https://github.com/andrewck24/volleybro/commit/7450a604369a693160b8e860e3d7ce26dee1d51d))
* update dependencies for date-fns and react-day-picker ([1ab6f95](https://github.com/andrewck24/volleybro/commit/1ab6f954ae14cff6a7420e476cf3d7b78ef65908))


### Features

* add shadcn/ui components and update global state management ([998ab99](https://github.com/andrewck24/volleybro/commit/998ab9918d0f7920dbd4a39c3e51a8a7e87bdd59))
* **match:** add match record overview page and related components ([5118e5a](https://github.com/andrewck24/volleybro/commit/5118e5a876f7c392f492f56497bf31a60c460319))
* **record:** add `Interval` component integrated with `StatsForOneSet`component ([d4b7d94](https://github.com/andrewck24/volleybro/commit/d4b7d94aede6f332c52888883bd2b554855f7b6b))
* **record:** Add `Summary` component to `Interval` ([df61486](https://github.com/andrewck24/volleybro/commit/df6148661335b002d7ac907e9b19caf92d33d8b0))
* **record:** add match sets overview and layout components ([9d72ccd](https://github.com/andrewck24/volleybro/commit/9d72ccd71efbbb51ead5d3f447f59e57acf4a37c))
* **record:** add set and match completion detection in rally helpers ([992fa10](https://github.com/andrewck24/volleybro/commit/992fa10456fc6d3dae8d590a8bc55edfadccaf7a))
* **record:** add SetEdit component and integrate with SetsList for editing functionality ([ee27759](https://github.com/andrewck24/volleybro/commit/ee277594f3892a205bc1f04f24d512c8124321e6))
* **record:** integrate accordion for sets list and enhance UI interactions ([3343c1a](https://github.com/andrewck24/volleybro/commit/3343c1ad6b173be331e6a11b846b1887680d4223))
* **record:** integrate SetOptions dialog in Interval component and improve panel styling ([e004c19](https://github.com/andrewck24/volleybro/commit/e004c19db0db240d20b9c9a206a2e2f666931070))

# [0.7.0](https://github.com/AndrewCK24/volleybro/compare/v0.6.1...v0.7.0) (2025-03-27)


### Bug Fixes

* **entities:** make Set.options.time property optional ([b5d7053](https://github.com/AndrewCK24/volleybro/commit/b5d7053396cb68707fe6841ed26e094c136bbbe1))
* **record:** handle undefined sets in serving status calculation ([f76257f](https://github.com/AndrewCK24/volleybro/commit/f76257ff43dc9a16b71f87c8fbe6bc17d757be1a))


### Features

* **record:** implement infinite scrolling for match listing ([db42a27](https://github.com/AndrewCK24/volleybro/commit/db42a274a539c9b5c18fb0d2c91795274f2933ba))

## [0.6.1](https://github.com/AndrewCK24/volleybro/compare/v0.6.0...v0.6.1) (2025-03-17)


### Bug Fixes

* **pwa:** add apple-mobile-web-app-capable meta tag to enable iOS splash screen ([61dc50d](https://github.com/AndrewCK24/volleybro/commit/61dc50d99159c3f878e012b9dd38dbf0284ddfbd))

# [0.6.0](https://github.com/AndrewCK24/volleybro/compare/v0.5.2...v0.6.0) (2025-03-16)


### Bug Fixes

* **auth:** resolve type conflicts by consolidating auth type declarations ([4e8e6c5](https://github.com/AndrewCK24/volleybro/commit/4e8e6c582aa151749888296c6f60d5ec58cd7fb2))


### Features

* **core:** implement dependency injection with InversifyJS ([3bc3849](https://github.com/AndrewCK24/volleybro/commit/3bc3849b2853aa4bf22939608c0c74fe7aa8d160))

## [0.5.2](https://github.com/AndrewCK24/volleybro/compare/v0.5.1...v0.5.2) (2025-03-04)


### CI

* **ci:** integrate `semantic-release` for automated versioning ([19dafca](https://github.com/AndrewCK24/volleybro/commit/19dafcae0c8382008cac648362196db8c5bc02b7))
