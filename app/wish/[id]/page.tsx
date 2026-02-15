import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import InteractiveFireworks from '@/app/components/InteractiveFireworks';
import { notFound } from 'next/navigation';

async function getWishById(id: string) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  
  const row = rows.find(r => r.get('id') === id);
  if (!row) return [];

  // Lấy dữ liệu từ các cột trong Google Sheet
  const sender = row.get('sender');
  const receiver = row.get('receiver') || 'Bạn'; // Thêm receiver, dự phòng chữ "Bạn" nếu dữ liệu cũ chưa có
  const messageData = row.get('message');
  
  let messagesArray: string[] = [];
  try {
    messagesArray = JSON.parse(messageData); // Giải mã chuỗi JSON thành mảng
  } catch (e) {
    messagesArray = [messageData]; // Fallback nếu dữ liệu cũ không phải JSON
  }

  // Trả về mảng các object Wish gồm sender, receiver và message
  return messagesArray.map(msg => ({ 
    sender, 
    receiver, 
    message: msg 
  }));
}

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userWishes = await getWishById(resolvedParams.id);
  
  if (!userWishes || userWishes.length === 0) {
    notFound();
  }

  return (
    <main className="relative min-h-screen">
      {/* Truyền danh sách lời chúc (đã có receiver) vào Canvas */}
      <InteractiveFireworks initialWishes={userWishes} />
    </main>
  );
}