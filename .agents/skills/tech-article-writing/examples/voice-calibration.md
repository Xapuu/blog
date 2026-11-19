# Voice Calibration Examples

Use these before/after comparisons to keep hooks sharp, conversational, and free of corporate or AI-sounding filler.

## Example 1: Dev Server Vulnerability (Vite RCE)

**Too generic / press-release style (Avoid):**
> A critical vulnerability (GHSA-p4f5-76q4-ffq7, CVSS 9.1) was recently disclosed in Vite's development server. Organizations should review their configurations and ensure development servers are not exposed to untrusted networks.

**Pragmatic team-lead voice (Target):**
> Don't forget there is a reason every bundler warns against running dev servers on the network.
>
> One `vite --host` committed to `package.json` or `-p 5173:5173` in Docker turns a dev-server advisory (GHSA-p4f5-76q4-ffq7, CVSS 9.1) into LAN-accessible file read and RCE on shared Wi-Fi.
>
> Fix it in 30 seconds: bind Docker dev ports to `127.0.0.1:5173:5173` and upgrade Vite.

## Example 2: Database Wire Protocols (PostgreSQL & Oracle)

**Too generic / symmetrical AI style (Avoid):**
> In today's threat landscape, strong passwords are no longer enough. Not only did PostgreSQL patch 52 CVEs, but Oracle also released critical security updates. Here is why network segmentation matters more than ever.

**Pragmatic team-lead voice (Target):**
> Oracle really looked at PostgreSQL dropping 52 CVEs (including a pre-auth spinlock DoS) and said: "Hold my database."
>
> Strong passwords do not protect an exposed port 5432 or 1521. Packet parsing happens before authentication ever runs.
>
> Run `ss -tulnp` on your host today and verify no database port is listening on `0.0.0.0`.

## Punctuation & Rhythm Check

- Replace heavy em-dash chains (`thing A — which does B — breaks C`) with short sentences, parentheses, or colons.
- Prefer active, concrete verbs (`audit`, `revoke`, `bind`, `pin`, `verify`) over passive phrasing (`should be audited`, `is recommended`).
