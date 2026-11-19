---
title: "Treat IDE Extensions & MCP Servers Like Prod Dependencies"
description: "AI coding agents, MCP servers, and IDE extensions execute with your full local OS user permissions. Verify publisher identities, pin versions, and audit tool permissions."
pubDate: 2026-12-09
tags: ["security", "ai", "supply-chain", "tooling"]
series: "advent-2026"
adventDay: 9
draft: true
---

In 2026, most developers carefully review changes to `package.json` in pull requests—yet will install a brand-new VS Code / Cursor extension or wire up a community **Model Context Protocol (MCP)** server with a single `npx -y @some-org/mcp-server` line in their config.

Here is the uncomfortable truth: **IDE extensions and local MCP servers do not run in a browser sandbox.** They run as native processes on your workstation with your exact OS user permissions.

> **Real-World Receipt (Nov 2026):** Security researchers uncovered trojanized AI coding extensions on the Open VSX / Cursor marketplace masquerading as official tools, alongside prompt-injection and permission-bypass flaws in AI coding assistants that allowed untrusted repository files to trigger background data exfiltration.

---

## Three Attack Vectors in Modern AI Developer Tooling

1. **Typosquatted / Unverified Marketplace Extensions:** Open-source IDE registries don't always mirror the exact publisher namespaces of the VS Code Marketplace. Attackers register lookalike publisher IDs (`anthropic-ai-tools`, `prettier-official`) and bundle credential stealers.
2. **Unpinned `npx -y` MCP Servers:** Configuring an MCP server with `"command": "npx", "args": ["-y", "some-mcp-package@latest"]` downloads and executes the latest published npm tarball on every IDE startup—turning an upstream npm account takeover into immediate RCE on every developer's laptop.
3. **Indirect Prompt Injection + Auto-Approved Shell Execution:** If an AI agent reads an untrusted issue, PR description, or file containing hidden instructions—and you have enabled *"Always allow shell commands"* without a sandbox—prompt injection becomes remote code execution.

---

## Hardening Your IDE & MCP Configuration

### 1. Never Use Floating `@latest` with `npx -y` in MCP Configs

Pin exact, audited versions (or point to a local, hash-verified checkout) and restrict the environment variables passed to each MCP server:

```json
{
  "mcpServers": {
    "postgres-readonly": {
      "command": "node",
      "args": ["/opt/audited-mcp/postgres-mcp-v1.4.2/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://readonly_user:pass@127.0.0.1:5432/local_dev"
      }
    }
  }
}
```

### 2. Audit Installed IDE Extensions via CLI

Run a periodic check of every extension installed in your IDE and remove anything unmaintained or unnecessary:

```bash
# List all installed extensions with versions and publisher IDs
code --list-extensions --show-versions
```

### 3. Keep Terminal Sandboxing Enabled for AI Agents

Never grant blanket unsandboxed shell auto-approval (`yolo` mode) to AI agents working on repositories that ingest external PRs, issues, or web content. Use strict command prefix allowlists (`git status`, `npm test`) and require manual approval for network or outside-workspace operations.

### Key Takeaway for Day 09

An IDE extension or MCP server has the same blast radius as running `curl | bash` on your machine. Verify publisher signatures, never run `npx -y <pkg>@latest` in MCP configs, and keep terminal sandboxes enabled.

---

## Social Summary (X & LinkedIn)

```text
You wouldn't run `npx -y random-package@latest` on your production server every morning—yet thousands of developers have that exact pattern inside their local `mcp.json` and IDE extension configs.

After Nov 2026's trojanized marketplace extensions and AI agent permission bypasses, treat your local AI tooling like production infrastructure.

Day 09/24 of the 2026 DevSec Advent Calendar: Hardening IDE extensions and MCP servers.
```
