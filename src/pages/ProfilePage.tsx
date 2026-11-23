import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Globe2, MoonStar, Trash2, UploadCloud } from 'lucide-react';
import { ScooterBoy } from '../animations/ScooterBoy';
import { AnimatedPageTransition, ErrorAnimation } from '../animations/MotionPrimitives';
import { authService } from '../services/authService';
import { storageService, type UserDocumentItem } from '../services/storageService';
import { extractApiError } from '../services/api';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeRider, activeRiderIndex, setSessionUser, pushToast } = useApp();
  const { language, setLanguage, languages, t } = useLanguage();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifyOrders, setNotifyOrders] = useState(user?.notifyOrders ?? true);
  const [notifyOffers, setNotifyOffers] = useState(user?.notifyOffers ?? true);
  const [notifyDelivery, setNotifyDelivery] = useState(user?.notifyDelivery ?? true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState<UserDocumentItem[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('DELIVERY_INSTRUCTION');
  const [docUploading, setDocUploading] = useState(false);
  const [supabaseStorageActive, setSupabaseStorageActive] = useState(false);

  const loadDocuments = async () => {
    try {
      const res = await storageService.getDocuments();
      setDocuments(res.documents);
      setSupabaseStorageActive(res.supabaseStorageActive);
    } catch {
      // ignore if unauthenticated
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setMobile(user.mobile);
      setNotifyOrders(user.notifyOrders);
      setNotifyOffers(user.notifyOffers);
      setNotifyDelivery(user.notifyDelivery);
      loadDocuments();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-[#131C17]">
        <div className="mx-auto w-48">
          <ScooterBoy riderIndex={activeRiderIndex} mood="sleeping" speechBubble="Napping until you sign in..." />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">Sign In to View Profile</h1>
        <Link to="/login" className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white">
          {t.signIn}
        </Link>
      </div>
    );
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const updated = await authService.updateProfile(fullName, mobile);
      await setSessionUser(updated);
      pushToast('success', 'Profile details saved');
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      pushToast('success', 'Password changed successfully');
    } catch (err) {
      setError(extractApiError(err));
    }
  };

  const handlePrefsSave = async () => {
    const updated = await authService.updatePreferences({ notifyOrders, notifyOffers, notifyDelivery });
    await setSessionUser(updated);
    pushToast('success', 'Notification preferences saved');
  };

  const handleDeleteAccount = async () => {
    await authService.deleteAccount();
    await setSessionUser(null);
    pushToast('info', 'Account deleted');
    navigate('/login');
  };

  const handleUploadDocument = (file: File | undefined) => {
    if (!file) return;
    setDocUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await storageService.uploadDocument({
          title: docTitle.trim() || file.name,
          docType,
          fileName: file.name,
          dataUrl: String(reader.result || ''),
        });
        setDocTitle('');
        pushToast('success', 'Document saved securely');
        await loadDocuments();
      } catch (err) {
        pushToast('error', extractApiError(err, 'Document upload failed'));
      } finally {
        setDocUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (id: number) => {
    await storageService.deleteDocument(id);
    pushToast('info', 'Document deleted');
    await loadDocuments();
  };

  return (
    <AnimatedPageTransition>
      <div className="space-y-6">
        {/* Profile Header with Sleeping Scooter Rider Mode */}
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-emerald-950 p-6 text-white shadow-md">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-indigo-200">
              <MoonStar className="h-3.5 w-3.5 text-amber-300" />
              <span>Bike Parked · {activeRider.name} in Sleep Mode</span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{user.fullName}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {user.email} · {user.mobile}
            </p>
            <p className="mt-2 text-xs text-emerald-200/90">{t.riderSleepBanner}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
              <Link to="/addresses" className="text-amber-300 hover:underline">
                Manage Google Map Addresses →
              </Link>
              <Link to="/orders" className="text-emerald-300 hover:underline">
                Order History →
              </Link>
              <Link to="/notifications" className="text-sky-300 hover:underline">
                Alerts →
              </Link>
            </div>
          </div>

          <div className="w-48 shrink-0">
            <ScooterBoy
              riderIndex={activeRiderIndex}
              mood="sleeping"
              speechBubble="Zzz... resting on bike!"
            />
          </div>
        </div>

        {error && <ErrorAnimation message={error} />}

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleProfileSave} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-lg font-bold">{t.editProfile}</h2>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mobile Number (10-15 digits)</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Registered Email</label>
              <input value={user.email} disabled className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50" />
            </div>
            <button type="submit" className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800">
              {t.saveChanges}
            </button>
          </form>

          <form onSubmit={handlePasswordChange} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <h2 className="font-display text-lg font-bold">Change Password</h2>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">New Password (6+ chars)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-900" required />
            </div>
            <button type="submit" className="h-10 rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white hover:bg-emerald-800">
              Update Password
            </button>
          </form>
        </div>

        {/* Language & Notification Preferences */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <h2 className="font-display text-base font-bold">Preferred Language</h2>
              </div>
              <p className="text-xs text-slate-500">All 23 regional languages supported</p>
            </div>
            <select
              aria-label="Preferred Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
            <div className="space-y-2">
              <h2 className="font-display text-base font-bold">Notification Preferences</h2>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyOrders} onChange={(e) => setNotifyOrders(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Order Updates</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyDelivery} onChange={(e) => setNotifyDelivery(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Scooter Alerts</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={notifyOffers} onChange={(e) => setNotifyOffers(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Deals</span>
                </label>
              </div>
            </div>
            <button type="button" onClick={handlePrefsSave} className="h-10 rounded-xl border border-emerald-700 px-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Save Preferences
            </button>
          </div>
        </div>

        {/* User Uploads & Delivery Documents (Supabase Storage) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-emerald-950/60 dark:bg-[#131C17]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold">Delivery Documents & Receipts</h2>
              <p className="text-xs text-slate-500">
                Upload gate passes, receipts, or delivery note photos ({supabaseStorageActive ? 'Supabase Storage Active' : 'Local Preview Storage'})
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Document title (e.g. Gate Pass)"
              className="h-10 min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="DELIVERY_INSTRUCTION">Delivery Gate Pass</option>
              <option value="ORDER_RECEIPT">Order Invoice / Receipt</option>
              <option value="PRESCRIPTION_NOTE">Special Item Note</option>
            </select>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800">
              <UploadCloud className="h-4 w-4" />
              <span>{docUploading ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,text/plain"
                className="sr-only"
                onChange={(e) => handleUploadDocument(e.target.files?.[0])}
              />
            </label>
          </div>

          {documents.length > 0 && (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{doc.title}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {doc.fileName} · {(doc.fileSize / 1024).toFixed(1)} KB · {doc.storageProvider}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    aria-label="Delete uploaded document"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-950/60 dark:bg-rose-950/15">
          <h2 className="font-display text-base font-bold text-rose-800 dark:text-rose-300">Danger Zone</h2>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">Permanently delete your FreshCart account and personal data.</p>
          {!deleteConfirm ? (
            <button type="button" onClick={() => setDeleteConfirm(true)} className="mt-3 h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white">
              Delete Account
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <button type="button" onClick={handleDeleteAccount} className="h-9 rounded-xl bg-rose-700 px-4 text-xs font-semibold text-white">
                Confirm Permanent Deletion
              </button>
              <button type="button" onClick={() => setDeleteConfirm(false)} className="h-9 rounded-xl border border-slate-300 px-4 text-xs font-semibold">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </AnimatedPageTransition>
  );
};
