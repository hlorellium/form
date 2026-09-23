import Component from '@glimmer/component';

import type Owner from '@ember/owner';
import type { FieldApiOptions } from '@tanstack/form-core';
import type { AnyInternalFormApi } from '@tanstack/form-core/internals';

interface InternalFieldSignature {
  Args: FieldApiOptions<any, any, any, any, any, any, any> & {
    form?: AnyInternalFormApi;
  };
  Blocks: { default: [field: any] };
}

export default class Field extends Component<InternalFieldSignature> {
  #field: any;

  constructor(owner: Owner, args: InternalFieldSignature['Args']) {
    super(owner, args);
  }

  get form(): AnyInternalFormApi {
    if (this.args.form !== undefined) return this.args.form;
    throw new Error('Field must be bound to an Ember form instance');
  }

  protected get arrayBinding(): boolean {
    return false;
  }

  protected get fieldOptions(): InternalFieldSignature['Args'] {
    return this.args;
  }

  get field(): any {
    if (this.#field === undefined) {
      const factory = () => this.fieldOptions as Record<string, unknown>;
      this.#field = this.arrayBinding
        ? (this.form as any).arrayField(factory)
        : (this.form as any).field(factory);
    }
    return this.#field;
  }

  <template>{{yield this.field}}</template>
}
