import Component from '@glimmer/component';
import {
  ArrayField,
  createForm,
  Field,
  formOptions,
  Subscribe,
  type EmberFormType,
  type FieldValidators,
} from '@tanstack/ember-form';

interface ProfileData {
  profile: {
    name: string;
    age: number;
    tags: Array<{ label: string }>;
  };
}

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
  ageValidators: FieldValidators<ProfileData, 'profile.age', number> = [
    {
      triggers: [],
      run: ({ value }) => (value < 0 ? 'Age must be positive' : undefined),
    },
  ];

  nameValidators: FieldValidators<ProfileData, 'profile.name', string> = [
    {
      triggers: [],
      run: ({ value }) => (value === '' ? 'Name is required' : undefined),
    },
  ];

  selectGroupName = (state: {
    values: { name: string };
  }): string => state.values.name;

  expectString = (_value: string): void => {};
  expectNumber = (_value: number): void => {};

  <template>
    <this.args.form.Field @name="profile.name" as |field|>
      {{field.value}}
      {{! @glint-expect-error string field rejects numbers }}
      {{field.handleChange 1}}
    </this.args.form.Field>

    <this.args.form.Field
      @name="profile.age"
      @validators={{this.ageValidators}}
    />

    {{! @glint-expect-error string validator is incompatible with number field }}
    <this.args.form.Field @name="profile.age" @validators={{this.nameValidators}} />

    {{! @glint-expect-error v2 fields do not accept per-field defaultValue }}
    <this.args.form.Field @name="profile.age" @defaultValue={{18}} />

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
        {{this.expectString selectedName}}
        {{! @glint-expect-error group selector returns string }}
        {{this.expectNumber selectedName}}
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

  ageValidators: FieldValidators<ProfileData, 'profile.age', number> = [
    {
      triggers: [],
      run: ({ value }) => (value < 0 ? 'Age must be positive' : undefined),
    },
  ];

  nameValidators: FieldValidators<ProfileData, 'profile.name', string> = [
    {
      triggers: [],
      run: ({ value }) => (value === '' ? 'Name is required' : undefined),
    },
  ];

  selectCanSubmit = (state: this['form']['state']): boolean => state.canSubmit;
  selectAge = (state: this['form']['state']): number =>
    state.values.profile.age;

  expectBoolean = (_value: boolean): void => {};
  expectNumber = (_value: number): void => {};
  expectString = (_value: string): void => {};

  submit = (event: SubmitEvent): void => {
    event.preventDefault();
    void this.form.handleSubmit();
  };

  <template>
    <form {{on "submit" this.submit}}>
      <ProfileFields @form={{this.form}} />
      <this.form.Subscribe @selector={{this.selectCanSubmit}} as |canSubmit|>
        {{this.expectBoolean canSubmit}}
        {{! @glint-expect-error form selector returns boolean }}
        {{this.expectString canSubmit}}
        <button type="submit" disabled={{not canSubmit}}>Save</button>
      </this.form.Subscribe>

      <Subscribe
        @source={{this.form.atom}}
        @selector={{this.selectAge}}
        as |age|
      >
        {{this.expectNumber age}}
        {{! @glint-expect-error standalone selector returns number }}
        {{this.expectString age}}
      </Subscribe>

      <Field @form={{this.form}} @name="profile.name" as |field|>
        {{this.expectString field.value}}
        {{! @glint-expect-error standalone string field rejects numbers }}
        {{field.handleChange 1}}
      </Field>

      <Field
        @form={{this.form}}
        @name="profile.age"
        @validators={{this.ageValidators}}
      />

      {{! @glint-expect-error standalone validator must match field value }}
      <Field @form={{this.form}} @name="profile.age" @validators={{this.nameValidators}} />

      {{! @glint-expect-error standalone Field checks form paths }}
      <Field @form={{this.form}} @name="profile.missing" />

      <ArrayField @form={{this.form}} @name="profile.tags" as |field|>
        {{field.pushValue (hash label="standalone")}}
      </ArrayField>

      {{! @glint-expect-error standalone ArrayField only accepts array values }}
      <ArrayField @form={{this.form}} @name="profile.name" />
    </form>
  </template>
}

void Example;
