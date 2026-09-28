import {
  associateDestroyableChild,
  registerDestructor,
} from '@ember/destroyable'
import { createCache, getValue } from '@glimmer/tracking/primitives/cache'
import { FormApi } from '@tanstack/form-core'
import { extendForm } from './-private/extend-form.ts'

import type { EmberFormApi, EmberFormExtendedApi } from './types.ts'
import type {
  FormAsyncValidateOrFn,
  FormOptions,
  FormValidateOrFn,
} from '@tanstack/form-core'

/**
 * Returns a form that `parent` owns.
 *
 * Call this in a class, with the class instance as `parent`.
 * The form mounts now, and it is a destroyable child of `parent`:
 * it unmounts when `parent` is destroyed, or when you `destroy` it.
 *
 * `options` is an object, or a function that returns one.
 * A function may read tracked state, for example `this.args`. Bound components
 * and `useSelector(...).current` apply the current options when read. For
 * imperative use, `state`, `reset`, validation methods, and `handleSubmit`
 * refresh options before they run, even when no component renders.
 *
 * The result is the `FormApi` with `Field`, `ArrayField`, `Subscribe`,
 * `FormGroup`, and `useSelector` added.
 * Render the components as `<this.form.Field>`, or pass the form to the
 * exported components as `@form`.
 *
 * To create a form component in module scope instead, see `createForm`.
 *
 * @example
 * ```gts
 * import Component from '@glimmer/component';
 * import { mountForm } from '@tanstack/ember-form';
 *
 * export default class Signup extends Component {
 *   form = mountForm(this, {
 *     defaultValues: { firstName: '', lastName: '' },
 *     onSubmit: ({ value }) => this.args.save(value),
 *   });
 *
 *   <template>
 *     <this.form.Field @name="firstName" as |field|>
 *       <input value={{field.state.value}} />
 *     </this.form.Field>
 *   </template>
 * }
 * ```
 */
export function mountForm<
  TFormData,
  TFormOnMount extends undefined | FormValidateOrFn<TFormData> = undefined,
  TFormOnChange extends undefined | FormValidateOrFn<TFormData> = undefined,
  TFormOnChangeAsync extends
    | undefined
    | FormAsyncValidateOrFn<TFormData> = undefined,
  TFormOnBlur extends undefined | FormValidateOrFn<TFormData> = undefined,
  TFormOnBlurAsync extends
    | undefined
    | FormAsyncValidateOrFn<TFormData> = undefined,
  TFormOnSubmit extends undefined | FormValidateOrFn<TFormData> = undefined,
  TFormOnSubmitAsync extends
    | undefined
    | FormAsyncValidateOrFn<TFormData> = undefined,
  TFormOnDynamic extends undefined | FormValidateOrFn<TFormData> = undefined,
  TFormOnDynamicAsync extends
    | undefined
    | FormAsyncValidateOrFn<TFormData> = undefined,
  TFormOnServer extends
    | undefined
    | FormAsyncValidateOrFn<TFormData> = undefined,
  TSubmitMeta = never,
>(
  parent: object,
  options:
    | FormOptions<
        TFormData,
        TFormOnMount,
        TFormOnChange,
        TFormOnChangeAsync,
        TFormOnBlur,
        TFormOnBlurAsync,
        TFormOnSubmit,
        TFormOnSubmitAsync,
        TFormOnDynamic,
        TFormOnDynamicAsync,
        TFormOnServer,
        TSubmitMeta
      >
    | (() => FormOptions<
        TFormData,
        TFormOnMount,
        TFormOnChange,
        TFormOnChangeAsync,
        TFormOnBlur,
        TFormOnBlurAsync,
        TFormOnSubmit,
        TFormOnSubmitAsync,
        TFormOnDynamic,
        TFormOnDynamicAsync,
        TFormOnServer,
        TSubmitMeta
      >) = {},
): EmberFormExtendedApi<
  TFormData,
  TFormOnMount,
  TFormOnChange,
  TFormOnChangeAsync,
  TFormOnBlur,
  TFormOnBlurAsync,
  TFormOnSubmit,
  TFormOnSubmitAsync,
  TFormOnDynamic,
  TFormOnDynamicAsync,
  TFormOnServer,
  TSubmitMeta
> {
  type Extensions = EmberFormApi<
    TFormData,
    TFormOnMount,
    TFormOnChange,
    TFormOnChangeAsync,
    TFormOnBlur,
    TFormOnBlurAsync,
    TFormOnSubmit,
    TFormOnSubmitAsync,
    TFormOnDynamic,
    TFormOnDynamicAsync,
    TFormOnServer,
    TSubmitMeta
  >

  const currentOptions = typeof options === 'function' ? options : () => options
  const hasReactiveOptions = typeof options === 'function'

  const api = new FormApi(currentOptions())

  associateDestroyableChild(parent, api)

  /**
   * Keep thunk dependencies in a Glimmer cache and apply changed options only
   * when a bound or imperative API boundary reads the cache.
   */
  const update = api.update
  let applyingOptions = false

  const applyOptions = createCache(() => {
    applyingOptions = true
    try {
      update.call(api, currentOptions())
    } finally {
      applyingOptions = false
    }
  })

  const ensureCurrentOptions = () => {
    // FormApi.update reads `state`, which is wrapped below. Avoid re-entering
    // the cache while it is already applying a new options value.
    if (!applyingOptions) getValue(applyOptions)
  }

  // A cache is lazy, so reading it only from bound components misses option
  // changes when callers use the FormApi imperatively. Refresh at the direct
  // state, reset, validation, and submit boundaries that consume form options.
  // This does not create an autorun; options are applied when those APIs are
  // next used.
  if (hasReactiveOptions) {
    const stateDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(api),
      'state',
    )
    if (stateDescriptor?.get) {
      Object.defineProperty(api, 'state', {
        configurable: true,
        enumerable: stateDescriptor.enumerable,
        get() {
          ensureCurrentOptions()
          return stateDescriptor.get!.call(api)
        },
      })
    }

    const refreshBefore = <T extends (...args: any[]) => any>(method: T): T =>
      ((...args: Parameters<T>) => {
        ensureCurrentOptions()
        return method(...args)
      }) as T

    api.reset = refreshBefore(api.reset)
    api.validateField = refreshBefore(api.validateField)
    api.validateSync = refreshBefore(api.validateSync)
    api.validateAsync = refreshBefore(api.validateAsync)
    api.validate = refreshBefore(api.validate)
    api.handleSubmit = refreshBefore(api.handleSubmit)
    api._handleSubmit = refreshBefore(api._handleSubmit)
  }

  const extensions: Extensions = extendForm(api, api, () => {
    getValue(applyOptions)

    return api
  })

  registerDestructor(api, api.mount())

  return Object.assign(api, extensions)
}
