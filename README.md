# GD COMPUTER - Web app quản lý cửa hàng linh kiện máy tính

App này dùng:

- Frontend: Next.js
- Database/Auth: Supabase Free
- Hosting: Vercel Free, ban đầu dùng link dạng `gd-computer.vercel.app`
- Backup: xuất CSV/dump định kỳ ra máy tính hoặc thư mục Google Drive Desktop

## Chức năng đã có

- Đăng nhập tài khoản bằng Supabase Auth.
- Phân quyền `Chủ cửa hàng` và `Nhân viên`.
- Quản lý sản phẩm: mã, tên, danh mục, giá nhập, giá bán, link ảnh, tồn kho.
- Quản lý danh mục: CPU, RAM, SSD, VGA, Mainboard, PSU, Màn hình, Laptop, Phụ kiện, Dịch vụ.
- Quản lý nhập kho: nhà cung cấp, ngày nhập, nhiều sản phẩm, số lượng, giá nhập, thành tiền.
- Quản lý bán hàng: chọn khách hàng, thêm nhiều sản phẩm, tự tính tổng tiền.
- Chặn bán quá tồn kho ở giao diện và trong database.
- Tính lợi nhuận từng đơn = doanh thu - giá vốn.
- Quản lý khách hàng và lịch sử mua hàng.
- Quản lý nhà cung cấp và lịch sử nhập.
- Báo cáo doanh thu ngày, tháng, lợi nhuận, sản phẩm bán chạy, tồn kho thấp.
- In hóa đơn có logo GD COMPUTER, có thể lưu PDF bằng trình duyệt.
- Responsive, dùng được trên PC và điện thoại.

## Thiết kế để dùng Free lâu nhất

- Không lưu ảnh sản phẩm trong database.
- App chỉ lưu `image_url`, tức một đường link ảnh nhỏ dạng text.
- Không tạo Supabase Storage bucket mặc định.
- Không lưu hàng loạt file PDF hóa đơn trong Supabase.
- Hóa đơn được mở thành trang in, khi cần thì bấm `In / Lưu PDF`.
- Logo chỉ là một file SVG nhỏ trong `public/gd-logo.svg`.
- Không có bảng log thao tác chi tiết.
- Bảng `stock_movements` chỉ ghi nhận nhập/xuất kho, vì đây là dữ liệu nghiệp vụ cần thiết để kiểm tra tồn kho.
- Backup định kỳ ra CSV/dump, có thể đặt trong thư mục Google Drive Desktop.
- Có script dọn backup cũ để tránh đầy ổ đĩa.

## Cấu trúc project

```text
gd-computer-sales-app/
  src/app/
    login/                 Màn hình đăng nhập
    (app)/dashboard/       Tổng quan
    (app)/products/        Sản phẩm
    (app)/categories/      Danh mục
    (app)/stock-in/        Nhập kho
    (app)/sales/           Bán hàng
    (app)/customers/       Khách hàng
    (app)/suppliers/       Nhà cung cấp
    (app)/reports/         Báo cáo
    (app)/orders/[id]/invoice/  Hóa đơn in/PDF
    (app)/settings/users/  Phân quyền tài khoản
  src/components/          Khung giao diện dùng chung
  src/lib/                 Kết nối Supabase, định dạng tiền/ngày
  supabase/schema.sql      Database schema, RLS, function, view báo cáo
  scripts/                 Backup CSV/dump và dọn backup cũ
  public/gd-logo.svg       Logo nhỏ của GD COMPUTER
```

## Phần bạn cần tự làm

Các phần này cần tài khoản/mật khẩu của bạn nên tôi không thể làm thay trực tiếp:

- Tạo project Supabase.
- Chạy file SQL trong Supabase SQL Editor.
- Lấy Supabase URL và key để điền vào `.env.local` và Vercel.
- Tạo tài khoản GitHub/Vercel và deploy.
- Cài lịch backup trên Windows hoặc Google Drive Desktop.
- Sửa số điện thoại/địa chỉ cửa hàng trên hóa đơn.

## Bước 1: Cài phần mềm trên Windows

1. Cài Node.js LTS từ `https://nodejs.org`.
2. Cài Git từ `https://git-scm.com`.
3. Cài Visual Studio Code nếu muốn sửa code dễ hơn.
4. Mở PowerShell trong thư mục project.

Kiểm tra:

```powershell
node -v
npm -v
git --version
```

## Bước 2: Tạo Supabase Free

1. Vào `https://supabase.com`.
2. Đăng nhập, tạo project mới.
3. Chọn region gần Việt Nam nếu có, ví dụ Singapore.
4. Lưu lại database password thật kỹ.
5. Sau khi project tạo xong, bấm vào tên project để vào màn hình quản trị project.
6. Nhìn menu dọc bên trái của Supabase Dashboard.
7. Tìm mục `SQL Editor`. Có thể nó hiện là chữ `SQL Editor`, hoặc chỉ là icon có chữ `SQL`.
8. Nếu menu bên trái đang thu nhỏ, bấm nút mở rộng menu hoặc dùng ô tìm kiếm của Supabase và gõ `SQL Editor`.
9. Trong `SQL Editor`, bấm `New query` hoặc `+ New`.
10. Mở file schema đúng trong project này:

```text
C:\Users\GD COMPUTER\Documents\Codex\2026-07-07\web-app-gd-computer-d-ng\supabase\schema.sql
```

Không dùng file trong thư mục `.pnpm-store`, vì đó là cache của công cụ cài package.

11. Copy toàn bộ nội dung file `schema.sql`, paste vào ô query trong Supabase.
12. Bấm `Run`.

Sau bước này Supabase sẽ có bảng sản phẩm, đơn hàng, khách hàng, nhà cung cấp, phân quyền, báo cáo và hàm nhập/bán kho.

## Bước 3: Lấy Supabase URL và key

Trong Supabase:

1. Vào `Project Settings`.
2. Vào `API`.
3. Copy `Project URL`.
4. Copy `Publishable key`.

Tạo file `.env.local` trong thư mục project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Nếu dashboard Supabase của bạn chỉ hiện `anon public key`, dùng key đó thay cho publishable key.

Không đưa `.env.local` lên GitHub.

## Bước 4: Chạy app trên máy

Trong PowerShell:

```powershell
npm install
npm run dev
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Bước 5: Tạo tài khoản chủ cửa hàng đầu tiên

1. Mở app local.
2. Bấm `Tạo tài khoản`.
3. Nhập email và mật khẩu.
4. Nếu Supabase yêu cầu xác nhận email, hãy mở email để xác nhận.
5. Vào Supabase `SQL Editor`: mở project Supabase, nhìn menu trái, chọn `SQL Editor`, rồi bấm `New query`.
6. Chạy lệnh này, đổi email thành email của bạn:

```	
```

7. Đăng nhập lại app.
8. Vào `Tài khoản` để quản lý nhân viên.

Gợi ý an toàn: Sau khi tạo đủ tài khoản, vào Supabase Auth để tắt public signup nếu bạn không muốn người lạ tự đăng ký.

## Bước 6: Dùng app hằng ngày

Quy trình đề xuất:

1. Vào `Danh mục`, kiểm tra danh mục mặc định.
2. Vào `Sản phẩm`, tạo sản phẩm với mã SKU rõ ràng.
3. Nếu muốn ảnh, chỉ dán link ảnh vào `Link ảnh`; không upload ảnh lên Supabase.
4. Vào `Nhà cung cấp`, thêm nơi nhập hàng.
5. Vào `Nhập kho`, tạo phiếu nhập để tăng tồn kho.
6. Vào `Khách hàng`, thêm khách quen.
7. Vào `Bán hàng`, tạo đơn bán.
8. Sau khi tạo đơn, app mở hóa đơn.
9. Bấm `In / Lưu PDF` nếu cần in hoặc lưu PDF.
10. Vào `Báo cáo` để xem doanh thu/lợi nhuận/tồn thấp.

## Bước 7: Sửa thông tin cửa hàng trên hóa đơn

Mở file:

```text
src/app/(app)/orders/[id]/invoice/page.tsx
```

Tìm đoạn:

```text
Điện thoại: 0900 000 000
Địa chỉ: Cập nhật địa chỉ cửa hàng trong README
```

Sửa thành số điện thoại và địa chỉ thật của GD COMPUTER.

Logo nằm tại:

```text
public/gd-logo.svg
```

## Bước 8: Deploy miễn phí lên Vercel

Ban đầu không cần mua tên miền.

1. Tạo tài khoản GitHub tại `https://github.com`.
2. Tạo repository mới, ví dụ `gd-computer`.
3. Trong thư mục project, chạy:

```powershell
git init
git add .
git commit -m "Initial GD COMPUTER sales app"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB_CUA_BAN/gd-computer.git
git push -u origin main
```

4. Vào `https://vercel.com`.
5. Chọn `Add New Project`.
6. Import repository `gd-computer`.
7. Framework Vercel sẽ nhận là Next.js.
8. Vào phần `Environment Variables`, thêm:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

9. Bấm `Deploy`.
10. Sau khi deploy, Vercel sẽ cho link dạng:

```text
https://gd-computer.vercel.app
```

Nếu Vercel tạo link khác, bạn vào `Settings -> Domains` trong project Vercel để chỉnh subdomain nếu còn trống.

Sau này khi app ổn, bạn có thể mua tên miền như:

```text
gdcomputer.vn
gdcomputer.com
```

Rồi gắn domain vào Vercel.

## Bước 9: Backup dữ liệu định kỳ

Dữ liệu bán hàng là quan trọng nhất. Không nên chỉ tin vào app online.

Có 2 kiểu backup:

- `dump`: dùng để khôi phục database đầy đủ.
- `CSV`: mở bằng Excel, dễ kiểm tra, dễ đưa lên Google Drive.

### 9.1 Lấy Database URL từ Supabase

Trong Supabase:

1. Vào `Project Settings`.
2. Vào `Database`.
3. Tìm `Connection string`.
4. Chọn dạng URI.
5. Copy chuỗi kết nối.
6. Thay `[YOUR-PASSWORD]` bằng database password.

Ví dụ dạng:

```text
postgresql://postgres.xxxxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Không đưa chuỗi này lên GitHub.

### 9.2 Cài PostgreSQL client

Để chạy backup cần có `pg_dump` và `psql`.

Cách dễ nhất:

1. Cài PostgreSQL từ `https://www.postgresql.org/download/windows/`.
2. Khi cài, nhớ chọn Command Line Tools.
3. Mở PowerShell mới.
4. Kiểm tra:

```powershell
pg_dump --version
psql --version
```

### 9.3 Backup dump đầy đủ

```powershell
scripts\backup-supabase.bat "postgresql://postgres.xxxxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

File sẽ nằm trong:

```text
backups/
```

### 9.4 Xuất CSV để mở bằng Excel

```powershell
scripts\export-csv.bat "postgresql://postgres.xxxxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

Mỗi lần chạy sẽ tạo một thư mục CSV có các file:

```text
products.csv
customers.csv
suppliers.csv
purchase_orders.csv
purchase_order_items.csv
sales_orders.csv
sales_order_items.csv
stock_movements.csv
```

Bạn có thể mở các file này bằng Excel.

### 9.5 Backup thẳng vào Google Drive

1. Cài Google Drive for Desktop.
2. Tạo thư mục, ví dụ:

```text
G:\My Drive\GD COMPUTER Backup
```

3. Chạy:

```powershell
scripts\export-csv.bat "postgresql://postgres.xxxxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" "G:\My Drive\GD COMPUTER Backup"
```

Google Drive sẽ tự đồng bộ thư mục này lên cloud.

### 9.6 Tạo lịch backup tự động trên Windows

1. Mở `Task Scheduler`.
2. Chọn `Create Basic Task`.
3. Name: `GD COMPUTER Daily Backup`.
4. Trigger: `Daily`.
5. Chọn giờ ít bán hàng, ví dụ 22:00.
6. Action: `Start a program`.
7. Program/script:

```text
C:\Windows\System32\cmd.exe
```

8. Add arguments:

```text
/c scripts\export-csv.bat "postgresql://postgres.xxxxx:MAT_KHAU@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" "G:\My Drive\GD COMPUTER Backup"
```

9. Start in:

```text
C:\Users\GD COMPUTER\Documents\Codex\2026-07-07\web-app-gd-computer-d-ng
```

10. Save.
11. Bấm chuột phải task, chọn `Run` để thử.

Lịch đề xuất:

- Mỗi ngày: xuất CSV lên Google Drive.
- Mỗi tuần: chạy backup dump đầy đủ.
- Mỗi tháng: tải thêm một bản về USB hoặc ổ cứng ngoài.

### 9.7 Dọn backup cũ

Mặc định script giữ ít nhất 60 ngày:

```powershell
scripts\cleanup-backups.bat
```

Hoặc chạy thủ công:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\cleanup-backups.ps1 -BackupDir "G:\My Drive\GD COMPUTER Backup" -KeepDays 90
```

Không nên giữ quá ít ngày. Tối thiểu nên giữ 60-90 ngày.

## Bước 10: Khi nào cần nâng cấp trả phí?

Bạn có thể dùng miễn phí khá lâu nếu:

- Số nhân viên ít.
- Không upload nhiều ảnh/file.
- Không lưu PDF hàng loạt.
- Backup ra ngoài đều đặn.
- Xóa dữ liệu test/rác sau khi chạy thử.

Nên cân nhắc nâng cấp khi:

- Dữ liệu đơn hàng tăng mạnh.
- Cần backup tự động chuyên nghiệp hơn.
- Nhiều nhân viên dùng đồng thời.
- Cần lưu nhiều ảnh/file.
- App là hệ thống chính của cửa hàng và doanh thu phụ thuộc vào nó mỗi ngày.

## Ghi chú vận hành

- Giá vốn của đơn hàng được chốt tại thời điểm bán.
- Sau này đổi giá nhập sản phẩm thì lợi nhuận đơn cũ không đổi.
- Nếu bán nhầm, bản hiện tại chưa có chức năng hủy/hoàn đơn tự động. Cách an toàn là tạo phiếu điều chỉnh bằng SQL hoặc bổ sung màn hình hoàn hàng ở phiên bản sau.
- Không xóa sản phẩm/khách hàng/nhà cung cấp đã phát sinh dữ liệu nếu không cần. Nên chuyển trạng thái ngừng dùng/ngừng bán.
- Trước khi chạy thật, hãy tạo vài đơn test, kiểm tra báo cáo, hóa đơn và backup.

## Lệnh hay dùng

Chạy local:

```powershell
npm run dev
```

Build kiểm tra trước deploy:

```powershell
npm run build
```

Backup CSV:

```powershell
scripts\export-csv.bat "DATABASE_URL"
```

Backup dump:

```powershell
scripts\backup-supabase.bat "DATABASE_URL"
```
