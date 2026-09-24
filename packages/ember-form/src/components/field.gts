import Component from '@glimmer/component';

import type Owner from '@ember/owner';
import type { FieldApiOptions } from '@tanstack/form-core';
import type {
  AnyFieldApiOptions,
  AnyInternalFormApi,
} from '@tanstack/form-core/internals';

interface InternalFieldSignature {
  Args: FieldApiOptions<any, any, any, any, any, any, any> & {
    form?: AnyInternalFormApi;
  };
  Blocks: { default: [field: any] };
}

/** Form handle surface Field uses to create reactive lenses. */
export type EmberFormWithFieldLenses = AnyInternalFormApi & {
  field(options: () => AnyFieldApiOptions): unknown;
  arrayField(options: () => AnyFieldApiOptions): unknown;
};

export default class Field extends Component<InternalFieldSignature> {
  #field: any;

  constructor(owner: Owner, args: InternalFieldSignature['Args']) {
    super(owner, args);
  }

  get form(): EmberFormWithFieldLenses {
    if (this.args.form !== undefined) {
      return this.args.form as EmberFormWithFieldLenses;
    }
    throw new Error('Field must be bound to an Ember form instance');
  }

  protected get arrayBinding(): boolean {
    return false;
  }

  /** Field options for form-core; omit the Ember `@form` arg. */
  protected get fieldOptions(): AnyFieldApiOptions {
    const { form: _form, ...options } = this.args;
    return options;
  }

  get field(): any {
    if (this.#field === undefined) {
      const factory = () => this.fieldOptions;
      this.#field = this.arrayBinding
        ? this.form.arrayField(factory)
        : this.form.field(factory);
    }
    return this.#field;
  }

  <template>{{yield this.field}}</template>
}
