export interface IBaseRepository<T> {
  find(filter: Record<string, unknown>): Promise<T[]>;
  findOne(filter: Record<string, unknown>): Promise<T | undefined>;
  create(data: Partial<T>): Promise<T>;
  update(filter: Record<string, unknown>, data: Partial<T>): Promise<T>;
  delete(filter: Record<string, unknown>): Promise<boolean>;
}
