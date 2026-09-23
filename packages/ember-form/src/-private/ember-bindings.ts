import { registerDestructor } from '@ember/destroyable'
import { trackedObject } from '@ember/reactive/collections'
import { cancel, schedule } from '@ember/runloop'
import {
  InternalFormGroupApi,
  nameToFieldNodeSegments,
} from '@tanstack/form-core/internals'
import { ReactiveOptions } from './reactive-options.ts'

import type { ReadonlyAtom } from '@tanstack/store'
import type {
  AnyInternalFieldApi,
  AnyInternalFormApi,
  AnyInternalFormGroupApi,
} from '@tanstack/form-core/internals'
import type { EmberFormApi } from '../form-api-types.ts'
interface Observation<T> {
  readonly current: T
  destroy(): void
}

interface HandleResolver {
  (): EmberFormHandle | undefined
  callbackViews?: CallbackViewRegistry
}

type CallbackScope = 'form' | 'field' | 'group'

function adaptApi(
  api: any,
  scope: CallbackScope,
  resolve: HandleResolver,
): any {
  if (api === undefined || api === null) return api
  const handle = resolve()
  if (handle !== undefined) {
    if (scope === 'form' && (api === handle.core || api === handle.public)) {
      return handle.public
    }
    const binding = handle.bindingFor(api, scope)
    if (binding !== undefined) return binding
  }

  const callbackViews = resolve.callbackViews
  if (callbackViews !== undefined) {
    return callbackViews.get(api, scope)
  }

  return new Proxy(api, {
    get(target, key) {
      if (key === 'form' && scope !== 'form') {
        return handle?.public ?? target.form
      }
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

function adaptCallbackContext(
  context: any,
  resolve: HandleResolver,
  scope: CallbackScope,
): any {
  if (context === undefined || context === null) return context
  const next = { ...context }
  if ('formApi' in next) next.formApi = adaptApi(next.formApi, 'form', resolve)
  if ('fieldApi' in next) next.fieldApi = adaptApi(next.fieldApi, 'field', resolve)
  if ('groupApi' in next) next.groupApi = adaptApi(next.groupApi, 'group', resolve)
  if ('triggerFieldApi' in next) {
    next.triggerFieldApi = adaptApi(next.triggerFieldApi, 'field', resolve)
  }
  return next
}

function adaptFunction(value: unknown, resolve: HandleResolver, scope: CallbackScope): unknown {
  return typeof value === 'function'
    ? (...args: any[]) => value(adaptCallbackContext(args[0], resolve, scope), ...args.slice(1))
    : value
}

function adaptValidator(value: any, resolve: HandleResolver, scope: CallbackScope): any {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value
  }
  return {
    ...value,
    run:
      typeof value.run === 'function'
        ? (...args: any[]) =>
            value.run(adaptCallbackContext(args[0], resolve, scope))
        : value.run,
    runOnSubmit: adaptFunction(value.runOnSubmit, resolve, scope),
    triggerDebounceMs: adaptFunction(value.triggerDebounceMs, resolve, scope),
    triggers: value.triggers?.map((trigger: any) =>
      typeof trigger === 'object' && trigger !== null
        ? { ...trigger, when: adaptFunction(trigger.when, resolve, scope) }
        : trigger,
    ),
  }
}

function adaptListeners(value: any, resolve: HandleResolver, scope: CallbackScope): any {
  return value?.map((listener: any) => ({
    ...listener,
    run: (...args: any[]) => listener.run(adaptCallbackContext(args[0], resolve, scope)),
    triggerDebounceMs: adaptFunction(listener.triggerDebounceMs, resolve, scope),
    triggers: listener.triggers?.map((trigger: any) =>
      typeof trigger === 'object' && trigger !== null
        ? { ...trigger, when: adaptFunction(trigger.when, resolve, scope) }
        : trigger,
    ),
  }))
}

export function adaptFormOptions(options: Record<string, any>, resolve: HandleResolver): any {
  return {
    ...options,
    validators: options.validators?.map((validator: any) =>
      adaptValidator(validator, resolve, 'form'),
    ),
    listeners: adaptListeners(options.listeners, resolve, 'form'),
    onSubmit:
      typeof options.onSubmit === 'function'
        ? (context: any) => options.onSubmit(adaptCallbackContext(context, resolve, 'form'))
        : options.onSubmit,
    onSubmitInvalid:
      typeof options.onSubmitInvalid === 'function'
        ? (context: any) =>
            options.onSubmitInvalid(adaptCallbackContext(context, resolve, 'form'))
        : options.onSubmitInvalid,
  }
}

function adaptFieldOptions(options: Record<string, any>, resolve: HandleResolver): any {
  const adapted = { ...options }
  if (Object.hasOwn(options, 'validators')) {
    adapted.validators = options.validators?.map((validator: any) =>
      adaptValidator(validator, resolve, 'field'),
    )
  }
  if (Object.hasOwn(options, 'listeners')) {
    adapted.listeners = adaptListeners(options.listeners, resolve, 'field')
  }
  return adapted
}

function adaptGroupOptions(options: Record<string, any>, resolve: HandleResolver): any {
  return {
    ...options,
    validators: options.validators?.map((validator: any) =>
      adaptValidator(validator, resolve, 'group'),
    ),
    onSubmit: adaptFunction(options.onSubmit, resolve, 'group'),
    onSubmitInvalid: adaptFunction(options.onSubmitInvalid, resolve, 'group'),
  }
}

class AtomObservation<T> implements Observation<T> {
  #value: T
  readonly #atom: ReadonlyAtom<unknown>
  readonly #selector: (value: unknown) => T
  #revision = trackedObject({ current: 0 })
  #unsubscribe: (() => void) | undefined
  #scheduled: ReturnType<typeof schedule> | undefined

  constructor(
    atom: ReadonlyAtom<unknown>,
    selector: (value: unknown) => T,
  ) {
    this.#atom = atom
    this.#selector = selector
    this.#value = selector(atom.get())
    const subscription = atom.subscribe((value) => {
      const next = selector(value)
      if (Object.is(next, this.#value)) return
      this.#value = next
      if (this.#scheduled !== undefined) return
      this.#scheduled = schedule('afterRender', () => {
        this.#scheduled = undefined
        this.#revision.current++
      })
    })
    this.#unsubscribe = () => subscription.unsubscribe()
  }

  get current(): T {
    void this.#revision.current
    return this.#selector(this.#atom.get())
  }

  destroy(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
    if (this.#scheduled !== undefined) {
      cancel(this.#scheduled)
      this.#scheduled = undefined
    }
  }
}

function observed<T>(
  atom: ReadonlyAtom<unknown>,
  selector: (value: unknown) => T,
): Observation<T> {
  return new AtomObservation(atom, selector)
}

function observedState(
  atom: ReadonlyAtom<unknown>,
  key: PropertyKey,
): Observation<unknown> {
  return observed(atom, (snapshot) => {
    return (snapshot as Record<PropertyKey, unknown>)[key]
  })
}

function proxyMeta(
  atom: ReadonlyAtom<unknown>,
  getMeta: () => Record<PropertyKey, unknown>,
  observations: Set<Observation<unknown>>,
  observe: typeof observed = observed,
): object {
  const observationsByKey = new Map<PropertyKey, Observation<unknown>>()
  return new Proxy(
    {},
    {
      get(_target, key) {
        let observation = observationsByKey.get(key)
        if (observation === undefined) {
          observation = observe(atom, (snapshot) =>
            (snapshot as { meta: Record<PropertyKey, unknown> }).meta[key],
          )
          observations.add(observation)
          observationsByKey.set(key, observation)
        }
        return observation.current
      },
      has(_target, key) {
        return key in getMeta()
      },
      ownKeys() {
        return Reflect.ownKeys(getMeta())
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true }
      },
    },
  )
}

function proxyState(
  atom: ReadonlyAtom<unknown>,
  getState: () => Record<PropertyKey, unknown>,
  observations: Set<Observation<unknown>>,
  observe: typeof observed = observed,
): object {
  const observationsByKey = new Map<PropertyKey, Observation<unknown>>()
  return new Proxy(
    {},
    {
      get(_target, key) {
        let observation = observationsByKey.get(key)
        if (observation === undefined) {
          observation = observe(atom, (snapshot) =>
            (snapshot as Record<PropertyKey, unknown>)[key],
          )
          observations.add(observation)
          observationsByKey.set(key, observation)
        }
        return observation.current
      },
      ownKeys: () => Reflect.ownKeys(getState()),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    },
  )
}

class CallbackFieldView {
  readonly #raw: AnyInternalFieldApi
  readonly #registry: CallbackViewRegistry
  readonly #observations = new Map<string, Observation<unknown>>()
  #meta: object | undefined

  constructor(raw: AnyInternalFieldApi, registry: CallbackViewRegistry) {
    this.#raw = raw
    this.#registry = registry
  }

  get form(): any {
    return this.#registry.formApi(this.#raw.form)
  }
  get name(): string {
    return String(this.#raw.name)
  }
  get atom() {
    return this.#raw.atom
  }
  get state(): unknown {
    return this.#observation('state', (state) => state).current
  }
  get value(): unknown {
    return this.#observation('value', (state) => (state as any).value).current
  }
  get meta(): object {
    this.#meta ??= proxyMeta(
      this.#raw.atom,
      () => this.#raw.meta as Record<PropertyKey, unknown>,
      this.#registry.observations,
      this.#registry.observe,
    )
    return this.#meta
  }
  get errors(): unknown {
    return this.#observation('errors', (state) => (state as any).meta.errors).current
  }
  handleChange = (value: unknown, options?: unknown): void =>
    this.#raw.handleChange(value as never, options as never)
  handleBlur = (): void => this.#raw.handleBlur()
  reset = (): void => this.#raw.reset()
  pushValue = (value: unknown, options?: unknown): void =>
    this.#raw.pushValue(value as never, options as never)
  insertValue = (index: number, value: unknown, options?: unknown): void =>
    this.#raw.insertValue(index, value as never, options as never)
  removeValue = (index: number, options?: unknown): void =>
    this.#raw.removeValue(index, options as never)
  swapValues = (a: number, b: number): void => this.#raw.swapValues(a, b)
  moveValue = (a: number, b: number, options?: unknown): void =>
    this.#raw.moveValue(a, b, options as never)
  clearValues = (options?: unknown): void => this.#raw.clearValues(options as never)
  filterValues = (predicate: unknown, options?: unknown): void =>
    this.#raw.filterValues(predicate as never, options as never)

  #observation<T>(key: string, selector: (state: unknown) => T): Observation<T> {
    let observation = this.#observations.get(key)
    if (observation === undefined) {
      observation = this.#registry.observe(this.#raw.atom, selector)
      this.#observations.set(key, observation as Observation<unknown>)
    }
    return observation as Observation<T>
  }
}

class CallbackGroupView {
  readonly #raw: AnyInternalFormGroupApi
  readonly #registry: CallbackViewRegistry
  readonly #observations = new Map<string, Observation<unknown>>()

  #state: object | undefined
  #meta: object | undefined

  constructor(raw: AnyInternalFormGroupApi, registry: CallbackViewRegistry) {
    this.#raw = raw
    this.#registry = registry
  }
  get form(): any {
    return this.#registry.formApi(this.#raw.form)
  }
  get atom() {
    return this.#raw.atom
  }
  get name(): string {
    return String(this.#raw.name)
  }
  get state(): object {
    return (this.#state ??= proxyState(
      this.#raw.atom,
      () => this.#raw.state,
      this.#registry.observations,
      this.#registry.observe,
    ))
  }
  get value(): unknown {
    return this.#observation('values', (state) => (state as any).values).current
  }
  get errors(): unknown {
    return this.#observation('errors', (state) => (state as any).errors).current
  }
  get meta(): object {
    return (this.#meta ??= proxyMeta(
      this.#raw.atom,
      () => (this.#raw.state as any).meta,
      this.#registry.observations,
      this.#registry.observe,
    ))
  }
  #observation<T>(key: string, selector: (state: unknown) => T): Observation<T> {
    let observation = this.#observations.get(key)
    if (observation === undefined) {
      observation = this.#registry.observe(this.#raw.atom, selector)
      this.#observations.set(key, observation as Observation<unknown>)
    }
    return observation as Observation<T>
  }
}

class CallbackFormView {
  readonly #raw: AnyInternalFormApi
  readonly #registry: CallbackViewRegistry
  #state: object | undefined

  constructor(raw: AnyInternalFormApi, registry: CallbackViewRegistry) {
    this.#raw = raw
    this.#registry = registry
  }
  get state(): object {
    const publicForm = this.#registry.currentForm(this.#raw)
    if (publicForm !== undefined) return publicForm.state
    return (this.#state ??= proxyState(
      this.#raw.atom,
      () => this.#raw.state,
      this.#registry.observations,
      this.#registry.observe,
    ))
  }
  get atom() {
    return this.#raw.atom
  }
}

export class CallbackViewRegistry {
  readonly observations = new Set<Observation<unknown>>()
  #views = new Map<object, Map<CallbackScope, any>>()
  #handle: EmberFormHandle | undefined
  #destroyed = false

  observe = <T>(
    atom: ReadonlyAtom<unknown>,
    selector: (value: unknown) => T,
  ): Observation<T> => {
    if (this.#destroyed) {
      return {
        get current() {
          return selector(atom.get())
        },
        destroy() {},
      }
    }
    const observation = observed(atom, selector)
    this.observations.add(observation as Observation<unknown>)
    return observation
  }

  setHandle(handle: EmberFormHandle): void {
    if (!this.#destroyed) this.#handle = handle
  }
  get(api: any, scope: CallbackScope): any {
    if (this.#destroyed) return api
    let views = this.#views.get(api)
    if (views === undefined) {
      views = new Map()
      this.#views.set(api, views)
    }
    let view = views.get(scope)
    if (view !== undefined) return view
    const target =
      scope === 'form'
        ? new CallbackFormView(api, this)
        : scope === 'field'
          ? new CallbackFieldView(api, this)
          : new CallbackGroupView(api, this)
    view = new Proxy(target, {
      get: (receiver, key) => {
        if (key in receiver) {
          const value = Reflect.get(receiver, key, receiver)
          return typeof value === 'function' ? value.bind(receiver) : value
        }
        const source =
          scope === 'form'
            ? this.currentForm(api) ?? api
            : api
        const value = Reflect.get(source, key, source)
        return typeof value === 'function' ? value.bind(source) : value
      },
    })
    views.set(scope, view)
    return view
  }
  currentForm(raw: any): any {
    return this.#handle !== undefined &&
      (raw === this.#handle.core || raw === this.#handle.public)
      ? this.#handle.public
      : undefined
  }
  formApi(raw: any): any {
    return this.currentForm(raw) ?? this.get(raw, 'form')
  }
  destroy(): void {
    this.#destroyed = true
    this.observations.forEach((observation) => observation.destroy())
    this.observations.clear()
    this.#views.clear()
    this.#handle = undefined
  }
}

function hasArrayPath(
  form: AnyInternalFormApi,
  name: unknown,
): boolean {
  let current: unknown = form.state.values
  const segments = nameToFieldNodeSegments(String(name))

  for (const segment of segments) {
    if (typeof segment === 'number' && !Array.isArray(current)) return false
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return false
      }
    }
    current =
      current !== null && typeof current === 'object'
        ? (current as Record<string, unknown>)[segment]
        : undefined
  }

  return true
}

class FieldBinding {
  readonly #form: EmberFormHandle
  readonly #array: boolean
  readonly #observations = new Set<Observation<unknown>>()
  readonly #fieldObservations = new Map<string, Observation<unknown>>()
  readonly #options: ReactiveOptions<any>
  #activeOptions: Record<string, unknown>
  #field: AnyInternalFieldApi
  #name: string
  #stopOptions: (() => void) | undefined
  #stopReset: (() => void) | undefined
  #metaProxy: object | undefined
  #generation = trackedObject({ current: 0 })

  constructor(
    form: EmberFormHandle,
    options: () => Record<string, unknown>,
    array: boolean,
  ) {
    this.#form = form
    this.#array = array
    this.#options = form.options(options)
    const initial = this.#options.value
    this.#activeOptions = { ...initial }
    this.#name = String(initial.name)
    this.#field = this.#create(initial)
    this.#stopOptions = this.#options.subscribe(form.owner, (next) =>
      this.#reconcile(next),
    )
    const reset = form.core._atoms.resetVersion
    const resetSubscription = reset.subscribe(() => {
      const activeOptions = this.#activeOptions
      if (
        this.#field._isKilled &&
        !hasArrayPath(this.#form.core, activeOptions.name)
      ) {
        return
      }
      this.#reconcile(activeOptions)
    })
    this.#stopReset = () => resetSubscription.unsubscribe()
    form.addBinding(this)
  }

  get form(): EmberFormApi<any, any> {
    return this.#form.public
  }

  get name(): string {
    return String(this.#field.name)
  }

  get atom() {
    return this.#field.atom
  }

  get state(): unknown {
    void this.#generation.current
    return this.#observation('state', (state) => state).current
  }

  get value(): unknown {
    void this.#generation.current
    if (this.#array) {
      this.#observation('array-structure', (state) => {
        const value = (state as { value: unknown }).value
        return Array.isArray(value)
          ? `${value.length}:${(this.#field._getBaseMeta() as any)._arrayVersion}`
          : ''
      }).current
      return this.#field.value
    }
    return this.#observation('value', (state) => (state as { value: unknown }).value).current
  }

  get meta(): object {
    void this.#generation.current
    if (this.#metaProxy === undefined) {
      this.#metaProxy = proxyMeta(
        this.#field.atom,
        () => this.#field.meta as Record<PropertyKey, unknown>,
        this.#observations,
      )
    }
    return this.#metaProxy
  }

  get errors(): unknown {
    void this.#generation.current
    return this.#observation('errors', (state) =>
      (state as { meta: { errors: unknown } }).meta.errors,
    ).current
  }

  handleChange = (value: unknown, options?: unknown): void => {
    this.#field.handleChange(value as never, options as never)
  }
  handleBlur = (): void => this.#field.handleBlur()
  reset = (): void => this.#field.reset()
  pushValue = (value: unknown, options?: unknown): void =>
    this.#field.pushValue(value as never, options as never)
  insertValue = (index: number, value: unknown, options?: unknown): void =>
    this.#field.insertValue(index, value as never, options as never)
  removeValue = (index: number, options?: unknown): void =>
    this.#field.removeValue(index, options as never)
  swapValues = (a: number, b: number): void => this.#field.swapValues(a, b)
  moveValue = (a: number, b: number, options?: unknown): void =>
    this.#field.moveValue(a, b, options as never)
  clearValues = (options?: unknown): void =>
    this.#field.clearValues(options as never)
  filterValues = (predicate: unknown, options?: unknown): void =>
    this.#field.filterValues(predicate as never, options as never)

  destroy(): void {
    this.#stopOptions?.()
    this.#stopOptions = undefined
    this.#stopReset?.()
    this.#stopReset = undefined
    this.#observations.forEach((observation) => observation.destroy())
    this.#observations.clear()
    this.#fieldObservations.clear()
    this.#field._unregister()
    this.#form.unregisterField(this.#field, this)
  }

  #observation<T>(
    key: string,
    selector: (state: unknown) => T,
  ): Observation<T> {
    let observation = this.#fieldObservations.get(key)
    if (observation === undefined) {
      observation = observed(this.#field.atom, selector)
      this.#fieldObservations.set(key, observation as Observation<unknown>)
      this.#observations.add(observation as Observation<unknown>)
    }
    return observation as Observation<T>
  }

  #create(options: Record<string, unknown>): AnyInternalFieldApi {
    const { name, ...fieldOptions } = options
    const adaptedOptions = adaptFieldOptions(fieldOptions, () => this.#form)
    const field = this.#form.core._getOrCreateFieldApi(
      { name, ...adaptedOptions } as never,
      'field',
    )
    this.#field = field
    this.#form.registerField(field, this)
    if (Object.keys(adaptedOptions).length > 0) {
      field._update(adaptedOptions as never, 'field')
    }
    field._register()
    // Core callbacks receive this logical field object. Its owner points back
    // to the same Ember form handle so callback consumers do not get a second
    // imperative-only form surface.
    field.form = this.#form.public as never
    return field
  }

  #reconcile(options: Record<string, unknown>): void {
    const nextName = String(options.name)
    if (this.#field._isKilled && !hasArrayPath(this.#form.core, nextName)) {
      this.#activeOptions = { ...options }
      return
    }
    if (nextName !== this.#name || this.#field._isKilled) {
      this.#field._unregister()
      this.#form.unregisterField(this.#field, this)
      this.#observations.forEach((observation) => observation.destroy())
      this.#observations.clear()
      this.#fieldObservations.clear()
      this.#field = this.#create(options)
      this.#name = nextName
      this.#metaProxy = undefined
      this.#activeOptions = { ...options }
      this.#generation.current++
      return
    }
    const { name: _name, ...fieldOptions } = options
    if (Object.keys(fieldOptions).length > 0) {
      this.#field._update(adaptFieldOptions(fieldOptions, () => this.#form), 'field')
    }
    this.#activeOptions = { ...options }
  }
}

class GroupBinding {
  readonly #form: EmberFormHandle
  readonly #options: ReactiveOptions<any>
  #activeOptions: Record<string, unknown>
  readonly #observations = new Set<Observation<unknown>>()
  readonly #stateObservations = new Map<PropertyKey, Observation<unknown>>()
  readonly #metaObservations = new Map<PropertyKey, Observation<unknown>>()
  readonly #valueObservations = new Map<string, Observation<unknown>>()
  #group: AnyInternalFormGroupApi
  #public: any
  #generation = trackedObject({ current: 0 })
  #stopOptions: (() => void) | undefined
  #stopReset: (() => void) | undefined

  constructor(form: EmberFormHandle, options: () => Record<string, unknown>) {
    this.#form = form
    this.#options = form.options(options)
    this.#activeOptions = { ...this.#options.value }
    this.#group = this.#create(this.#activeOptions)
    form.registerGroup(this.#group, this)
    this.#stopOptions = this.#options.subscribe(form.owner, (next) =>
      this.#reconcile(next),
    )
    const resetSubscription = form.core._atoms.resetVersion.subscribe(() => {
      const activeName = this.#activeOptions.name
      if (!hasArrayPath(this.#form.core, activeName)) return
      this.#group._attachToFieldTrie(String(activeName))
    })
    this.#stopReset = () => resetSubscription.unsubscribe()
    form.addBinding(this)
  }

  set public(value: any) {
    this.#public = value
  }
  get public(): any {
    return this.#public ?? this
  }
  get form(): EmberFormApi<any, any> {
    return this.#form.public
  }
  get core(): AnyInternalFormGroupApi {
    return this.#group
  }
  get atom() {
    return this.#group.atom
  }
  get name(): string {
    return String(this.#group.name)
  }
  get state(): unknown {
    void this.#generation.current
    return this.#snapshotProxy(
      this.#stateObservations,
      (key) => this.#observation((state) => (state as any)[key]),
      () => Reflect.ownKeys(this.#group.state),
    )
  }
  get value(): unknown {
    void this.#generation.current
    return this.#valueObservation('values').current
  }
  get errors(): unknown {
    void this.#generation.current
    return this.#valueObservation('errors').current
  }
  get meta(): unknown {
    void this.#generation.current
    return this.#snapshotProxy(
      this.#metaObservations,
      (key) => this.#observation((state) => (state as any).meta[key]),
      () => Reflect.ownKeys(this.#group.state.meta),
    )
  }

  destroy(): void {
    this.#stopOptions?.()
    this.#stopOptions = undefined
    this.#stopReset?.()
    this.#stopReset = undefined
    this.#observations.forEach((observation) => observation.destroy())
    this.#observations.clear()
    this.#stateObservations.clear()
    this.#metaObservations.clear()
    this.#valueObservations.clear()
    this.#group._cleanup()
    this.#form.unregisterGroup(this.#group)
  }

  #snapshotProxy(
    cache: Map<PropertyKey, Observation<unknown>>,
    create: (key: PropertyKey) => Observation<unknown>,
    keys: () => PropertyKey[],
  ): object {
    return new Proxy(
      {},
      {
        get: (_target, key) => {
          let observation = cache.get(key)
          if (observation === undefined) {
            observation = create(key)
            cache.set(key, observation)
          }
          return observation.current
        },
        ownKeys: keys,
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      },
    )
  }

  #valueObservation(key: string): Observation<unknown> {
    let observation = this.#valueObservations.get(key)
    if (observation === undefined) {
      observation = this.#observation((state) =>
        (state as Record<string, unknown>)[key],
      )
      this.#valueObservations.set(key, observation)
    }
    return observation
  }

  #observation(selector: (state: unknown) => unknown): Observation<unknown> {
    const observation = observed(this.#group.atom, selector)
    this.#observations.add(observation)
    return observation
  }
  #create(options: Record<string, unknown>): AnyInternalFormGroupApi {
    return new InternalFormGroupApi({
      ...adaptGroupOptions(options, () => this.#form),
      form: this.#form.public,
    } as never)
  }
  #replace(options: Record<string, unknown>): void {
    const previous = this.#group
    this.#observations.forEach((observation) => observation.destroy())
    this.#observations.clear()
    this.#stateObservations.clear()
    this.#metaObservations.clear()
    this.#valueObservations.clear()
    previous._cleanup()
    this.#form.unregisterGroup(previous)
    this.#group = this.#create(options)
    this.#form.registerGroup(this.#group, this)
    this.#group.mount()
    this.#generation.current++
  }
  #reconcile(options: Record<string, unknown>): void {
    const nextName = String(options.name)
    if (nextName !== String(this.#group.name)) {
      this.#replace(options)
      this.#activeOptions = { ...options }
      return
    }
    this.#group.update({
      ...adaptGroupOptions(options, () => this.#form),
      form: this.#form.public,
    } as never)
    this.#activeOptions = { ...options }
  }
}

export class EmberFormHandle {
  readonly owner: object
  readonly core: AnyInternalFormApi
  readonly public: EmberFormApi<any, any>
  readonly #observations = new Set<Observation<unknown>>()
  readonly #bindings = new Set<{ destroy(): void }>()
  readonly #fields = new Map<object, Set<FieldBinding>>()
  readonly #groups = new Map<object, GroupBinding>()
  readonly #stateObservations = new Map<PropertyKey, Observation<unknown>>()
  readonly #stateProxy: object
  readonly #callbackViews: CallbackViewRegistry | undefined

  constructor(
    owner: object,
    core: AnyInternalFormApi,
    callbackViews?: CallbackViewRegistry,
  ) {
    this.#callbackViews = callbackViews
    this.owner = owner
    this.core = core
    this.#stateProxy = new Proxy(
      {},
      {
        get: (_target, key) => {
          let observation = this.#stateObservations.get(key)
          if (observation === undefined) {
            observation = observedState(core.atom, key)
            this.#stateObservations.set(key, observation)
            this.#observations.add(observation)
          }
          return observation.current
        },
        ownKeys: () => Reflect.ownKeys(core.state),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
      },
    )
    this.public = new Proxy(this as any, {
      get: (target, key) => {
        if (key === 'state') return target.state
        if (key in target) {
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        }
        const value = Reflect.get(core as any, key, core)
        return typeof value === 'function' ? value.bind(core) : value
      },
      set: (_target, key, value) => {
        ;(core as any)[key] = value
        return true
      },
    }) as EmberFormApi<any, any>
    ;(core as any).field = (options: () => Record<string, unknown>) =>
      this.field(options)
    ;(core as any).arrayField = (options: () => Record<string, unknown>) =>
      this.arrayField(options)
    ;(core as any).formGroup = (options: () => Record<string, unknown>) =>
      this.formGroup(options)
    const getOrCreateField = core._getOrCreateFieldApi.bind(core)
    ;(core as any)._getOrCreateFieldApi = (
      options: unknown,
      scope?: unknown,
    ) => {
      const field = getOrCreateField(options as never, scope as never)
      field.form = this.public as never
      return field
    }
    registerDestructor(owner, () => this.destroy())
  }

  get state(): object {
    return this.#stateProxy
  }
  get atom() {
    return this.core.atom
  }
  get defaultValues() {
    return this.core.defaultValues
  }
  get formId() {
    return this.core.formId
  }

  options<T extends object>(resolve: () => T): ReactiveOptions<T> {
    return new ReactiveOptions(resolve)
  }

  field(options: () => Record<string, unknown>): unknown {
    return new FieldBinding(this, options, false)
  }
  arrayField(options: () => Record<string, unknown>): unknown {
    return new FieldBinding(this, options, true)
  }
  formGroup(options: () => Record<string, unknown>): unknown {
    const binding = new GroupBinding(this, options)
    const publicGroup = new Proxy(binding, {
      get: (target, key) => {
        if (key in target) {
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        }
        const value = Reflect.get(target.core as any, key, target.core)
        return typeof value === 'function' ? value.bind(target.core) : value
      },
    })
    binding.public = publicGroup
    binding.core.mount()
    return publicGroup
  }

  bindingFor(api: object, scope: CallbackScope): any {
    if (scope === 'field') {
      const bindings = this.#fields.get(api)
      return bindings === undefined ? undefined : Array.from(bindings).at(-1)
    }
    return this.#groups.get(api)?.public
  }
  registerField(field: object, binding: FieldBinding): void {
    let bindings = this.#fields.get(field)
    if (bindings === undefined) {
      bindings = new Set()
      this.#fields.set(field, bindings)
    }
    bindings.add(binding)
  }
  unregisterField(field: object, binding: FieldBinding): void {
    const bindings = this.#fields.get(field)
    bindings?.delete(binding)
    if (bindings?.size === 0) this.#fields.delete(field)
  }
  registerGroup(group: object, binding: GroupBinding): void {
    this.#groups.set(group, binding)
  }
  unregisterGroup(group: object): void {
    this.#groups.delete(group)
  }
  addBinding(binding: { destroy(): void }): void {
    this.#bindings.add(binding)
  }
  destroy(): void {
    this.#bindings.forEach((binding) => binding.destroy())
    this.#bindings.clear()
    this.#observations.forEach((observation) => observation.destroy())
    this.#observations.clear()
    this.#stateObservations.clear()
    this.#fields.clear()
    this.#groups.clear()
    this.#callbackViews?.destroy()
  }
}
