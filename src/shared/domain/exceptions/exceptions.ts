export class Exceptions extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Exceptions";
  }
}
