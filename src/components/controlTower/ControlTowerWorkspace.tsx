/**
 * Logistics Control Tower Workspace - Phase 42
 * Centralized Operations Control Tower, Real-Time KPIs, Exception Engine, Deadlines, and Operational Risk
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Calendar, 
  ArrowUpRight, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  FileText
} from 'lucide-react';
import { ShipmentRecord } from '../../types/shipment';
import { 
  ShipmentException, 
  ExceptionStatus, 
  ExceptionSeverity 
} from '../../types/exception';
import { 
  ControlTowerKPIs, 
  UpcomingDeadline, 
  OperationalRiskItem, 
  ControlTowerActiveTab 
} from '../../types/controlTower';
import { 
  getControlTowerKPIs, 
  getUpcomingDeadlines, 
  getOperationalRisks, 
  runCompanyExceptionDetection 
} from '../../services/controlTower/controlTowerService';
import { getExceptions, updateExceptionStatus } from '../../services/exception/exceptionService';
import { getShipments } from '../../services/shipment/shipmentService';
import { ExceptionDetailDrawer } from './ExceptionDetailDrawer';
import { CreateExceptionModal } from './CreateExceptionModal';

interface ControlTowerWorkspaceProps {
  companyId: string;
  currentUser: { uid: string; displayName?: string; email?: string };
  onOpenShipmentDetail: (shipmentId: string) => void;
  onOpenQuotation?: (quotationId: string) => void;
  onOpenDocumentCenter?: () => void;
  onOpenActionCenter?: () => void;
  language?: 'vi' | 'en';
}

export const ControlTowerWorkspace: React.FC<ControlTowerWorkspaceProps> = ({
  companyId,
  currentUser,
  onOpenShipmentDetail,
  onOpenQuotation,
  onOpenDocumentCenter,
  onOpenActionCenter,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  // Core State
  const [activeTab, setActiveTab] = useState<ControlTowerActiveTab>('EXCEPTIONS');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; found: number } | null>(null);

  // Data State
  const [kpis, setKpis] = useState<ControlTowerKPIs>({
    activeShipments: 0,
    dueToday: 0,
    overdueShipments: 0,
    totalExceptions: 0,
    openExceptions: 0,
    criticalExceptions: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    missingDocuments: 0,
    upcomingMilestones: 0,
    recentlyUpdated: 0,
  });

  const [exceptions, setExceptions] = useState<ShipmentException[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [risks, setRisks] = useState<OperationalRiskItem[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // 'ACTIVE', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Selected Exception & Modals
  const [selectedException, setSelectedException] = useState<ShipmentException | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Primary Data Loading
  const loadControlTowerData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [fetchedKpis, fetchedExceptionsRes, fetchedShipmentsRes, fetchedDeadlines, fetchedRisks] = 
        await Promise.all([
          getControlTowerKPIs(companyId),
          getExceptions(companyId, { pageLimit: 100 }),
          getShipments(companyId, { pageLimit: 50 }),
          getUpcomingDeadlines(companyId, 20),
          getOperationalRisks(companyId, 20),
        ]);

      setKpis(fetchedKpis);
      setExceptions(fetchedExceptionsRes.exceptions);
      setShipments(fetchedShipmentsRes.shipments);
      setDeadlines(fetchedDeadlines);
      setRisks(fetchedRisks);
    } catch (err) {
      console.error('[ControlTowerWorkspace] Error loading data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadControlTowerData();
  }, [companyId]);

  // Automated Exception Scanning Trigger
  const handleRunAutoDetection = async () => {
    try {
      setIsScanning(true);
      setScanResult(null);
      const res = await runCompanyExceptionDetection(companyId, currentUser);
      setScanResult({ scanned: res.totalScanned, found: res.newExceptionsCount });
      // Reload updated exceptions and KPIs immediately
      await loadControlTowerData(true);
    } catch (err) {
      console.error('[ControlTower] Detection error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Filtered Exceptions
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(e => {
      // Status filter
      if (statusFilter === 'ACTIVE') {
        if (e.status !== 'OPEN' && e.status !== 'ACKNOWLEDGED' && e.status !== 'IN_PROGRESS') return false;
      } else if (statusFilter !== 'ALL' && e.status !== statusFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && e.severity !== severityFilter) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchShp = e.shipmentNumber.toLowerCase().includes(q);
        const matchCust = e.customerName?.toLowerCase().includes(q) || false;
        const matchPic = e.assignedToName?.toLowerCase().includes(q) || false;
        const matchDesc = e.description?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchShp && !matchCust && !matchPic && !matchDesc) return false;
      }

      return true;
    });
  }, [exceptions, statusFilter, severityFilter, searchQuery]);

  // Severity styling helper
  const getSeverityBadgeClass = (severity: ExceptionSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOW':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Status styling helper
  const getStatusBadgeClass = (status: ExceptionStatus) => {
    switch (status) {
      case 'OPEN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ACKNOWLEDGED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISMISSED':
      case 'CANCELLED':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="min-h-full bg-slate-100/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
            <Radar className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {isVi ? 'Tháp Điều Hành Logistics (Control Tower)' : 'Logistics Control Tower'}
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                Phase 42
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi 
                ? 'Giám sát toàn diện chuỗi vận hành, cảnh báo tiến độ và xử lý sự cố thời gian thực'
                : 'Centralized operational visibility, deadline surveillance, and incident resolution'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Run Automated Exception Detection */}
          <button
            onClick={handleRunAutoDetection}
            disabled={isScanning || isLoading}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 text-indigo-600 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? (isVi ? 'Đang quét...' : 'Scanning...') : (isVi ? 'Quét Bất Thường' : 'Scan Exceptions')}</span>
          </button>

          {/* Log Manual Exception */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isVi ? 'Ghi Nhận Sự Cố' : 'Log Exception'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadControlTowerData(true)}
            disabled={isRefreshing || isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            title={isVi ? 'Làm mới dữ liệu' : 'Refresh Data'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Auto Scan Notification Banner */}
      {scanResult && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              {isVi 
                ? `Đã quét kiểm tra ${scanResult.scanned} lô hàng đang chạy. Phát hiện ${scanResult.found} mốc/hạn cần chú ý.`
                : `Scanned ${scanResult.scanned} active shipments. Evaluated ${scanResult.found} operational issues.`}
            </span>
          </div>
          <button 
            onClick={() => setScanResult(null)}
            className="text-[11px] font-semibold text-indigo-700 hover:underline ml-3"
          >
            {isVi ? 'Đóng' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* Interactive KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* KPI 1: Active Shipments */}
        <div 
          onClick={() => setActiveTab('SHIPMENT_BOARD')}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Lô Hàng Đang Chạy' : 'Active Shipments'}</span>
            <Package className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.activeShipments}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Đang điều hành' : 'In pipeline'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* KPI 2: Due Today */}
        <div 
          onClick={() => setActiveTab('DEADLINES')}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Đến Hạn Hôm Nay' : 'Due Today'}</span>
            <Calendar className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-blue-600">{kpis.dueToday}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Mốc / Lịch tàu' : 'Milestones / Cutoffs'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* KPI 3: Overdue */}
        <div 
          onClick={() => {
            setActiveTab('EXCEPTIONS');
            setStatusFilter('ACTIVE');
            setSeverityFilter('ALL');
          }}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Lô Hàng Quá Hạn' : 'Overdue'}</span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.overdueShipments}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Chậm kế hoạch' : 'Delayed'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* KPI 4: Active Exceptions */}
        <div 
          onClick={() => {
            setActiveTab('EXCEPTIONS');
            setStatusFilter('ACTIVE');
          }}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-rose-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Sự Cố Đang Xử Lý' : 'Active Issues'}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.openExceptions}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Cần can thiệp' : 'Action needed'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* KPI 5: Critical Exceptions */}
        <div 
          onClick={() => {
            setActiveTab('EXCEPTIONS');
            setStatusFilter('ACTIVE');
            setSeverityFilter('CRITICAL');
          }}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-red-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Nguy Cấp (Critical)' : 'Critical'}</span>
            <ShieldAlert className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-red-600">{kpis.criticalExceptions}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Nguy cơ đình trệ' : 'Critical halt'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* KPI 6: Upcoming Milestones */}
        <div 
          onClick={() => setActiveTab('DEADLINES')}
          className="cursor-pointer bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">{isVi ? 'Mốc 3 Ngày Tới' : 'Milestones (3D)'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpis.upcomingMilestones}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{isVi ? 'Chuẩn bị đến mốc' : 'Approaching'}</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Control Tower Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('EXCEPTIONS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'EXCEPTIONS'
              ? 'border-rose-600 text-rose-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isVi ? 'Trung Tâm Xử Lý Sự Cố (Exceptions)' : 'Exception Center'}</span>
          {kpis.openExceptions > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-100 text-rose-700">
              {kpis.openExceptions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SHIPMENT_BOARD')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'SHIPMENT_BOARD'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{isVi ? 'Bảng Điều Hành Lô Hàng' : 'Shipment Pipeline'}</span>
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-slate-200 text-slate-700">
            {shipments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DEADLINES')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'DEADLINES'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isVi ? 'Hạn Chót & Mốc Tiến Độ' : 'Upcoming Deadlines'}</span>
          <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-slate-200 text-slate-700">
            {deadlines.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RISKS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'RISKS'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isVi ? 'Đánh Giá Rủi Ro Vận Hành' : 'Operational Risk View'}</span>
          {risks.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-100 text-amber-700">
              {risks.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: EXCEPTIONS & INCIDENT ACTION CENTER */}
      {activeTab === 'EXCEPTIONS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isVi ? 'Tìm sự cố, mã lô hàng, khách hàng, PIC...' : 'Search issues, shipment, customer, PIC...'}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">{isVi ? 'Trạng thái:' : 'Status:'}</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                >
                  <option value="ACTIVE">{isVi ? 'Đang Xử Lý (Active)' : 'Active (Open / In Progress)'}</option>
                  <option value="OPEN">{isVi ? 'Mới Tạo (OPEN)' : 'OPEN'}</option>
                  <option value="ACKNOWLEDGED">{isVi ? 'Đã Tiếp Nhận' : 'ACKNOWLEDGED'}</option>
                  <option value="IN_PROGRESS">{isVi ? 'Đang Xử Lý (IN_PROGRESS)' : 'IN_PROGRESS'}</option>
                  <option value="RESOLVED">{isVi ? 'Đã Xong (RESOLVED)' : 'RESOLVED'}</option>
                  <option value="DISMISSED">{isVi ? 'Bỏ Qua (DISMISSED)' : 'DISMISSED'}</option>
                  <option value="ALL">{isVi ? 'Tất Cả (ALL)' : 'ALL'}</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">{isVi ? 'Mức độ:' : 'Severity:'}</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                >
                  <option value="ALL">{isVi ? 'Tất cả mức độ' : 'All Severities'}</option>
                  <option value="CRITICAL">CRITICAL (Nguy cấp)</option>
                  <option value="HIGH">HIGH (Cao)</option>
                  <option value="MEDIUM">MEDIUM (Trung bình)</option>
                  <option value="LOW">LOW (Thấp)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {isVi ? 'Hiển thị:' : 'Showing:'} <strong>{filteredExceptions.length}</strong> {isVi ? 'bất thường' : 'exceptions'}
            </div>
          </div>

          {/* Exceptions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredExceptions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isVi ? 'Không có sự cố nào cần xử lý' : 'No Operational Exceptions Found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isVi 
                    ? 'Tất cả mốc vận hành và thủ tục đều đúng tiến độ. Bấm "Quét Bất Thường" để kiểm tra lại toàn bộ lô hàng.'
                    : 'All operational milestones and cutoffs are on track. Click "Scan Exceptions" to re-verify.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">{isVi ? 'Mức Độ' : 'Severity'}</th>
                      <th className="px-4 py-3">{isVi ? 'Tiêu Đề Bất Thường & Nguồn' : 'Exception Title & Source'}</th>
                      <th className="px-4 py-3">{isVi ? 'Lô Hàng Liên Quan' : 'Shipment'}</th>
                      <th className="px-4 py-3">{isVi ? 'Khách Hàng' : 'Customer'}</th>
                      <th className="px-4 py-3">{isVi ? 'Phụ Trách (PIC)' : 'PIC'}</th>
                      <th className="px-4 py-3">{isVi ? 'Hạn Xử Lý' : 'Due At'}</th>
                      <th className="px-4 py-3">{isVi ? 'Trạng Thái' : 'Status'}</th>
                      <th className="px-4 py-3 text-right">{isVi ? 'Thao Tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredExceptions.map((exc) => (
                      <tr 
                        key={exc.id}
                        onClick={() => {
                          setSelectedException(exc);
                          setIsDrawerOpen(true);
                        }}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Severity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getSeverityBadgeClass(exc.severity)}`}>
                            {exc.severity}
                          </span>
                        </td>

                        {/* Title & Source */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 line-clamp-1">{exc.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono text-slate-600">{exc.sourceType}</span>
                            <span>•</span>
                            <span>{exc.id}</span>
                          </div>
                        </td>

                        {/* Shipment */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShipmentDetail(exc.shipmentId);
                            }}
                            className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <span>{exc.shipmentNumber}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3 max-w-[160px] truncate text-slate-800 font-semibold">
                          {exc.customerName || 'N/A'}
                        </td>

                        {/* Assigned PIC */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {exc.assignedToName || (
                            <span className="text-amber-600 italic font-normal text-[11px]">
                              {isVi ? 'Chưa chỉ định' : 'Unassigned'}
                            </span>
                          )}
                        </td>

                        {/* Due At */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          {exc.dueAt ? exc.dueAt.substring(0, 10) : '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(exc.status)}`}>
                            {exc.status}
                          </span>
                        </td>

                        {/* Quick Action */}
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedException(exc);
                              setIsDrawerOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <span>{isVi ? 'Chi Tiết' : 'Inspect'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE SHIPMENTS BOARD */}
      {activeTab === 'SHIPMENT_BOARD' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isVi ? 'Danh Sách Lô Hàng Đang Vận Hành' : 'Active Operational Shipments'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isVi ? 'Theo dõi tuyến đường, phương thức, thời gian đến dự kiến (ETA) và tình trạng' : 'Track route, mode, planned ETA and operational status'}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {isVi ? 'Tổng cộng:' : 'Total:'} <strong>{shipments.length}</strong>
              </span>
            </div>

            {shipments.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                {isVi ? 'Chưa có lô hàng nào trong hệ thống.' : 'No shipments found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-3">{isVi ? 'Mã Lô Hàng' : 'Shipment No.'}</th>
                      <th className="px-4 py-3">{isVi ? 'Khách Hàng' : 'Customer'}</th>
                      <th className="px-4 py-3">{isVi ? 'Phương Thức' : 'Mode'}</th>
                      <th className="px-4 py-3">{isVi ? 'Tuyến Vận Tải' : 'Route (POL → POD)'}</th>
                      <th className="px-4 py-3">{isVi ? 'Hãng Vận Chuyển' : 'Carrier / Vessel'}</th>
                      <th className="px-4 py-3">{isVi ? 'ETD / ETA' : 'ETD / ETA'}</th>
                      <th className="px-4 py-3">{isVi ? 'Trạng Thái' : 'Status'}</th>
                      <th className="px-4 py-3 text-right">{isVi ? 'Chi Tiết' : 'Open'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {shipments.map((s) => (
                      <tr 
                        key={s.id}
                        onClick={() => onOpenShipmentDetail(s.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-bold text-indigo-600">
                          {s.shipmentNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 max-w-[180px] truncate">
                          {s.customerName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                            {s.serviceMode}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-slate-800">{s.origin}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-slate-800">{s.destination}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {s.carrierName || s.vesselFlightName || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          <span>{s.etdPlanned ? s.etdPlanned.substring(5, 10) : '—'}</span>
                          <span className="text-slate-300 mx-1">/</span>
                          <span className="font-semibold text-slate-800">{s.etaPlanned ? s.etaPlanned.substring(5, 10) : '—'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShipmentDetail(s.id);
                            }}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UPCOMING DEADLINES & MILESTONES */}
      {activeTab === 'DEADLINES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isVi ? 'Lịch Trình & Hạn Chót Sắp Đến (Surveillance Deadlines)' : 'Surveillance Deadlines & Cutoffs'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isVi 
                  ? 'Các hạn chót SI, hạn bãi CY, mốc vận hành quá hạn hoặc cần hoàn tất trong 7 ngày tới'
                  : 'SI Cutoffs, CY Cutoffs, overdue milestones or milestones due within 7 days'}
              </p>
            </div>
            {onOpenActionCenter && (
              <button
                type="button"
                onClick={onOpenActionCenter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors shrink-0 shadow-2xs"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isVi ? 'Mở Action Center Toàn Diện' : 'Open Full Action Center'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {deadlines.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {isVi ? 'Không có mốc hoặc hạn chót nào trong khoảng thời gian này.' : 'No upcoming deadlines.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deadlines.map((d) => (
                <div 
                  key={d.id}
                  onClick={() => onOpenShipmentDetail(d.shipmentId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                    d.isOverdue 
                      ? 'bg-red-50/50 border-red-200 hover:border-red-300' 
                      : d.daysRemaining === 0
                      ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-indigo-700">{d.shipmentNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      d.isOverdue 
                        ? 'bg-red-100 text-red-800' 
                        : d.daysRemaining === 0 
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {d.isOverdue 
                        ? (isVi ? `Quá hạn ${Math.abs(d.daysRemaining)} ngày` : `Overdue ${Math.abs(d.daysRemaining)}d`)
                        : d.daysRemaining === 0 
                        ? (isVi ? 'Đến hạn hôm nay' : 'Due Today')
                        : (isVi ? `Còn ${d.daysRemaining} ngày` : `In ${d.daysRemaining} days`)}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{d.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{d.customerName}</p>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{isVi ? 'Hạn chót:' : 'Due:'} <strong>{d.dueAt.substring(0, 10)}</strong></span>
                    <span>{d.assignedToName || (isVi ? 'Chưa giao PIC' : 'Unassigned')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: OPERATIONAL RISK VIEW */}
      {activeTab === 'RISKS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isVi ? 'Đánh Giá Rủi Ro Vận Hành (Operational Risk View)' : 'Rule-Based Operational Risk View'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi 
                ? 'Đánh giá nguy cơ chậm trễ và phát sinh chi phí dựa trên dữ liệu mốc tiến độ, hạn chót và bất thường thực tế'
                : 'Deterministic evaluation based on real milestone delays, missed cutoffs, and active incidents'}
            </p>
          </div>

          {risks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              {isVi ? 'Chưa phát hiện rủi ro vận hành đáng kể nào.' : 'No significant operational risks detected.'}
            </div>
          ) : (
            <div className="space-y-3">
              {risks.map((risk) => (
                <div 
                  key={risk.shipmentId}
                  onClick={() => onOpenShipmentDetail(risk.shipmentId)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-slate-50/50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getSeverityBadgeClass(risk.riskLevel)}`}>
                        {risk.riskLevel} RISK
                      </span>
                      <span className="font-bold text-xs text-indigo-700">{risk.shipmentNumber}</span>
                      <span className="text-xs font-semibold text-slate-800">• {risk.customerName}</span>
                      <span className="text-xs text-slate-400">({risk.origin} → {risk.destination})</span>
                    </div>

                    <div className="space-y-0.5 text-xs text-slate-600 pl-1 pt-1">
                      {risk.riskReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {risk.suggestedAction && (
                      <p className="text-[11px] font-semibold text-indigo-700 pt-1">
                        👉 {risk.suggestedAction}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-[11px] text-slate-400">
                      <div>{isVi ? 'Phụ trách:' : 'PIC:'} <strong className="text-slate-700">{risk.assignedToName || 'N/A'}</strong></div>
                      <div>{risk.activeExceptionsCount} {isVi ? 'sự cố đang mở' : 'active issues'}</div>
                    </div>
                    <button className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                      {isVi ? 'Mở Lô Hàng' : 'Inspect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exception Detail Drawer */}
      <ExceptionDetailDrawer
        exception={selectedException}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedException(null);
        }}
        onUpdated={(updated) => {
          setSelectedException(updated);
          // Update in-memory list
          setExceptions(prev => prev.map(e => e.id === updated.id ? updated : e));
          // Refresh KPIs
          loadControlTowerData(true);
        }}
        onOpenShipmentDetail={(shipmentId) => {
          setIsDrawerOpen(false);
          onOpenShipmentDetail(shipmentId);
        }}
        currentUser={currentUser}
        language={language}
      />

      {/* Create Manual Exception Modal */}
      <CreateExceptionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        shipments={shipments}
        companyId={companyId}
        currentUser={currentUser}
        onCreated={(newException) => {
          setExceptions(prev => [newException, ...prev]);
          loadControlTowerData(true);
        }}
        language={language}
      />
    </div>
  );
};
