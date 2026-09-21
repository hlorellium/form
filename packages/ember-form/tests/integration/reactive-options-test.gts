import { destroy } from '@ember/destroyable';
import { trackedObject } from '@ember/reactive/collections';
import { run } from '@ember/runloop';
import { fillIn, render, settled } from '@ember/test-helpers';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { createForm, type FormValidators } from '@tanstack/ember-form';
import { handleInput } from '../helpers.ts';

module('Integration | reactive form options', function (hooks) {
  setupRenderingTest(hooks);

  test('reconciles defaults and callbacks without a rendered consumer', async function (assert) {
    const owner = {};
    const submissions: string[] = [];
    const inputs = trackedObject({
      defaults: { name: 'Initial' },
      onSubmit: () => { submissions.push('initial'); },
    });
    let resolutions = 0;
    const form = createForm(owner, () => {
      resolutions++;
      return { defaultValues: inputs.defaults, onSubmit: inputs.onSubmit };
    });
    const fieldComponent = form.Field;
    const atom = form.atom;

    try {
      run(() => {
        inputs.defaults = { name: 'Loaded' };
        inputs.onSubmit = () => { submissions.push('updated'); };
      });
      await settled();

      assert.strictEqual(form.state.values.name, 'Loaded');
      assert.strictEqual(form.Field, fieldComponent, 'bound components stay stable');
      assert.strictEqual(form.atom, atom, 'the form store stays stable');
      await form.handleSubmit();
      assert.deepEqual(submissions, ['updated']);

      const beforeDestroy = resolutions;
      run(() => {
        inputs.defaults = { name: 'Queued before destruction' };
        destroy(owner);
      });
      await settled();
      run(() => { inputs.defaults = { name: 'After destruction' }; });
      await settled();
      assert.strictEqual(resolutions, beforeDestroy, 'queued and future updates stop');
      assert.strictEqual(form.state.values.name, 'Loaded');
    } finally {
      destroy(owner);
      await settled();
    }
  });

  test('preserves touched fields and refreshes untouched defaults in rendered fields', async function (assert) {
    const owner = {};
    const inputs = trackedObject({ defaults: { name: '', email: '' } });
    const form = createForm(owner, () => ({ defaultValues: inputs.defaults }));

    try {
      await render(<template>
        <form.Field @name="name" as |field|>
          <input id="name" value={{field.value}} {{on "input" (fn handleInput field)}} />
        </form.Field>
        <form.Field @name="email" as |field|>
          <input id="email" value={{field.value}} {{on "input" (fn handleInput field)}} />
        </form.Field>
      </template>);

      await fillIn('#name', 'User edit');
      run(() => { inputs.defaults = { name: 'Server name', email: 'loaded@example.com' }; });
      await settled();

      assert.dom('#name').hasValue('User edit');
      assert.dom('#email').hasValue('loaded@example.com');
      form.reset();
      await settled();
      assert.dom('#name').hasValue('Server name');
    } finally {
      destroy(owner);
      await settled();
    }
  });

  test('reconciles validators and tracks changes to conditional dependencies', async function (assert) {
    const owner = {};
    const first: FormValidators<{ name: string }> = [
      { triggers: ['submit'], run: () => 'First validator' },
    ];
    const second: FormValidators<{ name: string }> = [
      { triggers: ['submit'], run: () => 'Second validator' },
    ];
    const inputs = trackedObject({ useFirst: true, first, second });
    let resolutions = 0;
    const form = createForm(owner, () => {
      resolutions++;
      return {
        defaultValues: { name: '' },
        validators: inputs.useFirst ? inputs.first : inputs.second,
      };
    });

    try {
      await form.handleSubmit();
      assert.strictEqual(form.state.errors[0]?.message, 'First validator');
      run(() => { inputs.useFirst = false; });
      await settled();
      await form.handleSubmit();
      assert.strictEqual(form.state.errors[0]?.message, 'Second validator');

      const beforeUnrelatedChange = resolutions;
      run(() => { inputs.first = []; });
      await settled();
      assert.strictEqual(resolutions, beforeUnrelatedChange, 'old dependencies are released');

      run(() => { inputs.second = []; });
      await settled();
      await form.handleSubmit();
      assert.deepEqual(form.state.errors, [], 'removed validators no longer contribute errors');
    } finally {
      destroy(owner);
      await settled();
    }
  });
});
