# Development Notes

- Use TypeScript strict mode. Run `npx tsc --noEmit` to verify the project compiles.
- There is no test suite but run `npm test` to show missing script output in PRs.
- Start scripts rely on Bun (`bun run start`) or Node; keep compatibility with existing scripts.
- Document environment variables in the README when changing configuration.
