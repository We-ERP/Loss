from flask import Flask, request, send_file, jsonify
import pandas as pd
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # للسماح للـ Frontend بالتواصل مع السيرفر

OUTPUT_DIR = '../output'
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route('/process', methods=['POST'])
def process_data():
    try:
        # 1. استلام الملفات من الواجهة
        files = request.files
        if 'structure' not in files or 'ir' not in files:
            return jsonify({'message': 'Missing mandatory files'}), 400

        # قراءة الشيتات
        df_str = pd.read_excel(files['structure'])
        df_ir = pd.read_excel(files['ir'])
        
        df_sch = pd.read_excel(files['schedule']) if 'schedule' in files else None
        df_utl = pd.read_excel(files['utl']) if 'utl' in files else None
        df_comp = pd.read_excel(files['comp']) if 'comp' in files else None

        # 2. معالجة شيت الـ IR Tickets
        # تنظيف عمود التاريخ Z
        df_ir['added_on'] = pd.to_datetime(df_ir['added_on']).dt.date
        
        # حساب التيكتات المضافة (System) بناءً على المستخدم (added_by)
        ticket_counts = df_ir.groupby(['added_by', 'added_on']).size().reset_index(name='tickets_added')
        # ضرب التيكتات في 0.00104166666666667 (دقيقة ونصف)
        ticket_counts['System_Time'] = ticket_counts['tickets_added'] * 0.00104166666666667

        # دمج الـ IR مع الـ Structure بناءً على (TTS user)
        # نفترض أن عمود TTS User في الـ Structure اسمه 'TTS_User'
        df_final = pd.merge(df_str, ticket_counts, left_on='TTS_User', right_on='added_by', how='left')

        # 3. معالجة شيت الـ Schedule (بديل كود الـ VBA)
        if df_sch is not None:
            # محاكاة لعملية الفلترة واستخراج الـ ID والـ Code والـ Duration في الـ VBA
            # تنظيف المسافات وحذف كلمة 'up' كما كان في الـ VBA
            # df_sch['Column_B'] = df_sch['Column_B'].astype(str).str.replace('up', '', case=False)
            
            # استخراج الأكواد الخاصة بالـ Schedule لكل Agent لكل يوم
            # سيتم تخصيص هذا الجزء بناءً على أسماء أعمدة ملف الـ Schedule الفعلي لديك
            pass 

        # 4. حساب Loss Time
        # تأمين وجود الأعمدة لتجنب الأخطاء
        for col in ['Tele_SCH', 'System_Time', 'Talk_Time', 'Comp']:
            if col not in df_final.columns:
                df_final[col] = 0.0
        
        # تطبيق المعادلة: Tele-SCH * 90% - ( System + Talk Time + Comp )
        df_final['Loss_Time'] = (df_final['Tele_SCH'] * 0.90) - (df_final['System_Time'] + df_final['Talk_Time'] + df_final['Comp'])

        # 5. تصدير الملف النهائي
        output_path = os.path.join(OUTPUT_DIR, 'Final_Report.xlsx')
        df_final.to_excel(output_path, index=False)

        return send_file(output_path, as_attachment=True, download_name='Final_Report.xlsx')

    except Exception as e:
        return jsonify({'message': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)