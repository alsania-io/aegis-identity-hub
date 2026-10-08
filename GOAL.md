# Aegis Identity Hub — Project Goal

> Salvaged from `aegis-identity-hub-review` (2026-10-08). This is the clearest
> statement of the project's intent — kept as the north star.

Use `nyx_instructions.md` to guide the project development process and ensure code consistency across the codebase. You have access to Nyx and all tools.

What we are building is the **aegis-identity-hub**. It's a browser extension built from the Nyx browser extension in order to keep all of the Nyx features for connecting free browser-based AI models to MCP server tools. But the Aegis Identity Hub will be the **fully featured, mobile browser, and non-technical user friendly** version. It should be **modular with a plugin style** that makes it easy to test, maintain, debug, and add/remove/update features as needed.

The build output from `aegis-identity-hub.zip` is a good start — the browser extension set up with the mcpnyx-u server and config. Basically this is our Nyx extension, and we're adding all of the best features of **Hermes, OpenClaw, Nanoclaw, and others** to create the top agent/identity/memory context, workflow, etc.

For now, focus on getting the **core features** set up without breaking what already works. Start with:

1. **Personality / identity**
2. **Memory**
3. **Plugins**
4. **Skills**
5. **MCPs**
6. **Workspace**

...and whatever else should be added to ensure identity initialization and memory/data persistence and migration/storage/retrieval are set up fully — for smooth transition and optimal token usage while providing the best, most impactful effect.

Remember this will be connected to **mcpnyx** (free) or **mcpnyx-u** (premium) for the MCP tools, so users can set up any MCP tools in the config. But this is a project by Alsania, and I'd like it to work the best with **Alsania-built MCPs**, even if we need to add to them to make this perfect.

---

*Imagined by Sigma. Powered by Echo.*