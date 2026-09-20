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
