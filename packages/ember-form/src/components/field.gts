import Component from '@glimmer/component';
import { registerDestructor } from '@ember/destroyable';
import { AtomSelection } from '../-private/select-atom.ts';

import type Owner from '@ember/owner';
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
        any,
        { value: unknown; meta: unknown }
      >
    | undefined;
  #field: AnyInternalFieldApi | undefined;
  #unregister: (() => void) | undefined;

  constructor(owner: Owner, args: InternalFieldSignature['Args']) {
    super(owner, args);
    registerDestructor(this, () => this.#releaseField());
  }

  get form(): AnyInternalFormApi {
    throw new Error('Field must be bound to an Ember form instance');
  }

  /**
   * Reading the binding is the Ember observation point for tracked arguments.
   * Core registration may synchronously update atoms here; AtomSelection keeps
   * its value current but queues the Glimmer invalidation to avoid backtracking.
   */
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
      this.#releaseField();
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
          selectFieldSnapshot,
        );
      } else {
        this.#fieldSelection.update(this.#field.atom, selectFieldSnapshot);
      }
    } else {
      this.#field!._update(options, 'field');
    }

    this.#form = form;
    this.#name = name;
    this.#resetVersion = resetVersion;
    void this.#fieldSelection?.current;

    return this.#field!;
  }

  #releaseField(): void {
    const unregister = this.#unregister;
    this.#unregister = undefined;
    unregister?.();
  }

  <template>{{yield this.field}}</template>
}

function selectFieldSnapshot(snapshot: unknown): {
  value: unknown;
  meta: unknown;
} {
  const state = snapshot as { value: unknown; meta: unknown };
  return { value: state.value, meta: state.meta };
}
