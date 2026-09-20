import Component from '@glimmer/component';
import { registerDestructor } from '@ember/destroyable';
import { AtomSelection } from '../-private/select-atom.ts';

import type { FieldApiOptions } from '@tanstack/form-core';
import type {
  AnyInternalFieldApi,
  AnyInternalFormApi,
} from '@tanstack/form-core/internals';

interface InternalFieldSignature {
  Args: FieldApiOptions<any, any, any, any, any, any, any>;
  Blocks: { default: [field: AnyInternalFieldApi] };
}

export default class Field extends Component<InternalFieldSignature> {
  #form: AnyInternalFormApi | undefined;
  #name: unknown;
  #resetVersion: number | undefined;
  #resetSelection: AtomSelection<number, number> | undefined;
  #fieldSelection:
    | AtomSelection<
        unknown,
        { value: unknown; meta: unknown }
      >
    | undefined;
  #field: AnyInternalFieldApi | undefined;
  #unregister: (() => void) | undefined;

  constructor(owner: unknown, args: InternalFieldSignature['Args']) {
    super(owner, args);
    registerDestructor(this, () => this.#unregister?.());
  }

  get form(): AnyInternalFormApi {
    throw new Error('Field must be bound to an Ember form instance');
  }

  get field(): AnyInternalFieldApi {
    const form = this.form;

    if (this.#resetSelection === undefined) {
      this.#resetSelection = new AtomSelection(
        this,
        form._atoms.resetVersion,
        (version) => version,
      );
    } else if (form !== this.#form) {
      this.#resetSelection.update(
        form._atoms.resetVersion,
        (version) => version,
      );
    }

    const resetVersion = this.#resetSelection.current;
    const { name, ...options } = this.args;
    const shouldResolve =
      this.#field === undefined ||
      this.#field._isKilled ||
      form !== this.#form ||
      name !== this.#name ||
      resetVersion !== this.#resetVersion;

    if (shouldResolve) {
      this.#unregister?.();
      this.#field = form._getOrCreateFieldApi(
        { ...options, name },
        'field',
      );
      this.#field._update(options, 'field');
      this.#unregister = this.#field._register();

      if (this.#fieldSelection === undefined) {
        this.#fieldSelection = new AtomSelection(
          this,
          this.#field.atom,
          selectFieldState,
        );
      } else {
        this.#fieldSelection.update(this.#field.atom, selectFieldState);
      }
    } else {
      this.#field._update(options, 'field');
    }

    this.#form = form;
    this.#name = name;
    this.#resetVersion = resetVersion;
    void this.#fieldSelection?.current;

    return this.#field;
  }

  <template>{{yield this.field}}</template>
}

function selectFieldState(field: unknown): {
  value: unknown;
  meta: unknown;
} {
  const state = field as { value: unknown; meta: unknown };
  return { value: state.value, meta: state.meta };
}
