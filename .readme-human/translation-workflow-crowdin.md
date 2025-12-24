# Translations + Crowdin workflow (this repo)

## Current setup
- Source language is `src/locales/en.json`.
- Other locales (e.g. `src/locales/fr.json`) are synced by Crowdin via GitHub Actions.
- Translation completeness is checked with `npm run check:i18n`.

## Key files
- Locale files: `src/locales/en.json`, `src/locales/fr.json`
  ```json
  {
    "HomePage": {
      "title": "Boilerplate Code for Your Next.js Project with Tailwind CSS"
    }
  }
  ```
- i18n check script: `package.json` (`check:i18n`)
  ```json
  { "scripts": { "check:i18n": "i18n-check -l src/locales -s en -u src -f next-intl" } }
  ```
- Crowdin config: `crowdin.yml`
  ```yml
  project_id_env: CROWDIN_PROJECT_ID
  api_token_env: CROWDIN_PERSONAL_TOKEN
  ```
- Crowdin workflows: `.github/workflows/crowdin.yml`, `.github/workflows/CI.yml`
  ```yml
  uses: crowdin/github-action@v2
  ```

## How to use
- Add or change English strings: edit `src/locales/en.json`.
- Validate keys: run `npm run check:i18n`.
- Do not manually edit non-English JSON files if Crowdin is enabled for the repo.
  ```bash
  npm run check:i18n
  ```

## Resources
- https://next-intl.dev/docs/usage/messages
- https://support.crowdin.com/github-integration/
