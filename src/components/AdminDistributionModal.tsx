import React, { useRef, useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Lock, 
  Unlock, 
  KeyRound, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Info, 
  Trash2, 
  X,
  LogOut,
  Eye,
  EyeOff,
  BarChart3,
  Users,
  FileText,
  FileSpreadsheet,
  ClipboardCopy,
  TrendingUp,
  Globe,
  Share2,
  RotateCcw
} from 'lucide-react';
import { TopicDistributionFile } from '../types';
import { parseTopicDistributionExcel } from '../utils/excelParser';
import { 
  getLocalAnalytics, 
  fetchGlobalAnalytics, 
  resetAnalytics, 
  AnalyticsSummary 
} from '../utils/analytics';

interface AdminDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributions: TopicDistributionFile[];
  onAddDistribution: (dist: TopicDistributionFile) => void;
  onDeleteDistribution: (id: string) => void;
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const DEFAULT_ADMIN_PASS = 'oyss2025';

export const AdminDistributionModal: React.FC<AdminDistributionModalProps> = ({
  isOpen,
  onClose,
  distributions,
  onAddDistribution,
  onDeleteDistribution,
  isAuthenticated,
  onLogin,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'distributions' | 'cloud'>('stats');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stored admin password
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('oyss_admin_password') || DEFAULT_ADMIN_PASS;
  });

  // Change password mode inside admin panel
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);

  // Analytics Data & Live Fetch Status
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(getLocalAnalytics);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Function to refresh global live analytics from cloud
  const refreshLiveAnalytics = async () => {
    setIsLoadingGlobal(true);
    try {
      const liveData = await fetchGlobalAnalytics();
      setAnalytics(liveData);
      setLastSyncTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  // Cloud webhook URL for multi-user sync
  const [cloudWebhookUrl, setCloudWebhookUrl] = useState(() => {
    return localStorage.getItem('oyss_cloud_analytics_url') || '';
  });
  const [webhookSaved, setWebhookSaved] = useState(false);

  // Distribution upload state
  const [isNational, setIsNational] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refresh analytics whenever modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      refreshLiveAnalytics();
    } else {
      setPasswordInput('');
      setLoginError(null);
      setIsChangingPass(false);
      setNewPass('');
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login Attempt
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      onLogin();
      setLoginError(null);
      setPasswordInput('');
    } else {
      setLoginError('Hatalı yönetici şifresi! Lütfen tekrar deneyiniz.');
    }
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 4) {
      alert('Şifre en az 4 karakter olmalıdır.');
      return;
    }
    setAdminPassword(newPass);
    localStorage.setItem('oyss_admin_password', newPass);
    setIsChangingPass(false);
    setNewPass('');
    setPassChangeSuccess(true);
    setTimeout(() => setPassChangeSuccess(false), 3000);
  };

  // Save Cloud Webhook URL
  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('oyss_cloud_analytics_url', cloudWebhookUrl.trim());
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 3000);
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsed = await parseTopicDistributionExcel(file);
      parsed.isNationalExam = isNational;
      if (isNational) {
        parsed.nationalExamNote = 'MEB tarafından ÜLKE GENELİ ORTAK YAZILI SINAV olarak uygulanmaktadır.';
      }

      onAddDistribution(parsed);
      setSuccessMsg(`"${file.name}" başarıyla eklendi! (${parsed.grade}. Sınıf ${parsed.subject}, ${parsed.scenarios.length} senaryo)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Excel dosyası işlenirken bir hata oluştu.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download all distributions as JSON file for Vercel
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(distributions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distributions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset Analytics
  const handleResetAnalytics = () => {
    if (confirm('Tüm sayaçlar ve kullanım istatistikleri sıfırlanacak. Emin misiniz?')) {
      resetAnalytics();
      setAnalytics(getLocalAnalytics());
    }
  };

  // Calculate percentages
  const totalLevels = (analytics.levelCounts.ortaokul || 0) + (analytics.levelCounts.lise || 0);
  const ortaokulPct = totalLevels > 0 ? Math.round(((analytics.levelCounts.ortaokul || 0) / totalLevels) * 100) : 50;
  const lisePct = totalLevels > 0 ? 100 - ortaokulPct : 50;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
              isAuthenticated ? 'bg-emerald-600' : 'bg-red-600'
            }`}>
              {isAuthenticated ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>{isAuthenticated ? 'Yönetici Paneli' : 'Yönetici Girişi'}</span>
                {isAuthenticated && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Oturum Açık
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {isAuthenticated 
                  ? 'Sistem yönetimi ve MEB konu soru dağılımları'
                  : 'Yalnızca yetkili sistem yöneticisi giriş yapabilir'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. STATE: NOT AUTHENTICATED (LOGIN SCREEN) */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 space-y-6">
            <div className="text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                Yönetici Şifrenizi Giriniz
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Yönetim paneline erişmek için lütfen şifrenizi giriniz.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="max-w-sm mx-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Yönetici Şifresi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Şifrenizi yazınız..."
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {loginError && (
                  <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {loginError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-md shadow-red-600/20"
                >
                  Giriş Yap
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* 2. STATE: AUTHENTICATED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Top Navigation Tabs & Admin Status */}
            <div className="px-6 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    activeTab === 'stats'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Kullanım İstatistikleri
                </button>

                <button
                  onClick={() => setActiveTab('distributions')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    activeTab === 'distributions'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Konu Soru Dağılımları ({distributions.length})
                </button>

                <button
                  onClick={() => setActiveTab('cloud')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    activeTab === 'cloud'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Vercel & Canlı Sayaç Rehberi
                </button>
              </div>

              {/* Admin Actions: Change Password & Logout */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangingPass(!isChangingPass)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
                >
                  Şifre Değiştir
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Çıkış Yap
                </button>
              </div>
            </div>

            {/* Change Password Dropdown Panel */}
            {isChangingPass && (
              <form onSubmit={handleChangePassword} className="px-6 py-3 bg-amber-50/80 border-b border-amber-200 flex flex-wrap items-center gap-3">
                <span className="font-bold text-amber-950">Yeni Şifreniz:</span>
                <input
                  type="text"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="En az 4 karakter yeni şifre..."
                  className="bg-white border border-amber-300 rounded-lg px-3 py-1 text-xs text-slate-900 font-mono w-56"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPass(false)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  İptal
                </button>
              </form>
            )}

            {passChangeSuccess && (
              <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Yönetici şifreniz başarıyla değiştirildi!</span>
              </div>
            )}

            {/* TAB CONTENT */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">

              {/* TAB 1: KULLANIM İSTATİSTİKLERİ VE SAYAÇLAR */}
              {activeTab === 'stats' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top Stats Overview & Live Status */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Canlı Türkiye Geneli Sayaç Aktif</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            Vercel Girişi Gerekmez
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Siteyi kullanan tüm öğretmenlerin işlemleri merkezi bulut sayacımızda anlık toplanır. Vercel'e girmeden buradan takip edebilirsiniz.
                          {lastSyncTime && <span className="ml-1 text-slate-500 font-mono">(Son senkron: {lastSyncTime})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshLiveAnalytics}
                        disabled={isLoadingGlobal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-60"
                        title="Buluttaki en güncel canlı verileri çek"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isLoadingGlobal ? 'animate-spin' : ''}`} />
                        {isLoadingGlobal ? 'Güncelleniyor...' : 'Canlı Verileri Yenile'}
                      </button>

                      <button
                        onClick={handleResetAnalytics}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
                        title="Sayaçları sıfırla"
                      >
                        <Trash2 className="w-3 h-3" />
                        Sıfırla
                      </button>
                    </div>
                  </div>

                  {/* 4 Big KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Toplam Ziyaretçi */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Toplam Kullanıcı / Oturum
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono block mt-1">
                        {analytics.totalVisits}
                      </span>
                      <span className="text-[10px] text-slate-400">Siteyi Açan Kişi</span>
                    </div>

                    {/* Toplam PDF Çıktısı */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Alınan PDF Çıktıları
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-red-600 font-mono block mt-1">
                        {analytics.totalPdfExports}
                      </span>
                      <span className="text-[10px] text-slate-400">İndirilen PDF Sayısı</span>
                    </div>

                    {/* Toplam Excel Çıktısı */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        Alınan Excel Çıktıları
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono block mt-1">
                        {analytics.totalExcelExports}
                      </span>
                      <span className="text-[10px] text-slate-400">İndirilen Excel Listesi</span>
                    </div>

                    {/* e-Okul Kopyalama */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-2">
                        <ClipboardCopy className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">
                        e-Okul Panoya Kopyalama
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono block mt-1">
                        {analytics.totalEOkulCopies}
                      </span>
                      <span className="text-[10px] text-slate-400">e-Okul'a Aktarılan</span>
                    </div>
                  </div>

                  {/* Kademe & Sınıf Seviyeleri Dağılımı */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Kademe Yüzdeleri */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                        Kademe Tercih Dağılımı
                      </h5>

                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">Ortaokul (5, 6, 7, 8. Sınıf)</span>
                            <span className="text-red-700">%{ortaokulPct} ({analytics.levelCounts.ortaokul || 0} İşlem)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-red-600 h-full rounded-full" style={{ width: `${ortaokulPct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700">Lise (9, 10, 11, 12. Sınıf)</span>
                            <span className="text-blue-700">%{lisePct} ({analytics.levelCounts.lise || 0} İşlem)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${lisePct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sınıf Seviyeleri Grafiği */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        En Çok Kullanılan Sınıf Seviyeleri
                      </h5>

                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <div key={g} className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="block font-bold text-slate-800 text-xs">{g}. Sınıf</span>
                            <span className="block font-mono font-black text-red-600 text-sm mt-0.5">
                              {analytics.gradeCounts[g] || 0}
                            </span>
                            <span className="text-[10px] text-slate-400">İşlem</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* En Popüler Dersler & Son Canlı Hareketler */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* En Çok Kullanılan Dersler */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        En Popüler Sınav Dersleri
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {Object.entries(analytics.subjectCounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([subj, count]) => (
                            <div key={subj} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{subj}</span>
                              <span className="font-mono font-bold text-red-600 text-xs">{count} Kullanım</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Son Canlı Hareket Listesi */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Son Yapılan İşlemler (Canlı Hareketler)
                      </h5>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {analytics.recentEvents.length === 0 ? (
                          <p className="text-slate-400 text-center py-4">Henüz hareket kaydedilmedi.</p>
                        ) : (
                          analytics.recentEvents.map(ev => (
                            <div key={ev.id} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${
                                  ev.type === 'pdf_download' ? 'bg-red-500' :
                                  ev.type === 'excel_download' ? 'bg-emerald-500' :
                                  ev.type === 'eokul_copy' ? 'bg-indigo-500' : 'bg-blue-500'
                                }`} />
                                <span className="font-bold text-slate-800">
                                  {ev.classBranch || `${ev.grade}. Sınıf`} • {ev.subject}
                                </span>
                                {ev.schoolName && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                    {ev.schoolName}
                                  </span>
                                )}
                                <span className="text-slate-500">
                                  ({ev.type === 'pdf_download' ? 'PDF İndirildi' :
                                    ev.type === 'excel_download' ? 'Excel İndirildi' :
                                    ev.type === 'eokul_copy' ? 'e-Okul Kopyalandı' : 'Site Ziyareti'})
                                </span>
                                {ev.studentCount ? (
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    ({ev.studentCount} Öğr.)
                                  </span>
                                ) : null}
                              </div>
                              <span className="font-mono text-slate-400 text-[10px]">{ev.timestamp}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: KONU SORU DAĞILIMLARI YÖNETİMİ */}
              {activeTab === 'distributions' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Upload New Excel */}
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-red-600" />
                      Yeni MEB Konu Soru Dağılım Tablosu Yükle (.xlsx)
                    </h4>

                    {/* Checkbox for National Common Exam */}
                    <label className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                      <input
                        type="checkbox"
                        checked={isNational}
                        onChange={e => setIsNational(e.target.checked)}
                        className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">
                          Bu sınav MEB tarafından "Ülke Geneli Ortak Sınav" olarak yapılıyor
                        </span>
                        <span className="text-[11px] text-slate-500">
                          İşaretlendiğinde ders kartında özel altın/kırmızı "MEB Ülke Geneli Ortak Sınav" rozeti çıkar.
                        </span>
                      </div>
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
                      >
                        <Upload className="w-4 h-4" />
                        Excel Dosyası Seç ve Ekle
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                      />
                      <span className="text-[11px] text-slate-500">
                        MEB'in yayımladığı resmi Excel formatları doğrudan desteklenir.
                      </span>
                    </div>

                    {successMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {errorMsg && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Currently Loaded Distributions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-800">
                        Yüklenen Konu Soru Dağılımları ({distributions.length})
                      </h4>
                      {distributions.length > 0 && (
                        <button
                          type="button"
                          onClick={handleDownloadJson}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
                          title="Tüm tabloları Vercel yayını için distributions.json dosyası olarak indir"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          Vercel İçin JSON İndir
                        </button>
                      )}
                    </div>

                    {distributions.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <Layers className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-700">Yüklü Konu Soru Dağılım Tablosu Bulunmuyor</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Hazır tablo yüklenmemiştir. Öğretmenler doğrudan soru sayısı belirleyip e-Okul için not girişi yapabilir veya ihtiyaç halinde yukarıdan Excel (.xlsx) yükleyebilirsiniz.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {distributions.map(d => (
                          <div
                            key={d.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">
                                  {d.grade}. Sınıf {d.subject}
                                </span>
                                {d.isNationalExam && (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                                    Ülke Geneli
                                  </span>
                                )}
                                <span className="text-slate-400 text-[11px]">
                                  ({d.scenarios.length} Senaryo)
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{d.title}</p>
                            </div>

                            <button
                              onClick={() => onDeleteDistribution(d.id)}
                              className="text-slate-300 hover:text-red-600 p-1.5 transition"
                              title="Bu dağılımı kaldır"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VERCEL & CANLI SAYAÇ REHBERİ */}
              {activeTab === 'cloud' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-950 space-y-3">
                    <h4 className="font-black text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Vercel'e Girmeden İstatistikleri Nasıl Görürsünüz?
                    </h4>
                    <p className="leading-relaxed text-xs">
                      <strong>Vercel paneline hiç giriş yapmanıza gerek yoktur!</strong> Sistemimiz arka planda genel bir bulut sayacı (CountAPI) kullanır. Projenizi Vercel'e yükleyip linkini öğretmenlerle paylaştığınız andan itibaren:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="p-3.5 bg-white rounded-xl border border-blue-200">
                        <strong className="block text-blue-900 mb-1">1. Otomatik Merkezi Sayaç (Şu Anda Aktif)</strong>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Türkiye'nin herhangi bir yerinden bir öğretmen sitenizi açtığında, PDF indirdiğinde veya e-Okul için not kopyaladığında sayaçlar anında +1 artar. Siz istediğiniz zaman telefonunuzdan veya bilgisayarınızdan sitenizi açıp <strong>Yönetici Paneli</strong>'ne şifrenizle girdiğinizde bu toplam sayıları canlı olarak görürsünüz.
                        </p>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-blue-200">
                        <strong className="block text-blue-900 mb-1">2. İsteğe Bağlı: Google E-Tablo / Webhook</strong>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Eğer isterseniz yapılan her işlemin saatini ve sınıfını kendi Google E-Tablonuza da anlık satır satır düşürmek için aşağıya ücretsiz bir Apps Script Webhook linki ekleyebilirsiniz. (Zorunlu değildir, ilk yöntem zaten çalışmaktadır).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Webhook Configuration Form */}
                  <form onSubmit={handleSaveWebhook} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold text-slate-800">
                      Merkezi Bulut Sayaç Webhook URL'si (İsteğe Bağlı)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Örn: Ücretsiz Google Apps Script Webhook URL'nizi buraya kaydederek tüm öğretmenlerin hareketlerini canlı e-tablonuza da aktarabilirsiniz.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={cloudWebhookUrl}
                        onChange={e => setCloudWebhookUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec veya Firebase URL"
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-xs"
                      >
                        Kaydet
                      </button>
                    </div>

                    {webhookSaved && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-1.5 font-medium">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Bulut sayaç bağlantısı kaydedildi!</span>
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
