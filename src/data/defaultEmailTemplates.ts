import { EmailTemplate } from '../types/quotationCommunication';

export const ALLOWED_EMAIL_VARIABLES = [
  '{{customerName}}',
  '{{companyName}}',
  '{{quotationNumber}}',
  '{{revisionNumber}}',
  '{{quotationDate}}',
  '{{validUntil}}',
  '{{origin}}',
  '{{destination}}',
  '{{incoterm}}',
  '{{totalAmount}}',
  '{{currency}}',
  '{{salesName}}',
  '{{salesEmail}}',
  '{{salesPhone}}',
  '{{documentLink}}'
];

export const FORBIDDEN_EMAIL_VARIABLES = [
  'buyCost',
  'profit',
  'margin',
  'supplier',
  'internalNotes',
  'pricingPolicy',
  'internalApproval'
];

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl-quotation-send-vi',
    companyId: 'default-company',
    name: 'Báo Giá Vận Chuyển Chuẩn (Tiếng Việt)',
    code: 'QUOTATION_SEND_VI',
    type: 'QUOTATION_SEND',
    language: 'vi',
    subject: 'Báo giá vận chuyển logistics {{quotationNumber}} (Rev {{revisionNumber}}) – Tuyến {{origin}} đến {{destination}}',
    body: `<p>Kính gửi <strong>{{customerName}}</strong>,</p>

<p>Lời đầu tiên, <strong>{{companyName}}</strong> xin gửi lời chào trân trọng và cảm ơn Quý khách hàng đã tin tưởng liên hệ dịch vụ vận chuyển logistics của chúng tôi.</p>

<p>Chúng tôi xin trân trọng gửi đến Quý khách bảng báo giá cước vận chuyển và dịch vụ logistics chính thức chi tiết như sau:</p>

<ul>
  <li><strong>Mã số báo giá:</strong> {{quotationNumber}} (Phiên bản: Rev {{revisionNumber}})</li>
  <li><strong>Ngày phát hành:</strong> {{quotationDate}}</li>
  <li><strong>Tuyến vận chuyển:</strong> {{origin}} ➔ {{destination}}</li>
  <li><strong>Điều kiện giao hàng (Incoterms):</strong> {{incoterm}}</li>
  <li><strong>Tổng chi phí dịch vụ:</strong> <span style="color: #0284c7; font-size: 1.1em; font-weight: bold;">{{totalAmount}} {{currency}}</span></li>
  <li><strong>Hiệu lực báo giá đến:</strong> {{validUntil}}</li>
</ul>

<p>Chi tiết bảng cước và các phụ phí local charges đã được đính kèm trong tệp tài liệu PDF chính thức gửi kèm thư này.</p>

<p>Quý khách cũng có thể xem trực tuyến và xác nhận báo giá nhanh chóng thông qua liên kết bảo mật sau:<br/>
👉 <a href="{{documentLink}}" style="color: #2563eb; font-weight: bold;">Truy cập Báo Giá Trực Tuyến & Phê Duyệt Nhanh</a></p>

<p>Nếu Quý khách cần thêm bất kỳ thông tin hoặc yêu cầu điều chỉnh nào, xin vui lòng phản hồi trực tiếp thư này hoặc liên hệ chuyên viên phụ trách của chúng tôi:</p>

<p>
  <strong>{{salesName}}</strong><br/>
  Điện thoại / Zalo: {{salesPhone}}<br/>
  Email: {{salesEmail}}<br/>
  Công ty: {{companyName}}
</p>

<p>Rất mong có cơ hội hợp tác và đồng hành cùng Quý khách!</p>

<p>Trân trọng kính thư,</p>`,
    variables: ALLOWED_EMAIL_VARIABLES,
    active: true,
    version: 1,
    isDefault: true,
    createdBy: 'System Admin',
    updatedBy: 'System Admin',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tmpl-quotation-send-en',
    companyId: 'default-company',
    name: 'Standard Freight Quotation (English)',
    code: 'QUOTATION_SEND_EN',
    type: 'QUOTATION_SEND',
    language: 'en',
    subject: 'Official Freight Quotation {{quotationNumber}} (Rev {{revisionNumber}}) – {{origin}} to {{destination}}',
    body: `<p>Dear <strong>{{customerName}}</strong>,</p>

<p>Greetings from <strong>{{companyName}}</strong>. Thank you very much for your valued inquiry and interest in our international freight and logistics services.</p>

<p>We are pleased to provide you with our official freight quotation as detailed below:</p>

<ul>
  <li><strong>Quotation Reference:</strong> {{quotationNumber}} (Revision: Rev {{revisionNumber}})</li>
  <li><strong>Issue Date:</strong> {{quotationDate}}</li>
  <li><strong>Routing:</strong> {{origin}} to {{destination}}</li>
  <li><strong>Trade Terms:</strong> {{incoterm}}</li>
  <li><strong>Estimated Total Amount:</strong> <span style="color: #0284c7; font-size: 1.1em; font-weight: bold;">{{totalAmount}} {{currency}}</span></li>
  <li><strong>Quotation Validity:</strong> {{validUntil}}</li>
</ul>

<p>The complete cost breakdown, freight schedule, and standard local charges are detailed in the official PDF document attached to this email.</p>

<p>You can also review the interactive quotation and directly submit your confirmation online via our secure link:<br/>
👉 <a href="{{documentLink}}" style="color: #2563eb; font-weight: bold;">View Online Quotation & Confirm Booking</a></p>

<p>Should you have any questions or require any routing adjustments, please do not hesitate to reply to this email or contact your dedicated representative:</p>

<p>
  <strong>{{salesName}}</strong><br/>
  Phone / Mobile: {{salesPhone}}<br/>
  Email: {{salesEmail}}<br/>
  Company: {{companyName}}
</p>

<p>We look forward to serving your logistics requirements.</p>

<p>Best regards,</p>`,
    variables: ALLOWED_EMAIL_VARIABLES,
    active: true,
    version: 1,
    isDefault: true,
    createdBy: 'System Admin',
    updatedBy: 'System Admin',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tmpl-quotation-followup-vi',
    companyId: 'default-company',
    name: 'Follow-Up Báo Giá (Tiếng Việt)',
    code: 'QUOTATION_FOLLOWUP_VI',
    type: 'QUOTATION_FOLLOW_UP',
    language: 'vi',
    subject: 'Theo dõi tiến độ báo giá {{quotationNumber}} – Tuyến {{origin}} đến {{destination}}',
    body: `<p>Kính gửi <strong>{{customerName}}</strong>,</p>

<p>Tôi là <strong>{{salesName}}</strong> đại diện bộ phận kinh doanh từ <strong>{{companyName}}</strong>.</p>

<p>Tôi xin phép liên hệ lại để kiểm tra xem Quý khách đã nhận được và xem qua bảng báo giá số <strong>{{quotationNumber}}</strong> cho lô hàng tuyến <strong>{{origin}} ➔ {{destination}}</strong> hay chưa?</p>

<p>Báo giá hiện tại có hiệu lực đến ngày <strong>{{validUntil}}</strong>. Do tình hình giá cước và chỗ (space/equipment) của các hãng tàu/hãng hàng không có thể biến động nhanh, Quý khách vui lòng cho chúng tôi biết kế hoạch xuất hàng để chúng tôi hỗ trợ giữ chỗ tốt nhất.</p>

<p>👉 <a href="{{documentLink}}" style="color: #2563eb; font-weight: bold;">Xem lại báo giá trực tuyến tại đây</a></p>

<p>Nếu cần điều chỉnh lịch trình hoặc phương án vận chuyển tối ưu hơn, xin hãy liên hệ ngay với tôi qua số {{salesPhone}}.</p>

<p>Trân trọng kính chào,</p>`,
    variables: ALLOWED_EMAIL_VARIABLES,
    active: true,
    version: 1,
    isDefault: false,
    createdBy: 'System Admin',
    updatedBy: 'System Admin',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tmpl-quotation-reminder-vi',
    companyId: 'default-company',
    name: 'Nhắc Nhở Báo Giá Sắp Hết Hạn (Tiếng Việt)',
    code: 'QUOTATION_REMINDER_VI',
    type: 'QUOTATION_REMINDER',
    language: 'vi',
    subject: '[Nhắc nhở] Báo giá {{quotationNumber}} sắp hết hiệu lực vào ngày {{validUntil}}',
    body: `<p>Kính gửi <strong>{{customerName}}</strong>,</p>

<p>Hệ thống của <strong>{{companyName}}</strong> xin trân trọng thông báo bảng báo giá số <strong>{{quotationNumber}}</strong> (Tuyến {{origin}} ➔ {{destination}}) sắp hết hạn hiệu lực vào ngày <strong>{{validUntil}}</strong>.</p>

<p>Để đảm bảo mức giá ưu đãi và giữ slot vận chuyển, kính mong Quý khách sớm phản hồi hoặc xác nhận đơn hàng.</p>

<p>👉 <a href="{{documentLink}}" style="color: #2563eb; font-weight: bold;">Xác nhận báo giá tại đây</a></p>

<p>Trân trọng,</p>`,
    variables: ALLOWED_EMAIL_VARIABLES,
    active: true,
    version: 1,
    isDefault: false,
    createdBy: 'System Admin',
    updatedBy: 'System Admin',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  }
];
