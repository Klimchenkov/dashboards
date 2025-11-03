export const API = process.env.NEXT_PUBLIC_API_URL || "http://backend_dashboards:8000";

export async function runQuery(query: any) {
  const res = await fetch(`${API}/api/v1/builder/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(query), cache: 'no-store'
  });
  if (!res.ok) throw new Error('Query failed');
  return res.json();
}

export async function saveDashboard(name: string, schema: any) {
  const res = await fetch(`${API}/api/v1/visualizations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, schema })
  });
  if (!res.ok) throw new Error('Save failed');
  return res.json(); // { id }
}

export async function fetchDashboard(id: string | number) {
  const res = await fetch(`${API}/api/v1/visualizations/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Load failed');
  return res.json(); // { id, name, schema }
}
