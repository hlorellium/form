import Field from './field.gts';

import type { InternalBaseFieldMeta } from '@tanstack/form-core/internals';

export default class ArrayField extends Field {
  protected override get snapshotSelector(): (
    snapshot: unknown,
  ) => unknown {
    return selectArrayFieldSnapshot;
  }
}

function selectArrayFieldSnapshot(snapshot: unknown): {
  length: number;
  version: number;
} {
  const state = snapshot as {
    value: Array<unknown>;
    meta: InternalBaseFieldMeta;
  };

  return {
    length: state.value.length,
    version: state.meta._arrayVersion,
  };
}
