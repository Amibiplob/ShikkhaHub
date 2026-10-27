# Visual asset audit

27 October 2026, Asia/Dhaka. Scope: tracked local assets and all image/metadata references in source. No hosted database records or user media were fetched or changed.

## Identity and source

New images are original SVG compositions authored directly in code for this repository. They are **not AI-generated** and contain no stock photos or identifiable student/teacher/team portraits. The social PNG is a Chrome rasterization of the included SVG source. Existing typography, teal/navy palette, header graduation-cap identity, actual academic team names and initial-based avatar fallbacks are preserved.

## Replacement inventory

| Previous state | Replacement | Use |
| --- | --- | --- |
| Hero had only generic icon/stat cards | `public/artwork/learning-workspace.svg` | Original connected coding notebook/book/lesson composition; existing real statistics and catalog CTA remain |
| Missing thumbnail displayed a generic book icon; broken uploads stayed broken | `public/artwork/course-code.svg`, `course-data.svg`, `course-design.svg` | Category-sensitive 16:9 fallback; valid teacher uploads still take priority; image errors fall back once without a retry loop |
| Unattributed binary favicon | `public/favicon.svg` | Small local book mark in the existing brand palette |
| Remote editor-generated R2 social screenshot | `public/social-card.png` and editable `public/social-card.svg` | 1200×630 local ShikkhaHub social card with explicit metadata dimensions and description |
| Unreferenced generated `placeholder.svg` | Removed after reference checks | No active caller was changed to a broken reference |

## Files and sizes

| File | Bytes | Method |
| --- | --- | --- |
| `public/artwork/learning-workspace.svg` | 2,899 | Original vector code |
| `public/artwork/course-code.svg` | 1,297 | Original vector code |
| `public/artwork/course-data.svg` | 1,327 | Original vector code |
| `public/artwork/course-design.svg` | 1,285 | Original vector code |
| `public/favicon.svg` | 296 | Original vector code |
| `public/social-card.svg` | 1,032 | Original vector code |
| `public/social-card.png` | 43,219 | Chrome rasterization of original SVG |

The SVGs have explicit view boxes and need no external fonts, scripts, embedded raster data or network access. The PNG is a conventional social-platform-compatible raster; SVG source remains available for editing. Combined SVG payload is small enough that bitmap conversion would add complexity without a useful size benefit.

## Rendering and accessibility

Hero imagery reserves 800×450 dimensions and uses high fetch priority. Course thumbnails reserve the same 16:9 layout, use meaningful course-title alt text, lazy loading and asynchronous decoding. Hero alt text is translated in both English and Bangla. Decorative category art does not impersonate an actual course preview or teacher. The course image error handler preserves the uploaded URL as data and changes only that card's presentation.

Actual inspected Chrome screenshots at 375px and 1440px cover dark/light home pages and the assistant panel, with existing public/role smoke coverage at 375, 768, 1024 and 1440px as applicable. The artwork itself and social PNG were opened and inspected. Final selected UI captures are linked from [MODERNIZATION_VERIFICATION.md](MODERNIZATION_VERIFICATION.md); baseline screenshots remain historical, not pixel-perfect references for the intentionally changed artwork.

## Remaining boundaries

- Existing database-owned thumbnails, profile avatars, Storage URLs, videos and recordings are dynamic user data. They were not downloaded, replaced or deleted in production. Course cards now recover failed thumbnails; avatar components retain initials when images cannot load.
- The upload form's image preview is legitimate user content, not a template asset. Empty states intentionally use accessible text/icons rather than invented imagery.
- Absolute canonical/og URLs depend on an actual approved hosting domain. The source uses a local social-image path and no fabricated canonical domain; the hosting checklist requires final absolute metadata before sharing/release.
- No unrelated original logo, academic names, fonts, server PDF font assets, historical screenshots or migration fixtures were removed.
