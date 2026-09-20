import {
  createInternalForm,
  initializeForm,
} from './-private/initialize-form.ts'

import type {
  FormOptions,
  FormValidators,
  ToFormErrorTypes,
} from '@tanstack/form-core'
import type { EmberFormApi } from './form-api-types.ts'

export function createForm<
  TFormData,
  const TFormValidators extends FormValidators<TFormData>,
  TSubmitReturn,
>(
  parent: object,
  options: FormOptions<TFormData, TFormValidators, TSubmitReturn, unknown>,
): EmberFormApi<
  TFormData,
  ToFormErrorTypes<TFormValidators, TSubmitReturn>
> {
  return createInternalForm(parent, options, initializeForm) as never
}
