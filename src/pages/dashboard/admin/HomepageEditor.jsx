import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLandingContent } from '../../../contexts/LandingContentContext';
import { DEFAULT_LANDING_CONTENT } from '../../../lib/landingContent';
import {
  Save, RotateCcw, Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronRight,
  Layout, Star, MessageSquare, HelpCircle, Megaphone, Globe, Link as LinkIcon,
  Info, Sliders,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', rows, placeholder }) {
  if (rows) {
    return (
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-y"
        />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
      />
    </div>
  );
}

function Collapsible({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-50">{children}</div>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function HomepageEditor() {
  const { content, updateContent } = useLandingContent();
  const [saved, setSaved] = useState(false);

  const set = (path, value) => {
    updateContent(prev => {
      const next = JSON.parse(JSON.stringify(prev)); // deep clone
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i].includes('[')) {
          const [k, idx] = keys[i].replace(']', '').split('[');
          obj = obj[k][parseInt(idx)];
        } else {
          obj = obj[keys[i]];
        }
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey.includes('[')) {
        const [k, idx] = lastKey.replace(']', '').split('[');
        obj[k][parseInt(idx)] = value;
      } else {
        obj[lastKey] = value;
      }
      return next;
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm('Reset all homepage content to defaults? This cannot be undone.')) {
      updateContent(DEFAULT_LANDING_CONTENT);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage Editor</h1>
          <p className="text-sm text-gray-500 mt-1">Edit all public-facing content on the landing page. Changes are saved automatically to localStorage.</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-2">
            <Eye className="w-4 h-4" /> Preview
          </a>
          <button onClick={handleReset} className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} className={`inline-flex items-center px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all gap-2 ${saved ? 'bg-green-500' : 'bg-primary hover:bg-primary/90'}`}>
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Navbar ── */}
      <Collapsible icon={Layout} title="Navbar" defaultOpen>
        <Field label="Brand Name" value={content.navbar.brandName} onChange={v => set('navbar.brandName', v)} />
      </Collapsible>

      {/* ── Hero ── */}
      <Collapsible icon={Sliders} title="Hero Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Badge Text" value={content.hero.badge} onChange={v => set('hero.badge', v)} />
          <Field label="Primary Button" value={content.hero.primaryBtn} onChange={v => set('hero.primaryBtn', v)} />
          <Field label="Title (before highlight)" value={content.hero.title} onChange={v => set('hero.title', v)} />
          <Field label="Title Highlight (colored)" value={content.hero.titleHighlight} onChange={v => set('hero.titleHighlight', v)} />
          <Field label="Title End (after highlight)" value={content.hero.titleEnd} onChange={v => set('hero.titleEnd', v)} />
          <Field label="Secondary Button" value={content.hero.secondaryBtn} onChange={v => set('hero.secondaryBtn', v)} />
        </div>
        <Field label="Subtitle" value={content.hero.subtitle} onChange={v => set('hero.subtitle', v)} rows={2} />
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Stats (Value &amp; Label)</label>
          <div className="space-y-2">
            {content.hero.stats.map((stat, i) => (
              <div key={i} className="flex gap-3">
                <input
                  value={stat.value}
                  onChange={e => {
                    const stats = [...content.hero.stats];
                    stats[i] = { ...stats[i], value: e.target.value };
                    set('hero.stats', stats);
                  }}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <input
                  value={stat.label}
                  onChange={e => {
                    const stats = [...content.hero.stats];
                    stats[i] = { ...stats[i], label: e.target.value };
                    set('hero.stats', stats);
                  }}
                  placeholder="Label"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </Collapsible>

      {/* ── Services ── */}
      <Collapsible icon={Globe} title="Services Section">
        <div className="space-y-3">
          {content.services.map((service, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800">{service.title}</span>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={service.active !== false}
                    onChange={e => {
                      const svcs = JSON.parse(JSON.stringify(content.services));
                      svcs[i].active = e.target.checked;
                      set('services', svcs);
                    }}
                    className="w-4 h-4 text-primary rounded"
                  />
                  Show on homepage
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={service.title} onChange={v => {
                  const svcs = JSON.parse(JSON.stringify(content.services));
                  svcs[i].title = v;
                  set('services', svcs);
                }} />
                <Field label="Color (e.g. blue, green)" value={service.color || ''} onChange={v => {
                  const svcs = JSON.parse(JSON.stringify(content.services));
                  svcs[i].color = v;
                  set('services', svcs);
                }} />
              </div>
              <Field label="Description" value={service.description} rows={2} onChange={v => {
                const svcs = JSON.parse(JSON.stringify(content.services));
                svcs[i].description = v;
                set('services', svcs);
              }} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Features (comma-separated)</label>
                <input
                  value={(service.features || []).join(', ')}
                  onChange={e => {
                    const svcs = JSON.parse(JSON.stringify(content.services));
                    svcs[i].features = e.target.value.split(',').map(f => f.trim()).filter(Boolean);
                    set('services', svcs);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* ── Benefits ── */}
      <Collapsible icon={Star} title="Benefits Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Section Badge" value={content.benefits.sectionBadge} onChange={v => set('benefits.sectionBadge', v)} />
          <Field label="Heading" value={content.benefits.heading} onChange={v => set('benefits.heading', v)} />
          <Field label="Rating Text" value={content.benefits.ratingText} onChange={v => set('benefits.ratingText', v)} />
          <Field label="Review Count" value={content.benefits.reviewCount} onChange={v => set('benefits.reviewCount', v)} />
        </div>
        <Field label="Subheading" value={content.benefits.subheading} onChange={v => set('benefits.subheading', v)} rows={2} />
        <Field label="Banner Title" value={content.benefits.bannerTitle} onChange={v => set('benefits.bannerTitle', v)} />
        <Field label="Banner Subtitle" value={content.benefits.bannerSubtitle} onChange={v => set('benefits.bannerSubtitle', v)} rows={2} />
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Benefit Items (Title &amp; Description)</label>
          <div className="space-y-3">
            {content.benefits.items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                <Field label="Title" value={item.title} onChange={v => {
                  const items = JSON.parse(JSON.stringify(content.benefits.items));
                  items[i].title = v;
                  set('benefits.items', items);
                }} />
                <Field label="Description" value={item.description} rows={2} onChange={v => {
                  const items = JSON.parse(JSON.stringify(content.benefits.items));
                  items[i].description = v;
                  set('benefits.items', items);
                }} />
              </div>
            ))}
          </div>
        </div>
      </Collapsible>

      {/* ── Testimonials ── */}
      <Collapsible icon={MessageSquare} title="Testimonials Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Section Badge" value={content.testimonials.sectionBadge} onChange={v => set('testimonials.sectionBadge', v)} />
          <Field label="Heading" value={content.testimonials.heading} onChange={v => set('testimonials.heading', v)} />
        </div>
        <Field label="Subheading" value={content.testimonials.subheading} onChange={v => set('testimonials.subheading', v)} rows={2} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500">Testimonials</label>
            <button
              onClick={() => {
                const items = [...content.testimonials.items, { name: '', role: '', initials: '', content: '' }];
                set('testimonials.items', items);
              }}
              className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary/80"
            ><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          <div className="space-y-3">
            {content.testimonials.items.map((t, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Testimonial {i + 1}</span>
                  <button onClick={() => {
                    const items = content.testimonials.items.filter((_, idx) => idx !== i);
                    set('testimonials.items', items);
                  }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Name" value={t.name} onChange={v => {
                    const items = JSON.parse(JSON.stringify(content.testimonials.items));
                    items[i].name = v;
                    items[i].initials = v.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    set('testimonials.items', items);
                  }} />
                  <Field label="Role" value={t.role} onChange={v => {
                    const items = JSON.parse(JSON.stringify(content.testimonials.items));
                    items[i].role = v;
                    set('testimonials.items', items);
                  }} />
                  <Field label="Initials" value={t.initials} onChange={v => {
                    const items = JSON.parse(JSON.stringify(content.testimonials.items));
                    items[i].initials = v;
                    set('testimonials.items', items);
                  }} />
                </div>
                <Field label="Content" value={t.content} rows={3} onChange={v => {
                  const items = JSON.parse(JSON.stringify(content.testimonials.items));
                  items[i].content = v;
                  set('testimonials.items', items);
                }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Stats Row</label>
          <div className="space-y-2">
            {content.testimonials.stats.map((stat, i) => (
              <div key={i} className="flex gap-3">
                <input value={stat.value} onChange={e => {
                  const stats = [...content.testimonials.stats];
                  stats[i] = { ...stats[i], value: e.target.value };
                  set('testimonials.stats', stats);
                }} placeholder="Value" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <input value={stat.label} onChange={e => {
                  const stats = [...content.testimonials.stats];
                  stats[i] = { ...stats[i], label: e.target.value };
                  set('testimonials.stats', stats);
                }} placeholder="Label" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            ))}
          </div>
        </div>
      </Collapsible>

      {/* ── FAQ ── */}
      <Collapsible icon={HelpCircle} title="FAQ Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Section Badge" value={content.faq.sectionBadge} onChange={v => set('faq.sectionBadge', v)} />
          <Field label="Heading" value={content.faq.heading} onChange={v => set('faq.heading', v)} />
          <Field label="Support Email" value={content.faq.support.email} onChange={v => set('faq.support.email', v)} />
          <Field label="Support Phone" value={content.faq.support.phone} onChange={v => set('faq.support.phone', v)} />
          <Field label="Support Hours" value={content.faq.support.hours} onChange={v => set('faq.support.hours', v)} />
        </div>
        <Field label="Subheading" value={content.faq.subheading} onChange={v => set('faq.subheading', v)} rows={2} />
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500">FAQ Items</label>
            <button onClick={() => {
              const items = [...content.faq.items, { question: '', answer: '' }];
              set('faq.items', items);
            }} className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary/80"><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          <div className="space-y-3">
            {content.faq.items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">FAQ {i + 1}</span>
                  <button onClick={() => {
                    const items = content.faq.items.filter((_, idx) => idx !== i);
                    set('faq.items', items);
                  }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Field label="Question" value={item.question} onChange={v => {
                  const items = JSON.parse(JSON.stringify(content.faq.items));
                  items[i].question = v;
                  set('faq.items', items);
                }} />
                <Field label="Answer" value={item.answer} rows={3} onChange={v => {
                  const items = JSON.parse(JSON.stringify(content.faq.items));
                  items[i].answer = v;
                  set('faq.items', items);
                }} />
              </div>
            ))}
          </div>
        </div>
      </Collapsible>

      {/* ── CTA ── */}
      <Collapsible icon={Megaphone} title="CTA Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Badge" value={content.cta.badge} onChange={v => set('cta.badge', v)} />
          <Field label="Heading" value={content.cta.heading} onChange={v => set('cta.heading', v)} />
          <Field label="Heading Highlight" value={content.cta.headingHighlight} onChange={v => set('cta.headingHighlight', v)} />
          <Field label="Primary Button" value={content.cta.primaryBtn} onChange={v => set('cta.primaryBtn', v)} />
          <Field label="Secondary Button" value={content.cta.secondaryBtn} onChange={v => set('cta.secondaryBtn', v)} />
        </div>
        <Field label="Subheading" value={content.cta.subheading} onChange={v => set('cta.subheading', v)} rows={2} />
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Trust Badges (comma-separated)</label>
          <input
            value={(content.cta.badges || []).join(', ')}
            onChange={e => set('cta.badges', e.target.value.split(',').map(b => b.trim()).filter(Boolean))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
      </Collapsible>

      {/* ── Footer ── */}
      <Collapsible icon={Info} title="Footer">
        <Field label="Description" value={content.footer.description} rows={3} onChange={v => set('footer.description', v)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Copyright Text" value={content.footer.copyright} onChange={v => set('footer.copyright', v)} />
          <Field label="Tagline" value={content.footer.tagline} onChange={v => set('footer.tagline', v)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Social Links</label>
          <div className="space-y-2">
            <Field label="Facebook URL" value={content.footer.social.facebook} onChange={v => set('footer.social.facebook', v)} type="url" />
            <Field label="Twitter URL" value={content.footer.social.twitter} onChange={v => set('footer.social.twitter', v)} type="url" />
            <Field label="Instagram URL" value={content.footer.social.instagram} onChange={v => set('footer.social.instagram', v)} type="url" />
          </div>
        </div>
      </Collapsible>

      {/* Sticky Save */}
      <div className="flex justify-end pt-2 pb-6">
        <button onClick={handleSave} className={`inline-flex items-center px-8 py-3 text-sm font-semibold text-white rounded-xl transition-all gap-2 shadow-lg ${saved ? 'bg-green-500 shadow-green-200' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}>
          <Save className="w-4 h-4" /> {saved ? '✓ Saved Successfully!' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
