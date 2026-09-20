import type Component from '@glimmer/component'
import type { ComponentLike } from '@glint/template'
import type {
  AnyFormApi,
  DeepKeys,
  DeepValue,
  FieldApi,
  FieldApiOptions,
  FieldValidators,
  FormApi,
  FormErrorTypes,
  FormState,
  ToFieldError,
} from '@tanstack/form-core'
import type { SelectorSource } from './-private/select-atom.ts'

export type EmberFieldComponents = Record<string, ComponentLike<any>>

export type EmberFieldApi<
  TFieldName,
  TFieldValue,
  TFieldError,
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> = FieldApi<TFieldName, TFieldValue, TFieldError, TFormData, TFormErrorTypes> &
  TFieldComponents

export interface EmberFormFieldComponent<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  new <
    TFieldName extends DeepKeys<TFormData>,
    const TFieldValidators extends FieldValidators<
      TFormData,
      TFieldName,
      DeepValue<TFormData, TFieldName>
    >,
  >(
    owner: unknown,
    args: FieldApiOptions<
      TFormData,
      TFieldName,
      DeepValue<TFormData, TFieldName>,
      TFieldValidators,
      never,
      TFormData,
      TFormErrorTypes
    >,
  ): Component<{
    Args: FieldApiOptions<
      TFormData,
      TFieldName,
      DeepValue<TFormData, TFieldName>,
      TFieldValidators,
      never,
      TFormData,
      TFormErrorTypes
    >
    Blocks: {
      default: [
        field: EmberFieldApi<
          TFieldName,
          DeepValue<TFormData, TFieldName>,
          ToFieldError<NoInfer<TFieldValidators>, never, TFormErrorTypes>,
          TFormData,
          TFormErrorTypes,
          TFieldComponents
        >,
      ]
    }
  }>
}

export interface EmberFormSubscribeComponent<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
> {
  new <const TSelected>(
    owner: unknown,
    args: {
      selector: (value: FormState<TFormData, TFormErrorTypes>) => TSelected
      when?: (selected: NoInfer<TSelected>) => boolean
    },
  ): Component<{
    Args: {
      selector: (value: FormState<TFormData, TFormErrorTypes>) => TSelected
      when?: (selected: NoInfer<TSelected>) => boolean
    }
    Blocks: { default: [selected: TSelected] }
  }>
}

export interface EmberSubscribeSignature<TSource, TSelected> {
  Args: {
    source: SelectorSource<TSource>
    selector: (value: TSource) => TSelected
    when?: (selected: NoInfer<TSelected>) => boolean
  }
  Blocks: { default: [selected: TSelected] }
}

export interface EmberSubscribeComponent {
  new <TSource, const TSelected>(
    owner: unknown,
    args: EmberSubscribeSignature<TSource, TSelected>['Args'],
  ): Component<EmberSubscribeSignature<TSource, TSelected>>
}

export interface EmberTanStackFormComponents<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  Field: EmberFormFieldComponent<TFormData, TFormErrorTypes, TFieldComponents>
  Subscribe: EmberFormSubscribeComponent<TFormData, TFormErrorTypes>
}

export type EmberFormApi<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TComponents extends EmberFieldComponents = Record<never, never>,
> = FormApi<TFormData, TFormErrorTypes> &
  EmberTanStackFormComponents<TFormData, TFormErrorTypes, TComponents>

export type AnyEmberFormApi = AnyFormApi &
  EmberTanStackFormComponents<any, any, any>
