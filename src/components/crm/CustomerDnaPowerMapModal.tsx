import React, { useState, useMemo } from 'react';
import {
  Dna,
  Users,
  Target,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  Building2,
  Award,
  Zap,
  HelpCircle,
  Plus,
  Compass
} from 'lucide-react';
import {
  CustomerDnaPowerMapProfile,
  OrgPowerContact,
  DealOrgRole,
  DiscPersonality,
  ShipperPersonaType
} from '../../types/customerDnaPowerMap';
import { CustomerDnaPowerMapService } from '../../services/crm/customerDnaPowerMapService';

interface CustomerDnaPowerMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerName?: string;
  onApplyPlaybookToQuote?: (playbook: CustomerDnaPowerMapProfile['salesPlaybook']) => void;
}

export const CustomerDnaPowerMapModal: React.FC<CustomerDnaPowerMapModalProps> = ({
  isOpen,
  onClose,
  initialCustomerName,
  onApplyPlaybookToQuote
}) => {
  const [profiles, setProfiles] = useState<CustomerDnaPowerMapProfile[]>(() =>
    CustomerDnaPowerMapService.getProfiles()
  );

  const [selectedProfileId, setSelectedProfileId] = useState<string>(() => {
    if (initialCustomerName) {
      const match = CustomerDnaPowerMapService.getProfileByCustomerName(initialCustomerName);
      if (match) return match.id;
    }
    const all = CustomerDnaPowerMapService.getProfiles();
    return all[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'dna' | 'powermap' | 'scripts'>('dna');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Script generator state
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<'ZALO' | 'CALL' | 'EMAIL'>('ZALO');

  // Add Contact Form Modal state
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactForm, setNewContactForm] = useState<Partial<OrgPowerContact>>({
    name: '',
    title: '',
    department: 'PURCHASING',
    roleInDeal: 'INFLUENCER',
    influenceLevel: 7,
    personalityStyle: 'DOMINANT',
    stanceTowardUs: 'NEUTRAL',
    personalPainPoint: '',
    hiddenAgenda: '',
    preferredChannel: 'ZALO',
    notes: '',
    phone: '',
    email: ''
  });

  const currentProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || profiles[0];
  }, [profiles, selectedProfileId]);

  // Set default contact for script tab
  React.useEffect(() => {
    if (currentProfile && currentProfile.powerMapContacts.length > 0) {
      if (!selectedContactId || !currentProfile.powerMapContacts.some(c => c.id === selectedContactId)) {
        setSelectedContactId(currentProfile.powerMapContacts[0].id);
      }
    }
  }, [currentProfile, selectedContactId]);

  if (!isOpen || !currentProfile) return null;

  const personaMeta = CustomerDnaPowerMapService.autoAnalyzePersona(currentProfile.sensitivityScores);

  const selectedContact = currentProfile.powerMapContacts.find(c => c.id === selectedContactId) || currentProfile.powerMapContacts[0];

  const generatedScript = selectedContact
    ? CustomerDnaPowerMapService.generateInstantScript(currentProfile, selectedContact, selectedChannel)
    : null;

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactForm.name || !newContactForm.title) return;

    const contactToAdd: OrgPowerContact = {
      id: `contact-${Date.now()}`,
      name: newContactForm.name,
      title: newContactForm.title,
      department: newContactForm.department || 'PURCHASING',
      roleInDeal: newContactForm.roleInDeal || 'INFLUENCER',
      influenceLevel: Number(newContactForm.influenceLevel) || 7,
      personalityStyle: newContactForm.personalityStyle || 'DOMINANT',
      stanceTowardUs: newContactForm.stanceTowardUs || 'NEUTRAL',
      personalPainPoint: newContactForm.personalPainPoint || '',
      hiddenAgenda: newContactForm.hiddenAgenda || '',
      preferredChannel: newContactForm.preferredChannel || 'ZALO',
      notes: newContactForm.notes || '',
      phone: newContactForm.phone || '',
      email: newContactForm.email || ''
    };

    const updated = CustomerDnaPowerMapService.addPowerMapContact(currentProfile.id, contactToAdd);
    if (updated) {
      setProfiles(CustomerDnaPowerMapService.getProfiles());
      setIsAddingContact(false);
      setSelectedContactId(contactToAdd.id);
    }
  };

  const getRoleBadge = (role: DealOrgRole) => {
    switch (role) {
      case 'DECISION_MAKER':
        return {
          label: 'Quyết Định Tối Cao',
          color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      case 'CHAMPION':
        return {
          label: 'Đồng Minh Ruột',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'BLOCKER':
        return {
          label: 'Rào Cản (Blocker)',
          color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
          dot: 'bg-rose-500'
        };
      case 'INFLUENCER':
        return {
          label: 'Người Tham Mưu',
          color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500'
        };
      case 'GATEKEEPER':
        return {
          label: 'Người Gác Cổng',
          color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400'
        };
    }
  };

  const getStanceBadge = (stance: OrgPowerContact['stanceTowardUs']) => {
    switch (stance) {
      case 'STRONGLY_IN_FAVOR':
        return { text: 'Ủng hộ tuyệt đối', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200' };
      case 'LEANING_POSITIVE':
        return { text: 'Nghiêng về ủng hộ', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200' };
      case 'NEUTRAL':
        return { text: 'Trung lập', color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 border-slate-200' };
      case 'SKEPTICAL':
        return { text: 'Hoài nghi', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200' };
      case 'HOSTILE':
        return { text: 'Phản đối gay gắt', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Trung Tâm Giải Mã Khách Hàng 360°
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Customer Logistics DNA & Power Map
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bóc tách bản sắc vận tải, điểm đau quá khứ & sơ đồ quyền lực bộ sậu nhà máy để Sales nắm bắt triệt để
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Customer Switcher */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 shadow-sm">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <select
                value={selectedProfileId}
                onChange={e => setSelectedProfileId(e.target.value)}
                aria-label="Chọn khách hàng mục tiêu"
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-2"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900">
                    {p.customerName}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Snapshot Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold">Khách Hàng Mục Tiêu</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{currentProfile.customerName}</span>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold">Khẩu Vị Mua Hàng</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                {personaMeta.labelVi}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold">Sản Lượng Ước Tính</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentProfile.shipmentDna.monthlyVolumeTeu} TEU/tháng (~${(currentProfile.shipmentDna.annualLogisticsBudgetUsd / 1000).toFixed(0)}k/năm)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              Độ Tương Thích Năng Lực: {currentProfile.compatibilityScore}%
            </div>
            {onApplyPlaybookToQuote && (
              <button
                type="button"
                onClick={() => onApplyPlaybookToQuote(currentProfile.salesPlaybook)}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs shadow-sm transition"
              >
                <Zap className="w-3.5 h-3.5" />
                Áp Dụng Vào Báo Giá Hiện Tại
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('dna')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'dna'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Dna className="w-4 h-4" />
            Hồ Sơ Gen Logistics & Vết Sẹo Quá Khứ
          </button>

          <button
            onClick={() => setActiveTab('powermap')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'powermap'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Sơ Đồ Quyền Lực Bộ Sậu Nhà Máy ({currentProfile.powerMapContacts.length})
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'scripts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Kịch Bản Tác Chiến Đa Điểm (Multi-Threading)
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* TAB 1: LOGISTICS DNA & BUYING PERSONA */}
          {activeTab === 'dna' && (
            <div className="space-y-6">
              
              {/* Persona Overview Banner */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white">
                      Khẩu Vị Chủ Đạo
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {personaMeta.labelVi}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                    {personaMeta.descriptionVi}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Compass className="w-5 h-5 text-indigo-500" />
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Tuyến Trọng Điểm</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {currentProfile.shipmentDna.coreTradeLanes[0]?.origin} ➔ {currentProfile.shipmentDna.coreTradeLanes[0]?.destination}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns: Sensitivity Radar + Shipment DNA */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 5-Axis Sensitivity Indicators */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      Ma Trận Độ Nhạy Quyết Định Mua (Sensitivity Scores)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">Thang điểm 1 - 10</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Price */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Độ Nhạy Giá Cước (Price Sensitivity)</span>
                        <span className="text-indigo-600 font-bold">{currentProfile.sensitivityScores.priceSensitivity}/10</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${currentProfile.sensitivityScores.priceSensitivity * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Transit Time */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Độ Nhạy Tiến Độ & Lịch Tàu (Transit Time)</span>
                        <span className="text-indigo-600 font-bold">{currentProfile.sensitivityScores.transitTimeSensitivity}/10</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${currentProfile.sensitivityScores.transitTimeSensitivity * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Free time DEM/DET */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Nhu Cầu Miễn Phí Lưu Bãi DEM/DET</span>
                        <span className="text-indigo-600 font-bold">{currentProfile.sensitivityScores.freeTimeDemDetSensitivity}/10</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-500"
                          style={{ width: `${currentProfile.sensitivityScores.freeTimeDemDetSensitivity * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Credit terms */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Nhu Cầu Công Nợ (Credit Terms Net 30-60)</span>
                        <span className="text-indigo-600 font-bold">{currentProfile.sensitivityScores.creditTermSensitivity}/10</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${currentProfile.sensitivityScores.creditTermSensitivity * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Customs */}
                    <div>
                      <div className="flex justify-between font-semibold mb-1">
                        <span className="text-slate-700 dark:text-slate-300">Đòi Hỏi Nghiêm Ngặt Thủ Tục Hải Quan & C/O</span>
                        <span className="text-indigo-600 font-bold">{currentProfile.sensitivityScores.customsReliabilitySensitivity}/10</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${currentProfile.sensitivityScores.customsReliabilitySensitivity * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipment Logistics DNA */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-500" />
                      Thông Số Vận Tải Cốt Lõi (Shipment DNA)
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                      Ngành: {currentProfile.industry.split('(')[0]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Mặt Hàng Xuất Khẩu</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {currentProfile.shipmentDna.primaryCommodity}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Quy Cách Đóng Gói</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {currentProfile.shipmentDna.packagingType}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Mùa Vụ Cao Điểm</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                        Tháng {currentProfile.shipmentDna.peakSeasonMonths.join(', ')} hàng năm
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Hãng Tàu Ưa Chuộng</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {currentProfile.shipmentDna.coreTradeLanes[0]?.preferredCarriers.join(', ') || 'Maersk, CMA CGM'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">Yêu cầu sống còn khi làm hàng:</span>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {currentProfile.shipmentDna.criticalRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

              {/* Past Logistics Scars (Vết Sẹo Quá Khứ) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                      Vết Sẹo Vận Tải Quá Khứ (Past Logistics Scars & Trauma)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Những sự cố kinh hoàng khách từng gặp phải với forwarder cũ — Điểm mấu chốt để Sales xoáy sâu và bán giải pháp cam kết
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    {currentProfile.scars.length} Vết Sẹo Ghi Nhận
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentProfile.scars.map(scar => (
                    <div
                      key={scar.id}
                      className="border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 bg-gradient-to-br from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          <h5 className="font-bold text-xs text-rose-950 dark:text-rose-200">{scar.title}</h5>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 rounded shrink-0">
                          Năm {scar.incidentYear}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-700 dark:text-slate-300">Bên gây lỗi:</strong> {scar.perpetrator}
                        </div>
                        {scar.financialLossVnd && (
                          <div className="text-rose-600 dark:text-rose-400 font-semibold">
                            <strong>Thiệt hại:</strong> {scar.financialLossVnd}
                          </div>
                        )}
                        <div className="text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[11px] italic">
                          "{scar.psychologicalImpact}"
                        </div>
                      </div>

                      <div className="pt-2 border-t border-rose-100 dark:border-rose-900/30">
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Đơn Thuốc Xoa Dịu Độc Quyền (Healing Prescription):
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                          {scar.healingPrescription}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Sales Playbook */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-sm sm:text-base text-white">
                      Chiến Thuật Bán Hàng Tức Thì (Instant Sales Playbook)
                    </h4>
                  </div>
                  <span className="text-xs text-indigo-300 bg-indigo-950 px-3 py-1 rounded-full border border-indigo-700">
                    Áp dụng riêng cho {currentProfile.customerName}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hook Opener */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        Câu Mở Đầu "Chạm Đúng Tim Đen" (Hook Opener)
                      </span>
                      <button
                        onClick={() => handleCopy(currentProfile.salesPlaybook.openingHook, 'hook')}
                        className="text-xs text-indigo-200 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-1 rounded"
                      >
                        {copiedField === 'hook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedField === 'hook' ? 'Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-100 italic leading-relaxed">
                      "{currentProfile.salesPlaybook.openingHook}"
                    </p>
                  </div>

                  {/* Taboo Words */}
                  <div className="bg-rose-950/40 backdrop-blur-md rounded-xl p-4 border border-rose-500/30 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Những Từ Tuyệt Đối Cấm Kỵ (Taboo Words)
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentProfile.salesPlaybook.tabooWords.map((word, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-200 border border-rose-500/30"
                        >
                          ✕ {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Power Value Props & Closing Tactic */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="md:col-span-2 bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Quân Bài Giá Trị Áp Đảo (Power Value Props)
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {currentProfile.salesPlaybook.powerValueProps.map((vp, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{vp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Chiêu Bài Chốt Hạ (Closing Tactic)
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {currentProfile.salesPlaybook.closingTactic}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ORG POWER MAP & BUYING CENTER */}
          {activeTab === 'powermap' && (
            <div className="space-y-6">
              
              {/* Header with Add Contact action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Sơ Đồ Mạng Lưới Quyền Lực Bộ Sậu Nhà Máy ({currentProfile.customerName})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Xác định đúng người ra quyết định, phân hóa đồng minh và hóa giải kẻ ngáng đường
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingContact(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Thêm Nhân Sự Vào Sơ Đồ
                </button>
              </div>

              {/* Power Map Grid of Contact Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentProfile.powerMapContacts.map(contact => {
                  const roleBadge = getRoleBadge(contact.roleInDeal);
                  const stanceBadge = getStanceBadge(contact.stanceTowardUs);

                  return (
                    <div
                      key={contact.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm card-hover-lift space-y-4 relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Top role & stance */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${roleBadge.color}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${roleBadge.dot}`} />
                            {roleBadge.label}
                          </span>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${stanceBadge.color}`}>
                            {stanceBadge.text}
                          </span>
                        </div>

                        {/* Name & Title */}
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {contact.name}
                          </h4>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                            {contact.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Phòng: {contact.department === 'PURCHASING' ? 'Thu Mua' : contact.department === 'LOGISTICS' ? 'Logistics / XNK' : contact.department === 'FINANCE_ACCOUNTING' ? 'Kế Toán / Tài Chính' : contact.department === 'FACTORY_OPS' ? 'Vận Hành Kho Bãi' : 'Ban Giám Đốc'}
                          </span>
                        </div>

                        {/* Influence Level & DISC */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">Quyền Lực Tác Động:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {contact.influenceLevel}/10 Điểm
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-semibold block">Tính Cách (DISC):</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {contact.personalityStyle === 'DOMINANT' ? 'D - Quyết đoán' : contact.personalityStyle === 'INFLUENTIAL' ? 'I - Cởi mở' : contact.personalityStyle === 'STEADY' ? 'S - Kiên định' : 'C - Cẩn trọng'}
                            </span>
                          </div>
                        </div>

                        {/* Personal Pain Point & Hidden Agenda */}
                        <div className="space-y-2 text-xs">
                          {contact.personalPainPoint && (
                            <div className="text-slate-600 dark:text-slate-300">
                              <strong className="text-rose-600 dark:text-rose-400 font-semibold block text-[11px]">Nỗi lo sợ cá nhân:</strong>
                              <p className="text-[11px] leading-relaxed mt-0.5">{contact.personalPainPoint}</p>
                            </div>
                          )}

                          {contact.hiddenAgenda && (
                            <div className="text-slate-600 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded border border-amber-200/50 dark:border-amber-900/30">
                              <strong className="text-amber-700 dark:text-amber-400 font-semibold block text-[10px] uppercase">Lợi ích ngầm muốn đạt được:</strong>
                              <p className="text-[11px] text-amber-900 dark:text-amber-200 mt-0.5">{contact.hiddenAgenda}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          {contact.preferredChannel === 'ZALO' && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                          {contact.preferredChannel === 'CALL' && <Phone className="w-3.5 h-3.5 text-emerald-500" />}
                          {contact.preferredChannel === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-indigo-500" />}
                          <span className="text-[11px] font-medium">Kênh: {contact.preferredChannel}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setActiveTab('scripts');
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition"
                        >
                          Tạo Kịch Bản <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: MULTI-THREADING SCRIPTS & ATTACK PLAN */}
          {activeTab === 'scripts' && (
            <div className="space-y-6">
              
              {/* Selector Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Chọn Nhân Sự Trong Power Map:
                    </span>
                    <select
                      value={selectedContactId}
                      onChange={e => setSelectedContactId(e.target.value)}
                      aria-label="Chọn nhân sự trong sơ đồ quyền lực"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      {currentProfile.powerMapContacts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title} - {c.name} ({getRoleBadge(c.roleInDeal).label})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Định Dạng Kênh Tác Chiến:
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setSelectedChannel('ZALO')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                          selectedChannel === 'ZALO'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Zalo 1-Chạm
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedChannel('CALL')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                          selectedChannel === 'CALL'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Gọi Điện 60s
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedChannel('EMAIL')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                          selectedChannel === 'EMAIL'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email May Đo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mục tiêu:</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {selectedContact ? getRoleBadge(selectedContact.roleInDeal).label : 'Đàm phán'}
                  </span>
                </div>
              </div>

              {/* Script Box */}
              {generatedScript && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        {generatedScript.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(generatedScript.content, 'generated_script')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      {copiedField === 'generated_script' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          Đã Sao Chép Toàn Bộ!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Sao Chép Lời Thoại
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pre-formatted script text */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {generatedScript.content}
                  </div>

                  {/* Psychological notes for Sales */}
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/40 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      Lưu Ý Tâm Lý Chi Cực Kỳ Quan Trọng Cho Sales:
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {generatedScript.keyBulletPoints.map((bp, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Dữ liệu Customer DNA & Power Map được đồng bộ tức thì cho toàn bộ đội ngũ Sales</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition"
          >
            Đóng
          </button>
        </div>

      </div>

      {/* Inline Form to Add Contact */}
      {isAddingContact && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Thêm Nhân Sự Vào Sơ Đồ Quyền Lực ({currentProfile.customerName})
              </h4>
              <button onClick={() => setIsAddingContact(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Họ & Tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Ông Lê Quốc Hùng"
                    value={newContactForm.name}
                    onChange={e => setNewContactForm({ ...newContactForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Chức Danh *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trưởng Phòng Thu Mua"
                    value={newContactForm.title}
                    onChange={e => setNewContactForm({ ...newContactForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Vai Trò Trong Deal</label>
                  <select
                    value={newContactForm.roleInDeal}
                    onChange={e => setNewContactForm({ ...newContactForm, roleInDeal: e.target.value as DealOrgRole })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="DECISION_MAKER">Quyết định tối cao</option>
                    <option value="CHAMPION">Đồng minh ruột</option>
                    <option value="BLOCKER">Rào cản (Blocker)</option>
                    <option value="INFLUENCER">Người tham mưu</option>
                    <option value="GATEKEEPER">Người gác cổng</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Mức Độ Tác Động (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newContactForm.influenceLevel}
                    onChange={e => setNewContactForm({ ...newContactForm, influenceLevel: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Nỗi Sợ / Điểm Đau Riêng</label>
                <input
                  type="text"
                  placeholder="VD: Sợ trễ hàng bị khách phạt, sợ phát sinh phụ phí"
                  value={newContactForm.personalPainPoint}
                  onChange={e => setNewContactForm({ ...newContactForm, personalPainPoint: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Số Điện Thoại / Zalo</label>
                  <input
                    type="text"
                    placeholder="09xx..."
                    value={newContactForm.phone}
                    onChange={e => setNewContactForm({ ...newContactForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">Kênh Tiếp Cận Ưu Tiên</label>
                  <select
                    value={newContactForm.preferredChannel}
                    onChange={e => setNewContactForm({ ...newContactForm, preferredChannel: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="ZALO">Zalo</option>
                    <option value="CALL">Gọi điện trực tiếp</option>
                    <option value="EMAIL">Email</option>
                    <option value="FACE_TO_FACE">Gặp trực tiếp</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  Lưu Vào Sơ Đồ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
