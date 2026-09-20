import Component from '@glimmer/component';
import { AtomSelection } from '../-private/select-atom.ts';

import type { SelectorSource } from '../-private/select-atom.ts';
import type { EmberSubscribeSignature } from '../form-api-types.ts';

export default class Subscribe extends Component<
  EmberSubscribeSignature<any, any>
> {
  #selection: AtomSelection<any, any> | undefined;

  get source(): SelectorSource<any> {
    return this.args.source;
  }

  get selected(): unknown {
    if (this.#selection === undefined) {
      this.#selection = new AtomSelection(
        this,
        this.source,
        this.args.selector,
      );
    } else {
      this.#selection.update(this.source, this.args.selector);
    }

    return this.#selection.current;
  }

  get shouldRender(): boolean {
    const selected = this.selected;
    return this.args.when?.(selected) !== false;
  }

  <template>
    {{#if this.shouldRender}}
      {{yield this.selected}}
    {{/if}}
  </template>
}
