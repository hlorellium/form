import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { FormGroupApi } from '@tanstack/form-core';
import { trackApi } from '../-private/track-api.ts';

import type { FormGroupSignature } from '../types.ts';
import type {
  DeepKeys,
  DeepValue,
  FormAsyncValidateOrFn,
  FormGroupAsyncValidateOrFn,
  FormGroupValidateOrFn,
  FormValidateOrFn,
} from '@tanstack/form-core';

/**
 * Yields a `FormGroupApi` for the fields under `@name`.
 *
 * A group is a part of the form with validators, listeners,
 * and a submit lifecycle of its own.
 * `group.handleSubmit()` validates and submits only the fields under `@name`,
 * and `group.state.meta` aggregates them:
 * `isValid`, `canSubmit`, `isSubmitting`, `errors`, and so on.
 *
 * The fields keep their full names.
 * Inside `<FormGroup @name="address">`, the street is `@name="address.street"`.
 *
 * `group.state` is autotracked.
 *
 * @example
 * ```gjs
 * <FormGroup
 *   @form={{tanstackForm}}
 *   @name="address"
 *   @validators={{hash onChange=validateAddress}}
 *   @onGroupSubmit={{saveAddress}}
 *   as |address|
 * >
 *   <Field @form={{tanstackForm}} @name="address.street" as |field|>
 *     <input
 *       value={{field.state.value}}
 *       {{on "input" (fn handleInput field)}}
 *     />
 *   </Field>
 *
 *   <button
 *     type="button"
 *     disabled={{unless address.state.meta.canSubmit true}}
 *     {{on "click" address.handleSubmit}}
 *   >
 *     Save address
 *   </button>
 * </FormGroup>
 * ```
 */
export default class FormGroup<
  TParentData,
  TName extends DeepKeys<TParentData>,
  TData extends DeepValue<TParentData, TName>,
  TOnMount extends undefined | FormGroupValidateOrFn<TParentData, TName, TData>,
  TOnChange extends
    | undefined
    | FormGroupValidateOrFn<TParentData, TName, TData>,
  TOnChangeAsync extends
    | undefined
    | FormGroupAsyncValidateOrFn<TParentData, TName, TData>,
  TOnBlur extends undefined | FormGroupValidateOrFn<TParentData, TName, TData>,
  TOnBlurAsync extends
    | undefined
    | FormGroupAsyncValidateOrFn<TParentData, TName, TData>,
  TOnSubmit extends
    | undefined
    | FormGroupValidateOrFn<TParentData, TName, TData>,
  TOnSubmitAsync extends
    | undefined
    | FormGroupAsyncValidateOrFn<TParentData, TName, TData>,
  TOnDynamic extends
    | undefined
    | FormGroupValidateOrFn<TParentData, TName, TData>,
  TOnDynamicAsync extends
    | undefined
    | FormGroupAsyncValidateOrFn<TParentData, TName, TData>,
  TSubmitMeta,
  TFormOnMount extends undefined | FormValidateOrFn<TParentData>,
  TFormOnChange extends undefined | FormValidateOrFn<TParentData>,
  TFormOnChangeAsync extends undefined | FormAsyncValidateOrFn<TParentData>,
  TFormOnBlur extends undefined | FormValidateOrFn<TParentData>,
  TFormOnBlurAsync extends undefined | FormAsyncValidateOrFn<TParentData>,
  TFormOnSubmit extends undefined | FormValidateOrFn<TParentData>,
  TFormOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TParentData>,
  TFormOnDynamic extends undefined | FormValidateOrFn<TParentData>,
  TFormOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TParentData>,
  TFormOnServer extends undefined | FormAsyncValidateOrFn<TParentData>,
  TParentSubmitMeta,
> extends Component<
  FormGroupSignature<
    TParentData,
    TName,
    TData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TSubmitMeta,
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
    TParentSubmitMeta
  >
> {
  /**
   * The `FormGroup` that a form yields overrides this.
   */
  get form() {
    return this.args.form;
  }

  get #options() {
    return { ...this.args, form: this.form };
  }

  #api = trackApi(this, new FormGroupApi(this.#options));

  /**
   * form-core documents `update` as free of side effects,
   * so the group can apply the current args when it is read.
   */
  @cached
  get group() {
    this.#api.update(this.#options);

    return this.#api;
  }

  <template>{{yield this.group}}</template>
}
