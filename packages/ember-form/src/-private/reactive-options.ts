import { destroy, isDestroyed, isDestroying } from '@ember/destroyable'
import { dependentKeyCompat } from '@ember/object/compat'
import { addObserver, removeObserver } from '@ember/object/observers'
import { createCache, getValue } from '@glimmer/tracking/primitives/cache'

/**
 * Bridge tracked options to an imperative API without requiring a rendered
 * consumer. Keep the getter pure: the asynchronous observer applies updates
 * outside the cache's tracking frame.
 */
export class ReactiveOptions<TOptions extends object> {
  readonly #cache

  constructor(resolve: () => TOptions) {
    this.#cache = createCache(() => ({ ...resolve() }))
  }

  @dependentKeyCompat
  get value(): TOptions {
    return getValue(this.#cache)!
  }

  subscribe(parent: object, update: (options: TOptions) => void): () => void {
    let stopped = false
    const reconcile = () => {
      if (stopped || isDestroying(parent) || isDestroyed(parent)) return
      update(this.value)
    }

    // Ember's public observer bridge provides eager updates for tracked inputs;
    // a cache alone would only refresh when a template or caller reads it.
    addObserver(this, 'value', null, reconcile, false)

    return () => {
      if (stopped) return
      stopped = true
      removeObserver(this, 'value', null, reconcile, false)
      destroy(this)
    }
  }
}
