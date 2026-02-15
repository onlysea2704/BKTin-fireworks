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
    const { sender, messages } = await req.json(); // Nhận mảng messages
    const id = nanoid(8);
    
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo(); 
    const sheet = doc.sheetsByIndex[0];

    await sheet.loadHeaderRow();
    if (sheet.headerValues.length === 0) {
        await sheet.setHeaderRow(['id', 'sender', 'message', 'timestamp']);
    }

    // Lọc bỏ các lời chúc rỗng và chuyển mảng thành chuỗi JSON để lưu
    const validMessages = messages.filter((m: string) => m.trim() !== '');

    await sheet.addRow({
      id,
      sender,
      message: JSON.stringify(validMessages), // Lưu mảng dưới dạng chuỗi
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true, id, link: `/wish/${id}` });
  } catch (error) {
    console.error('Lỗi API:', error);
    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra' }, { status: 500 });
  }
}