
export interface Controller<T> {

  command(level: T): void;

  stop(): void;
  
}