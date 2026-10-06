# Project Architecture Rules

- Keep home-page discovery data in focused presentation components that query existing public or user-scoped data; this preserves the route page as a readable section composition.- Unit/component tests live next to source as *.test.ts(x) with shared fakes in src/test/; browser smoke tests live in e2e/ — keeps tests close to code and e2e independent of the Vite build.
