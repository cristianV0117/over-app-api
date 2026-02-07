import { TaskDto } from "./dtos/task.dto";

export class Task {
    constructor(protected props: TaskDto) { }

    toJSON() {
        return {
            id: this.props.id,
            title: this.props.title,
            description: this.props.description,
            statusId: this.props.statusId,
            statusName: this.props.statusName,
            userId: this.props.userId,
            dueDate: this.props.dueDate,
            order: this.props.order,
        };
    }
}