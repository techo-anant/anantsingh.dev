# anantsingh.dev

Source for [anantsingh.dev](https://anantsingh.dev), the personal portfolio of Anant Kumar Singh,
covering work across software, AI, robotics and accounting.

Built with [Astro](https://astro.build) and TypeScript (strict), deployed on Railway.

## Running locally

Requires Node 26 (see `.nvmrc`; `fnm use` or `nvm use` picks it up).

```sh
npm install
npm run dev        # http://localhost:4321
```

## Scripts

| Command                | What it does                                  |
| :--------------------- | :-------------------------------------------- |
| `npm run dev`          | Start the dev server                          |
| `npm run build`        | Build the static site to `dist/`              |
| `npm run preview`      | Serve the built site locally                  |
| `npm run check`        | Type check (`astro check`)                    |
| `npm run lint`         | ESLint + Stylelint                            |
| `npm run format`       | Format everything with Prettier               |
| `npm run format:check` | Check formatting without writing (used in CI) |

## Contributing workflow

- One branch per change (`feat/...`, `fix/...`, `chore/...`, `docs/...`, `refactor/...`).
- Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org);
  commitlint checks commit messages and CI checks PR titles.
- PRs are squash-merged into `main`, which deploys to Railway.

## License

The **code** in this repository is licensed under the [MIT License](LICENSE).

The **written content, images and visual designs** (everything under `src/content/`, plus the
site's artwork and copy) are © Anant Kumar Singh, all rights reserved, and are **not** covered
by the MIT License.
