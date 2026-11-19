---
title: "Firewall Internal Database Ports (5432, 1521, 6379)"
description: "Database wire protocols aren't designed to face untrusted networks. Pre-authentication bugs can crash or compromise database servers before a login handshake even finishes. Keep DB ports strictly inside private subnets."
pubDate: 2026-12-20
tags: ["security", "database", "networking", "ops"]
series: "advent-2026"
adventDay: 20
draft: true
---

*"Our database port is open to `0.0.0.0/0` so developers can connect from home, but it requires a strong 32-character password and TLS, so it's safe."*

If you have ever heard (or made) that argument, November 2026's database advisories are your wake-up call.

> **Real-World Receipt (Nov 2026):** PostgreSQL 18 patched a **pre-authentication** cancel-request spinlock Denial of Service (**CVE-2026-116322**), while Oracle's November Critical Security Patch Update dropped **CVSS 9.9 unauthenticated network flaws** across Oracle Database & Supply Chain—exploitable over the wire with **no active database username or password required**.

---

## Why Strong Passwords Don't Protect Exposed Wire Protocols

When TCP port `5432` (PostgreSQL), `1521` (Oracle), `3306` (MySQL), or `6379` (Redis) is reachable from the public internet:

1. **Pre-Authentication Parser Bugs:** Before the database server ever verifies your password, it must parse the raw TCP startup packet, TLS handshake, or cancel-request header in C/C++. Any memory corruption or spinlock bug in that pre-auth code path can be triggered by an unauthenticated attacker with a single TCP packet.
2. **Docker Bypassing `ufw` on Linux VPS Hosts:** If you run Postgres or Redis in Docker on a single VPS with `-p 5432:5432`, Docker manipulates `iptables` `PREROUTING` chains directly—**completely bypassing `ufw` (Uncomplicated Firewall)** and exposing port `5432` to the entire internet!

---

## How to Lock Down Database Network Exposure

### 1. Check What Ports Are Publicly Listening Right Now

```bash
# On your host server: list all TCP ports bound to 0.0.0.0 or ::
ss -tulnp | grep -E '5432|6379|3306|1521|27017'
```

### 2. Never Use `-p 5432:5432` in Production `docker-compose.yml`

If your application and database run on the same Docker network, you don't need `ports:` on the database service at all—containers communicate over the internal bridge network. If you need host-local access, bind strictly to `127.0.0.1`:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    restart: unless-stopped
    # Only reachable from host loopback (for SSH tunnel / local backup), NEVER 0.0.0.0!
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - backend_internal

networks:
  backend_internal:
    internal: true
```

### 3. Use Private VPC Subnets + SSH Bastion / WireGuard / Cloud IAP for Developer Access

In cloud environments (AWS RDS, GCP Cloud SQL, Azure), place database instances in a **private subnet with no public IP** and restrict the Security Group / VPC Firewall rule so port `5432` accepts traffic **only from the application tier's security group**.

### Key Takeaway for Day 20

Password authentication happens *after* packet parsing. Never expose database wire protocols (`5432`, `1521`, `3306`, `6379`) to `0.0.0.0/0`, and watch out for Docker `-p` flags silently bypassing `ufw`.

---

## Social Summary (X & LinkedIn)

```text
Oracle really looked at PostgreSQL dropping 52 CVEs (including a pre-auth spinlock DoS) and said: "Hold my database"—dropping CVSS 9.9 flaws requiring zero authentication over the network.

Strong passwords don't stop pre-authentication wire-protocol bugs.

Day 20/24 of the 2026 DevSec Advent Calendar: Why database ports (5432, 1521, 6379) must never face the public internet.
```
