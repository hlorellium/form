import ArrayFieldComponent from './components/array-field.gts'
import FieldComponent from './components/field.gts'
import SubscribeComponent from './components/subscribe.gts'
import type {
  EmberArrayFieldComponent,
  EmberFieldComponent,
  EmberSubscribeComponent,
} from './form-api-types.ts'

export * from '@tanstack/form-core'

export { createForm } from './create-form.ts'
export { useSelector } from './-private/select-atom.ts'

export const Field = FieldComponent as unknown as EmberFieldComponent
export const ArrayField =
  ArrayFieldComponent as unknown as EmberArrayFieldComponent
export const Subscribe =
  SubscribeComponent as unknown as EmberSubscribeComponent

export type {
  AnyEmberFormApi,
  EmberArrayFieldComponent,
  EmberFieldApi,
  EmberFieldComponent,
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
export type {
  Selection,
  SelectorSource,
  SelectorSourceGetter,
  SelectorSourceInput,
} from './-private/select-atom.ts'
export type { EmberFormType } from './form-type.ts'
