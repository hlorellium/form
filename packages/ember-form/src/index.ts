import SubscribeComponent from './components/subscribe.gts'
import type { EmberSubscribeComponent } from './form-api-types.ts'

export * from '@tanstack/form-core'

export { createForm } from './create-form.ts'
export { useSelector } from './-private/select-atom.ts'

export const Subscribe =
  SubscribeComponent as unknown as EmberSubscribeComponent

export type {
  AnyEmberFormApi,
  EmberFieldApi,
  EmberFieldComponents,
  EmberFormApi,
  EmberFormArrayFieldComponent,
  EmberFormFieldComponent,
  EmberFormGroupApi,
  EmberFormGroupArrayFieldComponent,
  EmberFormGroupComponent,
  EmberFormGroupFieldComponent,
  EmberFormGroupSubscribeComponent,
  EmberSubscribeSignature,
} from './form-api-types.ts'
export type { Selection, SelectorSource } from './-private/select-atom.ts'
export type { EmberFormType } from './form-type.ts'
