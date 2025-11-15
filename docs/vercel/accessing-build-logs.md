# Accessing Vercel Build Logs via MCP Tools

This guide explains how to access Vercel deployment build logs using the MCP (Model Context Protocol) tools available in Cursor.

## Step-by-Step Process

### 1. Get the Team ID

First, list teams to get the team ID:

```javascript
mcp_Vercel_list_teams()
```

This returns teams like:
```json
{
  "teams": [
    {
      "id": "team_YnZA6PxaViRNFrHfQOocwHyg",
      "name": "Adap1oCode",
      "slug": "adap1ocodes-projects"
    }
  ]
}
```

**Save the `id`** (e.g., `team_YnZA6PxaViRNFrHfQOocwHyg`) - you'll need it for all subsequent operations.

### 2. List Projects

List projects to find the project name:

```javascript
mcp_Vercel_list_projects({})
```

**Note:** This may return Supabase projects. The Vercel project name is usually the repository name (e.g., `luton-eng-dashboard`).

### 3. List Recent Deployments

List deployments for the project using the project name and team ID:

```javascript
mcp_Vercel_list_deployments({
  projectId: "luton-eng-dashboard",  // Project name (not ID)
  teamId: "team_YnZA6PxaViRNFrHfQOocwHyg",
  since: 1735689600  // Unix timestamp (optional, for filtering recent deployments)
})
```

This returns deployments with their states (ERROR, READY, BUILDING, etc.). The first one in the list is usually the most recent.

### 4. Get Build Logs for Failed Deployment

Get build logs using the deployment ID or URL:

```javascript
mcp_Vercel_get_deployment_build_logs({
  idOrUrl: "dpl_4bGNmCaEaUbjkcdTRMpnXQL6Nrm2",  // Deployment ID from step 3
  teamId: "team_YnZA6PxaViRNFrHfQOocwHyg",
  limit: 600  // Number of log lines to retrieve
})
```

## Quick Reference Commands

### Get Team ID
```
mcp_Vercel_list_teams()
```

### List Recent Deployments
```
mcp_Vercel_list_deployments({
  projectId: "luton-eng-dashboard",
  teamId: "team_YnZA6PxaViRNFrHfQOocwHyg",
  since: 1735689600  // Adjust timestamp as needed
})
```

### Get Build Logs
```
mcp_Vercel_get_deployment_build_logs({
  idOrUrl: "<deployment-id>",  // From list_deployments result
  teamId: "team_YnZA6PxaViRNFrHfQOocwHyg",
  limit: 600
})
```

## Important Notes

1. **Project ID vs Project Name**: Use the project **name** (e.g., `luton-eng-dashboard`), not a numeric ID, for `list_deployments`.

2. **Team ID is Required**: Most operations require the `teamId` parameter. Get it once from `list_teams()` and reuse it.

3. **Deployment ID Format**: Deployment IDs start with `dpl_` (e.g., `dpl_4bGNmCaEaUbjkcdTRMpnXQL6Nrm2`).

4. **Log Limit**: Increase the `limit` parameter if you need more log lines (default is 100, max recommended is 600+ for full builds).

5. **Since Parameter**: The `since` parameter in `list_deployments` is a Unix timestamp. Use it to filter recent deployments:
   - Last 24 hours: `Math.floor(Date.now() / 1000) - 86400`
   - Last week: `Math.floor(Date.now() / 1000) - 604800`

## Example Workflow

```javascript
// 1. Get team ID (usually only need to do this once)
const teams = await mcp_Vercel_list_teams();
const teamId = teams.teams[0].id; // "team_YnZA6PxaViRNFrHfQOocwHyg"

// 2. List recent deployments
const deployments = await mcp_Vercel_list_deployments({
  projectId: "luton-eng-dashboard",
  teamId: teamId,
  since: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
});

// 3. Find the latest failed deployment
const latestError = deployments.deployments.deployments.find(
  d => d.state === "ERROR"
);

// 4. Get build logs
const logs = await mcp_Vercel_get_deployment_build_logs({
  idOrUrl: latestError.id,
  teamId: teamId,
  limit: 600
});

// 5. Search logs for errors
const errorLines = logs.events.filter(e => e.level === "error");
```

## Common Deployment States

- `ERROR`: Build failed - check logs for errors
- `READY`: Build succeeded and is deployed
- `BUILDING`: Build is currently in progress
- `QUEUED`: Build is waiting to start

## Troubleshooting

### "Deployment not found" Error
- Verify the deployment ID is correct (starts with `dpl_`)
- Check that the deployment exists in the project
- Ensure you're using the correct `teamId`

### Empty Logs
- Increase the `limit` parameter
- Check if the deployment is still building (logs may not be available yet)

### Wrong Project
- Use `mcp_Vercel_list_projects({})` to verify project names
- The project name is typically the repository name

## Related Documentation

- [Vercel Automated Deployment](./vercel-automated-deployment.md)
- [Vercel Troubleshooting](./vercel-troubleshooting.md)











