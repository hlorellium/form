import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { click, fillIn, render } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { createForm, FormGroup, mountForm } from '@tanstack/ember-form';
import { handleInput } from '../helpers.ts';

interface Address {
  street: string;
  city: string;
}

interface Profile {
  name: string;
  address: Address;
}

const defaults: Profile = {
  name: 'Ada',
  address: { street: 'Bond Street', city: 'London' },
};

const ProfileForm = createForm({ defaultValues: defaults });

const shortStreet = ({ value }: { value: Address }) =>
  value.street.length < 3 ? 'Street is too short' : undefined;

const submit = (group: { handleSubmit: () => unknown }) => () =>
  group.handleSubmit();

module('Integration | FormGroup', function (hooks) {
  setupRenderingTest(hooks);

  test('yields the value of the group', async function (assert) {
    await render(
      <template>
        <ProfileForm as |tanstackForm|>
          <tanstackForm.FormGroup @name="address" as |address|>
            <tanstackForm.Field @name="address.street" as |field|>
              <input
                id="street"
                value={{field.state.value}}
                {{on "input" (fn handleInput field)}}
              />
            </tanstackForm.Field>

            <output id="street-value">{{address.state.value.street}}</output>
            <output id="city-value">{{address.state.value.city}}</output>
          </tanstackForm.FormGroup>
        </ProfileForm>
      </template>,
    );

    assert.dom('#street-value').hasText('Bond Street');
    assert.dom('#city-value').hasText('London');

    await fillIn('#street', 'Baker Street');

    assert.dom('#street-value').hasText('Baker Street');
  });

  test('group validators surface errors and clear them', async function (assert) {
    await render(
      <template>
        <ProfileForm as |tanstackForm|>
          <tanstackForm.FormGroup
            @name="address"
            @validators={{hash onChange=shortStreet}}
            as |address|
          >
            <tanstackForm.Field @name="address.street" as |field|>
              <input
                id="street"
                value={{field.state.value}}
                {{on "input" (fn handleInput field)}}
              />
            </tanstackForm.Field>

            {{#each address.state.meta.errors as |error|}}
              <em class="error">{{error}}</em>
            {{/each}}

            <output id="valid">{{address.state.meta.isValid}}</output>
          </tanstackForm.FormGroup>
        </ProfileForm>
      </template>,
    );

    assert.dom('em.error').doesNotExist();
    assert.dom('#valid').hasText('true');

    await fillIn('#street', 'Jo');

    assert.dom('em.error').hasText('Street is too short');
    assert.dom('#valid').hasText('false');

    await fillIn('#street', 'Joey');

    assert.dom('em.error').doesNotExist();
    assert.dom('#valid').hasText('true');
  });

  test('handleSubmit submits the group and not the form', async function (assert) {
    const calls: string[] = [];
    const onSubmit = () => calls.push('form');

    const onGroupSubmit = ({ value }: { value: Address }) =>
      calls.push(`group:${value.city}`);

    await render(
      <template>
        <ProfileForm @onSubmit={{onSubmit}} as |tanstackForm|>
          <tanstackForm.FormGroup
            @name="address"
            @onGroupSubmit={{onGroupSubmit}}
            as |address|
          >
            <button id="save" type="button" {{on "click" (submit address)}}>
              save
            </button>
            <output id="attempts">
              {{address.state.meta.submissionAttempts}}
            </output>
          </tanstackForm.FormGroup>
        </ProfileForm>
      </template>,
    );

    assert.dom('#attempts').hasText('0');

    await click('#save');

    assert.deepEqual(calls, ['group:London']);
    assert.dom('#attempts').hasText('1');
  });

  test('the export takes the form as @form', async function (assert) {
    await render(
      <template>
        <ProfileForm as |tanstackForm|>
          <FormGroup @form={{tanstackForm}} @name="address" as |address|>
            <output id="city-value">{{address.state.value.city}}</output>
          </FormGroup>
        </ProfileForm>
      </template>,
    );

    assert.dom('#city-value').hasText('London');
  });

  test('a form from mountForm has a FormGroup', async function (assert) {
    class TestForm extends Component {
      @tracked saved = '';

      form = mountForm(this, { defaultValues: defaults });

      saveAddress = ({ value }: { value: Address }) => {
        this.saved = value.city;
      };

      <template>
        <this.form.FormGroup
          @name="address"
          @onGroupSubmit={{this.saveAddress}}
          as |address|
        >
          <this.form.Field @name="address.city" as |field|>
            <input
              id="city"
              value={{field.state.value}}
              {{on "input" (fn handleInput field)}}
            />
          </this.form.Field>

          <button id="save" type="button" {{on "click" (submit address)}}>
            save
          </button>
        </this.form.FormGroup>

        <output id="saved">{{this.saved}}</output>
      </template>
    }

    await render(<template><TestForm /></template>);
    await fillIn('#city', 'Paris');
    await click('#save');

    assert.dom('#saved').hasText('Paris');
  });

  test('a removed group calls its onUnmount listener', async function (assert) {
    const calls: string[] = [];
    const listeners = { onUnmount: () => calls.push('unmount') };

    class TestForm extends Component {
      @tracked isShown = true;

      hide = () => {
        this.isShown = false;
      };

      <template>
        <ProfileForm as |tanstackForm|>
          {{#if this.isShown}}
            <tanstackForm.FormGroup
              @name="address"
              @listeners={{listeners}}
              as |address|
            >
              <output id="city-value">{{address.state.value.city}}</output>
            </tanstackForm.FormGroup>
          {{/if}}
        </ProfileForm>

        <button id="hide" type="button" {{on "click" this.hide}}>hide</button>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.deepEqual(calls, []);

    await click('#hide');

    assert.dom('#city-value').doesNotExist();
    assert.deepEqual(calls, ['unmount']);
  });
});
