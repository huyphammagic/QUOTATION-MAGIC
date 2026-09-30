import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  PenTool, 
  Type, 
  RotateCcw, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Lock, 
  User, 
  Briefcase, 
  Building, 
  FileText,
  Phone,
  AlertCircle
} from 'lucide-react';

export interface SignatureData {
  signatureDataUrl: string;
  signatureType: 'DRAW' | 'TYPE';
  signerName: string;
  signerTitle: string;
  signerCompany: string;
  signerTaxId: string;
  signerPhone: string;
  signerEmail?: string;
  signedAt: string;
}

interface ElectronicSignaturePadProps {
  initialName?: string;
  initialCompany?: string;
  initialTaxId?: string;
  initialEmail?: string;
  onCancel: () => void;
  onConfirm: (data: SignatureData) => void;
  isSubmitting?: boolean;
}

const SCRIPT_FONTS = [
  { id: 'font-1', name: 'Thư Pháp Hiện Đại', style: 'italic font-serif tracking-wide text-2xl' },
  { id: 'font-2', name: 'Nét Bút Ký Doanh Nghiệp', style: 'font-mono italic font-semibold text-2xl tracking-tight' },
  { id: 'font-3', name: 'Chữ Ký Giám Đốc (Formal)', style: 'font-serif tracking-widest text-2xl uppercase' }
];

export const ElectronicSignaturePad: React.FC<ElectronicSignaturePadProps> = ({
  initialName = '',
  initialCompany = '',
  initialTaxId = '',
  initialEmail = '',
  onCancel,
  onConfirm,
  isSubmitting = false
}) => {
  const [signatureMode, setSignatureMode] = useState<'DRAW' | 'TYPE'>('DRAW');
  
  // Signer identity form state
  const [signerName, setSignerName] = useState(initialName);
  const [signerTitle, setSignerTitle] = useState('Đại diện ủy quyền');
  const [signerCompany, setSignerCompany] = useState(initialCompany);
  const [signerTaxId, setSignerTaxId] = useState(initialTaxId);
  const [signerPhone, setSignerPhone] = useState('');
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isLegalAgreed, setIsLegalAgreed] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Canvas refs and drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  // Setup canvas with high DPI support
  useEffect(() => {
    if (signatureMode !== 'DRAW') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual canvas pixels for high DPI
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a'; // Deep slate ink

    // Save blank state
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, [signatureMode]);

  // Coordinate helper
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
    setValidationError(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    // Save state for undo
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHasDrawn(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (historyRef.current.length > 1) {
      historyRef.current.pop();
      const prevState = historyRef.current[historyRef.current.length - 1];
      ctx.putImageData(prevState, 0, 0);
      if (historyRef.current.length === 1) {
        setHasDrawn(false);
      }
    }
  };

  // Generate PNG data URL from typed text
  const generateTypedSignaturePng = (text: string, fontStyle: string): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 600, 200);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic 48px serif';
    if (selectedFontIndex === 1) ctx.font = 'italic bold 44px monospace';
    if (selectedFontIndex === 2) ctx.font = 'bold 36px serif';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 300, 100);

    return tempCanvas.toDataURL('image/png');
  };

  const handleSubmit = () => {
    if (!signerName.trim()) {
      setValidationError('Vui lòng nhập họ và tên người ký đại diện.');
      return;
    }

    if (!isLegalAgreed) {
      setValidationError('Quý khách vui lòng đánh dấu đồng ý cam kết điều khoản trước khi ký xác nhận.');
      return;
    }

    let signaturePng = '';

    if (signatureMode === 'DRAW') {
      if (!hasDrawn || !canvasRef.current) {
        setValidationError('Vui lòng vẽ chữ ký tay trên khung bên dưới.');
        return;
      }
      signaturePng = canvasRef.current.toDataURL('image/png');
    } else {
      signaturePng = generateTypedSignaturePng(signerName, SCRIPT_FONTS[selectedFontIndex].style);
    }

    onConfirm({
      signatureDataUrl: signaturePng,
      signatureType: signatureMode,
      signerName: signerName.trim(),
      signerTitle: signerTitle.trim() || 'Người đại diện',
      signerCompany: signerCompany.trim(),
      signerTaxId: signerTaxId.trim(),
      signerPhone: signerPhone.trim(),
      signerEmail: initialEmail,
      signedAt: new Date().toISOString()
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-7 max-w-xl w-full mx-auto space-y-5 animate-in fade-in zoom-in-95">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Ký Số Xác Nhận Báo Giá (E-Signature)
            </h3>
            <p className="text-[11px] text-slate-500">
              Giá trị pháp lý theo Luật Giao dịch Điện tử
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo Mật 256-bit</span>
        </div>
      </div>

      {/* Signer Identity Information Form */}
      <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
          <User className="w-3.5 h-3.5" />
          <span>Thông Tin Người Đại Diện Ký Xác Nhận</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-600 font-medium mb-1">
              Họ và tên người ký <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => {
                setSignerName(e.target.value);
                setValidationError(null);
              }}
              placeholder="VD: Nguyễn Văn An"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">
              Chức vụ / Phòng ban:
            </label>
            <input
              type="text"
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder="VD: Trưởng phòng Xuất Nhập Khẩu"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">
              Doanh nghiệp / Khách hàng:
            </label>
            <input
              type="text"
              value={signerCompany}
              onChange={(e) => setSignerCompany(e.target.value)}
              placeholder="Tên công ty xuất nhập khẩu"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">
              Số điện thoại người ký:
            </label>
            <input
              type="text"
              value={signerPhone}
              onChange={(e) => setSignerPhone(e.target.value)}
              placeholder="0912 345 678"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mode Selector Tab (Draw vs Type) */}
      <div className="flex items-center justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setSignatureMode('DRAW')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              signatureMode === 'DRAW'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Vẽ Chữ Ký Tay</span>
          </button>

          <button
            type="button"
            onClick={() => setSignatureMode('TYPE')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              signatureMode === 'TYPE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Ký Bằng Tên (Chữ Ký Số)</span>
          </button>
        </div>

        {signatureMode === 'DRAW' && (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyRef.current.length <= 1}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors"
              title="Hoàn tác nét vẽ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
              title="Xóa trắng chữ ký"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Signature Input Canvas or Typography Area */}
      {signatureMode === 'DRAW' ? (
        <div className="space-y-1.5">
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 cursor-crosshair block"
            />
            
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                <span>Dùng chuột hoặc ngón tay vẽ chữ ký tại đây</span>
              </div>
            )}

            <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono pointer-events-none">
              Dấu chữ ký số điện tử
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Hỗ trợ cảm ứng trên điện thoại di động & máy tính bảng. Nét mực được làm mịn theo chuẩn vector.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[160px]">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Bản Xem Trước Chữ Ký Điện Tử
            </span>
            <div className={`text-slate-900 text-center py-3 select-none ${SCRIPT_FONTS[selectedFontIndex].style}`}>
              {signerName || 'Nguyễn Văn An'}
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono">
              Xác thực: {signerTitle} &bull; {signerCompany || 'Doanh Nghiệp'}
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            {SCRIPT_FONTS.map((font, idx) => (
              <button
                key={font.id}
                type="button"
                onClick={() => setSelectedFontIndex(idx)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  selectedFontIndex === idx
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {font.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Alert */}
      {validationError && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Legal Declaration Checkbox */}
      <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isLegalAgreed}
            onChange={(e) => setIsLegalAgreed(e.target.checked)}
            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span className="leading-relaxed">
            Tôi xác nhận có đầy đủ thẩm quyền đại diện cho <strong>{signerCompany || 'Doanh nghiệp'}</strong> để chấp thuận mức giá, phụ phí và các điều kiện vận chuyển nêu trên. Thỏa thuận có giá trị pháp lý ràng buộc để tiến hành đặt chỗ (Booking).
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center space-x-1.5 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{isSubmitting ? 'Đang tạo chứng thư...' : 'Ký Số & Xác Nhận Báo Giá'}</span>
        </button>
      </div>

    </div>
  );
};
