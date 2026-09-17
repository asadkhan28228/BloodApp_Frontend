import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, API_BASE_URL, clearSession, getAccessToken, setSession, USER_KEY } from './api';

export const db = { __api: true };

let currentUser: any = null;
let hydrated = false;
const listeners = new Set<(user: any) => void>();

function toSessionUser(user: any) {
  if (!user) return null;
  return {
    ...user,
    uid: user.id ?? user.uid,
    displayName: user.fullName ?? user.displayName ?? null,
    email: user.email ?? null,
  };
}

async function hydrate() {
  if (hydrated) return currentUser;
  hydrated = true;
  const token = await getAccessToken();
  const saved = await AsyncStorage.getItem(USER_KEY);
  if (token && saved) {
    try { currentUser = toSessionUser(JSON.parse(saved)); } catch { currentUser = null; }
  }
  if (currentUser && token) {
    try {
      const fresh = await apiRequest<any>('/api/auth/profile');
      currentUser = toSessionUser(fresh);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
    } catch {}
  }
  return currentUser;
}

export const auth = {
  get currentUser() { return currentUser; },
  get apiBaseUrl() { return API_BASE_URL; },
};

function notify() { listeners.forEach((cb) => cb(currentUser)); }

export function onAuthStateChanged(_auth: any, callback: (user: any) => void) {
  let active = true;
  hydrate().then((user) => { if (active) callback(user); });
  listeners.add(callback);
  return () => { active = false; listeners.delete(callback); };
}

export async function loginWithBackend(email: string, password: string) {
  const result = await apiRequest<any>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  if (!result?.token || !result?.user) {
    throw new Error('Login response did not contain a token or user.');
  }

  currentUser = toSessionUser(result.user);
  await setSession(result.token, result.refreshToken ?? '', result.user);
  notify();
  return { user: currentUser, data: result };
}

// Kept temporarily for older screens; this still uses the ASP.NET backend.
export async function signInWithEmailAndPassword(_auth: any, email: string, password: string) {
  return loginWithBackend(email, password);
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string) {
  throw Object.assign(new Error('Use registerWithBackend from backendCompat for registration.'), { code: 'auth/use-backend-register' });
}

export async function registerWithBackend(data: any) {
  const result = await apiRequest<any>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // Registration is handled by ASP.NET Core. We intentionally do not
  // persist the returned token here because the registration screen sends
  // the user to Login, where a fresh authenticated session is created.
  return { user: toSessionUser(result?.user), data: result };
}

export async function updateProfile(_user: any, profile: { displayName?: string | null; photoURL?: string | null }) {
  if (currentUser) {
    currentUser = { ...currentUser, displayName: profile.displayName ?? currentUser.displayName, fullName: profile.displayName ?? currentUser.fullName, avatarUrl: profile.photoURL ?? currentUser.avatarUrl };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    notify();
  }
}

export async function signOut(_auth: any) {
  try {
    const refreshToken = await AsyncStorage.getItem('@bloodapp/refreshToken');
    if (refreshToken) await apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify(refreshToken) });
  } catch {}
  currentUser = null;
  await clearSession();
  notify();
}

export async function sendPasswordResetEmail(_auth: any, email: string) {
  await apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
}

export class Timestamp {
  constructor(public seconds: number, public nanoseconds = 0) {}
  toDate() { return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  static now() { const d = new Date(); return new Timestamp(Math.floor(d.getTime()/1000), (d.getTime()%1000)*1e6); }
  static fromDate(d: Date) { return new Timestamp(Math.floor(d.getTime()/1000), (d.getTime()%1000)*1e6); }
}

export const serverTimestamp = () => new Date().toISOString();

export function collection(_db: any, name: string) { return { __type: 'collection', name }; }
export function doc(_dbOrCollection: any, collectionOrId?: any, maybeId?: string) {
  if (_dbOrCollection?.__type === 'collection') {
    return { __type: 'doc', collection: _dbOrCollection.name, id: String(collectionOrId ?? `new-${Date.now()}-${Math.random().toString(36).slice(2)}`), newDoc: collectionOrId == null };
  }
  return { __type: 'doc', collection: collectionOrId, id: String(maybeId) };
}
export function where(field: string, op: string, value: any) { return { type: 'where', field, op, value }; }
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') { return { type: 'orderBy', field, direction }; }
export function query(ref: any, ...constraints: any[]) { return { __type: 'query', ref, constraints }; }

function normalizeItem(item: any, id?: string) {
  const value = { ...(item || {}) };
  if (id && !value.id) value.id = id;
  if (value.emergencyRequestId && !value.emergencyId) value.emergencyId = value.emergencyRequestId;
  if (value.bloodRequestId && !value.requestId) value.requestId = value.bloodRequestId;
  return value;
}

async function fetchCollection(name: string, constraints: any[] = []) {
  let endpoint = '';
  switch (name) {
    case 'users': endpoint = '/api/user'; break;
    case 'blood-requests': endpoint = '/api/blood-requests'; break;
    case 'community_notifications': endpoint = '/api/community-notifications'; break;
    case 'notifications': endpoint = '/api/notifications'; break;
    case 'emergencies': endpoint = '/api/emergencies'; break;
    case 'emergency-responses': endpoint = '/api/emergency-responses/my'; break;
    case 'blood-inventory': endpoint = '/api/blood-inventory'; break;
    case 'blood-batches': endpoint = '/api/blood-batches'; break;
    case 'settings': endpoint = '/api/blood-banks'; break;
    default: throw new Error(`No .NET API mapping for backend database collection '${name}'.`);
  }
  let data: any;
    try { 
    data = await apiRequest<any>(endpoint); 
  } catch (e: any) { 
    if (name === 'blood-requests' && e?.status === 403) {
      data = await apiRequest<any>('/api/blood-requests/pending');
    } else if (name === 'users' && e?.status === 403) { 
      data = await apiRequest<any>('/api/user/donors'); 
    } else { 
      throw e; 
    } 
  }
  let arr = Array.isArray(data) ? data : [];
  if (name === 'community_notifications') {
    try {
      const active = await apiRequest<any[]>('/api/emergencies/active');
      const byId = new Map((active || []).map((e: any) => [String(e.id), e]));
      arr = arr.map((item: any) => {
        const emergencyId = item.emergencyRequestId ?? item.emergencyId;
        const e = emergencyId ? byId.get(String(emergencyId)) : undefined;
        return e ? { ...e, ...item, id: item.id, emergencyId: e.id, emergencyRequestId: e.id, respondingDonorsCount: e.respondingDonorsCount ?? item.respondingDonorsCount ?? 0 } : item;
      });
    } catch {}
  }
  for (const c of constraints) {
    if (c?.type === 'where') {
      arr = arr.filter((x: any) => {
        const actual = x?.[c.field];
        if (c.op === '==') return String(actual ?? '') === String(c.value ?? '');
        if (c.op === '!=') return String(actual ?? '') !== String(c.value ?? '');
        if (c.op === 'array-contains') return Array.isArray(actual) && actual.includes(c.value);
        return true;
      });
    }
  }
  const sort = constraints.find((c) => c?.type === 'orderBy');
  if (sort) {
    arr = [...arr].sort((a, b) => {
      const av = new Date(a?.[sort.field] ?? 0).getTime() || Number(a?.[sort.field]) || 0;
      const bv = new Date(b?.[sort.field] ?? 0).getTime() || Number(b?.[sort.field]) || 0;
      return sort.direction === 'desc' ? bv - av : av - bv;
    });
  }
  return arr.map((x: any) => normalizeItem(x));
}

export async function getDocs(ref: any) {
  const name = ref?.__type === 'query' ? ref.ref.name : ref.name;
  const constraints = ref?.__type === 'query' ? ref.constraints : [];
  const arr = await fetchCollection(name, constraints);
  const docs = arr.map((data: any) => ({ id: String(data.id), data: () => data, exists: () => true }));
  return { docs, empty: docs.length === 0, size: docs.length, forEach(cb: any) { docs.forEach(cb); } };
}

export async function getDoc(ref: any) {
  const name = ref.collection;
  if (name === 'settings' && ref.id === 'bloodBank') {
    const all = await apiRequest<any[]>('/api/blood-banks');
    const data = all?.[0];
    return { id: data?.id ? String(data.id) : ref.id, exists: () => !!data, data: () => data };
  }
  let endpoint: string;
  switch (name) {
    case 'users': endpoint = `/api/user/${ref.id}`; break;
    case 'blood-requests': endpoint = `/api/blood-requests/${ref.id}`; break;
    case 'community_notifications': endpoint = `/api/community-notifications/${ref.id}`; break;
    case 'notifications': endpoint = `/api/notifications`; break;
    case 'emergencies': endpoint = `/api/emergencies/${ref.id}`; break;
    case 'blood-inventory': endpoint = `/api/blood-inventory/${encodeURIComponent(ref.id)}`; break;
    case 'blood-batches': endpoint = `/api/blood-batches/${ref.id}`; break;
    default: throw new Error(`No .NET API mapping for document '${name}/${ref.id}'.`);
  }
  try {
    const data = await apiRequest<any>(endpoint);
    return { id: String(data?.id ?? ref.id), exists: () => true, data: () => normalizeItem(data, String(ref.id)) };
  } catch (e: any) {
    if (e.status === 404) return { id: String(ref.id), exists: () => false, data: () => undefined };
    throw e;
  }
}

function unwrapTimestamp(v: any) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  return v;
}

function clean(obj: any): any {
  if (!obj || typeof obj !== 'object') return unwrapTimestamp(obj);
  if (Array.isArray(obj)) return obj.map(clean);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = clean(v);
  }
  return out;
}

export async function addDoc(ref: any, data: any) {
  const name = ref.name;
  const body = clean(data);
  let endpoint = '';
  if (name === 'blood-requests') endpoint = '/api/blood-requests';
  else if (name === 'community_notifications') endpoint = '/api/community-notifications';
  else if (name === 'emergencies') endpoint = '/api/emergencies';
  else if (name === 'emergency-responses') endpoint = '/api/emergency-responses';
  else if (name === 'blood-batches') endpoint = '/api/blood-batches';
  else if (name === 'blood-inventory') endpoint = '/api/blood-inventory';
  else throw new Error(`Creating '${name}' is not supported by the .NET backend.`);

  // Legacy emergency notification objects are translated into the real emergency API.
  if (name === 'community_notifications' && body.type === 'emergency') {
    endpoint = '/api/emergencies';
    const emergency = {
      category: body.category ?? 'General', priority: body.priority ?? 'High', bloodType: body.bloodType,
      unitsNeeded: body.unitsNeeded ?? 1, location: body.location ?? '', latitude: body.latitude ?? null,
      longitude: body.longitude ?? null, phoneNumber: body.phoneNumber ?? '', details: body.details ?? body.message ?? null,
    };
    const result = await apiRequest<any>(endpoint, { method: 'POST', body: JSON.stringify(emergency) });
    const emergencyId = String(result?.id);
    // ASP.NET Core creates the emergency, linked blood request, and
    // community notification together, so the mobile client must not
    // create duplicate records.
    return { id: emergencyId, data: () => result };
  }
  if (name === 'community_notifications' && body.type === 'emergency_response') {
    const response = {
      emergencyRequestId: body.emergencyId,
      donorName: body.donorName ?? currentUser?.displayName ?? 'Donor',
      donorPhone: body.donorPhone ?? body.phoneNumber ?? currentUser?.phoneNumber ?? null,
      bloodType: body.bloodType ?? currentUser?.bloodType ?? null,
      status: body.responseStatus ?? body.status ?? 'Accepted',
      latitude: body.latitude ?? currentUser?.latitude ?? null,
      longitude: body.longitude ?? currentUser?.longitude ?? null,
    };
    try {
      const mine = await apiRequest<any>(`/api/emergency-responses/emergency/${body.emergencyId}/my`);
      if (mine?.id && response.status && response.status !== mine.status) {
        await apiRequest(`/api/emergencies/responses/${mine.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: response.status }) });
      }
      return { id: String(mine.id), data: () => mine };
    } catch (e: any) {
      if (e?.status !== 404) throw e;
      const result = await apiRequest<any>(`/api/emergencies/${body.emergencyId}/respond`, { method: 'POST' });
      return { id: String(result?.id ?? ''), data: () => result };
    }
  }
  const result = await apiRequest<any>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  return { id: String(result?.id ?? ''), data: () => result };
}

export async function setDoc(ref: any, data: any, options?: { merge?: boolean }) {
  const name = ref.collection;
  const body = clean(data);
  if (name === 'users') {
    if (options?.merge === false) throw new Error('Full user replacement is not supported.');
    await apiRequest(`/api/user/profile`, { method: 'PUT', body: JSON.stringify(body) });
    return;
  }
  if (name === 'settings') {
    const all = await apiRequest<any[]>('/api/blood-banks');
    const id = all?.[0]?.id;
    if (!id) throw new Error('No blood bank setting exists. Create one from the backend first.');
    await apiRequest(`/api/blood-banks/${id}`, { method: 'PUT', body: JSON.stringify({ name: body.name, phoneNumber: body.phoneNumber, address: body.address ?? '', latitude: body.latitude ?? null, longitude: body.longitude ?? null }) });
    return;
  }
  if (name === 'blood-inventory') {
    await apiRequest('/api/blood-inventory', { method: 'PUT', body: JSON.stringify(body) });
    return;
  }
  if (name === 'blood-batches') {
    await apiRequest(`/api/blood-batches/${ref.id}`, { method: 'PUT', body: JSON.stringify(body) });
    return;
  }
  throw new Error(`setDoc for '${name}' is not supported by the .NET backend.`);
}

export async function updateDoc(ref: any, data: any) {
  const name = ref.collection;
  const body = clean(data);
  if (name === 'users') {
    if (body.isActive === false) { await apiRequest(`/api/user/admin/${ref.id}`, { method: 'DELETE' }); return; }
    if (body.isActive === true) { await apiRequest(`/api/user/admin/${ref.id}/activate`, { method: 'PUT' }); return; }
    if (body.role) { await apiRequest(`/api/user/admin/${ref.id}/role`, { method: 'PUT', body: JSON.stringify(body.role) }); return; }
    const profile = await apiRequest<any>('/api/auth/profile');
    await apiRequest('/api/user/profile', { method: 'PUT', body: JSON.stringify({
      fullName: body.fullName ?? profile.fullName,
      phoneNumber: body.phoneNumber ?? profile.phoneNumber,
      bloodType: body.bloodType ?? profile.bloodType,
      gender: body.gender ?? profile.gender,
      location: body.location ?? profile.location,
      latitude: body.latitude ?? profile.latitude,
      longitude: body.longitude ?? profile.longitude,
      availableToDonate: body.availableToDonate ?? profile.availableToDonate,
      avatarUrl: body.avatarUrl ?? profile.avatarUrl,
      pushToken: body.pushToken ?? profile.pushToken,
    }) });
    return;
  }
  if (name === 'blood-requests') {
    if (body.status === 'Completed' || body.status === 'complete' || body.status === 'Complete') { await apiRequest(`/api/blood-requests/${ref.id}/complete`, { method: 'PATCH' }); return; }
    if (body.status === 'Cancelled' || body.status === 'Canceled' || body.status === 'Rejected') { await apiRequest(`/api/blood-requests/${ref.id}/cancel`, { method: 'PATCH' }); return; }
    const current = await apiRequest<any>(`/api/blood-requests/${ref.id}`);
    await apiRequest(`/api/blood-requests/${ref.id}`, { method: 'PUT', body: JSON.stringify({
      patientName: body.patientName ?? current.patientName,
      bloodType: body.bloodType ?? current.bloodType,
      urgency: body.urgency ?? current.urgency,
      hospitalName: body.hospitalName ?? current.hospitalName,
      location: body.location ?? current.location,
      latitude: body.latitude ?? current.latitude,
      longitude: body.longitude ?? current.longitude,
      contactPhone: body.contactPhone ?? current.contactPhone,
      unitsNeeded: body.unitsNeeded ?? current.unitsNeeded,
      additionalNotes: body.additionalNotes ?? current.additionalNotes,
    }) });
    return;
  }
  if (name === 'community_notifications') {
    if (body.unread === false) { await apiRequest(`/api/community-notifications/${ref.id}/read`, { method: 'PATCH' }); return; }
    const existing = await apiRequest<any>(`/api/community-notifications/${ref.id}`);
    const emergencyId = existing?.emergencyRequestId ?? existing?.emergencyId;
    if (emergencyId) {
      if (body.status === 'Resolved') { await apiRequest(`/api/emergencies/${emergencyId}/resolve`, { method: 'PATCH' }); return; }
      if (body.status === 'Cancelled') { await apiRequest(`/api/emergencies/${emergencyId}/cancel`, { method: 'PATCH' }); return; }
      if (Array.isArray(body.donorResponses)) {
        const me = currentUser?.uid;
        const response = body.donorResponses.find((r: any) => (r.donorUid ?? r.uid) === me);
        if (response) {
          try {
            const mine = await apiRequest<any>(`/api/emergency-responses/emergency/${emergencyId}/my`);
            const status = response.status ?? response.response ?? 'Accepted';
            if (mine?.id && status !== mine.status) {
              await apiRequest(`/api/emergencies/responses/${mine.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            }
          } catch (e: any) {
            if (e?.status === 404) await apiRequest(`/api/emergencies/${emergencyId}/respond`, { method: 'POST' });
            else throw e;
          }
        }
        return;
      }
    }
    if (body.unread === false) { await apiRequest(`/api/community-notifications/${ref.id}/read`, { method: 'PATCH' }); return; }
    throw new Error('This community notification field is not exposed by the .NET backend.');
  }
  if (name === 'notifications') {
    if (body.unread === false) { await apiRequest(`/api/notifications/${ref.id}/read`, { method: 'PATCH' }); return; }
    throw new Error('Updating arbitrary notification fields is not exposed by the backend.');
  }
  if (name === 'blood-inventory') { await apiRequest('/api/blood-inventory', { method: 'PUT', body: JSON.stringify(body) }); return; }
  if (name === 'blood-batches') { await apiRequest(`/api/blood-batches/${ref.id}`, { method: 'PUT', body: JSON.stringify(body) }); return; }
  throw new Error(`updateDoc for '${name}' is not supported by the .NET backend.`);
}

export async function deleteDoc(ref: any) {
  const name = ref.collection;
  if (name === 'community_notifications') {
    try {
      const existing = await apiRequest<any>(`/api/community-notifications/${ref.id}`);
      const emergencyId = existing?.emergencyRequestId ?? existing?.emergencyId;
      if (emergencyId) return apiRequest(`/api/emergencies/${emergencyId}/cancel`, { method: 'PATCH' });
    } catch {}
    return apiRequest(`/api/community-notifications/${ref.id}`, { method: 'DELETE' });
  }
  if (name === 'notifications') return apiRequest(`/api/notifications/${ref.id}`, { method: 'DELETE' });
  if (name === 'blood-batches') return apiRequest(`/api/blood-batches/${ref.id}`, { method: 'DELETE' });
  if (name === 'blood-requests') return apiRequest(`/api/blood-requests/${ref.id}/cancel`, { method: 'PATCH' });
  throw new Error(`deleteDoc for '${name}' is not supported by the .NET backend.`);
}

export function onSnapshot(ref: any, callback: any) {
  let active = true;
  const poll = async () => {
    try {
      const snapshot = await getDocs(ref);
      if (active) callback(snapshot);
    } catch (e) { if (active) console.warn('API realtime refresh failed', e); }
  };
  poll();
  const timer = setInterval(poll, 15000);
  return () => { active = false; clearInterval(timer); };
}

export async function runTransaction(_db: any, callback: any) {
  const operations: any[] = [];
  const transaction = {
    get: async (ref: any) => getDoc(ref),
    set: (ref: any, data: any, options?: any) => operations.push({ type: 'set', ref, data, options }),
    delete: (ref: any) => operations.push({ type: 'delete', ref }),
  };
  const result = await callback(transaction);
  for (const op of operations) {
    if (op.type === 'set') {
      const name = op.ref.collection;
      if (name === 'blood-batches' && op.ref.newDoc) {
        await addDoc({ name }, { ...op.data });
      } else if (name === 'blood-batches' && op.data?.expiresAtMs) {
        await addDoc({ name }, { bloodType: op.data.bloodType, units: op.data.units, expiresAt: new Date(op.data.expiresAtMs).toISOString() });
      } else {
        await setDoc(op.ref, op.data, op.options);
      }
    } else if (op.type === 'delete') {
      await deleteDoc(op.ref);
    }
  }
  return result;
}

export const increment = (amount: number) => ({ __increment: amount });
export const arrayUnion = (...values: any[]) => ({ __arrayUnion: values });
