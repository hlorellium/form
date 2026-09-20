import {
  isDestroyed,
  isDestroying,
  registerDestructor,
} from '@ember/destroyable'
import { trackedObject } from '@ember/reactive/collections'
import { shallow } from '@tanstack/store'

export interface SelectorSource<TValue> {
  get(): TValue
  subscribe(listener: (value: TValue) => void): { unsubscribe(): void }
}

export interface Selection<TSelected> {
  readonly current: TSelected
}

export class AtomSelection<TSource, TSelected> implements Selection<TSelected> {
  readonly #parent: object
  #source: SelectorSource<TSource>
  #selector: (value: TSource) => TSelected
  #selected: TSelected
  #unsubscribe: (() => void) | undefined
  #scheduled = false
  #destroyed = false
  #revision = trackedObject({ current: 0 })

  constructor(
    parent: object,
    source: SelectorSource<TSource>,
    selector: (value: TSource) => TSelected,
  ) {
    this.#parent = parent
    this.#source = source
    this.#selector = selector
    this.#selected = selector(source.get())
    this.#subscribe()
    registerDestructor(parent, () => this.destroy())
  }

  get current(): TSelected {
    void this.#revision.current
    return this.#selected
  }

  update(
    source: SelectorSource<TSource>,
    selector: (value: TSource) => TSelected,
  ): void {
    if (this.#destroyed) return
    if (source === this.#source && selector === this.#selector) return

    this.#unsubscribe?.()
    this.#source = source
    this.#selector = selector
    this.#setSelected(selector(source.get()))
    this.#subscribe()
  }

  destroy(): void {
    if (this.#destroyed) return
    this.#destroyed = true
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
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
    if (this.#scheduled) return
    this.#scheduled = true

    queueMicrotask(() => {
      this.#scheduled = false
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
  source: SelectorSource<TSource>,
  selector: (value: TSource) => TSelected,
): Selection<TSelected> {
  return new AtomSelection(parent, source, selector)
}
