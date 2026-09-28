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
 * A function may read tracked state, for example `this.args`.
 * The form applies the current options each time one of its components
 * renders, or `useSelector(...).current` is read.
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

  const api = new FormApi(currentOptions())

  associateDestroyableChild(parent, api)

  /**
   * form-core documents `update` as free of side effects,
   * so the form can apply the current options when it is read.
   *
   * The cache runs again only when tracked state that `options` read changes.
   */
  const applyOptions = createCache(() => {
    api.update(currentOptions())
  })

  const extensions: Extensions = extendForm(api, api, () => {
    getValue(applyOptions)

    return api
  })

  registerDestructor(api, api.mount())

  return Object.assign(api, extensions)
}
