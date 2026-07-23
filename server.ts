import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
}

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini AI Route: Suggest Local Charges & Surcharges based on shipment route and mode
app.post("/api/gemini/suggest-charges", async (req, res) => {
  try {
    const { mode, origin, destination, commodity, containerType } = req.body;
    
    const prompt = `Bạn là chuyên gia tư vấn Freight Forwarding & Logistics quốc tế tại Việt Nam.
Hãy gợi ý danh sách các khoản Phụ phí Local Charges & Surcharges chuẩn ngành cho lô hàng sau:
- Hình thức vận chuyển: ${mode || 'Sea FCL'}
- Cảng/Điểm đi (POL/Origin): ${origin || 'Cat Lai Port, Ho Chi Minh, Vietnam'}
- Cảng/Điểm đến (POD/Destination): ${destination || 'Los Angeles, USA'}
- Loại hàng hóa: ${commodity || 'General Cargo'}
- Loại container/quy cách: ${containerType || '40HC'}

Trả về kết quả dưới dạng JSON thuần túy (không dùng markdown backticks, chỉ JSON) theo cấu trúc array các item:
[
  {
    "category": "Local Charge" | "Surcharge" | "Customs" | "Trucking",
    "code": "THC",
    "description": "Terminal Handling Charge (Phí xếp dỡ tại cảng)",
    "suggestedPriceUsd": 140,
    "suggestedPriceVnd": 3500000,
    "unit": "Container" | "Set" | "Bill" | "CBM" | "Trip",
    "currency": "USD" | "VND",
    "note": "Bắt buộc cho FCL"
  }
]
Chỉ xuất ra đúng 5-8 phụ phí thực tế phổ biến nhất theo tuyến đường này (VD: THC, BL, Seal, D/O, BAF, LSS, CIC, Handling fee...).`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "[]";
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const suggestions = JSON.parse(cleanedText);

    res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error("Error in AI suggest charges:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate AI recommendations" });
  }
});

// Gemini AI Route: Generate professional quotation offer email to client
app.post("/api/gemini/generate-email", async (req, res) => {
  try {
    const { quoteNumber, customerName, companyName, route, totalVnd, totalUsd, validityDate, incoterm } = req.body;

    const prompt = `Bạn là Trưởng phòng Kinh doanh Logistics chuyên nghiệp. Hãy viết một email chào giá dịch vụ Logistics gửi tới khách hàng dựa trên thông tin sau:
- Mã Báo Giá: ${quoteNumber}
- Tên Khách hàng: ${customerName || 'Quý khách'} (${companyName || 'Quý công ty'})
- Tuyến đường & Phương thức: ${route}
- Tổng chi phí ước tính: ${totalUsd} (tương đương ${totalVnd})
- Điều kiện giao hàng (Incoterm): ${incoterm || 'FOB'}
- Hiệu lực báo giá đến: ${validityDate || '15 ngày kể từ ngày báo giá'}

Email cần thể hiện sự lịch sự, chuyên nghiệp, nêu rõ ưu điểm dịch vụ (cam kết vỏ cont đẹp, thông quan nhanh, không phát sinh chi phí ẩn), và kêu gọi phản hồi sớm để giữ slot/vỏ. Viết cả bản tiếng Việt và tóm tắt bản tiếng Anh bên dưới.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, emailContent: response.text });
  } catch (error: any) {
    console.error("Error generating AI email:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate email" });
  }
});

// Gemini AI Route: Audit Quote Competitiveness & Risks
app.post("/api/gemini/audit-quote", async (req, res) => {
  try {
    const { quoteData } = req.body;

    const prompt = `Bạn là chuyên gia phân tích rủi ro và giá cả Logistics (Quotation Auditor). Hãy đánh giá chi tiết bảng báo giá sau:
${JSON.stringify(quoteData, null, 2)}

Hãy đưa ra đánh giá ngắn gọn dạng bullet points:
1. Độ hợp lý của mức cước & phụ phí.
2. Các khoản phí tiềm ẩn có thể bị bỏ sót đối với tuyến đường/loại hàng này (VD: Phí soi chiếu customs, lưu kho bãi, cược vỏ cont, phí kiểm dịch...).
3. Khuyến nghị điều khoản Incoterm & thanh toán để tránh rủi ro công nợ cho công ty Forwarding.
4. Điểm xếp hạng tính cạnh tranh (Thang điểm 10/10).`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, auditReport: response.text });
  } catch (error: any) {
    console.error("Error auditing quote:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to audit quote" });
  }
});

// Setup Vite Development Middleware or Static Production Serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Logistics Quotation App listening on port ${PORT}`);
  });
}

setupServer();
