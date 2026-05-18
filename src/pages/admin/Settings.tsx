import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2, Wifi, Phone } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useGlobalSettings } from '../../lib/hooks';
import type { GlobalSettings, Contact } from '../../lib/types';
import { DEFAULT_SETTINGS } from '../../lib/types';

export default function AdminSettings() {
  const [settings, updateSettings] = useGlobalSettings();
  const [draft, setDraft] = useState<GlobalSettings>(settings);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(settings);
  }, [settings, dirty]);

  const patch = (p: Partial<GlobalSettings>) => {
    setDirty(true);
    setDraft(prev => ({ ...prev, ...p }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(draft);
      setDirty(false);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    }
  };

  const handleRevert = () => {
    setDraft(settings);
    setDirty(false);
  };

  const addContact = () => {
    patch({ contacts: [...draft.contacts, { name: '', role: '', email: '', phone: '' }] });
  };

  const updateContact = (idx: number, p: Partial<Contact>) => {
    const next = [...draft.contacts];
    next[idx] = { ...next[idx], ...p };
    patch({ contacts: next });
  };

  const removeContact = (idx: number) => {
    patch({ contacts: draft.contacts.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6 max-w-6xl pb-24">
      <Toaster position="bottom-right" />

      <div>
        <h2 className="text-2xl font-display font-bold flex items-center gap-3">
          <SettingsIcon size={26} className="text-eqc-green" />
          Global Settings
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Configuration that affects the whole app. Saves to <code className="font-mono text-xs">settings/global</code>.</p>
      </div>

      {/* Carousel */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-lg font-display font-bold">Carousel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Slide duration (ms)</label>
            <input
              type="number"
              min={1000}
              max={60000}
              step={500}
              value={draft.carouselSlideDurationMs}
              onChange={(e) => patch({ carouselSlideDurationMs: Number(e.target.value) || DEFAULT_SETTINGS.carouselSlideDurationMs })}
              className="w-full p-3 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Transition</label>
            <select
              value={draft.carouselTransition}
              onChange={(e) => patch({ carouselTransition: e.target.value as 'fade' | 'slide' })}
              className="w-full p-3 border rounded-lg"
            >
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
            </select>
          </div>
        </div>
      </section>

      {/* Daily reset */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-lg font-display font-bold">Daily reset</h3>
        <div>
          <label className="block text-sm font-bold mb-1">Reset hour (24h)</label>
          <input
            type="number"
            min={0}
            max={23}
            value={draft.resetTimeHour}
            onChange={(e) => patch({ resetTimeHour: Number(e.target.value) })}
            className="w-32 p-3 border rounded-lg"
          />
          <p className="text-xs text-eqc-muted mt-1">Rooms reset to "Available" at this hour every day. Default 22 (10pm).</p>
        </div>
      </section>

      {/* WiFi */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-lg font-display font-bold flex items-center gap-2"><Wifi size={20} /> Campus WiFi</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">SSID</label>
            <input value={draft.wifiSsid} onChange={(e) => patch({ wifiSsid: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="EQC-network" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Password</label>
            <input value={draft.wifiPassword} onChange={(e) => patch({ wifiPassword: e.target.value })} className="w-full p-3 border rounded-lg font-mono" placeholder="leave blank for open network" />
          </div>
        </div>
        <p className="text-xs text-eqc-muted">Displayed on the mobile companion view.</p>
      </section>

      {/* Contacts */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-display font-bold flex items-center gap-2"><Phone size={20} /> Contact directory</h3>
          <button onClick={addContact} className="text-eqc-green font-bold text-sm flex items-center gap-1 hover:bg-eqc-green/5 px-3 py-1.5 rounded-lg">
            <Plus size={16} /> Add contact
          </button>
        </div>

        {draft.contacts.length === 0 ? (
          <p className="text-sm text-eqc-muted italic">No contacts yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px] space-y-3">
              {draft.contacts.map((c, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_120px_40px] gap-2 items-center bg-gray-50 p-3 rounded-lg">
                  <input value={c.name} onChange={(e) => updateContact(idx, { name: e.target.value })} placeholder="Name" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <input value={c.role} onChange={(e) => updateContact(idx, { role: e.target.value })} placeholder="Role" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <input value={c.email} onChange={(e) => updateContact(idx, { email: e.target.value })} placeholder="email@example.com" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <input value={c.phone || ''} onChange={(e) => updateContact(idx, { phone: e.target.value })} placeholder="Phone (optional)" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <button onClick={() => removeContact(idx)} className="text-red-500 p-1.5 hover:bg-red-50 rounded justify-self-end">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-700 font-bold">Unsaved changes</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500">All changes saved</span>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={handleRevert} disabled={!dirty} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">
            Revert
          </button>
          <button onClick={handleSave} disabled={!dirty} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
