export class TaskStoreValueObject {
    constructor(
        private readonly title: string,
        private readonly userId: string,
        private readonly statusId?: string,
        private readonly description?: string,
        private readonly dueDate?: Date,
        private readonly order?: number
    ) { }

    getTitle(): string {
        return this.title;
    }

    getUserId(): string {
        return this.userId;
    }

    getStatusId(): string | undefined {
        return this.statusId;
    }

    getDescription(): string | undefined {
        return this.description;
    }

    getDueDate(): Date | undefined {
        return this.dueDate;
    }

    getOrder(): number {
        return this.order ?? 0;
    }
}
