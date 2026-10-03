// دالة لقراءة ملف الإكسيل وتحويله إلى بيانات JSON (مصفوفات)
function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            resolve(json);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

document.getElementById('processBtn').addEventListener('click', async () => {
    const statusMsg = document.getElementById('statusMessage');
    
    const files = {
        structure: document.getElementById('structure_file').files[0],
        ir: document.getElementById('ir_file').files[0],
        // يمكنك إضافة باقي الملفات هنا لاحقاً بنفس الطريقة
    };

    if (!files.structure || !files.ir) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = "يرجى رفع ملف Structure وملف IR Tickets كحد أدنى للبدء!";
        return;
    }

    statusMsg.style.color = 'blue';
    statusMsg.innerText = "جاري المعالجة محلياً على جهازك، يرجى الانتظار...";

    try {
        // 1. قراءة البيانات من الملفات المرفوعة
        const structureData = await readExcel(files.structure);
        const irData = await readExcel(files.ir);

        // 2. حساب التيكتات من شيت الـ IR
        let ticketCounts = {};
        irData.forEach(row => {
            // تأكد أن اسم العمود في شيت الإكسيل هو "added_by" أو قم بتعديله هنا
            let addedBy = row['added_by']; 
            if (addedBy) {
                ticketCounts[addedBy] = (ticketCounts[addedBy] || 0) + 1;
            }
        });

        // 3. دمج البيانات وحساب Loss Time في شيت الـ Structure
        structureData.forEach(row => {
            // افترضنا أن اسم العمود في الـ Structure هو "TTS user"
            let user = row['TTS user']; 
            
            // حساب System بناءً على عدد التيكتات * 1.5 دقيقة
            let totalTickets = ticketCounts[user] || 0;
            let systemTime = totalTickets * 0.00104166666666667;
            
            row['System'] = systemTime;
            row['Total Tickets'] = totalTickets; // إضافة عمود لعدد التيكتات للتوضيح

            // جلب القيم الأخرى (لو مش موجودة هنعتبرها صفر)
            // تأكد من أسماء الأعمدة الفعلية في ملفك (Tele-SCH, Talk Time, Comp)
            let teleSch = parseFloat(row['Tele-SCH']) || 0; 
            let talkTime = parseFloat(row['Talk Time']) || 0;
            let comp = parseFloat(row['Comp']) || 0;

            // تطبيق المعادلة: Tele-SCH * 90% - ( System + Talk Time + Comp )
            row['Loss Time'] = (teleSch * 0.90) - (systemTime + talkTime + comp);
        });

        // 4. إنشاء ملف إكسيل جديد وتصديره
        const newWorksheet = XLSX.utils.json_to_sheet(structureData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Final_Report");
        
        // تحميل الملف النهائي
        XLSX.writeFile(newWorkbook, "Final_Report.xlsx");

        statusMsg.style.color = 'green';
        statusMsg.innerText = "تمت المعالجة بنجاح! تم تحميل التقرير النهائي.";

    } catch (error) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = "حدث خطأ أثناء المعالجة: " + error.message;
        console.error(error);
    }
});
