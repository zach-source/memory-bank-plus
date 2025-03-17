export interface Validator<T> {
  validate(input?: any): Error | null;
}
