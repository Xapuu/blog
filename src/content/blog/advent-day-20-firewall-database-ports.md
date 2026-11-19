---
title: "Firewall Internal Database Ports (5432, 1521, 6379)"
description: "Database wire protocols aren't designed to face untrusted networks. Pre-authentication bugs can crash or compromise database servers before a login handshake even finishes. Keep DB ports strictly inside private subnets."
pubDate: 2026-12-20
tags: ["security", "database", "networking", "ops"]
series: "advent-2026"
adventDay: 20
draft: true
socialSummary: |
  Oracle really looked at PostgreSQL dropping 52 CVEs (including a pre-auth spinlock DoS) and said: "Hold my database." Then it dropped CVSS 9.9 flaws requiring zero authentication over the network.

  Strong passwords don't stop pre-authentication wire-protocol bugs.

  Day 20/24 of the 2026 DevSec Advent Calendar: why database ports (5432, 1521, 6379) must never face the public internet.
---

*"Our database port is open to `0.0.0.0/0` so developers can connect from home, but it requires a strong 32-character password and TLS, so it's safe."*

If you have ever heard (or made) that argument, November 2026's database advisories are your wake-up call.

> **Real-World Receipt (Nov 2026):** PostgreSQL 18 (prior to 18.7) patched a **pre-authentication** startup/cancel-request spinlock Denial of Service (`CVE-2026-116322`), while Oracle's November Critical Security Patch Update dropped **CVSS 9.9 unauthenticated network flaws** across Oracle Database and Supply Chain. Both are exploitable over the wire with **no active database username or password required**.

---

## Why Strong Passwords Don't Protect Exposed Wire Protocols

When TCP port `5432` (PostgreSQL), `1521` (Oracle), `3306` (MySQL), or `6379` (Redis) is reachable from the public internet:

1. **Pre-Authentication Parser Bugs:** Before the database server ever verifies your password, it must parse the raw TCP startup packet, TLS handshake, or cancel-request header in C/C++. Any memory corruption or spinlock bug in that pre-auth code path can be triggered by an unauthenticated attacker with a single TCP packet.
2. **Docker Bypassing `ufw` on Linux VPS Hosts:** Just like exposing Vite dev ports on [Day 03](/blog/advent-day-03-vite-dev-server-host), running Postgres or Redis in Docker with `-p 5432:5432` causes Docker to write `iptables` `PREROUTING` rules directly. That **completely bypasses `ufw` (Uncomplicated Firewall)** and exposes port `5432` to the entire internet.

---

## How to Lock Down Database Network Exposure

### 1. Omit `ports:` Entirely in Production `docker-compose.yml`

If your application and database run on the same Docker network, you **do not need `ports:` on the database service at all**. Containers talk privately over the internal network. Only expose `127.0.0.1:5432:5432` on a non-internal bridge (for example in a local dev override or SSH bastion host) when host-loopback access is strictly required:

```yaml
# docker-compose.prod.yml
services:
  api:
    image: my-org/api:1.14.2
    networks:
      - public_edge
      - backend_internal

  postgres:
    image: postgres:18.7-alpine
    restart: unless-stopped
    # NO `ports:` published to the host at all!
    expose:
      - "5432"
    networks:
      - backend_internal

networks:
  public_edge:
  backend_internal:
    internal: true
```

### 2. Use Private VPC Subnets + `pg_hba.conf` Defense-in-Depth

In cloud environments (AWS RDS, GCP Cloud SQL, Azure), place database instances in a **private subnet with no public IP**, restrict the Security Group so port `5432` accepts traffic **only from the application tier's security group**, and access the DB from developer laptops via SSH bastion, WireGuard/Tailscale, or Cloud IAP.

As a second layer inside PostgreSQL, require TLS (`hostssl`) plus `scram-sha-256` restricted to your private VPC CIDR in `pg_hba.conf`:

```text
# pg_hba.conf: reject non-TLS and non-VPC connections
hostssl prod_db app_runtime 10.0.10.0/24 scram-sha-256
```

---

## Verify It in 60 Seconds

Check which database ports are bound to `0.0.0.0` or `::` on your server, and confirm from an external machine that the port is unreachable:

```bash
# 1. On your host server: list any DB ports bound to 0.0.0.0 or [::]
ss -tulnp | grep -E ':(5432|6379|3306|1521|27017)\b'

# 2. From an external machine outside your VPC: should time out / refuse
nc -zv -w 3 <your-public-ip> 5432
```

### Key Takeaway for Day 20

Password authentication happens *after* packet parsing. Never expose database wire protocols (`5432`, `1521`, `3306`, `6379`) to `0.0.0.0/0`, watch out for Docker `-p` flags silently bypassing `ufw`, and pair VPC isolation with least-privilege DB roles ([Day 19](/blog/advent-day-19-least-privilege-db-roles)).

---

## References

- [CVE-2026-116322: PostgreSQL 18 Startup Spinlock DoS](https://www.cve.org/CVERecord?id=CVE-2026-116322)
- [PostgreSQL Docs: The `pg_hba.conf` File](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [Docker Docs: Packet Filtering and Firewalls](https://docs.docker.com/engine/network/packet-filtering-firewalls/)
