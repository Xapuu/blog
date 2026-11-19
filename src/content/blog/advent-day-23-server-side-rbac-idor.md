---
title: "Never Trust Client-Side RBAC Alone (IDOR Prevention)"
description: "Hiding a button in Angular or guarding a frontend route only improves UX—it isn't security. Every API endpoint must verify both role permissions and resource ownership on the server."
pubDate: 2026-12-23
tags: ["security", "api", "angular", "nestjs"]
series: "advent-2026"
adventDay: 23
draft: true
---

In modern full-stack TypeScript architectures (like Angular + NestJS, or React + Next.js), teams often share role definitions (`Role.Admin`, `Role.Editor`, `Role.Viewer`) across frontend and backend packages.

On the frontend, engineers add route guards (`canActivate: [adminGuard]`) and hide the *"Delete Project"* button for non-admins.

Then someone tests the backend API directly with `curl -X DELETE https://api.example.com/projects/4829` using a regular `Viewer` token—or a token belonging to a user in **Tenant B**—and the record is deleted.

---

## Two Authorization Bugs That Bypass Authentication

1. **Missing Function-Level Access Control:** The API endpoint verifies that the JWT is valid (`AuthGuard`), but forgets to verify that the caller holds the required role (`RolesGuard`) for that specific mutation.
2. **Insecure Direct Object Reference (IDOR / BOLA):** Even if the user has the `ProjectAdmin` role in **Organization A**, the database query looks up the project solely by primary key (`WHERE id = :projectId`) without scoping the query to the authenticated user's `organizationId`!

---

## Defense Pattern: Composite Tenant-Scoped Queries in NestJS

### 1. Frontend Guards Are Strictly UX

In Angular or React, treat route guards and `*ngIf="isAdmin"` directives purely as **User Experience** conveniences so users don't click buttons that will return `403 Forbidden`.

### 2. Enforce Role + Tenant Ownership in Every Backend Query

Never fetch or mutate a multi-tenant resource by `id` alone. Always bind `organizationId` (or `ownerId`) extracted from the **verified server-side JWT payload** directly into the `WHERE` clause:

```typescript
// projects.controller.ts (NestJS)
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Delete(':id')
  @Roles(Role.ProjectAdmin)
  async deleteProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: AuthenticatedUser // Extracted from verified JWT/session, NEVER request body!
  ): Promise<void> {
    await this.projectsService.deleteForTenant(projectId, user.organizationId);
  }
}

// projects.service.ts
@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  async deleteForTenant(projectId: string, organizationId: string): Promise<void> {
    // BAD (IDOR Vulnerable): DELETE FROM projects WHERE id = $1
    // GOOD (Tenant-Scoped): Combines resource ID and authenticated tenant ID atomically
    const result = await this.db.query(
      `DELETE FROM projects WHERE id = $1 AND organization_id = $2`,
      [projectId, organizationId]
    );

    if (result.rowCount === 0) {
      // Return 404 so cross-tenant attackers cannot even enumerate valid UUIDs
      throw new NotFoundException('Project not found');
    }
  }
}
```

### Key Takeaway for Day 23

A valid JWT only proves *who* the caller is (`401 Unauthorized`), not *what* they are allowed to touch (`403 Forbidden`). Audit every `UPDATE`, `DELETE`, and `GET /:id` query in your backend to ensure `tenant_id` / `user_id` is enforced in the SQL `WHERE` clause.

---

## Social Summary (X & LinkedIn)

```text
Hiding a "Delete" button in Angular or adding a frontend route guard is UX, not security.

And checking `@Roles('admin')` on the backend still leaves you wide open to IDOR if your SQL query says `WHERE id = :id` instead of `WHERE id = :id AND tenant_id = :jwtTenantId`.

Day 23/24 of the 2026 DevSec Advent Calendar: Server-side RBAC and atomic tenant-scoped queries.
```
