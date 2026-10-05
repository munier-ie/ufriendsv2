import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, RefreshCw, Shield, Search } from 'lucide-react';

export default function SecurityEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [severity, setSeverity] = useState('');
    const [userId, setUserId] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '50' });
            if (severity) params.set('severity', severity);
            if (userId) params.set('userId', userId);
            const { data } = await axios.get(`/api/admin/security/events?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            setEvents(data.events || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Could not load security events', error);
        } finally { setLoading(false); }
    }, [page, severity, userId]);
    useEffect(() => { load(); }, [load]);
    const badge = value => value === 'critical' ? 'bg-red-100 text-red-700' : value === 'warning' || value === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
    return <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div><div className="flex items-center gap-2 text-blue-700"><Shield size={20}/><span className="text-xs font-bold uppercase tracking-wider">Security Center</span></div><h1 className="text-2xl font-bold text-slate-900 mt-1">Account activity log</h1><p className="text-sm text-slate-500 mt-1">Wallet changes, security holds and other investigation events.</p></div>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"><RefreshCw size={16}/>Refresh</button>
        </header>
        <section className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 mb-4">
            <label className="flex items-center gap-2 text-sm text-slate-600"><AlertTriangle size={16}/><select className="rounded-md border px-3 py-2" value={severity} onChange={e => {setPage(1); setSeverity(e.target.value);}}><option value="">All severity</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="high">High</option><option value="info">Info</option></select></label>
            <label className="flex items-center gap-2 text-sm text-slate-600"><Search size={16}/><input className="rounded-md border px-3 py-2" placeholder="Filter by user ID" inputMode="numeric" value={userId} onChange={e => {setPage(1); setUserId(e.target.value.replace(/\D/g, ''));}}/></label>
            <span className="ml-auto self-center text-sm text-slate-500">{total.toLocaleString()} events</span>
        </section>
        <section className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['When','Event','Severity','User','Source / Reference','Balance change','Details'].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead>
                <tbody className="divide-y">{loading ? <tr><td colSpan="7" className="p-10 text-center text-slate-500">Loading events…</td></tr> : events.length ? events.map(event => <tr key={event.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(event.createdAt).toLocaleString()}</td><td className="px-4 py-3 font-semibold text-slate-900">{event.kind.replaceAll('_',' ')}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${badge(event.severity)}`}>{event.severity}</span></td><td className="px-4 py-3">{event.userId ? `#${event.userId}` : '—'}</td><td className="max-w-52 break-words px-4 py-3 text-slate-600">{event.source || '—'}{event.reference && <div className="font-mono text-xs">{event.reference}</div>}</td><td className="whitespace-nowrap px-4 py-3">{event.oldBalance != null && event.newBalance != null ? `₦${Number(event.oldBalance).toLocaleString()} → ₦${Number(event.newBalance).toLocaleString()}` : '—'}</td><td className="max-w-sm whitespace-pre-wrap break-words px-4 py-3 text-slate-600">{event.metadata?.reason || event.metadata?.description || event.metadata?.route || '—'}{event.adminId ? <div className="mt-1 font-medium">Admin #{event.adminId}</div> : null}<details className="mt-2"><summary className="cursor-pointer text-blue-700">View audit details</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(event.metadata || {}, null, 2)}</pre></details></td></tr>) : <tr><td colSpan="7" className="p-10 text-center text-slate-500">No security events found.</td></tr>}</tbody>
            </table>
        </section>
        <footer className="flex justify-end gap-2 mt-4"><button disabled={page <= 1} onClick={()=>setPage(p=>p-1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span className="px-2 py-2 text-sm text-slate-500">Page {page}</span><button disabled={page*50 >= total} onClick={()=>setPage(p=>p+1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></footer>
    </main>;
}
