import {
  isDestroyed,
  isDestroying,
  registerDestructor,
} from '@ember/destroyable'
import { trackedObject } from '@ember/reactive/collections'
import { cancel, schedule } from '@ember/runloop'
import { untrack } from '@glimmer/validator'
import { shallow } from '@tanstack/store'

export interface SelectorSource<TValue> {
  get(): TValue
  subscribe(listener: (value: TValue) => void): { unsubscribe(): void }
}

/** A raw atom or a form/field/group API exposing its atom. */
export type SelectorSourceInput<TValue> =
  | SelectorSource<TValue>
  | { readonly atom: SelectorSource<TValue> }

/** A tracked getter for a source that may be replaced over time. */
export type SelectorSourceGetter<TValue> = () => SelectorSourceInput<TValue>

type SelectorSourceDefinition<TValue> =
  | SelectorSourceInput<TValue>
  | SelectorSourceGetter<TValue>

export interface Selection<TSelected> {
  readonly current: TSelected
}

export class AtomSelection<TSource, TSelected> implements Selection<TSelected> {
  readonly #parent: object
  #sourceDefinition: SelectorSourceDefinition<TSource>
  #source: SelectorSource<TSource>
  #selector: (value: TSource) => TSelected
  #selected: TSelected
  #unsubscribe: (() => void) | undefined
  #scheduled: ReturnType<typeof schedule> | undefined
  #destroyed = false
  #revision = trackedObject({ current: 0 })

  constructor(
    parent: object,
    source: SelectorSourceDefinition<TSource>,
    selector: (value: TSource) => TSelected,
  ) {
    this.#parent = parent
    this.#sourceDefinition = source
    this.#source = this.#resolveSource(source)
    this.#selector = selector
    this.#selected = this.#readSelected(this.#source)
    this.#subscribe()
    registerDestructor(parent, () => this.destroy())
  }

  get current(): TSelected {
    // A getter source can depend on a tracked argument (for example, a form
    // supplied by a parent component). Resolve it during the consuming getter
    // so replacement updates retain the same selection and subscription.
    this.#refreshSource()
    void this.#revision.current
    return this.#selected
  }

  update(
    source: SelectorSourceDefinition<TSource>,
    selector: (value: TSource) => TSelected,
  ): void {
    if (this.#destroyed) return
    const selectorChanged = selector !== this.#selector
    const previousSource = this.#source
    this.#sourceDefinition = source
    this.#selector = selector
    this.#refreshSource()
    if (selectorChanged && previousSource === this.#source) {
      this.#setSelected(this.#readSelected(this.#source))
    }
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
    if (this.#scheduled !== undefined) {
      cancel(this.#scheduled)
      this.#scheduled = undefined
    }
  }

  #resolveSource(
    definition: SelectorSourceDefinition<TSource>,
  ): SelectorSource<TSource> {
    const input = typeof definition === 'function' ? definition() : definition
    return 'atom' in input ? input.atom : input
  }

  #refreshSource(): void {
    if (this.#destroyed) return
    const source = this.#resolveSource(this.#sourceDefinition)
    if (source === this.#source) return

    this.#unsubscribe?.()
    this.#source = source
    this.#setSelected(this.#readSelected(source))
    this.#subscribe()
  }

  #readSelected(source: SelectorSource<TSource>): TSelected {
    return untrack(() => this.#selector(source.get()))
  }

  #subscribe(): void {
    const subscription = this.#source.subscribe((value) => {
      if (
        this.#destroyed ||
        isDestroying(this.#parent) ||
        isDestroyed(this.#parent)
      ) {
        return
      }
      this.#setSelected(this.#selector(value))
    })
    this.#unsubscribe = () => subscription.unsubscribe()
  }

  #setSelected(next: TSelected): void {
    if (shallow(this.#selected, next)) return
    this.#selected = next
    this.#scheduleInvalidation()
  }

  #scheduleInvalidation(): void {
    if (this.#scheduled !== undefined) return

    this.#scheduled = schedule('afterRender', () => {
      this.#scheduled = undefined
      if (
        this.#destroyed ||
        isDestroying(this.#parent) ||
        isDestroyed(this.#parent)
      ) {
        return
      }
      this.#revision.current++
    })
  }
}

export function useSelector<TSource, TSelected>(
  parent: object,
  source: SelectorSourceDefinition<TSource>,
  selector: (value: TSource) => TSelected,
): Selection<TSelected> {
  return new AtomSelection(parent, source, selector)
}
