document.getElementById('processBtn').addEventListener('click', async () => {
    const statusMsg = document.getElementById('statusMessage');
    const files = {
        structure: document.getElementById('structure_file').files[0],
        schedule: document.getElementById('schedule_file').files[0],
        utl: document.getElementById('utl_file').files[0],
        ir: document.getElementById('ir_file').files[0],
        comp: document.getElementById('comp_file').files[0]
    };

    // التحقق من رفع الملفات الأساسية
    if (!files.structure || !files.ir) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = "يرجى رفع ملف Structure وملف IR Tickets كحد أدنى!";
        return;
    }

    statusMsg.style.color = 'blue';
    statusMsg.innerText = "جاري معالجة البيانات، يرجى الانتظار...";

    const formData = new FormData();
    for (const key in files) {
        if (files[key]) formData.append(key, files[key]);
    }

    try {
        // سيتم إرسال الطلب إلى سيرفر البايثون (Flask)
        const response = await fetch('http://127.0.0.1:5000/process', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            // تحميل الملف النهائي تلقائياً
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Final_Report.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            statusMsg.style.color = 'green';
            statusMsg.innerText = "تمت المعالجة بنجاح! جاري تحميل الملف.";
        } else {
            const err = await response.json();
            throw new Error(err.message || 'حدث خطأ في الخادم');
        }
    } catch (error) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = "خطأ: " + error.message;
    }
});