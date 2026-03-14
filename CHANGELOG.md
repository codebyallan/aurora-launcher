# Changelog

## [1.4.2](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.4.1...aurora-launcher-v1.4.2) (2026-03-14)


### Bug Fixes

* **sgdb:** warn at startup when AURORA_SGDB_PROXY is not set ([#26](https://github.com/codebyallan/aurora-launcher/issues/26)) ([f503f25](https://github.com/codebyallan/aurora-launcher/commit/f503f255e6561c46813be7caf2db09923ea93dc8))
* **sgdb:** warn at startup when AURORA_SGDB_PROXY is not set ([#26](https://github.com/codebyallan/aurora-launcher/issues/26)) ([2a2cc12](https://github.com/codebyallan/aurora-launcher/commit/2a2cc1252351ec66e65b9a875a0ee345d48cb421))

## [1.4.1](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.4.0...aurora-launcher-v1.4.1) (2026-03-14)


### Bug Fixes

* **umu:** respect STORE_PRIORITY order in parallel search ([#23](https://github.com/codebyallan/aurora-launcher/issues/23)) ([eb1255d](https://github.com/codebyallan/aurora-launcher/commit/eb1255d9be8a7b8c7455d921481a88dca031f8b6))

## [1.4.0](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.3.0...aurora-launcher-v1.4.0) (2026-03-13)


### Features

* **sgdb:** route cover art through server-side proxy ([#20](https://github.com/codebyallan/aurora-launcher/issues/20)) ([9a130c0](https://github.com/codebyallan/aurora-launcher/commit/9a130c0caa55d2b267f92cdc7ecb2dbfefc86624))
* **sgdb:** route cover art through server-side proxy ([#20](https://github.com/codebyallan/aurora-launcher/issues/20)) ([6c2cc26](https://github.com/codebyallan/aurora-launcher/commit/6c2cc269cca75cfe87ee6984bf2d0320ef35c851))

## [1.3.0](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.2.0...aurora-launcher-v1.3.0) (2026-03-12)


### Features

* **carousel:** PS5-style card redesign with glassmorphism and larger sizes ([c4cb3fc](https://github.com/codebyallan/aurora-launcher/commit/c4cb3fc674329de36a3ee075053f637f5ce52619))


### Bug Fixes

* **sgdb:** use native score field, server-side style/mime filters, two-pass fallback ([#17](https://github.com/codebyallan/aurora-launcher/issues/17)) ([c88ca6d](https://github.com/codebyallan/aurora-launcher/commit/c88ca6d2bb16c854af26767f7f882bc2cb487029))

## [1.2.0](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.1.0...aurora-launcher-v1.2.0) (2026-03-12)


### Features

* **carousel:** add pulsing running badge to game card ([#11](https://github.com/codebyallan/aurora-launcher/issues/11)) ([4721076](https://github.com/codebyallan/aurora-launcher/commit/4721076bc021e950bb3e33e2521e12d6707aef9f))


### Bug Fixes

* **input:** keyboard/mouse support + TypeError on focusin ([#10](https://github.com/codebyallan/aurora-launcher/issues/10)) ([b7c3108](https://github.com/codebyallan/aurora-launcher/commit/b7c31085136200ce4d26855c3395aa0cafb837f2))

## [1.1.0](https://github.com/codebyallan/aurora-launcher/compare/aurora-launcher-v1.0.0...aurora-launcher-v1.1.0) (2026-03-12)


### Features

* add automatic umu_id and store lookup via umu database api ([bed45f4](https://github.com/codebyallan/aurora-launcher/commit/bed45f4429db9a7c96a169cb43b87949db807f3c))
* add components for game management and loading overlay ([095d834](https://github.com/codebyallan/aurora-launcher/commit/095d83487618ff0011bad9cd85d7444605a36834))
* add data sanitization for library loading ([fe51c2b](https://github.com/codebyallan/aurora-launcher/commit/fe51c2bffcf62ba626ed301e65e72ea9c325715d))
* add form validation with zod in add game modal ([311d630](https://github.com/codebyallan/aurora-launcher/commit/311d6301514af2834912577a25feb56576cfb4c9))
* add game management features and UI enhancements ([0a9d9d4](https://github.com/codebyallan/aurora-launcher/commit/0a9d9d41b901e6c016ab8678cc57bd8f6e15d71e))
* add launch options section to AddGameModal ([3e21cf9](https://github.com/codebyallan/aurora-launcher/commit/3e21cf90bc19d6a0a5b206e6306865b30eccb777))
* **args:** fix argument parsing to support env vars with commas ([eec2779](https://github.com/codebyallan/aurora-launcher/commit/eec2779cfac2919e27ff952ba62a92df27da1554))
* **audio:** add synthesized UI sound effects via Web Audio API ([9fd0087](https://github.com/codebyallan/aurora-launcher/commit/9fd0087a225a14037e699225ba2d685a748ecfe7))
* **covers:** auto-fetch hero and icon from SteamGridDB on save ([4a847ca](https://github.com/codebyallan/aurora-launcher/commit/4a847cabb25bc350f324d93cd73557b35e971d25))
* **doc:** add readme  ([7d10c80](https://github.com/codebyallan/aurora-launcher/commit/7d10c8057b4d3827ca80f30bd61b7df88d087644))
* enhance gamepad support and controller hints ([a000fc7](https://github.com/codebyallan/aurora-launcher/commit/a000fc7860cb2113393da8062eca43b4e06ba37d))
* implement electron ([7720a25](https://github.com/codebyallan/aurora-launcher/commit/7720a25465281a44dcaeed21ca7a78f2694fad0d))
* implement game launching and stopping functionality with process management ([de8394b](https://github.com/codebyallan/aurora-launcher/commit/de8394b47eafeec5ef97f49ce44d184aba63fc00))
* improve gamepad support in modals and cleanup on unmount ([008f4cd](https://github.com/codebyallan/aurora-launcher/commit/008f4cd4d17db4998a979cacd5f01c4c583f1af5))
* initial commit ([4c3bdc1](https://github.com/codebyallan/aurora-launcher/commit/4c3bdc1623bee0c0976f8352eac7622a76d84f4a))
* **security:** enable chromium sandbox for renderer process ([2ecf8f8](https://github.com/codebyallan/aurora-launcher/commit/2ecf8f848907c78bc0c005f303c8a1e8a33ea9bc))
* **ui:** add toast notifications for game actions via Nuxt UI ([ba9780f](https://github.com/codebyallan/aurora-launcher/commit/ba9780fcad16c89b32f300ccbd86a3cd9d824c1d))
* **ui:** animate GameEmptyState with floating icon and pulse effect ([92d3ca0](https://github.com/codebyallan/aurora-launcher/commit/92d3ca040dc9b8ed2f0b0f835e62035f46d5fbac))


### Bug Fixes

* add missing lang="ts" attribute to app.vue script ([599a859](https://github.com/codebyallan/aurora-launcher/commit/599a859019eb8ac27bf378e81e519ebf0fc8050f))
* adjust transition timing for controller hints ([460d430](https://github.com/codebyallan/aurora-launcher/commit/460d430f1f8219bffca8d0e9ad2563f7fc8176e9))
* **build:** inject steamgriddb api key into production binary ([cb719a4](https://github.com/codebyallan/aurora-launcher/commit/cb719a4837f1cddf1f587ad1f7c13bbd5bba4182))
* correct exit handler assignment and ensure proper cleanup on component unmount ([5fa7cd3](https://github.com/codebyallan/aurora-launcher/commit/5fa7cd3a9ef4499d2f1e172306e5f2e84dadcafb))
* **doc:** add missing screenshot hero launcher ([ae734b7](https://github.com/codebyallan/aurora-launcher/commit/ae734b73754ca7579ee6446800bcad840bc15d46))
* implement atomic write for library updates ([2330c98](https://github.com/codebyallan/aurora-launcher/commit/2330c98e1caff52baea2927f03f0c5d05eb1b322))
* prevent duplicate save on double click in add game modal ([8665802](https://github.com/codebyallan/aurora-launcher/commit/8665802b5de68a432196673e918fcb26eb945049))
* remove duplicate argument parsing logic ([95d4847](https://github.com/codebyallan/aurora-launcher/commit/95d4847cf41a977729fd2f61114d2d9b9fd0bc0e))
* scroll to footer buttons correctly in AddGameModal controller navigation ([ae2ea04](https://github.com/codebyallan/aurora-launcher/commit/ae2ea0471e35620664f6d04c6ad7da9f9ed7dfb0))
* **ui:** resolve incorrect image pathing in loading overlay ([c9f7fad](https://github.com/codebyallan/aurora-launcher/commit/c9f7fadcf782bf4f51bae3bdfe0e860a7eede73d))


### Refactors

* modularise electron main process and extract frontend composables ([aa3fd84](https://github.com/codebyallan/aurora-launcher/commit/aa3fd847152cf3b656be87092265d52370a5cfb5))
* remove unused getButtonLabel function ([ebf955f](https://github.com/codebyallan/aurora-launcher/commit/ebf955f5ed4d4312f7cac685da3074e019a47dfc))
* restructure app ([7864920](https://github.com/codebyallan/aurora-launcher/commit/7864920160fa38b6084a5d96723db5da19dc7f52))
