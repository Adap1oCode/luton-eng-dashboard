// -----------------------------------------------------------------------------
// FILE: src/app/api/debug/permissions/route.ts
// PURPOSE: Debug endpoint to list all existing permissions in the database
// USAGE: GET /api/debug/permissions
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await supabaseServer();

    // Get all permissions
    const { data: permissions, error: permError } = await supabase
      .from("permissions")
      .select("key, description")
      .order("key");

    if (permError) {
      return NextResponse.json({ error: "Failed to fetch permissions", details: permError }, { status: 500 });
    }

    // Get all roles
    const { data: roles, error: roleError } = await supabase
      .from("roles")
      .select("id, role_code, role_name, is_active")
      .order("role_code");

    if (roleError) {
      return NextResponse.json({ error: "Failed to fetch roles", details: roleError }, { status: 500 });
    }

    // Get role-permission mappings
    const { data: rolePermissions, error: rpError } = await supabase
      .from("role_permissions")
      .select(`
        role_id,
        permission_key,
        roles:roles!role_permissions_role_id_fkey (role_code, role_name),
        permissions:permissions!role_permissions_permission_key_fkey (key, description)
      `)
      .order("role_id, permission_key");

    if (rpError) {
      return NextResponse.json({ error: "Failed to fetch role permissions", details: rpError }, { status: 500 });
    }

    return NextResponse.json({
      permissions: permissions || [],
      roles: roles || [],
      rolePermissions: rolePermissions || [],
      summary: {
        totalPermissions: permissions?.length || 0,
        totalRoles: roles?.length || 0,
        totalRolePermissionMappings: rolePermissions?.length || 0,
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

