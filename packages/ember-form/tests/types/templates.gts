import Component from '@glimmer/component';
import {
  createForm,
  formOptions,
  type EmberFormType,
} from '@tanstack/ember-form';

const profileOptions = formOptions({
  defaultValues: {
    profile: {
      name: '',
      age: 0,
    },
  },
});

type ProfileForm = EmberFormType<typeof profileOptions>;

interface ProfileFieldsSignature {
  Args: {
    form: ProfileForm;
  };
}

class ProfileFields extends Component<ProfileFieldsSignature> {
  <template>
    <this.args.form.Field @name="profile.name" as |field|>
      {{field.value}}
      {{! @glint-expect-error string field rejects numbers }}
      {{field.handleChange 1}}
    </this.args.form.Field>

    {{! @glint-expect-error unknown field path }}
    <this.args.form.Field @name="profile.missing" as |field|>
      {{field.name}}
    </this.args.form.Field>
  </template>
}

class Example extends Component {
  form = createForm(this, profileOptions);

  selectCanSubmit = (state: this['form']['state']): boolean => state.canSubmit;

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <ProfileFields @form={{this.form}} />
      <this.form.Subscribe @selector={{this.selectCanSubmit}} as |canSubmit|>
        <button type="submit" disabled={{not canSubmit}}>Save</button>
      </this.form.Subscribe>
    </form>
  </template>
}

void Example;
