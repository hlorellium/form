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

/**
 * Create one form owned by an Ember destroyable. Pass an options function to
 * reconcile tracked configuration changes on that same instance. Updates are
 * asynchronous and follow Ember's run loop; plain options configure it once.
 */
export function createForm<
  TFormData,
  const TFormValidators extends FormValidators<TFormData>,
  TSubmitReturn,
>(
  parent: object,
  options:
    | FormOptions<TFormData, TFormValidators, TSubmitReturn, unknown>
    | (() => FormOptions<TFormData, TFormValidators, TSubmitReturn, unknown>),
): EmberFormApi<TFormData, ToFormErrorTypes<TFormValidators, TSubmitReturn>> {
  return createInternalForm(parent, options, initializeForm) as never
}
