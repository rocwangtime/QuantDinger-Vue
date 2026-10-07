// This deployment is a personal workspace. Commercial screens remain available
// in the source for deployments that explicitly turn personal mode off.
export const PERSONAL_WORKSPACE = true

export function resolveWorkspaceLayout (savedLayout, personal = PERSONAL_WORKSPACE) {
  if (personal) return 'sidemenu'
  return ['sidemenu', 'topmenu'].includes(savedLayout) ? savedLayout : 'topmenu'
}

export function workspaceMenuRoutes (routes, personal = PERSONAL_WORKSPACE) {
  if (!personal) return routes
  return routes.filter(route => route.path !== '/billing')
}

export function workspaceProfileTab (tab, personal = PERSONAL_WORKSPACE) {
  return personal && ['credits', 'referrals'].includes(tab) ? 'basic' : tab
}
