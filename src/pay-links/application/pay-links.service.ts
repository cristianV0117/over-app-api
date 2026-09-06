import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PayLinkDocument,
  PayLinkModel,
} from "src/shared/infrastructure/mongo/schemas/pay-link.schema";
import { PayLinkWriteDto } from "../infrastructure/dtos/pay-link-write.dto";

export type PayLinkDto = {
  id: string;
  name: string;
  url: string;
  notes: string;
  createdAt: string;
};

@Injectable()
export class PayLinksService {
  constructor(
    @InjectModel(PayLinkModel.name)
    private readonly model: Model<PayLinkDocument>
  ) {}

  async list(userId: string): Promise<PayLinkDto[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ name: 1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDto(d));
  }

  async create(userId: string, body: PayLinkWriteDto): Promise<PayLinkDto> {
    const created = await this.model.create({
      userId: new Types.ObjectId(userId),
      name: body.name.trim(),
      url: body.url.trim(),
      notes: body.notes?.trim() ?? "",
    });
    return this.toDto(created);
  }

  async update(
    userId: string,
    id: string,
    body: PayLinkWriteDto
  ): Promise<PayLinkDto> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        {
          $set: {
            name: body.name.trim(),
            url: body.url.trim(),
            notes: body.notes?.trim() ?? "",
          },
        },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Página no encontrada");
    return this.toDto(doc);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.model
      .deleteOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!res.deletedCount) throw new NotFoundException("Página no encontrada");
  }

  private toDto(doc: {
    _id: unknown;
    name: string;
    url: string;
    notes?: string;
    createdAt?: Date;
  }): PayLinkDto {
    return {
      id: String(doc._id),
      name: doc.name,
      url: doc.url,
      notes: doc.notes ?? "",
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    };
  }
}
