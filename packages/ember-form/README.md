# @tanstack/ember-form

Ember bindings for TanStack Form v2 alpha.

`createForm` returns a form instance immediately. The supplied Ember destroyable
owns its mount and cleanup; rendering a component is not required to create the
form.

```gts
import Component from '@glimmer/component';
import {
  createForm,
  formOptions,
  useSelector,
  type EmberFormType,
} from '@tanstack/ember-form';

const passengerOptions = formOptions({
  defaultValues: {
    passenger: { name: '' },
  },
});

type PassengerForm = EmberFormType<typeof passengerOptions>;

const updateText = (
  field: { handleChange(value: string): void },
  event: Event,
) => field.handleChange((event.target as HTMLInputElement).value);

interface PassengerFieldsSignature {
  Args: { form: PassengerForm };
}

class PassengerFields extends Component<PassengerFieldsSignature> {
  <template>
    <this.args.form.Field @name="passenger.name" as |field|>
      <label>
        Name
        <input
          name="passenger.name"
          value={{field.value}}
          {{on "input" (fn updateText field)}}
          {{on "blur" field.handleBlur}}
        />
      </label>

      {{#each field.errors as |error|}}
        <p>{{error.message}}</p>
      {{/each}}
    </this.args.form.Field>
  </template>
}

export default class PassengerEditor extends Component {
  form = createForm(this, {
    ...passengerOptions,
    formId: 'passenger-editor',
    onSubmit: async ({ value }) => {
      await savePassenger(value);
    },
  });

  canSubmit = useSelector(
    this,
    this.form.atom,
    (state) => state.canSubmit,
  );

  submit = (event: SubmitEvent) => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <PassengerFields @form={{this.form}} />
      <button type="submit" disabled={{not this.canSubmit.current}}>
        Save
      </button>
    </form>
  </template>
}
```

## Typing child components

Declare reusable options with `formOptions`, then derive the exact form type
for child component arguments:

```ts
const profileOptions = formOptions({
  defaultValues: { profile: { name: '' } },
})

type ProfileForm = EmberFormType<typeof profileOptions>
```

Prefer this over `EmberFormApi<T, any>`: `EmberFormType` retains the options'
inferred field paths, values, validator errors, and component metadata. Use
`AnyEmberFormApi` only when a child intentionally works with every form shape.

Use `<form.Subscribe>` (or standalone `<Subscribe @source={{form.atom}}>`) when
template output must react to selected state. `form.state` is a current
imperative read; reading it alone does not establish an Ember autotracking
dependency.

The field block observes v2 `field.value`, `field.meta`, and `field.errors`.
For other reactive UI, use `useSelector` or the form-bound
`<this.form.Subscribe>` component.

The creation options are initial configuration. They are not automatically
observed or reconciled. Stable callbacks can read current application state
when called. Use core field/form operations for editable values and `reset`
only when its value, metadata, and baseline reset semantics are intended.

Supply an explicit `formId` when server and browser output must share an
identifier. Otherwise form-core generates the identifier.

## Non-goals

Out of scope for this alpha adapter:

- FieldGroup / `withFields`
- `createFormHook` / AppForm / `componentMap`
- a standalone FormGroup export
- an Ember DevTools adapter

## Type seams

`createForm` types `FormOptions` component and widget metadata as `unknown`
because Ember does not register AppField widgets yet.

Per-field `@defaultValue` on `Field` is not part of form-core v2
`FieldApiOptions`. Defaults belong on form-level `defaultValues` only. See
the existing `@glint-expect-error` for `@defaultValue` in
`tests/types/templates.gts`.
