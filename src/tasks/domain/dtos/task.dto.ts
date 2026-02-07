export type TaskDto = {
    id?: string;
    title: string;
    description?: string;
    statusId: string;
    statusName?: string;
    userId: string;
    dueDate?: Date;
    order?: number;
};
