import { useState, FormEvent } from 'react';
import { Rss, Plus, Trash2, Edit3, X, Globe } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRssFeeds, useGlobalSettings } from '../../lib/hooks';
import type { RssFeed } from '../../lib/types';

const CATEGORIES: RssFeed['category'][] = ['cybersecurity', 'webdev', 'general', 'local', 'safety'];

export default function AdminRssFeeds() {
  const feeds = useRssFeeds();
  const [settings, updateSettings] = useGlobalSettings();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RssFeed | null>(null);

  const toggleActive = async (feed: RssFeed) => {
    try {
      await setDoc(doc(db, 'rssFeeds', feed.id), { active: !feed.active }, { merge: true });
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleDelete = async (feed: RssFeed) => {
    if (!confirm(`Delete RSS feed "${feed.label}"?`)) return;
    try {
      await deleteDoc(doc(db, 'rssFeeds', feed.id));
      toast.success('Feed removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Toaster position="bottom-right" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <Rss size={26} className="text-eqc-green" />
            RSS Feeds Library
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Sources for the news ticker. Toggle the tick to control which feeds appear.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
          <Plus size={18} /> Add Feed
        </button>
      </div>

      {/* Global ticker controls */}
      <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600">Ticker controls</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Status</label>
            <button
              onClick={() => updateSettings({ rssEnabled: !settings.rssEnabled })}
              className={`w-full px-3 py-2 text-sm font-bold rounded-lg ${settings.rssEnabled ? 'bg-eqc-green text-white' : 'bg-gray-200 text-gray-500'}`}
            >
              {settings.rssEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Refresh interval (min)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={settings.rssRefreshIntervalMin}
              onChange={(e) => updateSettings({ rssRefreshIntervalMin: Number(e.target.value) || 15 })}
              className="w-full p-2 border border-gray-200 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Scroll speed</label>
            <select
              value={settings.rssScrollSpeed}
              onChange={(e) => updateSettings({ rssScrollSpeed: e.target.value as any })}
              className="w-full p-2 border border-gray-200 rounded text-sm"
            >
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <Rss size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No feeds yet</h3>
          <p className="text-sm text-eqc-muted mb-4">Add an RSS source to start populating the ticker.</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2">
            <Plus size={18} /> Add your first feed
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[40px_1fr_120px_60px_80px] gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
            <span></span>
            <span>Label / URL</span>
            <span>Category</span>
            <span></span>
            <span className="text-right">Actions</span>
          </div>
          {feeds.map(feed => (
            <div key={feed.id} className="grid grid-cols-[40px_1fr_120px_60px_80px] gap-3 px-4 py-3 items-center border-b border-gray-100 last:border-b-0">
              <input
                type="checkbox"
                checked={feed.active}
                onChange={() => toggleActive(feed)}
                className="w-5 h-5 accent-eqc-green cursor-pointer"
              />
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{feed.label}</p>
                <p className="text-xs text-eqc-muted truncate flex items-center gap-1">
                  <Globe size={11} /> {feed.url}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                {feed.category}
              </span>
              <span />
              <div className="flex justify-end gap-1">
                <button onClick={() => { setEditing(feed); setShowForm(true); }} className="text-blue-500 p-1.5 hover:bg-blue-50 rounded">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(feed)} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {showForm && (
        <FeedForm
          existing={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function FeedForm({ existing, onCancel, onSaved }: { existing: RssFeed | null; onCancel: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(existing?.label || '');
  const [url, setUrl] = useState(existing?.url || '');
  const [category, setCategory] = useState<RssFeed['category']>(existing?.category || 'general');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) {
      toast.error('Label and URL are required');
      return;
    }
    setSaving(true);
    try {
      const id = existing?.id || `feed_${Date.now()}`;
      await setDoc(doc(db, 'rssFeeds', id), {
        id,
        label: label.trim(),
        url: url.trim(),
        category,
        active: existing?.active ?? true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      } as RssFeed, { merge: true });
      toast.success(existing ? 'Feed updated' : 'Feed added');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-display font-bold">{existing ? 'Edit feed' : 'Add feed'}</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Label *</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required className="w-full p-3 border rounded-lg" placeholder="e.g. The Hacker News" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Feed URL *</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} required className="w-full p-3 border rounded-lg" placeholder="https://example.com/feed.xml" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as RssFeed['category'])} className="w-full p-3 border rounded-lg">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 disabled:opacity-50">
              {saving ? 'Saving…' : (existing ? 'Save' : 'Add Feed')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
