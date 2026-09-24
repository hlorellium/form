import type {
  AnyFormOptions,
  FormOptions,
  FormValidators,
  ToFormErrorTypes,
} from '@tanstack/form-core'
import type { EmberFieldComponents, EmberFormApi } from './form-api-types.ts'

type EmberFormTypeErrorTypes<
  TFormValidators extends FormValidators<any>,
  TSubmitReturn,
> = unknown extends TSubmitReturn
  ? any
  : ToFormErrorTypes<TFormValidators, TSubmitReturn>

/**
 * Derives the Ember form API represented by a reusable options object.
 *
 * Use it to type arguments for child components that belong to one known form
 * shape. It preserves inferred field paths, values, errors, and component
 * metadata. Options such as `onSubmit` can be supplied either in the reusable
 * options or when the form is created.
 *
 * @example
 * ```ts
 * const profileOptions = formOptions({
 *   defaultValues: { name: '' },
 * })
 *
 * type ProfileForm = EmberFormType<typeof profileOptions>
 * ```
 *
 * @typeParam TOptions - The reusable form options from which the API derives
 * its form data, error, and registered-component types.
 */
export type EmberFormType<TOptions extends AnyFormOptions> =
  TOptions extends FormOptions<
    infer TFormData,
    infer TFormValidators,
    infer TSubmitReturn,
    infer TComponents
  >
    ? EmberFormApi<
        TFormData,
        EmberFormTypeErrorTypes<TFormValidators, TSubmitReturn>,
        TComponents extends EmberFieldComponents
          ? TComponents
          : Record<never, never>
      >
    : never
