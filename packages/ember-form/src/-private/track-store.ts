import { trackedObject } from '@ember/reactive/collections'
import { isDestroying, registerDestructor } from '@ember/destroyable'

interface ReadableStore<TState extends object> {
  state: TState
  subscribe: (listener: () => void) => { unsubscribe: () => void }
}

type Keyed = Record<string | symbol, unknown>

/**
 * A key whose readers invalidate when the version changes,
 * instead of when the value changes.
 */
export type Versions<TState extends object> = {
  [K in keyof TState]?: (state: TState) => unknown
}

/**
 * Returns a view of `store.state` that autotracking can observe per key.
 *
 * A read returns the live value, never a copy,
 * so the value cannot lag behind the store.
 *
 * `trackedObject` compares with `Object.is`,
 * so a key that keeps its value does not invalidate its readers.
 *
 * A key in `versions` invalidates its readers when its version changes,
 * not when its value changes.
 * `ArrayField` uses this to follow the shape of an array and not its items.
 *
 * The subscription ends when `parent` is destroyed.
 */
export function trackStore<TState extends object>(
  store: ReadableStore<TState>,
  parent: object,
  versions: Versions<TState> = {},
): TState {
  const versionOf = versions as Record<
    string | symbol,
    ((state: TState) => unknown) | undefined
  >

  function tagValue(state: TState, key: string | symbol) {
    const version = versionOf[key]

    return version ? version(state) : (state as Keyed)[key]
  }

  const initial: Keyed = {}

  for (const key of Reflect.ownKeys(store.state)) {
    initial[key] = tagValue(store.state, key)
  }

  const tags = trackedObject(initial)

  let isScheduled = false

  function notify() {
    isScheduled = false

    if (isDestroying(parent)) return

    const state = store.state

    for (const key of Reflect.ownKeys(state)) {
      tags[key] = tagValue(state, key)
    }
  }

  /**
   * form-core writes to its stores during a render:
   * - when a field mounts
   * - when `update` applies a new default value
   *
   * Autotracking throws if a value changes after the same render read it,
   * so the notification waits for the render to finish.
   */
  const { unsubscribe } = store.subscribe(() => {
    if (isScheduled) return

    isScheduled = true
    queueMicrotask(notify)
  })

  registerDestructor(parent, unsubscribe)

  const view = {}

  // form-core never adds or removes a state key, so the first keys are all the keys.
  for (const key of Reflect.ownKeys(store.state)) {
    Object.defineProperty(view, key, {
      enumerable: true,
      get() {
        void tags[key]

        return (store.state as Keyed)[key]
      },
    })
  }

  return view as TState
}
