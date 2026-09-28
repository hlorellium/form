import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { destroy, isDestroyed } from '@ember/destroyable';
import { click, fillIn, render } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { Field, mountForm, Subscribe } from '@tanstack/ember-form';
import { handleInput, tooShort, type Sample } from '../helpers.ts';

const defaults: Sample = { firstName: 'Ada', lastName: 'Lovelace' };

const pickFirstName = (state: { values: Sample }) => state.values.firstName;

const pickSubmit = (state: { canSubmit: boolean }) => ({
  cantSubmit: !state.canSubmit,
});

const submit = (form: { handleSubmit: () => unknown }) => () =>
  form.handleSubmit();

module('Integration | mountForm', function (hooks) {
  setupRenderingTest(hooks);

  test('the class owns the form before it renders', async function (assert) {
    const calls: string[] = [];

    class TestForm extends Component {
      form = mountForm(this, {
        defaultValues: defaults,
        listeners: { onMount: () => calls.push('mount') },
      });

      // Read in the constructor, before the first render.
      initialFirstName = this.form.state.values.firstName;

      <template><output id="initial">{{this.initialFirstName}}</output></template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('#initial').hasText('Ada');
    assert.deepEqual(calls, ['mount']);
  });

  test('this.form.Field renders with the form already bound', async function (assert) {
    class TestForm extends Component {
      form = mountForm(this, { defaultValues: defaults });

      <template>
        <this.form.Field @name="firstName" as |field|>
          <input
            id="firstName"
            value={{field.state.value}}
            {{on "input" (fn handleInput field)}}
          />
          <output id="value">{{field.state.value}}</output>
        </this.form.Field>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('#firstName').hasValue('Ada');

    await fillIn('#firstName', 'Grace');

    assert.dom('#value').hasText('Grace');
  });

  test('the exported components take the form as @form', async function (assert) {
    class TestForm extends Component {
      form = mountForm(this, { defaultValues: defaults });

      <template>
        <Field
          @form={{this.form}}
          @name="firstName"
          @validators={{hash onChange=tooShort}}
          as |field|
        >
          <input
            id="firstName"
            value={{field.state.value}}
            {{on "input" (fn handleInput field)}}
          />
          {{#each field.state.meta.errors as |error|}}
            <em class="error">{{error}}</em>
          {{/each}}
        </Field>

        <Subscribe @form={{this.form}} @selector={{pickSubmit}} as |slice|>
          <button id="submit" type="submit" disabled={{slice.cantSubmit}}>
            Submit
          </button>
        </Subscribe>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('em.error').doesNotExist();
    assert.dom('#submit').isEnabled();

    await fillIn('#firstName', 'Jo');

    assert.dom('em.error').hasText('Not long enough');
    assert.dom('#submit').isDisabled();
  });

  test('onSubmit can close over the class', async function (assert) {
    class TestForm extends Component {
      @tracked saved = '';

      form = mountForm(this, {
        defaultValues: defaults,
        onSubmit: ({ value }) => {
          this.saved = value.firstName;
        },
      });

      <template>
        <button id="go" type="button" {{on "click" (submit this.form)}}>
          go
        </button>
        <output id="saved">{{this.saved}}</output>
      </template>
    }

    await render(<template><TestForm /></template>);
    await click('#go');

    assert.dom('#saved').hasText('Ada');
  });

  test('useSelector follows the store from a getter', async function (assert) {
    class TestForm extends Component {
      form = mountForm(this, { defaultValues: defaults });

      selected = this.form.useSelector(pickFirstName);

      get firstName() {
        return this.selected.current;
      }

      <template>
        <this.form.Field @name="firstName" as |field|>
          <input
            id="firstName"
            value={{field.state.value}}
            {{on "input" (fn handleInput field)}}
          />
        </this.form.Field>
        <output id="selected">{{this.firstName}}</output>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('#selected').hasText('Ada');

    await fillIn('#firstName', 'Grace');

    assert.dom('#selected').hasText('Grace');
  });

  test('options may be a function that reads tracked state', async function (assert) {
    class TestForm extends Component {
      @tracked defaults: Sample = { firstName: 'Ada', lastName: '' };

      form = mountForm(this, () => ({ defaultValues: this.defaults }));

      load = () => {
        this.defaults = { firstName: 'Grace', lastName: 'Hopper' };
      };

      <template>
        <this.form.Field @name="firstName" as |field|>
          <input id="firstName" value={{field.state.value}} />
        </this.form.Field>

        <button id="load" type="button" {{on "click" this.load}}>load</button>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('#firstName').hasValue('Ada');

    await click('#load');

    assert.dom('#firstName').hasValue('Grace');
  });

  test('the form is destroyed with its parent', async function (assert) {
    let form: object | undefined;

    class Inner extends Component {
      form = mountForm(this, { defaultValues: defaults });

      constructor(...args: ConstructorParameters<typeof Component>) {
        super(...args);
        form = this.form;
      }

      <template>
        <this.form.Field @name="firstName" as |field|>
          <output id="value">{{field.state.value}}</output>
        </this.form.Field>
      </template>
    }

    class TestForm extends Component {
      @tracked isShown = true;

      hide = () => {
        this.isShown = false;
      };

      <template>
        {{#if this.isShown}}
          <Inner />
        {{/if}}

        <button id="hide" type="button" {{on "click" this.hide}}>hide</button>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.dom('#value').hasText('Ada');
    assert.false(isDestroyed(form!));

    await click('#hide');

    assert.dom('#value').doesNotExist();
    assert.true(isDestroyed(form!));
  });

  test('destroy unmounts the form before its parent', async function (assert) {
    let form: object | undefined;

    class TestForm extends Component {
      form = mountForm(this, { defaultValues: defaults });

      constructor(...args: ConstructorParameters<typeof Component>) {
        super(...args);
        form = this.form;
      }

      unmount = () => destroy(this.form);

      <template>
        <button id="unmount" type="button" {{on "click" this.unmount}}>
          unmount
        </button>
      </template>
    }

    await render(<template><TestForm /></template>);

    assert.false(isDestroyed(form!));

    await click('#unmount');

    assert.true(isDestroyed(form!));
    assert.dom('#unmount').exists('the parent is still rendered');
  });
});
