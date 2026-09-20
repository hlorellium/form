import Component from '@glimmer/component';
import { registerDestructor } from '@ember/destroyable';
import { InternalFormGroupApi } from '@tanstack/form-core/internals';
import { AtomSelection } from '../-private/select-atom.ts';
import ArrayField from './array-field.gts';
import Field from './field.gts';
import Subscribe from './subscribe.gts';

import type Owner from '@ember/owner';
import type { FieldApiOptions, FormGroupOptions } from '@tanstack/form-core';
import type {
  AnyInternalFormApi,
  InternalFormGroupApi as InternalFormGroupApiType,
} from '@tanstack/form-core/internals';

type AnyFormGroup = InternalFormGroupApiType<any, any, any, any, any>;

type FormGroupWithComponents = AnyFormGroup & {
  Field: typeof Field;
  ArrayField: typeof ArrayField;
  Subscribe: typeof Subscribe;
};

interface InternalFormGroupSignature {
  Args: Omit<FormGroupOptions<any, any, any, any, any>, 'form'>;
  Blocks: { default: [group: FormGroupWithComponents] };
}

export default class FormGroup extends Component<InternalFormGroupSignature> {
  readonly #group: FormGroupWithComponents;
  readonly #selection: AtomSelection<any, unknown>;

  constructor(owner: Owner, args: InternalFormGroupSignature['Args']) {
    super(owner, args);

    const group = new InternalFormGroupApi({
      ...args,
      form: this.form,
    } as never);

    this.#group = attachEmberFormGroupComponents(group, this.form);
    this.#group.mount();
    this.#selection = new AtomSelection(
      this,
      this.#group.atom,
      selectGroupState,
    );

    registerDestructor(this, () => this.#group._cleanup());
  }

  get form(): AnyInternalFormApi {
    throw new Error('FormGroup must be bound to an Ember form instance');
  }

  get group(): FormGroupWithComponents {
    this.#group.update({ ...this.args, form: this.form } as never);
    void this.#selection.current;
    return this.#group;
  }

  <template>{{yield this.group}}</template>
}

function attachEmberFormGroupComponents(
  group: AnyFormGroup,
  form: AnyInternalFormApi,
): FormGroupWithComponents {
  const result = group as FormGroupWithComponents;

  result.Field = class GroupField extends Field {
    override get form(): AnyInternalFormApi {
      return form;
    }

    protected override get fieldOptions(): FieldApiOptions<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    > {
      return group._getFormFieldOptions(
        { ...this.args },
        mergeFieldOptions,
      ) as never;
    }
  };

  result.ArrayField = class GroupArrayField extends ArrayField {
    override get form(): AnyInternalFormApi {
      return form;
    }

    protected override get fieldOptions(): FieldApiOptions<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    > {
      return group._getFormFieldOptions(
        { ...this.args },
        mergeFieldOptions,
      ) as never;
    }
  };

  result.Subscribe = class GroupSubscribe extends Subscribe {
    override get source() {
      return group.atom;
    }
  };

  return result;
}

function mergeFieldOptions<TOptions>(
  base: TOptions,
  overrides: Partial<TOptions>,
): TOptions {
  return { ...base, ...overrides };
}

function selectGroupState(state: unknown): unknown {
  return state;
}
