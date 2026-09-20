import SubscribeComponent from './components/subscribe.gts'
import type { EmberSubscribeComponent } from './form-api-types.ts'

export { createForm } from './create-form.ts'
export { useSelector } from './-private/select-atom.ts'

export const Subscribe =
  SubscribeComponent as unknown as EmberSubscribeComponent

export type {
  AnyEmberFormApi,
  EmberFieldApi,
  EmberFieldComponents,
  EmberFormApi,
  EmberSubscribeSignature,
} from './form-api-types.ts'
export type {
  Selection,
  SelectorSource,
} from './-private/select-atom.ts'
export type { EmberFormType } from './form-type.ts'
export type {
  FormErrorTypes,
  FormState,
  ValidationIssue,
} from '@tanstack/form-core'
