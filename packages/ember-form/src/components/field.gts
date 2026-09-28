import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { FieldApi } from '@tanstack/form-core';
import { arrayVersions, trackApi } from '../-private/track-api.ts';

import type { FieldSignature } from '../types.ts';
import type {
  DeepKeys,
  DeepValue,
  FieldAsyncValidateOrFn,
  FieldValidateOrFn,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from '@tanstack/form-core';

/**
 * Yields a `FieldApi` for `@name`.
 *
 * `field.state` is autotracked.
 *
 * With `@mode="array"`, `field.state.value` follows the shape of the array
 * and not its items, so an edit to one item keeps the DOM of the others.
 * `<ArrayField>` sets this mode for you.
 *
 * @example
 * ```gjs
 * <Field @form={{tanstackForm}} @name="firstName" as |field|>
 *   <input
 *     value={{field.state.value}}
 *     {{on "input" (fn handleInput field)}}
 *   />
 * </Field>
 * ```
 */
export default class Field<
  TParentData,
  TName extends DeepKeys<TParentData>,
  TData extends DeepValue<TParentData, TName>,
  TOnMount extends undefined | FieldValidateOrFn<TParentData, TName, TData>,
  TOnChange extends undefined | FieldValidateOrFn<TParentData, TName, TData>,
  TOnChangeAsync extends
    | undefined
    | FieldAsyncValidateOrFn<TParentData, TName, TData>,
  TOnBlur extends undefined | FieldValidateOrFn<TParentData, TName, TData>,
  TOnBlurAsync extends
    | undefined
    | FieldAsyncValidateOrFn<TParentData, TName, TData>,
  TOnSubmit extends undefined | FieldValidateOrFn<TParentData, TName, TData>,
  TOnSubmitAsync extends
    | undefined
    | FieldAsyncValidateOrFn<TParentData, TName, TData>,
  TOnDynamic extends undefined | FieldValidateOrFn<TParentData, TName, TData>,
  TOnDynamicAsync extends
    | undefined
    | FieldAsyncValidateOrFn<TParentData, TName, TData>,
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
  FieldSignature<
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
   * The `Field` that a form yields overrides this.
   */
  get form() {
    return this.args.form;
  }

  get #options() {
    return { ...this.args, form: this.form };
  }

  #api = trackApi(
    this,
    new FieldApi(this.#options),
    this.args.mode === 'array' ? arrayVersions : undefined,
  );

  /**
   * form-core documents `update` as free of side effects,
   * so the field can apply the current args when it is read.
   */
  @cached
  get field() {
    this.#api.update(this.#options);

    return this.#api;
  }

  <template>{{yield this.field}}</template>
}
