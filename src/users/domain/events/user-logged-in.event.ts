export class UserLoggedInEvent {
  constructor(
    public readonly userId: string | undefined,
    public readonly email: string,
    public readonly from: string,
    public readonly loginAt: Date = new Date()
  ) {}
}
