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

The field block observes v2 `field.value`, `field.meta`, and `field.errors`.
For other reactive UI, use `useSelector` or the form-bound
`<this.form.Subscribe>` component. `form.state` is a current imperative read;
reading it alone does not establish an Ember autotracking dependency.

The creation options are initial configuration. They are not automatically
observed or reconciled. Stable callbacks can read current application state
when called. Use core field/form operations for editable values and `reset`
only when its value, metadata, and baseline reset semantics are intended.

Supply an explicit `formId` when server and browser output must share an
identifier. Otherwise form-core generates the identifier.
