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
