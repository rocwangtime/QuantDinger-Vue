import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { PERSONAL_WORKSPACE, resolveWorkspaceLayout, workspaceMenuRoutes, workspaceProfileTab } from '../../src/config/workspace.mjs'

test('personal layout migrates saved top navigation and invalid preferences to a sidebar', () => {
  assert.equal(PERSONAL_WORKSPACE, true)
  for (const saved of ['topmenu', 'sidemenu', '', null, 'old-layout']) {
    assert.equal(resolveWorkspaceLayout(saved), 'sidemenu')
  }
  assert.equal(resolveWorkspaceLayout('topmenu', false), 'topmenu')
  assert.equal(resolveWorkspaceLayout('sidemenu', false), 'sidemenu')
})

test('personal menu hides billing while preserving trading, profile and future routes', () => {
  const routes = ['/polymarket', '/billing', '/broker-accounts', '/profile', '/future-tool'].map(path => ({ path }))
  assert.deepEqual(workspaceMenuRoutes(routes).map(route => route.path), ['/polymarket', '/broker-accounts', '/profile', '/future-tool'])
  assert.equal(routes.length, 5)
  assert.equal(workspaceMenuRoutes(routes)[0], routes[0])
  assert.equal(workspaceMenuRoutes(routes, false), routes)
})

test('old commercial profile deep links resolve to the available basic settings tab', () => {
  for (const tab of ['credits', 'referrals']) assert.equal(workspaceProfileTab(tab), 'basic')
  for (const tab of ['security', 'notifications', 'agentTokens']) assert.equal(workspaceProfileTab(tab), tab)
  assert.equal(workspaceProfileTab('credits', false), 'credits')
})

test('personal account header performs no billing polling or event subscriptions', async () => {
  const source = readFileSync(new URL('../../src/components/GlobalHeader/AvatarDropdown.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  let billingCalls = 0
  const component = new Function('PERSONAL_WORKSPACE', 'Modal', 'getMembershipPlans', script)(true, {}, async () => { billingCalls++; return {} })
  const vm = { ...component.data(), $root: { $on: () => assert.fail('Unexpected subscription') } }
  for (const [key, method] of Object.entries(component.methods)) vm[key] = method.bind(vm)
  component.mounted.call(vm)
  await vm.loadCredits(true)
  assert.equal(billingCalls, 0)
  assert.equal(vm.creditsRefreshTimer, null)
})
