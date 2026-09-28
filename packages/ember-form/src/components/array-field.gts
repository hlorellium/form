import Component from '@glimmer/component';
import { cached } from '@glimmer/tracking';
import { FieldApi } from '@tanstack/form-core';
import { arrayVersions, trackApi } from '../-private/track-api.ts';

import type { ArrayFieldSignature } from '../types.ts';
import type {
  DeepKeysOfType,
  DeepValue,
  FieldAsyncValidateOrFn,
  FieldValidateOrFn,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from '@tanstack/form-core';

/**
 * Yields a `FieldApi` for the array at `@name`.
 *
 * The same as `<Field @mode="array">`, and `@name` must name an array.
 *
 * `field.state.value` follows the shape of the array and not its items:
 * `pushValue`, `insertValue`, `removeValue`, `swapValues`, `moveValue`,
 * and `clearValues` invalidate it, and an edit to one item does not.
 * Iterate over it with `{{#each}}`, and read and write each item
 * through a `<Field>` of its own.
 *
 * @example
 * ```gjs
 * const nameAt = (index) => `people[${index}].name`;
 *
 * <ArrayField @form={{tanstackForm}} @name="people" as |people|>
 *   {{#each people.state.value as |_ index|}}
 *     <Field @form={{tanstackForm}} @name={{nameAt index}} as |field|>
 *       <input
 *         value={{field.state.value}}
 *         {{on "input" (fn handleInput field)}}
 *       />
 *     </Field>
 *   {{/each}}
 *
 *   <button type="button" {{on "click" (fn people.pushValue (hash name=""))}}>
 *     Add
 *   </button>
 * </ArrayField>
 * ```
 */
export default class ArrayField<
  TParentData,
  TName extends DeepKeysOfType<TParentData, any[]>,
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
  ArrayFieldSignature<
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
   * The `ArrayField` that a form yields overrides this.
   */
  get form() {
    return this.args.form;
  }

  get #options() {
    return { ...this.args, form: this.form };
  }

  #api = trackApi(this, new FieldApi(this.#options), arrayVersions);

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
