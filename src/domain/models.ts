export type ActorId = string;
export type ListingStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "archived";
export type LineDecision = "pending" | "confirmed" | "rejected";
export type RequestStatus =
  | "pending"
  | "partial"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";
export interface User {
  id: string;
  alias: string;
  isAdmin: boolean;
  isDemo: true;
  createdAt: string;
}
export interface SellerProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  district: string;
  pickupTerms: string;
  isDemo: true;
}
export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  order: number;
}
export interface ImageAsset {
  id: string;
  path: string;
  thumbnailPath?: string;
  alt: string;
  source: string;
  license: string;
  width: number;
  height: number;
  blob?: Blob;
}
export interface Listing {
  id: string;
  slug: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  imageIds: string[];
  tags: string[];
  material: string;
  color: string;
  dimensions: string;
  era: string;
  condition: string;
  functionality: "working" | "prop" | "replica" | "not-applicable";
  priceKopecks: number;
  depositKopecks: number;
  unit: string;
  quantity: number;
  district: string;
  delivery: boolean;
  pickupTerms: string;
  packaging: string;
  status: ListingStatus;
  updatedAt: string;
  isDemo: true;
  origin: "seed" | "local";
  rejectionReason?: string;
}
export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  listingIds: string[];
}
export interface Favorite {
  actorId: string;
  listingId: string;
}
export interface SelectionLine {
  listingId: string;
  quantity: number;
}
export interface Selection {
  actorId: string;
  startDate: string;
  endDate: string;
  lines: SelectionLine[];
}
export interface SavedSelection extends Selection {
  id: string;
  name: string;
  updatedAt: string;
}
export interface RequestLineSnapshot {
  id: string;
  listingId: string;
  title: string;
  quantity: number;
  priceKopecks: number;
  depositKopecks: number;
  unit: string;
  imageId: string;
  district: string;
  pickupTerms: string;
  packaging: string;
  delivery: boolean;
  decision: LineDecision;
  comment: string;
}
export interface RequestGroup {
  id: string;
  requesterId: string;
  startDate: string;
  endDate: string;
  days: number;
  ownerRequestIds: string[];
  status: RequestStatus;
  createdAt: string;
  idempotencyKey: string;
}
export interface OwnerRequest {
  id: string;
  groupId: string;
  ownerId: string;
  requesterId: string;
  lines: RequestLineSnapshot[];
  status: RequestStatus;
  createdAt: string;
}
export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityId: string;
  details: string;
  createdAt: string;
}
export interface CatalogPackage {
  schemaVersion: 1;
  categories: Category[];
  sellers: SellerProfile[];
  listings: Listing[];
  images: ImageAsset[];
  collections: Collection[];
}
export interface CatalogState extends CatalogPackage {
  revision: number;
  users: User[];
  favorites: Favorite[];
  selections: Selection[];
  savedSelections: SavedSelection[];
  requestGroups: RequestGroup[];
  ownerRequests: OwnerRequest[];
  audit: AuditEvent[];
}
export type ListingInput = Omit<
  Listing,
  "id" | "slug" | "ownerId" | "updatedAt" | "isDemo" | "origin" | "status"
> & { id?: string; slug?: string };
export interface Totals {
  days: number;
  rentKopecks: number;
  depositKopecks: number;
}
