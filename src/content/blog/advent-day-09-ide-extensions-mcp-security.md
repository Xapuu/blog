---
title: "Treat IDE Extensions & MCP Servers Like Prod Dependencies"
description: "AI coding agents, MCP servers, and IDE extensions execute with your full local OS user permissions. Verify publisher identities, pin versions, and audit tool permissions."
pubDate: 2026-12-09
tags: ["security", "ai", "supply-chain", "tooling"]
series: "advent-2026"
adventDay: 9
draft: true
socialSummary: |
  You wouldn't run `npx -y random-package@latest` on your production server every morning. Yet thousands of developers have that exact pattern inside their local `mcp.json` and IDE extension configs.

  After Nov 2026's trojanized marketplace extensions and AI agent permission bypasses, treat your local AI tooling like production infrastructure.

  Day 09/24 of the 2026 DevSec Advent Calendar: hardening IDE extensions and MCP servers.
---

In 2026, most developers carefully review changes to `package.json` in pull requests, yet install a brand-new VS Code or Cursor extension or wire up a community **Model Context Protocol (MCP)** server with a single `npx -y @some-org/mcp-server` line in their config.

Here is the uncomfortable truth: **IDE extensions and local MCP servers do not run in a browser sandbox.** They run as native processes on your workstation with your exact OS user permissions.

> **Real-World Receipt (Nov 2026):** Security researchers uncovered trojanized AI coding extensions on the Open VSX / Cursor marketplace masquerading as official tools, alongside prompt-injection and permission-bypass flaws in AI coding assistants that allowed untrusted repository files to trigger background data exfiltration.

---

## Three Attack Vectors in Modern AI Developer Tooling

1. **Typosquatted / Unverified Marketplace Extensions:** Open-source IDE registries do not always mirror the exact publisher namespaces of the VS Code Marketplace. Attackers register lookalike publisher IDs (`anthropic-ai-tools`, `prettier-official`) and bundle credential stealers.
2. **Unpinned `npx -y` MCP Servers:** Configuring an MCP server with `"command": "npx", "args": ["-y", "some-mcp-package@latest"]` downloads and executes the latest published npm tarball on every IDE startup. An upstream npm account takeover turns into immediate RCE on every developer's laptop.
3. **Indirect Prompt Injection + Auto-Approved Shell Execution:** If an AI agent reads an untrusted issue, PR description, or file containing hidden instructions, and you have enabled *"Always allow shell commands"* without a sandbox, prompt injection becomes remote code execution.

---

## Hardening Your IDE & MCP Configuration

### 1. Never Use Floating `@latest` with `npx -y` (and Don't Hardcode Secrets in `mcp.json`)

Pin exact, audited versions (or point to a local, hash-verified checkout), grant least-privilege read-only credentials, and inject secrets at runtime via a secret manager CLI (like 1Password `op run`) rather than storing plaintext passwords inside `mcp.json` ([Day 10](/blog/advent-day-10-secrets-in-docs-and-prompts)):

```json
{
  "mcpServers": {
    "postgres-readonly": {
      "command": "op",
      "args": [
        "run",
        "--",
        "node",
        "/opt/audited-mcp/postgres-mcp-v1.4.2/dist/index.js"
      ],
      "env": {
        "DATABASE_URL": "op://Engineering/Local-Dev-Postgres-RO/connection_string"
      }
    }
  }
}
```

### 2. Keep Terminal Sandboxing Enabled for AI Agents

Never grant blanket unsandboxed shell auto-approval (`yolo` mode) to AI agents working on repositories that ingest external PRs, issues, or web content. Use strict command prefix allowlists (`git status`, `npm test`) and require manual approval for network or outside-workspace operations.

---

## Verify It in 60 Seconds

Audit every installed IDE extension and hunt for unpinned `npx -y` commands in your local MCP configs right now:

```bash
# 1. List installed extensions with publisher IDs and versions (VS Code & Cursor)
code --list-extensions --show-versions 2>/dev/null
cursor --list-extensions --show-versions 2>/dev/null

# 2. Check local MCP configs for floating npx -y / @latest entries
grep -rnE "npx|@latest" ~/.cursor/mcp.json ~/.claude.json .mcp.json 2>/dev/null
```

### Key Takeaway for Day 09

An IDE extension or MCP server has the same blast radius as running `curl | bash` on your machine. Verify publisher signatures, never run `npx -y <pkg>@latest` in MCP configs, keep secrets out of plaintext config files, and keep terminal sandboxes enabled.

---

## References

- [Model Context Protocol (MCP) Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [OWASP Top 10 for LLM Applications: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
