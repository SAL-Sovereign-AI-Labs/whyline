# 14. Publishing whyline to npm

How to publish `whyline` 0.1.0 to the public npm registry correctly and safely. Every step cites the official page it comes from (docs.npmjs.com, the npm/cli docs source, or a reference repo) and quotes the sentence that supports it. Local checks were run on 26 Sep 2026 on this laptop with npm 11.19.1 and Node v26.8.2 (`npm -v`, `node -v`).

Sources fetched:

- S1 https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
- S2 https://docs.npmjs.com/creating-a-package-json-file
- S3 https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- S4 https://docs.npmjs.com/cli/v11/commands/npm-publish (source: https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-publish.md)
- S5 https://docs.npmjs.com/generating-provenance-statements (source: https://github.com/npm/documentation/blob/main/content/packages-and-modules/securing-your-code/generating-provenance-statements.mdx)
- S6 https://docs.npmjs.com/trusted-publishers (source: https://github.com/npm/documentation/blob/main/content/packages-and-modules/securing-your-code/trusted-publishers.mdx)
- S7 https://docs.npmjs.com/creating-a-new-npm-user-account
- S8 https://docs.npmjs.com/about-two-factor-authentication
- S9 https://docs.npmjs.com/configuring-two-factor-authentication
- S10 https://docs.npmjs.com/unpublishing-packages-from-the-registry
- S11 https://docs.npmjs.com/policies/unpublish
- S12 https://docs.npmjs.com/package-name-guidelines
- S13 https://docs.npmjs.com/threats-and-mitigations
- S14 https://docs.npmjs.com/about-access-tokens
- S15 https://docs.npmjs.com/cli/v11/commands/npm-version (source: https://github.com/npm/cli/blob/latest/docs/lib/content/commands/npm-version.md)
- S16 https://github.com/npm/cli/blob/latest/docs/lib/content/using-npm/scripts.md (lifecycle order)
- R1 https://github.com/ccusage/ccusage/blob/main/.github/workflows/release.yaml
- R2 https://github.com/vercel-labs/skills/blob/main/.github/workflows/publish.yml
- R3 https://github.com/getagentseal/codeburn/blob/main/RELEASING.md

## (a) Readiness checklist for this package

Results of the local checks, run read-only on 26 Sep 2026.

| Check | Result | Evidence |
|---|---|---|
| Name `whyline` is free on the registry | PASS | `npm view whyline` printed `npm error 404 Not Found - GET https://registry.npmjs.org/whyline - Not found` |
| Name follows the rules | PASS | S12: a name "Does _not_ contain uppercase letters", "Is unique", "Is descriptive". `whyline` is lowercase, one word, no lookalike found on the registry (the 404 above). |
| `name` and `version` present | PASS | S2: a package.json must contain `"name"` and `"version"`; `"version"` must follow `x.x.x` semver. package.json has `"whyline"` and `"0.1.0"`. |
| `bin` file has the node shebang | PASS | `head -1 cli/index.js` prints `#!/usr/bin/env node`. S3: "Please make sure that your file(s) referenced in `bin` starts with `#!/usr/bin/env node`; otherwise, the scripts are started without the node executable!" |
| `bin` file is executable in git | PASS | `git ls-files -s cli/index.js` prints `100755 5e7dea9bf1a9a1b2894c499a78714f890a548dad 0 cli/index.js` (mode 100755). |
| `files` list ships only what is needed | PASS | `npm pack --dry-run`: 29 files, package size 45.9 kB, unpacked 141.0 kB. Contents: LICENSE, README.md, package.json, cli/index.js, cli/lib/** (15 modules, the bob adapter with 6 SKILL.md files and settings.json, hook-entry.sh, report-template.html). No tests, no docs, no demo, no bob_sessions. S4: "If there is a "files" list in package.json, then only the files specified will be included." |
| No secrets or env files in the tarball | PASS | Tarball list above contains no `.env*`, no `.log`, no report. `.gitignore` excludes `.env`, `.env.*`, `*.log`, `.whyline-report.html`. S1: "Publishing sensitive information to the registry can harm your users, compromise your development infrastructure, be expensive to fix, and put you at risk of legal action." |
| README present and shown by npm | PASS | README.md (9.2 kB) is in the tarball. S3: README is always included. S1: "Create a README file that explains what your package code is and how to use it". |
| LICENSE present, `license` field set | PASS | LICENSE (1.1 kB) in tarball, `"license": "MIT"`. S3: "You should specify a license for your package so that people know how they are permitted to use it". |
| `engines.node >= 20` | PASS (advisory) | S3: "Unless the user has set the engine-strict config flag, this field is advisory only and will only produce warnings when your package is installed as a dependency." |
| `repository` is a public URL that matches the publish source | PASS | `"url": "https://github.com/SAL-Sovereign-AI-Labs/whyline"`. S5 (needed for provenance): "Ensure your `package.json` is configured with a public `repository` that matches (case-sensitive) where you are publishing with provenance from." |
| `publishConfig.access = public` | PASS (redundant but harmless) | S4: default access is "'public' for new packages"; unscoped packages cannot be restricted. |
| `description`, `keywords`, `homepage`, `bugs` | PASS | All present. S3: description and keywords help "people discover your package as it's listed in `npm search`." |
| Working tree clean, on main | PASS | `git status --short` printed nothing. HEAD is `23c6371`. |
| Logged in to npm | NOT YET | `npm whoami` printed `npm error code ENEEDAUTH`. Expected: the account does not exist yet. |
| Email verified and 2FA on the account | NOT YET | S7: "You must verify your email address in order to publish packages to the registry." S1 and S8: "Publishing to npm requires either: Two-factor authentication (2FA) enabled on your account, OR A granular access token with bypass 2FA enabled". |
| `prepublishOnly` runs the tests | MISSING (fix before publish) | package.json has no `prepublishOnly`. S16: "**prepublishOnly** Runs BEFORE the package is prepared and packed, ONLY on `npm publish`." and it exists "for instance, running the tests one last time to ensure they're in good shape". |
| Git tag for 0.1.0 | MISSING | `git tag` lists only `checkpoint-sat`. Created in step (d). |
| `author` field | Optional, absent | Not required by S2. Leave out (no email in the repo). |

### Fix before publishing (one small edit)

Add a `prepublishOnly` script so `npm publish` refuses to ship a broken build. This keeps the repo rule "npm test green before every commit" enforced at publish time too.

```json
"prepublishOnly": "npm test && npm run smoke"
```

Source S16: prepublishOnly "Runs BEFORE the package is prepared and packed, ONLY on `npm publish`." Lifecycle order on publish (S16): `prepublishOnly`, `prepack`, `prepare`, `postpack`, then `publish`, `postpublish`. codeburn (R3) uses the same hook: "The `prepublishOnly` script in `package.json` runs `npm run build` first". Commit that edit before publishing so the tree is clean (see Do not list).

## (b) Publishing paths

### Path A (Recommended for the first publish): manual from this laptop

Why this path first: trusted publishing is configured in the package's settings page on npmjs.com (S6: "Navigate to your package settings on npmjs.com and find the "Trusted Publisher" section."), so the package needs to exist on the registry before a trusted publisher can be attached to it. Provenance is not available for local publishes anyway (S5: "To publish a package with provenance, you must build your package with a supported cloud CI/CD provider using a cloud-hosted runner. Today this includes GitHub Actions and GitLab CI/CD."). So the first publish is manual, without `--provenance`, and Path B takes over from 0.1.1.

Step 1. Create the npm account (skip if it exists). S7.

- Go to https://www.npmjs.com/signup. Username rule: "Your username must be lower case, and can contain hyphens and numerals." Use `faisal-fida` to match GitHub.
- Note: "Your public email address will be added to the metadata of your packages and will be visible to anyone who downloads your packages." Use an address you are happy to expose.
- Verify the email: "After signing up for an npm account, you will receive an account verification email. You must verify your email address in order to publish packages to the registry."

Step 2. Enable 2FA on the website. S9, S8.

- npmjs.com, profile picture, Account, "Two-Factor Authentication", Enable 2FA, enter password, pick the method.
- Prefer a security key or passkey. S13: "The strongest option is to use a security-key, either built-in to your device or an external hardware key; it binds the authentication to the site you are accessing, making phishing exceedingly difficult." Touch ID on this Mac qualifies (S9 lists "Apple Touch ID, Face ID, or Windows Hello"). S9: security keys "can only be configured from the web".
- Keep the default level "authorization and writes" (S8: default; 2FA is then asked for "publishing/unpublishing packages").
- Save the recovery codes somewhere safe. S9: "Recovery codes are the only way to ensure you can recover your account if you lose access to your second factor device." Do not use one casually: "Using a recovery code to log in triggers a temporary 72-hour security hold on your account".
- Do not create a bypass-2FA token for this. S14: "Bypass-2FA tokens with direct-publish access are being deprecated. The ability to publish new package versions directly with a granular access token will be removed in January 2027." and "Legacy access tokens have been removed."

Step 3. Log in from the CLI. S7.

```sh
npm login
npm whoami        # must print your username
```

S7 warning: "If you misspell your existing account username when you log in with the npm login command, you will create a new account with the misspelled name."

Step 4. Add the `prepublishOnly` script (section a), run the tests, commit.

```sh
cd ~/projects/whyline
npm test && npm run smoke
git add package.json
git commit -m "build: run tests on prepublishOnly"
git status --short   # must be empty
```

Step 5. Inspect the tarball one more time. S4: "To see what will be included in your package, run `npm pack --dry-run`."

```sh
npm pack --dry-run
```

Expect 29 files, ~46 kB, only LICENSE, README.md, package.json, cli/index.js, cli/lib/**. If anything else appears, stop.

Step 6. Rehearse the publish without changing anything. S4 on `--dry-run`: "Indicates that you don't want npm to make any changes and that it should only report what it would have done."

```sh
npm publish --dry-run
```

Step 7. Publish. S1: "Direct method: `npm publish`". `--access public` is the default for a new unscoped package (S4: "'public' for new packages") and is also set in `publishConfig`; passing it explicitly is harmless and documents intent. No `--provenance` here: S5 says it needs a cloud CI runner. npm will ask for the one-time code (S4: the OTP "is needed when publishing or changing package permissions").

```sh
npm publish --access public
```

Step 8. Verify.

```sh
npm view whyline version          # expect 0.1.0
open https://www.npmjs.com/package/whyline
cd "$(mktemp -d)" && npx --yes whyline@0.1.0 --version && cd -
```

S1: "To see your public package page, visit https://npmjs.com/package/*package-name*" where public packages show "public" below the name.

### Path B (Alternative, use from 0.1.1 onward): GitHub Actions with trusted publishing and provenance

What you get: no npm token anywhere, and a provenance badge on the package page. S6: "Trusted publishing allows you to publish npm packages directly from your CI/CD workflows using OpenID Connect (OIDC) authentication, eliminating the need for long-lived npm tokens." S6: "When you publish using trusted publishing from GitHub Actions or GitLab CI/CD, npm automatically generates and publishes provenance attestations for your package. This happens by default" and you do not need to add the `--provenance` flag to the publish command.

Can 0.1.0 go through this path? The docs place the configuration under the package's own settings page (S6 Step 1: "Navigate to your package settings on npmjs.com"), and they contain no procedure for a name that does not exist yet. I did not find a documented first-publish route through OIDC, so treat Path A as required for 0.1.0 and Path B as the route for every later version. Confidence: high that the docs describe it only for an existing package; not tested against the registry.

Prerequisites (S6): "Trusted publishing requires npm CLI version 11.5.1 or later and Node version 22.14.0 or higher." Runner must be GitHub-hosted: "Self-hosted runners are not currently supported". Repo must be public for provenance: "Provenance generation is not supported for private repositories, even when publishing public packages." The whyline repo is public.

One-time configuration on npmjs.com (S6 Step 1, after 0.1.0 exists):

1. npmjs.com, Packages, whyline, Settings, "Trusted Publisher", click GitHub Actions.
2. Fields (all case-sensitive, S6 troubleshooting: "All fields are case-sensitive and must be exact."):
   - Organization or user: `SAL-Sovereign-AI-Labs`
   - Repository: `whyline`
   - Workflow filename: `publish.yml` ("Enter only the filename, not the full path", "Must include the .yml or .yaml extension", "The workflow file must exist in .github/workflows/ in your repository")
   - Environment name: leave empty (optional)
   - Allowed actions: tick `npm publish`. S6: "Configurations created after Sep 03, 2026 are automatically set to allow `npm stage publish`, and you can choose whether to also permit direct publishing with `npm publish`." Without ticking `npm publish`, the workflow can only stage, and a maintainer must promote the version by hand.
3. Save. S6: "npm does not verify your trusted publisher configuration when you save it. Double-check that your repository, workflow filename, and other details are correct, as errors will only appear when you attempt to publish."
4. Then lock out tokens (S6 "Recommended"): package Settings, Publishing access, "Require two-factor authentication and disallow tokens", Update Package Settings. "The "disallow tokens" setting only affects traditional token authentication. Your trusted publishers will continue to work normally, as they use OIDC tokens."

Workflow file `.github/workflows/publish.yml` (commit it to main before configuring npmjs.com). It follows the S6 example (tag trigger, `id-token: write`, setup-node with `registry-url`, cache off, tests, `npm publish`) and vercel-labs/skills (R2) for the release step. The publish command is plain `npm publish`: S6 says provenance is automatic under trusted publishing, and `--access public` is already in `publishConfig`.

```yaml
name: publish

on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write   # required for OIDC (S6)
  contents: write   # gh release create

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false   # S6: never use caching in release builds
      - run: git config --global user.name ci && git config --global user.email ci@example.invalid
      - run: npm test
      - run: npm run smoke
      - run: npm publish
      - run: gh release create "${GITHUB_REF_NAME}" --generate-notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Notes on that file:

- No `npm ci` step: the package has zero dependencies and no lockfile, so there is nothing to install. The S6 example has `npm ci` and `npm run build --if-present` for packages that need them.
- The git identity line is copied from ci.yml because the tests commit in temporary repos.
- `GITHUB_REF_NAME` is the tag name (`v0.1.1`), which is what `gh release create` needs.
- Do not wrap this in a reusable workflow. S6: "Some GitHub Actions workflows use `workflow_call` to invoke other workflows that run `npm publish`, or use `workflow_dispatch` for manual publishing. When this happens, validation checks the calling workflow's name instead of the workflow that actually contains the publish command, which can cause configuration mismatches."

Releasing a version with Path B (S15):

```sh
git status --short              # must be empty; npm version "will fail if the working directory is not clean"
npm version patch -m "v%s"      # bumps package.json, commits, tags v0.1.1 (S15: "If run in a git repo, it will also create a version commit and tag.")
git push && git push --tags     # ask before pushing
```

The tag push triggers publish.yml. Afterwards verify with `npm view whyline version`, and check the provenance badge on the package page. S5: "npm audit signatures" verifies attestations from a consuming project.

How the three reference repos do it (exact publish commands):

- ccusage (R1, release.yaml, job `npm`, permissions `contents: read` and `id-token: write`): `pnpm --filter='./apps/ccusage' --filter='./packages/ccusage-*' publish --provenance --no-git-checks --access public`. Tag and release PR come from `Songmu/tagpr`; a separate `release` job runs `nix run .#changelogithub` for the GitHub release.
- vercel-labs/skills (R2, publish.yml, `workflow_dispatch` with a patch/minor input, `environment: npm-publish`, permissions `contents: write` and `id-token: write`): `npm version ${{ inputs.bump }} -m "v%s"`, then `git push` and `git push --tags`, then `npm publish --provenance --access public`, then `gh release create "v${VERSION}" --notes-file release-notes.md`.
- codeburn (R3, RELEASING.md): "CLI releases are run by hand with `npm publish`". Steps: `npm version <version>` ("For example, `npm version 0.9.8` updates both files and creates a commit."), then "the maintainer runs `npm publish` from a clean working tree", then `git tag v0.9.8` and `git push origin v0.9.8`, then `gh release create v0.9.8 --title v0.9.8 --notes "..."`. No CI publish workflow for the CLI.

Whyline's Path A matches codeburn's manual flow; Path B matches vercel-labs/skills without the GPG step and with trusted publishing instead of a token.

## (c) Do not

- Do not put secrets, keys, `.env` files or personal data in the tarball. S1: "Publishing sensitive information to the registry can harm your users, compromise your development infrastructure, be expensive to fix, and put you at risk of legal action." Always run `npm pack --dry-run` first (S4).
- Do not rely on unpublish to fix a mistake. S11: "For newly created packages, as long as no other packages in the npm Public Registry depend on your package, you can unpublish anytime within the first 72 hours after publishing." After that, all three must hold: "no other packages in the npm Public Registry depend on it", "it had less than 300 downloads over the last week", "it has a single owner/maintainer". And S11: "Once `package@version` has been used, you can never use it again. You must publish a new version even if you unpublished the old one." S10: "If you unpublish an entire package, you may not publish any new versions of that package until 24 hours have passed." So 0.1.0 must be right the first time; a mistake means 0.1.1.
- Do not publish from a dirty tree. `npm version` refuses anyway (S15: "It will fail if the working directory is not clean, unless the `-f` or `--force` flag is set."), and codeburn's rule is the same (R3: "the maintainer runs `npm publish` from a clean working tree"). `npm publish` itself does not check git, so check `git status --short` yourself.
- Do not bump the version by hand in two places. Use `npm version` once; it edits package.json, commits and tags (S15). CHANGELOG.md gets its `## [0.1.0]` heading in the same commit, before running `npm version`.
- Do not create a bypass-2FA token to publish. S14: "Bypass-2FA tokens with direct-publish access are being deprecated." and "Legacy access tokens have been removed." Use 2FA locally (Path A) or OIDC (Path B).
- Do not use `--provenance` on a local publish. S5: it requires "a supported cloud CI/CD provider using a cloud-hosted runner".
- Do not add an `.npmignore`. S4: "If both files exist, then the .gitignore is ignored, and only the .npmignore is used." The `files` allowlist already does the job.
- Do not pick a lookalike name later for companion packages. S12: an unscoped name must be "not spelled in a similar way to another package name" and "will not confuse others about authorship". S13: attackers register "a package with a similar name to a popular package, in hopes that people will mistype or otherwise confuse the two." If a second package is ever needed, scope it (`@sal-sovereign-ai-labs/...`).
- Do not use a recovery code to log in unless locked out. S9: it "triggers a temporary 72-hour security hold on your account" during which you cannot publish.
- Do not use caching in the release job. S6 example: `package-manager-cache: false  # never use caching in release builds`.

## (d) After the first publish

1. Tag and release on GitHub (pattern from R3 and R2; ask before pushing):

```sh
cd ~/projects/whyline
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title v0.1.0 --notes "$(sed -n '/^## \[0.1.0\]/,/^## /p' CHANGELOG.md | sed '$d')"
```

   Move the `[Unreleased]` entries in CHANGELOG.md under a `## [0.1.0]` heading first, so the release notes command has something to extract. (If Path B is set up later, the tag push will trigger publish.yml, so for 0.1.0 push the tag before adding that workflow, or the workflow will try to republish 0.1.0 and fail.)

2. Switch the README install line. README.md line 16 currently reads `npm install -g SAL-Sovereign-AI-Labs/whyline   # from GitHub (npm release coming: npm install -g whyline)`. Change to:

```sh
npm install -g whyline
```

   Keep the GitHub form as a second line for people who want main.

3. Optional npm badge in the README, same shields pattern codeburn uses (R3 README line 19: `https://img.shields.io/npm/v/codeburn.svg`):

```md
[![npm](https://img.shields.io/npm/v/whyline.svg)](https://www.npmjs.com/package/whyline)
```

4. Commit README and CHANGELOG (`git add README.md CHANGELOG.md`), then, when 0.1.1 is due, add `.github/workflows/publish.yml`, configure the trusted publisher on npmjs.com (Path B), and release with `npm version patch -m "v%s"`.

5. Verify from a clean machine or temp dir: `npx --yes whyline --version` prints `0.1.0`, and the package page at https://www.npmjs.com/package/whyline shows README, MIT, and "public".
