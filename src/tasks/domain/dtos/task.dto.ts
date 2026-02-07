export type TaskDto = {
    id?: string;
    title: string;
    description?: string;
    statusId: string;
    userId: string;
    dueDate?: Date;
    order?: number;
};
