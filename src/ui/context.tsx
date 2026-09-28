import { createContext, useContext } from "react";
import type { CatalogPackage, CatalogState } from "../domain/models";
import type { MarketplaceService } from "../domain/service";
import type { IndexedDbRepository } from "../data/repository";
export interface AppContext {
  state: CatalogState;
  seed: CatalogPackage;
  actor: string;
  service: MarketplaceService;
  repo: IndexedDbRepository;
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>;
  notify: (message: string, error?: boolean) => void;
  login: () => void;
  switchActor: (id: string) => Promise<void>;
}
export const Context = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Контекст приложения недоступен");
  return value;
}
export function go(path: string) {
  window.location.hash = path;
}
export function base(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
export const statusLabels: Record<string, string> = {
  draft: "Черновик",
  pending: "Ожидает ответа",
  published: "Опубликовано",
  rejected: "Отклонено",
  archived: "В архиве",
  partial: "Частично подтверждено",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Сценарий завершён",
};
