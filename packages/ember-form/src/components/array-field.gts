import Field from './field.gts';

export default class ArrayField extends Field {
  protected override get arrayBinding(): boolean {
    return true;
  }
}
