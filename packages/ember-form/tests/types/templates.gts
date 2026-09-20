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
      tags: [{ label: '' }],
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
  selectGroupName = (state: {
    values: { name: string };
  }): string => state.values.name;

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

    <this.args.form.ArrayField @name="profile.tags" as |field|>
      {{field.value.length}}
      {{field.pushValue (hash label="new")}}
      {{! @glint-expect-error array element type rejects strings }}
      {{field.pushValue "new"}}
    </this.args.form.ArrayField>

    {{! @glint-expect-error ArrayField only accepts array values }}
    <this.args.form.ArrayField @name="profile.name" as |field|>
      {{field.name}}
    </this.args.form.ArrayField>

    <this.args.form.FormGroup @name="profile" as |group|>
      {{group.state.values.name}}

      <group.Field @name="name" as |field|>
        {{field.value}}
        {{! @glint-expect-error grouped string field rejects numbers }}
        {{field.handleChange 1}}
      </group.Field>

      <group.ArrayField @name="tags" as |field|>
        {{field.value.length}}
        {{field.pushValue (hash label="grouped")}}
      </group.ArrayField>

      <group.Subscribe
        @selector={{this.selectGroupName}}
        as |selectedName|
      >
        {{selectedName}}
      </group.Subscribe>

      {{! @glint-expect-error group field paths are relative }}
      <group.Field @name="profile.name" as |field|>
        {{field.name}}
      </group.Field>

      {{! @glint-expect-error grouped ArrayField only accepts array values }}
      <group.ArrayField @name="name" as |field|>
        {{field.name}}
      </group.ArrayField>
    </this.args.form.FormGroup>

    <this.args.form.FormGroup @name="profile.tags[0]" as |nestedGroup|>
      <nestedGroup.Field @name="label" as |field|>
        {{field.value}}
      </nestedGroup.Field>
    </this.args.form.FormGroup>

    {{! @glint-expect-error unknown group path }}
    <this.args.form.FormGroup @name="missing" />
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
