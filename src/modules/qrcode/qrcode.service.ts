import QRCode from 'qrcode';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { NotFoundError } from '../../shared/errors/NotFoundError';

export class QrcodeService {
  async generateForTable(restaurantId: string, tableId: string, format: 'png' | 'svg' | 'pdf' = 'png') {
    const table = await prisma.table.findFirst({
      where: { id: tableId, restaurantId },
      include: { restaurant: { select: { slug: true } } },
    });

    if (!table) throw new NotFoundError('Table');

    // Generating the scan URL: e.g., http://localhost:8080/r/the-golden-spoon/t/1234
    const url = `${config.qr.baseUrl}/r/${table.restaurant.slug}/t/${table.id}`;

    if (format === 'svg') {
      const svg = await QRCode.toString(url, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      return { data: svg, type: 'image/svg+xml', filename: `table-${table.tableNumber}.svg` };
    }

    // Default to PNG Buffer
    const buffer = await QRCode.toBuffer(url, {
      margin: 2,
      width: 500,
      color: { dark: '#000000', light: '#ffffff' },
    });
    
    return { data: buffer, type: 'image/png', filename: `table-${table.tableNumber}.png` };
  }

  async generateAllForRestaurant(restaurantId: string) {
    // In a real system, you would generate a PDF containing all QR codes.
    // For this implementation, we return a ZIP or JSON with URLs.
    
    const tables = await prisma.table.findMany({
      where: { restaurantId, isActive: true },
      include: { restaurant: { select: { slug: true } } },
      orderBy: { tableNumber: 'asc' },
    });

    const qrCodes = await Promise.all(
      tables.map(async (table: any) => {
        const url = `${config.qr.baseUrl}/r/${table.restaurant.slug}/t/${table.id}`;
        const dataUrl = await QRCode.toDataURL(url, { margin: 2 });
        return {
          tableNumber: table.tableNumber,
          url,
          qrCodeImage: dataUrl,
        };
      })
    );

    return qrCodes;
  }
}
