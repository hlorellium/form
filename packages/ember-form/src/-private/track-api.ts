import { registerDestructor } from '@ember/destroyable'
import { trackStore } from './track-store.ts'

import type { Versions } from './track-store.ts'

interface MountableApi<TState extends object> {
  store: {
    state: TState
    subscribe: (listener: () => void) => { unsubscribe: () => void }
  }
  state: TState
  mount: () => () => void
}

/**
 * Mounts `api` until `parent` is destroyed, and makes `api.state` autotracked.
 *
 * form-core defines `state` as a prototype getter,
 * and autotracking cannot observe it.
 *
 * svelte-form shadows the getter on the instance in the same way.
 */
export function trackApi<TState extends object, TApi extends MountableApi<TState>>(
  parent: object,
  api: TApi,
  versions?: Versions<TState>,
): TApi {
  const state = trackStore(api.store, parent, versions)

  Object.defineProperty(api, 'state', { get: () => state })

  registerDestructor(parent, api.mount())

  return api
}

/**
 * The versions for a field in array mode.
 *
 * The readers of `state.value` follow the shape of the array:
 * its length, and the counter that form-core bumps on push, insert, remove,
 * swap, move, and clear.
 * An edit to one item does not invalidate them,
 * so `{{#each}}` keeps the DOM of the other items.
 */
export const arrayVersions: Versions<{
  value: unknown
  meta: { _arrayVersion?: number }
}> = {
  value: (state) =>
    `${state.meta._arrayVersion ?? 0}:${
      Array.isArray(state.value) ? state.value.length : -1
    }`,
}
