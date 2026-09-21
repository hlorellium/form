import type Component from '@glimmer/component'
import type { ComponentLike } from '@glint/template'
import type {
  AnyFormApi,
  DeepKeys,
  DeepKeysWhereValueIncludes,
  DeepValue,
  FieldApi,
  FieldApiOptions,
  FieldValidators,
  FormApi,
  FormErrorTypes,
  FormGroupApi,
  FormGroupOptions,
  FormGroupState,
  FormGroupValidators,
  FormState,
  ToFieldError,
  ToFormGroupErrorTypes,
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

export interface EmberFormArrayFieldComponent<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  new <
    TFieldName extends DeepKeysWhereValueIncludes<
      TFormData,
      ReadonlyArray<any>
    >,
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

type EmberFieldComponentArgs<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
  TFieldName extends DeepKeys<TFormData>,
  TFieldValidators extends FieldValidators<
    TFormData,
    TFieldName,
    DeepValue<TFormData, TFieldName>
  >,
> = FieldApiOptions<
  TFormData,
  TFieldName,
  DeepValue<TFormData, TFieldName>,
  TFieldValidators,
  never,
  TFormData,
  TFormErrorTypes
> & {
  form: EmberFormApi<TFormData, TFormErrorTypes, TFieldComponents>
}

/**
 * A standalone Ember field component that infers its field types from `@form`.
 */
export interface EmberFieldComponent {
  new <
    TFormData,
    TFormErrorTypes extends FormErrorTypes,
    TFieldComponents extends EmberFieldComponents,
    TFieldName extends DeepKeys<TFormData>,
    const TFieldValidators extends FieldValidators<
      TFormData,
      TFieldName,
      DeepValue<TFormData, TFieldName>
    >,
  >(
    owner: unknown,
    args: EmberFieldComponentArgs<
      TFormData,
      TFormErrorTypes,
      TFieldComponents,
      TFieldName,
      TFieldValidators
    >,
  ): Component<{
    Args: EmberFieldComponentArgs<
      TFormData,
      TFormErrorTypes,
      TFieldComponents,
      TFieldName,
      TFieldValidators
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

type EmberArrayFieldComponentArgs<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
  TFieldName extends DeepKeysWhereValueIncludes<
    TFormData,
    ReadonlyArray<any>
  >,
  TFieldValidators extends FieldValidators<
    TFormData,
    TFieldName,
    DeepValue<TFormData, TFieldName>
  >,
> = FieldApiOptions<
  TFormData,
  TFieldName,
  DeepValue<TFormData, TFieldName>,
  TFieldValidators,
  never,
  TFormData,
  TFormErrorTypes
> & {
  form: EmberFormApi<TFormData, TFormErrorTypes, TFieldComponents>
}

/**
 * A standalone Ember array field component that infers its field types from
 * `@form`.
 */
export interface EmberArrayFieldComponent {
  new <
    TFormData,
    TFormErrorTypes extends FormErrorTypes,
    TFieldComponents extends EmberFieldComponents,
    TFieldName extends DeepKeysWhereValueIncludes<
      TFormData,
      ReadonlyArray<any>
    >,
    const TFieldValidators extends FieldValidators<
      TFormData,
      TFieldName,
      DeepValue<TFormData, TFieldName>
    >,
  >(
    owner: unknown,
    args: EmberArrayFieldComponentArgs<
      TFormData,
      TFormErrorTypes,
      TFieldComponents,
      TFieldName,
      TFieldValidators
    >,
  ): Component<{
    Args: EmberArrayFieldComponentArgs<
      TFormData,
      TFormErrorTypes,
      TFieldComponents,
      TFieldName,
      TFieldValidators
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

export interface EmberFormGroupFieldComponent<
  TFormData,
  TGroupValue,
  TGroupErrorTypes extends FormErrorTypes,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  new <
    TFieldName extends DeepKeys<TGroupValue>,
    const TFieldValidators extends FieldValidators<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>
    >,
  >(
    owner: unknown,
    args: FieldApiOptions<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>,
      TFieldValidators,
      TGroupErrorTypes['fieldError'],
      TFormData,
      TFormErrorTypes
    >,
  ): Component<{
    Args: FieldApiOptions<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>,
      TFieldValidators,
      TGroupErrorTypes['fieldError'],
      TFormData,
      TFormErrorTypes
    >
    Blocks: {
      default: [
        field: EmberFieldApi<
          TFieldName,
          DeepValue<TGroupValue, TFieldName>,
          ToFieldError<
            NoInfer<TFieldValidators>,
            TGroupErrorTypes['fieldError'],
            TFormErrorTypes
          >,
          TFormData,
          TFormErrorTypes,
          TFieldComponents
        >,
      ]
    }
  }>
}

export interface EmberFormGroupArrayFieldComponent<
  TFormData,
  TGroupValue,
  TGroupErrorTypes extends FormErrorTypes,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  new <
    TFieldName extends DeepKeysWhereValueIncludes<
      TGroupValue,
      ReadonlyArray<any>
    >,
    const TFieldValidators extends FieldValidators<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>
    >,
  >(
    owner: unknown,
    args: FieldApiOptions<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>,
      TFieldValidators,
      TGroupErrorTypes['fieldError'],
      TFormData,
      TFormErrorTypes
    >,
  ): Component<{
    Args: FieldApiOptions<
      TGroupValue,
      TFieldName,
      DeepValue<TGroupValue, TFieldName>,
      TFieldValidators,
      TGroupErrorTypes['fieldError'],
      TFormData,
      TFormErrorTypes
    >
    Blocks: {
      default: [
        field: EmberFieldApi<
          TFieldName,
          DeepValue<TGroupValue, TFieldName>,
          ToFieldError<
            NoInfer<TFieldValidators>,
            TGroupErrorTypes['fieldError'],
            TFormErrorTypes
          >,
          TFormData,
          TFormErrorTypes,
          TFieldComponents
        >,
      ]
    }
  }>
}

export interface EmberFormGroupSubscribeComponent<
  TGroupValue,
  TGroupErrorTypes extends FormErrorTypes,
> {
  new <const TSelected>(
    owner: unknown,
    args: {
      selector: (
        value: FormGroupState<TGroupValue, TGroupErrorTypes>
      ) => TSelected
      when?: (selected: NoInfer<TSelected>) => boolean
    },
  ): Component<{
    Args: {
      selector: (
        value: FormGroupState<TGroupValue, TGroupErrorTypes>
      ) => TSelected
      when?: (selected: NoInfer<TSelected>) => boolean
    }
    Blocks: { default: [selected: TSelected] }
  }>
}

export interface EmberFormGroupApi<
  TFormData,
  TGroupName,
  TGroupValue,
  TGroupErrorTypes extends FormErrorTypes,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> extends FormGroupApi<
    TFormData,
    TGroupName,
    TGroupValue,
    TGroupErrorTypes,
    TFormErrorTypes
  > {
  Field: EmberFormGroupFieldComponent<
    TFormData,
    TGroupValue,
    TGroupErrorTypes,
    TFormErrorTypes,
    TFieldComponents
  >
  ArrayField: EmberFormGroupArrayFieldComponent<
    TFormData,
    TGroupValue,
    TGroupErrorTypes,
    TFormErrorTypes,
    TFieldComponents
  >
  Subscribe: EmberFormGroupSubscribeComponent<TGroupValue, TGroupErrorTypes>
}

export interface EmberFormGroupComponent<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  new <
    TGroupName extends DeepKeys<TFormData>,
    TGroupValue extends DeepValue<TFormData, TGroupName>,
    const TGroupValidators extends FormGroupValidators<TGroupValue>,
  >(
    owner: unknown,
    args: Omit<
      FormGroupOptions<
        TFormData,
        TGroupName,
        TGroupValue,
        TGroupValidators,
        TFormErrorTypes
      >,
      'form'
    >,
  ): Component<{
    Args: Omit<
      FormGroupOptions<
        TFormData,
        TGroupName,
        TGroupValue,
        TGroupValidators,
        TFormErrorTypes
      >,
      'form'
    >
    Blocks: {
      default: [
        group: EmberFormGroupApi<
          TFormData,
          TGroupName,
          TGroupValue,
          ToFormGroupErrorTypes<NoInfer<TGroupValidators>>,
          TFormErrorTypes,
          TFieldComponents
        >,
      ]
    }
  }>
}

export interface EmberTanStackFormComponents<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TFieldComponents extends EmberFieldComponents,
> {
  Field: EmberFormFieldComponent<TFormData, TFormErrorTypes, TFieldComponents>
  ArrayField: EmberFormArrayFieldComponent<
    TFormData,
    TFormErrorTypes,
    TFieldComponents
  >
  Subscribe: EmberFormSubscribeComponent<TFormData, TFormErrorTypes>
  FormGroup: EmberFormGroupComponent<
    TFormData,
    TFormErrorTypes,
    TFieldComponents
  >
}

export type EmberFormApi<
  TFormData,
  TFormErrorTypes extends FormErrorTypes,
  TComponents extends EmberFieldComponents = Record<never, never>,
> = FormApi<TFormData, TFormErrorTypes> &
  EmberTanStackFormComponents<TFormData, TFormErrorTypes, TComponents>

/**
 * An Ember form API whose form data, error, and field-component types are
 * erased.
 *
 * Use it for reusable components that only need operations common to every
 * form. Field paths and values are not checked against a particular form
 * shape; use `EmberFormType` when a component belongs to one known form.
 *
 * @example
 * ```gts
 * interface ResetButtonSignature {
 *   Args: { form: AnyEmberFormApi };
 * }
 *
 * class ResetButton extends Component<ResetButtonSignature> {
 *   <template>
 *     <button type="button" {{on "click" this.args.form.reset}}>Reset</button>
 *   </template>
 * }
 * ```
 */
export type AnyEmberFormApi = AnyFormApi &
  EmberTanStackFormComponents<any, any, any>
