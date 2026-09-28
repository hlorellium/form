import Component from '@glimmer/component';
import {
  ArrayField,
  createForm,
  Field,
  formOptions,
  FormGroup,
  mountForm,
  Subscribe,
} from '@tanstack/ember-form';
import type { EmberFormFromOptions } from '@tanstack/ember-form';

interface Person {
  firstName: string;
  age: number;
  hobbies: string[];
  address: { street: string; city: string };
}

const defaults: Person = {
  firstName: '',
  age: 0,
  hobbies: [],
  address: { street: '', city: '' },
};

const personFormOptions = formOptions({ defaultValues: defaults });
const PersonForm = createForm(personFormOptions);

const expectString = (value: string) => value;
const expectNumber = (value: number) => value;
const expectStrings = (value: string[]) => value.length;

const mustBeAdult = ({ value }: { value: number }) =>
  value < 18 ? 'Too young' : undefined;

const mustBeLong = ({ value }: { value: string }) =>
  value.length < 3 ? 'Too short' : undefined;

const mustHaveStreet = ({ value }: { value: { street: string } }) =>
  value.street ? undefined : 'No street';

const pickAge = (state: { values: Person }) => state.values.age;

type PersonFormApi = EmberFormFromOptions<typeof personFormOptions>;

interface PersonSectionSignature {
  Args: { form: PersonFormApi };
}

class PersonSection extends Component<PersonSectionSignature> {
  <template>
    <@form.Field @name="address.city" as |field|>
      {{expectString field.state.value}}
      {{! @glint-expect-error: address.city is a string }}
      {{expectNumber field.state.value}}
    </@form.Field>

    {{! @glint-expect-error: no such field }}
    <@form.Field @name="address.postalCode" />
  </template>
}

<template>
  <PersonForm as |tanstackForm|>
    <PersonSection @form={{tanstackForm}} />

    <tanstackForm.Field @name="firstName" as |field|>
      {{expectString field.state.value}}
      {{! @glint-expect-error: the value of firstName is a string }}
      {{expectNumber field.state.value}}
    </tanstackForm.Field>

    <tanstackForm.Field @name="age" as |field|>
      {{expectNumber field.state.value}}
    </tanstackForm.Field>

    {{! @glint-expect-error: no such field }}
    <tanstackForm.Field @name="typo" />

    <tanstackForm.Field @name="age" @validators={{hash onChange=mustBeAdult}} />

    {{! @glint-expect-error: the validator takes a string, and age is a number }}
    <tanstackForm.Field @name="age" @validators={{hash onChange=mustBeLong}} />

    {{! @glint-expect-error: the default value of age is a number }}
    <tanstackForm.Field @name="age" @defaultValue="18" />

    <Field @form={{tanstackForm}} @name="firstName" as |field|>
      {{expectString field.state.value}}
    </Field>

    {{! @glint-expect-error: no such field }}
    <Field @form={{tanstackForm}} @name="typo" />

    <tanstackForm.ArrayField @name="hobbies" as |field|>
      {{expectStrings field.state.value}}
      {{! @glint-expect-error: the value of hobbies is an array of strings }}
      {{expectString field.state.value}}
    </tanstackForm.ArrayField>

    {{! @glint-expect-error: firstName is not an array }}
    <tanstackForm.ArrayField @name="firstName" />

    {{! @glint-expect-error: ArrayField sets the mode }}
    <tanstackForm.ArrayField @name="hobbies" @mode="value" />

    <ArrayField @form={{tanstackForm}} @name="hobbies" as |field|>
      {{expectStrings field.state.value}}
    </ArrayField>

    {{! @glint-expect-error: age is not an array }}
    <ArrayField @form={{tanstackForm}} @name="age" />

    <tanstackForm.FormGroup @name="address" as |group|>
      {{expectString group.state.value.street}}
      {{! @glint-expect-error: the value of address is an object }}
      {{expectString group.state.value}}
    </tanstackForm.FormGroup>

    <tanstackForm.FormGroup
      @name="address"
      @validators={{hash onChange=mustHaveStreet}}
    />

    {{! @glint-expect-error: the validator takes an address, and age is a number }}
    <tanstackForm.FormGroup @name="age" @validators={{hash onChange=mustHaveStreet}} />

    {{! @glint-expect-error: no such group }}
    <tanstackForm.FormGroup @name="typo" />

    <FormGroup @form={{tanstackForm}} @name="address" as |group|>
      {{expectString group.state.value.city}}
    </FormGroup>

    <tanstackForm.Subscribe @selector={{pickAge}} as |age|>
      {{expectNumber age}}
      {{! @glint-expect-error: the selector returns a number }}
      {{expectString age}}
    </tanstackForm.Subscribe>

    <tanstackForm.Subscribe as |state|>
      {{expectString state.values.firstName}}
    </tanstackForm.Subscribe>

    <Subscribe @form={{tanstackForm}} @selector={{pickAge}} as |age|>
      {{expectNumber age}}
    </Subscribe>

    {{expectNumber (pickAge tanstackForm.state)}}
  </PersonForm>

  {{! @glint-expect-error: onSubmit receives the form values }}
  <PersonForm @onSubmit={{expectString}} />
</template>

export class Owned extends Component {
  form = mountForm(this, {
    defaultValues: defaults,
    onSubmit: ({ value }) => {
      expectString(value.firstName);
      // @ts-expect-error: the value of age is a number
      expectString(value.age);
    },
  });

  // @ts-expect-error: the options are form options
  wrong = mountForm(this, { defaultValues: defaults, typo: true });

  fromFunction = mountForm(this, () => ({ defaultValues: defaults }));

  address = this.form.createGroup({
    name: 'address',
    validators: { onChange: mustHaveStreet },
  });

  // @ts-expect-error: group names are checked against the form values
  wrongGroup = this.form.createGroup({ name: 'typo' });

  selected = this.form.useSelector(pickAge);

  get age() {
    return expectNumber(this.selected.current);
  }

  get values() {
    return expectString(this.fromFunction.state.values.firstName);
  }

  get groupStreet() {
    return expectString(this.address.state.value.street);
  }

  <template>
    <PersonSection @form={{this.form}} />

    <this.form.Field @name="firstName" as |field|>
      {{expectString field.state.value}}
      {{! @glint-expect-error: the value of firstName is a string }}
      {{expectNumber field.state.value}}
    </this.form.Field>

    {{! @glint-expect-error: no such field }}
    <this.form.Field @name="typo" />

    <this.form.ArrayField @name="hobbies" as |field|>
      {{expectStrings field.state.value}}
    </this.form.ArrayField>

    {{! @glint-expect-error: age is not an array }}
    <this.form.ArrayField @name="age" />

    <this.form.FormGroup @name="address" as |group|>
      {{expectString group.state.value.street}}
    </this.form.FormGroup>

    <this.form.Subscribe @selector={{pickAge}} as |age|>
      {{expectNumber age}}
    </this.form.Subscribe>

    <Field @form={{this.form}} @name="age" as |field|>
      {{expectNumber field.state.value}}
    </Field>

    <Subscribe @form={{this.fromFunction}} @selector={{pickAge}} as |age|>
      {{expectNumber age}}
    </Subscribe>
  </template>
}
