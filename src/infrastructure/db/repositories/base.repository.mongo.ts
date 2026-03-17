import { Document, Model } from "mongoose";

export class BaseMongoRepository<T, M extends Document> {
  constructor(protected readonly model: Model<M>) {}

  async find(filter: Record<string, any>): Promise<T[]> {
    const docs = await this.model.find(filter);
    if (!docs) return null;
    return docs.map((doc) => doc.toJSON() as unknown as T);
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    const doc = await this.model.findOne(filter);
    if (!doc) return null;
    return doc.toJSON() as unknown as T;
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    await doc.save();
    return doc.toJSON() as unknown as T;
  }

  async update(
    filter: string | Record<string, any>,
    data: Partial<T>
  ): Promise<T | null> {
    const query = typeof filter === "string" ? { _id: filter } : filter;
    const doc = await this.model.findOneAndReplace(query, data as any, {
      new: true,
    });
    if (!doc) return null;
    return doc.toJSON() as unknown as T;
  }

  async delete(filter: string | Record<string, any>): Promise<boolean> {
    const query = typeof filter === "string" ? { _id: filter } : filter;
    const result = await this.model.findOneAndDelete(query);
    return !!result;
  }
}
