import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { nanoid } from 'nanoid';

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function POST(req: NextRequest) {
  try {
    // Nhận thêm trường 'receiver' từ Form
    const { sender, receiver, messages } = await req.json(); 
    const id = nanoid(8);
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo(); 
    const sheet = doc.sheetsByIndex[0];

    // Cập nhật lại header có chứa 'receiver' nếu đây là file Google Sheet mới
    await sheet.loadHeaderRow().catch(() => {}); // Catch lỗi nếu sheet hoàn toàn trống
    if (!sheet.headerValues || sheet.headerValues.length === 0) {
        await sheet.setHeaderRow(['id', 'sender', 'receiver', 'message', 'timestamp']);
    }

    // Lọc bỏ các lời chúc rỗng và chuyển mảng thành chuỗi JSON để lưu
    const validMessages = messages.filter((m: string) => m.trim() !== '');

    // Lưu dữ liệu vào Sheet
    await sheet.addRow({
      id,
      sender,
      receiver,
      message: JSON.stringify(validMessages), 
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, id, link: `/wish/${id}` });
  } catch (error) {
    console.error('Lỗi API:', error);
    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra' }, { status: 500 });
  }
}