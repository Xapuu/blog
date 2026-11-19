---
title: "Split Your DB Migration User From Your Runtime App User"
description: "Your runtime application role only needs SELECT, INSERT, UPDATE, DELETE, never CREATE or ALTER TABLE rights. Separating DDL migration users from runtime users blocks privilege escalation and host RCE chains."
pubDate: 2026-12-19
tags: ["security", "postgresql", "database", "backend"]
series: "advent-2026"
adventDay: 19
draft: true
socialSummary: |
  Does your live production API connect to PostgreSQL using the same database user that runs `CREATE TABLE` and `DROP TABLE` migrations?

  PostgreSQL's 22-year-old type-confusion RCE (CVE-2026-6460) required an authenticated user with object creation/alteration privileges.

  Day 19/24 of the 2026 DevSec Advent Calendar: splitting DDL migration roles from least-privilege runtime DB users.
---

In 90% of Node.js, NestJS, and Spring Boot projects, the `DATABASE_URL` environment variable passed to the running production API server uses the exact same database user that runs schema migrations (`prisma migrate deploy`, `typeorm migration:run`, or `flyway migrate`).

Even worse, that single database user is often the database owner or `postgres` superuser.

> **Real-World Receipt (Nov 2026):** PostgreSQL patched a 22-year-old type-confusion Remote Code Execution vulnerability (`CVE-2026-6460`, CVSS 8.8, fixed in 18.7 / 17.12 / 16.16 / 15.20 / 14.25). It is triggered via `ALTER ... SET DATA TYPE` and DDL sequences by an authenticated database user holding object creation (`CREATE`) or alteration (`ALTER`) privileges.

---

## Why Runtime Applications Should Never Hold DDL Privileges

During normal operation, your web application only executes **Data Manipulation Language (DML)** queries: `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.

It has zero legitimate reason to execute **Data Definition Language (DDL)** statements like `CREATE TABLE`, `DROP TABLE`, `ALTER TYPE`, `CREATE EXTENSION`, or `COPY ... FROM PROGRAM`.

If an attacker discovers a SQL injection flaw (or compromises an application container and extracts `DATABASE_URL`) and that connection string belongs to a user with DDL or superuser rights:

1. They can `DROP` or `TRUNCATE` entire tables in a single statement.
2. They can create malicious triggers/functions or exploit DDL-dependent engine flaws (like `CVE-2026-6460`) to achieve arbitrary code execution as the OS user running PostgreSQL.

---

## Production Role Separation in PostgreSQL

Create two distinct, non-superuser roles:

1. **`app_migrator`:** Owns the application schema/tables and is used **strictly during CI/CD deployment jobs** to run DDL schema migrations.
2. **`app_runtime`:** Used by your running Node.js / backend containers, restricted strictly to `SELECT, INSERT, UPDATE, DELETE`.

```sql
-- 1. Lock down default PUBLIC permissions
REVOKE ALL ON DATABASE prod_db FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 2. Create the migration role (used ONLY in CI/CD migration steps)
CREATE ROLE app_migrator WITH
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
  PASSWORD 'replace-with-vault-secret-1';

GRANT CONNECT ON DATABASE prod_db TO app_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO app_migrator;

-- Note: For existing databases, transfer table/sequence ownership to app_migrator
-- so future ALTER TABLE migrations succeed:
-- REASSIGN OWNED BY legacy_owner TO app_migrator;

-- 3. Create the least-privilege runtime role (used by your live API servers)
CREATE ROLE app_runtime WITH
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
  PASSWORD 'replace-with-vault-secret-2';

GRANT CONNECT ON DATABASE prod_db TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;

-- Grant strictly DML permissions on existing tables and sequences
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Ensure future tables created by app_migrator automatically grant DML to app_runtime
ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
```

Pair role separation with network-level isolation ([Day 20](/blog/advent-day-20-firewall-database-ports)) and PostgreSQL Row-Level Security for multi-tenant isolation ([Day 23](/blog/advent-day-23-server-side-rbac-idor)).

---

## Verify It in 60 Seconds

Connect using your production runtime connection string (`app_runtime`) and verify that DDL statements are rejected by PostgreSQL:

```bash
psql "$DATABASE_RUNTIME_URL" -c "CREATE TABLE _perm_test (id int);"
# Expected: ERROR: permission denied for schema public
```

### Key Takeaway for Day 19

Your runtime API should not be able to run `DROP TABLE users`, `ALTER TYPE`, or `CREATE FUNCTION` even if an attacker gets a raw SQL prompt. Split `DATABASE_MIGRATION_URL` from `DATABASE_RUNTIME_URL` today.

---

## References

- [CVE-2026-6460: PostgreSQL Type-Confusion RCE](https://www.cve.org/CVERecord?id=CVE-2026-6460)
- [PostgreSQL Docs: `ALTER DEFAULT PRIVILEGES`](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
