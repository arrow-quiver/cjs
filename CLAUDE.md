## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, eslint, tailwindcss, drizzle, better-auth, storybook, mcp
- **Issue tracker**: GitHub issues in `spaceghostu/cjs`, **not Linear**

## Tickets

Tickets are tracked as GitHub issues. Linear is no longer used, so skip any Linear step a skill or workflow asks for (the dh-skills `linear`, `delivery` and `stack-*` flows assume Linear) and do the equivalent with `gh issue`.

- Issue titles keep the `[SPA-N]` key, so PR titles and commit subjects stay `[SPA-N] <type>: description`.
- Old Linear keys map to issues by a fixed offset: **SPA-N is issue #(N+9)** (SPA-9 is #18). `gh issue list --search '"[SPA-9]" in:title'` finds one by key.
- Link a PR to its issue by number in the PR body (`#18`, or `Closes #18` to close it on merge), not by Linear URL.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
