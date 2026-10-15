// In-memory source of truth for the trial. Every row carries its owner tenant (immutable, N-18).
// A "transaction" is a synchronous function: no await between the resolver read and the business write.
import { opaqueId } from './jwt.js';

export class Store {
  constructor() {
    this.sites = new Map(); this.floors = new Map(); this.rooms = new Map(); this.bookings = new Map();
    this.outbox = []; this.notifications = []; this.deadLetters = []; this.sentLog = [];
    this.businessExecutions = 0;
    this.tenantState = new Map(); // tid -> 'active' | 'suspended' (from lifecycle events, CON-12; injected in tests)
  }
  // fixture adapter (ST-8, CON-11 §6.4): create rows directly with a given owner tenant
  addSite(tid, id = opaqueId()) { this.sites.set(id, { id, tid }); return id; }
  addFloor(tid, siteId, id = opaqueId()) { this.floors.set(id, { id, tid, siteId }); return id; }
  addRoom(tid, floorId, id = opaqueId()) { this.rooms.set(id, { id, tid, floorId }); return id; }
  addBooking(tid, roomId, organizer, extra = {}) {
    const id = extra.id ?? opaqueId();
    this.bookings.set(id, { id, tid, roomId, organizer, attendees: extra.attendees ?? [], start: extra.start ?? '2026-10-20T01:00:00Z', end: extra.end ?? '2026-10-20T02:00:00Z', status: 'active', consistencyToken: null });
    return id;
  }
  // resolver.owner_tenant (CON-16 §2.4): 'NOT_FOUND' for absent rows
  ownerTenant(type, id) {
    const table = { 'rsv/room': this.rooms, 'rsv/booking': this.bookings, 'rsv/floor': this.floors, 'rsv/site': this.sites }[type];
    if (!table) return 'UNRESOLVABLE';
    const row = table.get(id);
    return row ? row.tid : 'NOT_FOUND';
  }
}
